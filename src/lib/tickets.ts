import { fetchGroups } from './data';

export type TicketType = 'onboarding' | 'activity' | 'upsell';
export type RiskLevel = 'low_risk' | 'high_risk' | 'critical';
export type TicketStatus = 'open' | 'closed';
export type ClosedReason = 'auto_utilization_improved' | 'auto_onboarding_completed' | 'manual_upsell_won' | 'manual_upsell_lost' | 'manual';

// A single open/close cycle
export interface TicketCycle {
  openedAt: string;    // ISO date
  closedAt?: string;   // ISO date (undefined if still open)
  closedReason?: ClosedReason;
  daysOpen: number;    // calculated
}

// Extended ticket with full history
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
  createdAt: string;      // first ever opened
  closedAt?: string;      // last closed date (if currently closed)
  closedReason?: ClosedReason;
  lastActivityAt: string;
  daysOpen: number;        // days in CURRENT cycle
  totalDaysOpen: number;   // total days across ALL cycles
  cycleCount: number;      // how many times opened
  cycles: TicketCycle[];   // full history
  description: string;
  utilizationPercent: number;
  expectedUtilizationPercent: number;
  typeLabel: string;
  typeColor: string;
}

export type ClosedTicket = Ticket; // alias for compatibility

// Global in-memory store for ticket history
// Key: `${type}-${groupId}`, Value: full ticket with history
let ticketHistoryStore = new Map<string, Ticket>();

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

function calculateDaysOpen(openedAt: string, closedAt?: string): number {
  const opened = new Date(openedAt);
  const closed = closedAt ? new Date(closedAt) : new Date();
  return Math.floor((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
}

interface GroupInput {
  id: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  usedMinutes: number;
  totalMinutes: number;
  name: string;
  companyName: string;
  salesPersonId: string;
  salesPersonName: string;
}

function calculateDynamicThresholds(groups: GroupInput[]): {
  activityOpenThreshold: number;
  activityCloseThreshold: number;
  minHysteresisBuffer: number;
} {
  const now = new Date();
  const activeGroups = groups.filter(g => {
    if (!g.isActive) return false;
    const start = new Date(g.startDate);
    const end = new Date(g.endDate);
    return now >= start && now <= end;
  });

  // If fewer than 10 groups, use fixed thresholds
  if (activeGroups.length < 10) {
    return {
      activityOpenThreshold: 10,
      activityCloseThreshold: 3,
      minHysteresisBuffer: 5,
    };
  }

  // Calculate utilization differences for all groups
  const diffs = activeGroups.map(g => {
    const expected = calculateExpectedUtilization(g.startDate, g.endDate, 0.75);
    const current = g.usedMinutes / g.totalMinutes;
    return (expected - current) * 100; // positive = behind
  });

  // Use median and stddev
  const sorted = [...diffs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  const stddev = Math.sqrt(diffs.reduce((sum, d) => sum + (d - median) ** 2, 0) / diffs.length);

  // Open threshold: median + 0.5*stddev (but min 7, max 20)
  let openThreshold = Math.max(7, Math.min(20, median + 0.5 * stddev));

  // Close threshold: must be at least 5pp below open threshold
  let closeThreshold = Math.max(2, openThreshold - Math.max(5, stddev * 0.3));

  // Ensure minimum hysteresis buffer of 5pp
  if (openThreshold - closeThreshold < 5) {
    closeThreshold = openThreshold - 5;
  }

  return {
    activityOpenThreshold: Math.round(openThreshold * 10) / 10,
    activityCloseThreshold: Math.round(Math.max(0, closeThreshold) * 10) / 10,
    minHysteresisBuffer: 5,
  };
}

function isCooldownActive(ticket: Ticket): boolean {
  if (ticket.status !== 'closed' || !ticket.closedAt) return false;

  // Upsell tickets: closed only manually, no cooldown (they don't auto-reopen)
  if (ticket.type === 'upsell') {
    return false;
  }

  // Activity and onboarding tickets: closed only automatically, always 14 day cooldown
  const closedDate = new Date(ticket.closedAt);
  const now = new Date();
  const daysSinceClosed = Math.floor((now.getTime() - closedDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceClosed >= 14) return false; // cooldown expired

  // Return true = cooldown IS active (don't reopen)
  return true;
}

export async function generateTickets(): Promise<Ticket[]> {
  const tickets: Ticket[] = [];
  const now = new Date();
  const GROUPS = await fetchGroups();

  // Calculate dynamic thresholds
  const thresholds = calculateDynamicThresholds(GROUPS);

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
    if (daysOld > 30 && utilizationDiff > thresholds.activityOpenThreshold) {
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
        closedReason: undefined,
        lastActivityAt: now.toISOString().split('T')[0],
        daysOpen: 0,
        totalDaysOpen: 0,
        cycleCount: 0,
        cycles: [],
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
        closedReason: undefined,
        lastActivityAt: now.toISOString().split('T')[0],
        daysOpen: 0,
        totalDaysOpen: 0,
        cycleCount: 0,
        cycles: [],
        description,
        utilizationPercent: Math.round(currentUtilization * 100),
        expectedUtilizationPercent: Math.round(expectedUtilization * 100),
        typeLabel: 'Onboarding',
        typeColor: 'blue',
      };
    }

    // UPSELL TICKETS - Lower priority (only if no other ticket)
    // Trigger: after 3 months from start AND good utilization (>65% or >70% of pool used)
    if (
      !ticketToAdd &&
      currentUtilization > 0.65 &&
      (daysOld >= 90 || percentUsed > 70)
    ) {
      // Upsell ticket: good utilization, group mature enough for upsell conversation
      let riskLevel: RiskLevel = 'low_risk';
      let description = '';

      // Two-dimensional risk: utilization % AND time remaining
      if (percentUsed > 85 || (percentUsed > 65 && daysRemaining < 60)) {
        riskLevel = 'critical';
        description = `Upsell: Gorący lead - wykorzystanie ${percentUsed.toFixed(0)}% puli, ${daysRemaining} dni pozostało`;
      } else if (percentUsed > 75 || (percentUsed > 65 && daysRemaining < 120)) {
        riskLevel = 'high_risk';
        description = `Upsell: Ciepły lead - wykorzystanie ${percentUsed.toFixed(0)}% puli, ${daysRemaining} dni pozostało`;
      } else {
        riskLevel = 'low_risk';
        description = `Upsell: Wczesny sygnał - grupa dobrze się rozwija (${percentUsed.toFixed(0)}% puli), okazja na ekspansję`;
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
        closedReason: undefined,
        lastActivityAt: now.toISOString().split('T')[0],
        daysOpen: 0,
        totalDaysOpen: 0,
        cycleCount: 0,
        cycles: [],
        description,
        utilizationPercent: Math.round(currentUtilization * 100),
        expectedUtilizationPercent: Math.round(expectedUtilization * 100),
        typeLabel: 'Upsell',
        typeColor: riskLevel === 'critical' ? 'green' : 'purple',
      };
    }

    // Check ticket history and apply decision matrix
    if (ticketToAdd) {
      const ticketKey = `${ticketToAdd.type}-${group.id}`;

      if (ticketHistoryStore.has(ticketKey)) {
        // Ticket history exists
        const existingTicket = ticketHistoryStore.get(ticketKey)!;

        if (existingTicket.status === 'closed') {
          // Check cooldown
          const cooldownActive = isCooldownActive(existingTicket);
          const panicBreak = utilizationDiff > 15; // panic clause

          if (!cooldownActive || panicBreak) {
            // Reopen: create new cycle
            const newCycle: TicketCycle = {
              openedAt: now.toISOString().split('T')[0],
              daysOpen: 0,
            };
            existingTicket.cycles.push(newCycle);
            existingTicket.status = 'open';
            existingTicket.closedAt = undefined;
            existingTicket.closedReason = undefined;
            existingTicket.cycleCount = existingTicket.cycles.length;
            existingTicket.daysOpen = 0;
            existingTicket.lastActivityAt = now.toISOString().split('T')[0];
            ticketHistoryStore.set(ticketKey, existingTicket);
            tickets.push(existingTicket);
          }
        } else {
          // Ticket is currently open - check close conditions
          let shouldClose = false;
          let closeReason: ClosedReason | null = null;

          if (ticketToAdd.type === 'activity') {
            // ACTIVITY: close only if utilization diff < closeThreshold
            if (utilizationDiff < thresholds.activityCloseThreshold) {
              shouldClose = true;
              closeReason = 'auto_utilization_improved';
            }
          } else if (ticketToAdd.type === 'onboarding') {
            // ONBOARDING: auto-close if >30 days old OR utilization > 30% of expected
            if (daysOld > 30 || currentUtilization > expectedUtilization * 0.3) {
              shouldClose = true;
              closeReason = 'auto_onboarding_completed';
            }
          }

          if (shouldClose && closeReason) {
            // Close current cycle
            const currentCycle = existingTicket.cycles[existingTicket.cycles.length - 1];
            if (currentCycle) {
              currentCycle.closedAt = now.toISOString().split('T')[0];
              currentCycle.closedReason = closeReason;
              currentCycle.daysOpen = calculateDaysOpen(currentCycle.openedAt, currentCycle.closedAt);
            }

            existingTicket.status = 'closed';
            existingTicket.closedAt = now.toISOString().split('T')[0];
            existingTicket.closedReason = closeReason;
            existingTicket.daysOpen = 0;
            existingTicket.lastActivityAt = now.toISOString().split('T')[0];

            // Calculate total days open
            existingTicket.totalDaysOpen = existingTicket.cycles.reduce((sum, c) => sum + c.daysOpen, 0);

            ticketHistoryStore.set(ticketKey, existingTicket);
          } else {
            // Keep open, update days and activity
            const currentCycle = existingTicket.cycles[existingTicket.cycles.length - 1];
            if (currentCycle) {
              currentCycle.daysOpen = calculateDaysOpen(currentCycle.openedAt);
            }
            existingTicket.daysOpen = currentCycle ? currentCycle.daysOpen : 0;
            existingTicket.lastActivityAt = now.toISOString().split('T')[0];
            ticketHistoryStore.set(ticketKey, existingTicket);
            tickets.push(existingTicket);
          }
        }
      } else {
        // New ticket - create first cycle
        const firstCycle: TicketCycle = {
          openedAt: now.toISOString().split('T')[0],
          daysOpen: 0,
        };
        ticketToAdd.cycles = [firstCycle];
        ticketToAdd.cycleCount = 1;
        ticketToAdd.daysOpen = 0;
        ticketToAdd.totalDaysOpen = 0;

        // Check if should immediately auto-close
        let shouldAutoClose = false;
        let autoCloseReason: ClosedReason | null = null;

        if (ticketToAdd.type === 'activity') {
          if (utilizationDiff < thresholds.activityCloseThreshold) {
            shouldAutoClose = true;
            autoCloseReason = 'auto_utilization_improved';
          }
        } else if (ticketToAdd.type === 'onboarding') {
          if (daysOld > 30 || currentUtilization > expectedUtilization * 0.3) {
            shouldAutoClose = true;
            autoCloseReason = 'auto_onboarding_completed';
          }
        }

        if (shouldAutoClose && autoCloseReason) {
          firstCycle.closedAt = now.toISOString().split('T')[0];
          firstCycle.closedReason = autoCloseReason;
          firstCycle.daysOpen = 0;
          ticketToAdd.status = 'closed';
          ticketToAdd.closedAt = now.toISOString().split('T')[0];
          ticketToAdd.closedReason = autoCloseReason;
          ticketToAdd.totalDaysOpen = 0;
        }

        ticketHistoryStore.set(ticketKey, ticketToAdd);
        if (ticketToAdd.status === 'open') {
          tickets.push(ticketToAdd);
        }
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
  // Only upsell tickets can be closed manually
  if (ticket.type !== 'upsell') {
    throw new Error(`Ręczne zamykanie jest dostępne tylko dla ticketów upsell. Typ ticketu: ${ticket.type}`);
  }

  const now = new Date();
  const closedReason: ClosedReason = reason === 'upsell_won' ? 'manual_upsell_won' : reason === 'upsell_lost' ? 'manual_upsell_lost' : 'manual';

  // Find and update the ticket in history
  const ticketKey = `${ticket.type}-${ticket.groupId}`;
  let ticketToClose = ticketHistoryStore.get(ticketKey);

  if (!ticketToClose) {
    // Create a new entry if it doesn't exist
    ticketToClose = { ...ticket };
    if (ticketToClose.cycles.length === 0) {
      ticketToClose.cycles = [{
        openedAt: ticket.createdAt,
        daysOpen: 0,
      }];
    }
  }

  // Close current cycle
  const currentCycle = ticketToClose.cycles[ticketToClose.cycles.length - 1];
  if (currentCycle && !currentCycle.closedAt) {
    currentCycle.closedAt = now.toISOString().split('T')[0];
    currentCycle.closedReason = closedReason;
    currentCycle.daysOpen = calculateDaysOpen(currentCycle.openedAt, currentCycle.closedAt);
  }

  ticketToClose.status = 'closed';
  ticketToClose.closedAt = now.toISOString().split('T')[0];
  ticketToClose.closedReason = closedReason;
  ticketToClose.daysOpen = 0;

  // Calculate total days open
  ticketToClose.totalDaysOpen = ticketToClose.cycles.reduce((sum, c) => sum + c.daysOpen, 0);

  ticketHistoryStore.set(ticketKey, ticketToClose);

  return ticketToClose as ClosedTicket;
}

export function getClosedTickets(): ClosedTicket[] {
  const closed: ClosedTicket[] = [];
  ticketHistoryStore.forEach((ticket) => {
    if (ticket.status === 'closed') {
      closed.push(ticket as ClosedTicket);
    }
  });
  return closed.sort((a, b) => {
    const aDate = a.closedAt ? new Date(a.closedAt).getTime() : 0;
    const bDate = b.closedAt ? new Date(b.closedAt).getTime() : 0;
    return bDate - aDate;
  });
}

export function getClosedTicketsByGroup(groupId: string): ClosedTicket[] {
  const closed: ClosedTicket[] = [];
  ticketHistoryStore.forEach((ticket) => {
    if (ticket.groupId === groupId && ticket.status === 'closed') {
      closed.push(ticket as ClosedTicket);
    }
  });
  return closed.sort((a, b) => {
    const aDate = a.closedAt ? new Date(a.closedAt).getTime() : 0;
    const bDate = b.closedAt ? new Date(b.closedAt).getTime() : 0;
    return bDate - aDate;
  });
}

export function getTicketHistory(groupId: string): Ticket[] {
  const history: Ticket[] = [];
  ticketHistoryStore.forEach((ticket) => {
    if (ticket.groupId === groupId) {
      history.push(ticket);
    }
  });
  return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
