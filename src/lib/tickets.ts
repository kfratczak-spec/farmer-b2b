import { fetchGroups } from './data';

export type TicketType = 'onboarding' | 'activity' | 'upsell';
export type RiskLevel = 'low_risk' | 'high_risk' | 'critical';
export type TicketStatus = 'open' | 'closed';
export type ClosedReason = 'auto_utilization_improved' | 'auto_onboarding_completed' | 'manual_upsell_won' | 'manual_upsell_lost' | 'manual';

export interface Ticket {
  id: string;
  type: TicketType;
  groupId: string;
  groupName: string;
  companyName: string;
  salesPersonId: string;
  salesPersonName: string;
  riskLevel: RiskLevel;
  status: TicketStatus;
  createdAt: string;
  closedAt?: string;
  lastActivityAt: string;
  daysOpen: number;
  description: string;
  utilizationPercent: number;
  expectedUtilizationPercent: number;
  typeLabel: string;
  typeColor: string;
}

export interface ClosedTicket extends Ticket {
  closedAt: string;
  closedReason: ClosedReason;
}

// Global in-memory store for closed tickets
// Key: `${type}-${groupId}`, Value: ClosedTicket
let closedTicketsStore = new Map<string, ClosedTicket>();

function calculateExpectedUtilization(
  groupStartDate: string,
  groupEndDate: string,
  targetUtilization: number = 0.75
): number {
  const now = new Date();
  const start = new Date(groupStartDate);
  const end = new Date(groupEndDate);

  if (now < start) return 0;
  if (now > end) return targetUtilization;

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const elapsedRatio = elapsedMs / totalMs;

  return Math.min(elapsedRatio * targetUtilization, targetUtilization);
}

function getDaysOld(startDate: string): number {
  const now = new Date();
  const start = new Date(startDate);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function generateTickets(): Promise<Ticket[]> {
  const tickets: Ticket[] = [];
  const now = new Date();
  const GROUPS = await fetchGroups();

  for (const group of GROUPS) {
    if (!group.isActive) continue;

    const groupStart = new Date(group.startDate);
    const groupEnd = new Date(group.endDate);

    // Only create tickets for groups that have started and are not yet ended
    if (now < groupStart || now > groupEnd) continue;

    const currentUtilization = group.usedMinutes / group.totalMinutes;
    const expectedUtilization = calculateExpectedUtilization(
      group.startDate,
      group.endDate,
      0.75
    );

    const daysOld = getDaysOld(group.startDate);
    const daysRemaining = getDaysRemaining(group.endDate);
    const percentUsed = (group.usedMinutes / group.totalMinutes) * 100;
    const utilizationDiff = (expectedUtilization - currentUtilization) * 100; // how far behind in percentage points

    let ticketToAdd: Ticket | null = null;

    // ACTIVITY TICKETS - Higher priority
    if (daysOld > 30 && utilizationDiff > 10) {
      // Activity ticket: group is old and behind on utilization
      let riskLevel: RiskLevel = 'low_risk';
      if (utilizationDiff > 25) {
        riskLevel = 'critical';
      } else if (utilizationDiff > 15) {
        riskLevel = 'high_risk';
      }

      const description = `Aktywność: Wykorzystanie ${(currentUtilization * 100).toFixed(0)}% vs oczekiwane ${(expectedUtilization * 100).toFixed(0)}%`;

      ticketToAdd = {
        id: `tkt-activity-${group.id}`,
        type: 'activity',
        groupId: group.id,
        groupName: group.name,
        companyName: group.companyName,
        salesPersonId: group.salesPersonId,
        salesPersonName: group.salesPersonName,
        riskLevel,
        status: 'open',
        createdAt: groupStart.toISOString().split('T')[0],
        lastActivityAt: now.toISOString().split('T')[0],
        daysOpen: Math.min(daysOld, 120),
        description,
        utilizationPercent: Math.round(currentUtilization * 100),
        expectedUtilizationPercent: Math.round(expectedUtilization * 100),
        typeLabel: 'Aktywność',
        typeColor: riskLevel === 'critical' ? 'red' : riskLevel === 'high_risk' ? 'orange' : 'yellow',
      };
    }

    // ONBOARDING TICKETS - Medium priority (only if no activity ticket)
    if (!ticketToAdd && daysOld <= 30 && currentUtilization < expectedUtilization * 0.3) {
      // Onboarding ticket: group is new and not being activated
      let riskLevel: RiskLevel = 'low_risk';
      const utilizationPercent = currentUtilization * 100;

      if (utilizationPercent < 15) {
        riskLevel = 'critical';
      } else if (utilizationPercent < 25) {
        riskLevel = 'high_risk';
      }

      const description = `Onboarding: Nowa grupa wymaga aktywacji. Obecne wykorzystanie ${(currentUtilization * 100).toFixed(0)}%`;

      ticketToAdd = {
        id: `tkt-onboarding-${group.id}`,
        type: 'onboarding',
        groupId: group.id,
        groupName: group.name,
        companyName: group.companyName,
        salesPersonId: group.salesPersonId,
        salesPersonName: group.salesPersonName,
        riskLevel,
        status: 'open',
        createdAt: groupStart.toISOString().split('T')[0],
        lastActivityAt: now.toISOString().split('T')[0],
        daysOpen: daysOld,
        description,
        utilizationPercent: Math.round(currentUtilization * 100),
        expectedUtilizationPercent: Math.round(expectedUtilization * 100),
        typeLabel: 'Onboarding',
        typeColor: 'blue',
      };
    }

    // UPSELL TICKETS - Lower priority (only if no other ticket)
    if (
      !ticketToAdd &&
      currentUtilization > 0.65 &&
      (daysRemaining < 90 || percentUsed > 70)
    ) {
      // Upsell ticket: good utilization with limited time left
      let riskLevel: RiskLevel = 'low_risk';
      let description = '';

      if (daysRemaining < 30) {
        riskLevel = 'critical';
        description = `Upsell: Gorący lead - grupa bardzo aktywna (${(currentUtilization * 100).toFixed(0)}%) z mniej niż 30 dniami pozostałymi`;
      } else if (daysRemaining < 60) {
        riskLevel = 'high_risk';
        description = `Upsell: Ciepły lead - grupa aktywna (${(currentUtilization * 100).toFixed(0)}%) z 30-60 dniami pozostałymi`;
      } else {
        riskLevel = 'low_risk';
        description = `Upsell: Wczesny sygnał - grupa dobrze się rozwija (${(currentUtilization * 100).toFixed(0)}%), okazja na ekspansję`;
      }

      ticketToAdd = {
        id: `tkt-upsell-${group.id}`,
        type: 'upsell',
        groupId: group.id,
        groupName: group.name,
        companyName: group.companyName,
        salesPersonId: group.salesPersonId,
        salesPersonName: group.salesPersonName,
        riskLevel,
        status: 'open',
        createdAt: groupStart.toISOString().split('T')[0],
        lastActivityAt: now.toISOString().split('T')[0],
        daysOpen: daysOld,
        description,
        utilizationPercent: Math.round(currentUtilization * 100),
        expectedUtilizationPercent: Math.round(expectedUtilization * 100),
        typeLabel: 'Upsell',
        typeColor: riskLevel === 'critical' ? 'green' : 'purple',
      };
    }

    // Check if the ticket should be auto-closed or was previously closed
    if (ticketToAdd) {
      const ticketKey = `${ticketToAdd.type}-${group.id}`;

      // Check if this ticket was previously closed
      if (closedTicketsStore.has(ticketKey)) {
        // Don't regenerate closed tickets - skip this ticket
        continue;
      }

      // Check auto-close conditions
      let shouldAutoClose = false;
      let autoCloseReason: ClosedReason | null = null;

      if (ticketToAdd.type === 'activity') {
        // ACTIVITY: auto-close if utilization difference dropped below 5%
        if (utilizationDiff < 5) {
          shouldAutoClose = true;
          autoCloseReason = 'auto_utilization_improved';
        }
      } else if (ticketToAdd.type === 'onboarding') {
        // ONBOARDING: auto-close if >30 days old OR utilization > 30% of expected
        if (daysOld > 30 || currentUtilization > expectedUtilization * 0.3) {
          shouldAutoClose = true;
          autoCloseReason = 'auto_onboarding_completed';
        }
      }

      // If should auto-close, store it as closed instead of adding to open tickets
      if (shouldAutoClose && autoCloseReason) {
        const closedTicket: ClosedTicket = {
          ...ticketToAdd,
          status: 'closed',
          closedAt: now.toISOString().split('T')[0],
          closedReason: autoCloseReason,
        };
        const ticketKey = `${ticketToAdd.type}-${group.id}`;
        closedTicketsStore.set(ticketKey, closedTicket);
      } else {
        // Add as open ticket
        tickets.push(ticketToAdd);
      }
    }
  }

  return tickets;
}

export async function getTicketById(ticketId: string): Promise<Ticket | undefined> {
  const tickets = await generateTickets();
  return tickets.find(t => t.id === ticketId);
}

export async function getTicketsByGroupId(groupId: string): Promise<Ticket[]> {
  const tickets = await generateTickets();
  return tickets.filter(t => t.groupId === groupId);
}

export async function getOpenTickets(): Promise<Ticket[]> {
  const tickets = await generateTickets();
  return tickets.filter(t => t.status === 'open');
}

export async function getTicketsBySalesperson(salesPersonId: string): Promise<Ticket[]> {
  const tickets = await generateTickets();
  return tickets.filter(t => t.salesPersonId === salesPersonId && t.status === 'open');
}

export function closeTicketManually(ticket: Ticket, reason: 'upsell_won' | 'upsell_lost' | 'manual'): ClosedTicket {
  const now = new Date();
  const closedReason: ClosedReason = reason === 'upsell_won' ? 'manual_upsell_won' : reason === 'upsell_lost' ? 'manual_upsell_lost' : 'manual';

  const closedTicket: ClosedTicket = {
    ...ticket,
    status: 'closed',
    closedAt: now.toISOString().split('T')[0],
    closedReason,
  };

  const ticketKey = `${ticket.type}-${ticket.groupId}`;
  closedTicketsStore.set(ticketKey, closedTicket);

  return closedTicket;
}

export function getClosedTickets(): ClosedTicket[] {
  const closed: ClosedTicket[] = [];
  closedTicketsStore.forEach((ticket) => {
    closed.push(ticket);
  });
  return closed.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
}

export function getClosedTicketsByGroup(groupId: string): ClosedTicket[] {
  const closed: ClosedTicket[] = [];
  closedTicketsStore.forEach((ticket) => {
    if (ticket.groupId === groupId) {
      closed.push(ticket);
    }
  });
  return closed.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
}
