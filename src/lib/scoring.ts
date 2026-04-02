import { Ticket, ClosedTicket } from './tickets';
import { Activity } from './activities';

export interface SalespersonScore {
  salesPersonName: string;
  totalScore: number; // 0-100
  reactionScore: number; // 0-25
  resolutionScore: number; // 0-25
  regularityScore: number; // 0-25
  upsellScore: number; // 0-25
  totalActivities: number;
  ticketsHandled: number;
  avgReactionDays: number;
  resolvedTickets: number;
}

export function calculateSalespersonScores(
  tickets: Ticket[],
  closedTickets: ClosedTicket[],
  activities: Activity[]
): SalespersonScore[] {
  // Group all salespeople
  const salespeople = new Set<string>();
  tickets.forEach(t => salespeople.add(t.salesPersonName));
  closedTickets.forEach(t => salespeople.add(t.salesPersonName));
  activities.forEach(a => salespeople.add(a.salesPersonName));

  const scores: SalespersonScore[] = [];

  salespeople.forEach((salespersonName) => {
    // Get all tickets (open and closed) for this salesperson
    const personOpenTickets = tickets.filter(t => t.salesPersonName === salespersonName);
    const personClosedTickets = closedTickets.filter(t => t.salesPersonName === salespersonName);
    const allPersonTickets = [...personOpenTickets, ...personClosedTickets];
    const totalTicketsHandled = allPersonTickets.length;

    // Get all activities for this salesperson
    const personActivities = activities.filter(a => a.salesPersonName === salespersonName);
    const totalActivities = personActivities.length;

    // ========================
    // 1. REACTION SPEED (0-25 pts)
    // ========================
    let reactionScore = 0;
    let avgReactionDays = 0;

    if (allPersonTickets.length > 0) {
      let totalReactionDays = 0;
      let ticketsWithActivity = 0;

      allPersonTickets.forEach(ticket => {
        const ticketActivities = personActivities.filter(a => a.ticketId === ticket.id);
        if (ticketActivities.length > 0) {
          // Find first activity after ticket creation
          const firstActivity = ticketActivities[ticketActivities.length - 1]; // Activities are sorted desc, so last is first in time
          const ticketDate = new Date(ticket.createdAt);
          const activityDate = new Date(firstActivity.createdAt);
          const diffTime = activityDate.getTime() - ticketDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          totalReactionDays += diffDays;
          ticketsWithActivity++;
        }
      });

      if (ticketsWithActivity > 0) {
        avgReactionDays = Math.round((totalReactionDays / ticketsWithActivity) * 10) / 10;

        if (avgReactionDays < 1) {
          reactionScore = 25;
        } else if (avgReactionDays < 3) {
          reactionScore = 20;
        } else if (avgReactionDays < 7) {
          reactionScore = 15;
        } else if (avgReactionDays < 14) {
          reactionScore = 10;
        } else {
          reactionScore = 5;
        }
      } else {
        reactionScore = 0;
      }
    }

    // ========================
    // 2. RESOLUTION RATE (0-25 pts)
    // ========================
    let resolutionScore = 0;
    const resolvedTickets = personClosedTickets.length;

    if (totalTicketsHandled > 0) {
      const resolutionRate = (resolvedTickets / totalTicketsHandled) * 100;

      if (resolutionRate >= 100) {
        resolutionScore = 25;
      } else if (resolutionRate >= 80) {
        resolutionScore = 20;
      } else if (resolutionRate >= 60) {
        resolutionScore = 15;
      } else if (resolutionRate >= 40) {
        resolutionScore = 10;
      } else {
        resolutionScore = 5;
      }
    }

    // ========================
    // 3. REGULARITY (0-25 pts)
    // ========================
    let regularityScore = 0;

    if (allPersonTickets.length > 0 && totalActivities > 0) {
      // Calculate activities per ticket per week
      const activitiesPerTicketPerWeek = (totalActivities / allPersonTickets.length) / 1; // Assuming average ticket life is ~1 week for simplicity
      // More accurate: sum of activities over sum of ticket durations in weeks
      let totalTicketWeeks = 0;

      allPersonTickets.forEach(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        const now = new Date();
        const diffTime = now.getTime() - ticketDate.getTime();
        const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
        totalTicketWeeks += Math.max(diffWeeks, 0.1); // At least 0.1 weeks
      });

      const avgActivitiesPerWeek = totalTicketWeeks > 0 ? totalActivities / totalTicketWeeks : 0;

      if (avgActivitiesPerWeek > 3) {
        regularityScore = 25;
      } else if (avgActivitiesPerWeek > 2) {
        regularityScore = 20;
      } else if (avgActivitiesPerWeek > 1) {
        regularityScore = 15;
      } else if (avgActivitiesPerWeek > 0.5) {
        regularityScore = 10;
      } else {
        regularityScore = 5;
      }
    }

    // ========================
    // 4. UPSELL SUCCESS (0-25 pts)
    // ========================
    let upsellScore = 0;
    const upsellTickets = allPersonTickets.filter(t => t.type === 'upsell');
    const upsellClosed = personClosedTickets.filter(
      t => t.type === 'upsell' && (t.closedReason === 'manual_upsell_won' || t.closedReason === 'auto_utilization_improved')
    );

    if (upsellTickets.length === 0) {
      // No upsells assigned - neutral score
      upsellScore = 12;
    } else {
      const upsellSuccessRate = (upsellClosed.length / upsellTickets.length) * 100;

      if (upsellSuccessRate >= 100) {
        upsellScore = 25;
      } else if (upsellSuccessRate > 50) {
        upsellScore = 20;
      } else if (upsellSuccessRate > 25) {
        upsellScore = 15;
      } else if (upsellSuccessRate > 0) {
        upsellScore = 10;
      } else {
        upsellScore = 5;
      }
    }

    // ========================
    // TOTAL SCORE
    // ========================
    const totalScore = reactionScore + resolutionScore + regularityScore + upsellScore;

    scores.push({
      salesPersonName: salespersonName,
      totalScore,
      reactionScore,
      resolutionScore,
      regularityScore,
      upsellScore,
      totalActivities,
      ticketsHandled: totalTicketsHandled,
      avgReactionDays,
      resolvedTickets,
    });
  });

  // Sort by totalScore descending
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}
