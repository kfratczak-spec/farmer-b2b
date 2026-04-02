import { NextRequest, NextResponse } from 'next/server';
import { generateTickets, getClosedTickets, getTicketHistory, Ticket } from '@/lib/tickets';
import { fetchGroups } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    // Get user from headers
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    let userRole = '';
    let fullName = '';

    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        userRole = decoded.role;
        fullName = decoded.fullName || '';
      } catch (e) {
        // Invalid token
      }
    }

    const allTickets = await generateTickets();
    const allClosedTickets = getClosedTickets();
    const GROUPS = await fetchGroups();

    // Get ticket history for user's groups
    const ticketHistories: Record<string, Ticket[]> = {};
    if (userRole === 'salesperson' && fullName) {
      const userGroups = GROUPS.filter((g) => g.salesPersonName === fullName);
      for (const group of userGroups) {
        ticketHistories[group.id] = getTicketHistory(group.id);
      }
    } else {
      for (const group of GROUPS) {
        ticketHistories[group.id] = getTicketHistory(group.id);
      }
    }

    // Filter tickets based on role
    let tickets = allTickets;
    let closedTickets = allClosedTickets;
    if (userRole === 'salesperson' && fullName) {
      tickets = allTickets.filter((t) => t.salesPersonName === fullName);
      closedTickets = allClosedTickets.filter((t) => t.salesPersonName === fullName);
    }

    // Sort by ticket type priority, then risk level, then days open
    const typePriority = { activity: 3, onboarding: 2, upsell: 1 };
    const riskOrder = { critical: 3, high_risk: 2, low_risk: 1 };

    tickets = tickets.sort((a, b) => {
      const typeDiff = typePriority[b.type] - typePriority[a.type];
      if (typeDiff !== 0) return typeDiff;
      const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return b.daysOpen - a.daysOpen;
    });

    return NextResponse.json({
      success: true,
      tickets,
      closedTickets,
      ticketHistories,
      total: tickets.length,
      closedTotal: closedTickets.length,
      summary: {
        open: tickets.filter((t) => t.status === 'open').length,
        onboarding: tickets.filter((t) => t.type === 'onboarding').length,
        activity: tickets.filter((t) => t.type === 'activity').length,
        upsell: tickets.filter((t) => t.type === 'upsell').length,
        critical: tickets.filter((t) => t.riskLevel === 'critical').length,
        highRisk: tickets.filter((t) => t.riskLevel === 'high_risk').length,
        lowRisk: tickets.filter((t) => t.riskLevel === 'low_risk').length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
