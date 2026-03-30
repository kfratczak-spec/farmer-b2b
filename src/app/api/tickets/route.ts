import { NextRequest, NextResponse } from 'next/server';
import { generateTickets } from '@/lib/tickets';

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

    // Filter tickets based on role
    let tickets = allTickets;
    if (userRole === 'salesperson' && fullName) {
      tickets = allTickets.filter((t) => t.salesPersonName === fullName);
    }

    // Sort by risk level (critical first) and by days open
    tickets = tickets.sort((a, b) => {
      const riskOrder = { critical: 3, high_risk: 2, low_risk: 1 };
      const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      if (riskDiff !== 0) return riskDiff;
      return b.daysOpen - a.daysOpen;
    });

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length,
      summary: {
        open: tickets.filter((t) => t.status === 'open').length,
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
