import { fetchGroups } from './data';

export type RiskLevel = 'low_risk' | 'high_risk' | 'critical';
export type TicketStatus = 'open' | 'closed';

export interface Ticket {
  id: string;
  groupId: string;
  groupName: string;
  companyName: string;
  salesPersonId: string;
  riskLevel: RiskLevel;
  status: TicketStatus;
  createdAt: string;
  closedAt?: string;
  lastActivityAt: string;
  daysOpen: number;
  description: string;
  utilizationPercent: number;
  expectedUtilizationPercent: number;
}

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

function calculateRiskLevel(
  currentUtilization: number,
  expectedUtilization: number
): RiskLevel {
  const difference = expectedUtilization - currentUtilization;

  if (difference > 0.25) return 'critical';
  if (difference > 0.1) return 'high_risk';
  return 'low_risk';
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

    const riskLevel = calculateRiskLevel(currentUtilization, expectedUtilization);

    // Only create tickets if there's actual risk (below expected trajectory)
    if (riskLevel === 'low_risk' && currentUtilization > 0.7) continue;

    // Calculate days since group start or last 30 days if older
    const daysOpen = Math.min(
      Math.ceil((now.getTime() - groupStart.getTime()) / (1000 * 60 * 60 * 24)),
      30
    );

    let description = '';
    if (riskLevel === 'critical') {
      description = `Zagrożenie: wykorzystanie wynosi ${(currentUtilization * 100).toFixed(0)}%, a oczekiwane to ${(expectedUtilization * 100).toFixed(0)}%`;
    } else if (riskLevel === 'high_risk') {
      description = `Ostrzeżenie: wykorzystanie spada poniżej oczekiwanego. Obecny poziom ${(currentUtilization * 100).toFixed(0)}%`;
    } else {
      description = `Monitorowanie: wykorzystanie jest niższe niż oczekiwane`;
    }

    tickets.push({
      id: `tkt${group.id}`,
      groupId: group.id,
      groupName: group.name,
      companyName: group.companyName,
      salesPersonId: group.salesPersonId,
      riskLevel,
      status: 'open',
      createdAt: groupStart.toISOString().split('T')[0],
      lastActivityAt: now.toISOString().split('T')[0],
      daysOpen,
      description,
      utilizationPercent: Math.round(currentUtilization * 100),
      expectedUtilizationPercent: Math.round(expectedUtilization * 100),
    });
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
