import * as XLSX from 'xlsx';
import { Ticket, ClosedTicket } from './tickets';
import { Activity } from './activities';
import { SalespersonScore } from './scoring';

interface ReportData {
  activities: Activity[];
  openTickets: Ticket[];
  closedTickets: ClosedTicket[];
  scores: SalespersonScore[];
  dateRange: { start: Date; end: Date };
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatActivityType(type: string): string {
  const types: Record<string, string> = {
    phone: 'Telefon',
    email: 'Email',
    meeting: 'Spotkanie',
  };
  return types[type] || type;
}

function formatTicketType(type: string): string {
  const types: Record<string, string> = {
    onboarding: 'Onboarding',
    activity: 'Aktywność',
    upsell: 'Upsell',
  };
  return types[type] || type;
}

function formatTicketStatus(status: string): string {
  const statuses: Record<string, string> = {
    open: 'Otwarty',
    closed: 'Zamknięty',
  };
  return statuses[status] || status;
}

function formatRiskLevel(riskLevel: string): string {
  const levels: Record<string, string> = {
    low_risk: 'Niskie',
    high_risk: 'Wysokie',
    critical: 'Krytyczne',
  };
  return levels[riskLevel] || riskLevel;
}

function formatClosedReason(reason: string): string {
  const reasons: Record<string, string> = {
    auto_utilization_improved: 'Auto: Wykorzystanie poprawiło się',
    auto_onboarding_completed: 'Auto: Onboarding ukończony',
    manual_upsell_won: 'Ręcznie: Upsell wygrany',
    manual_upsell_lost: 'Ręcznie: Upsell przegrany',
    manual: 'Ręcznie: Zamknięty',
  };
  return reasons[reason] || reason;
}

export function generateActivityReport(data: ReportData): Buffer {
  const workbook = XLSX.utils.book_new();

  // 1. SUMMARY SHEET
  const summaryData: any[] = [
    ['Raport podsumowania aktywności'],
    [],
    ['Okres raportu'],
    [
      'Od:',
      formatDate(data.dateRange.start),
    ],
    [
      'Do:',
      formatDate(data.dateRange.end),
    ],
    [],
    ['OGÓLNE STATYSTYKI'],
    ['Całkowita liczba aktywności', data.activities.length],
    ['Aktywności - Telefon', data.activities.filter(a => a.type === 'phone').length],
    ['Aktywności - Email', data.activities.filter(a => a.type === 'email').length],
    ['Aktywności - Spotkanie', data.activities.filter(a => a.type === 'meeting').length],
    [],
    ['TICKETY'],
    ['Tickety otwarte', data.openTickets.length],
    ['Tickety zamknięte', data.closedTickets.length],
    ['Razem tickety', data.openTickets.length + data.closedTickets.length],
    [],
    ['AKTYWNOŚCI PO HANDLOWCU'],
  ];

  // Add activities by salesperson
  const activityBySalesperson: Record<string, number> = {};
  data.activities.forEach(a => {
    activityBySalesperson[a.salesPersonName] = (activityBySalesperson[a.salesPersonName] || 0) + 1;
  });

  Object.entries(activityBySalesperson).forEach(([name, count]) => {
    summaryData.push([name, count]);
  });

  summaryData.push([]);
  summaryData.push(['TICKETY PO HANDLOWCU']);

  // Add tickets by salesperson
  const ticketBySalesperson: Record<string, number> = {};
  [...data.openTickets, ...data.closedTickets].forEach(t => {
    ticketBySalesperson[t.salesPersonName] = (ticketBySalesperson[t.salesPersonName] || 0) + 1;
  });

  Object.entries(ticketBySalesperson).forEach(([name, count]) => {
    summaryData.push([name, count]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Podsumowanie');

  // 2. ACTIVITIES SHEET
  const activitiesData: any[] = [
    ['Data', 'Handlowiec', 'Typ', 'Ticket', 'Grupa', 'Firma', 'Notatka'],
  ];

  data.activities.forEach(activity => {
    const ticket = [...data.openTickets, ...data.closedTickets].find(t => t.id === activity.ticketId);
    activitiesData.push([
      formatDate(activity.createdAt),
      activity.salesPersonName,
      formatActivityType(activity.type),
      activity.ticketId,
      activity.groupId,
      ticket?.companyName || '',
      activity.note,
    ]);
  });

  const activitiesSheet = XLSX.utils.aoa_to_sheet(activitiesData);
  activitiesSheet['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 25 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, activitiesSheet, 'Aktywności');

  // 3. SCORING SHEET
  const scoringData: any[] = [
    ['Pozycja', 'Handlowiec', 'Score', 'Czas reakcji', 'Rozwiązane', 'Regularność', 'Upsell', 'Liczba aktywności'],
  ];

  data.scores.forEach((score, index) => {
    scoringData.push([
      index + 1,
      score.salesPersonName,
      score.totalScore,
      `${score.avgReactionDays} dni`,
      score.resolvedTickets,
      score.regularityScore,
      score.upsellScore,
      score.totalActivities,
    ]);
  });

  const scoringSheet = XLSX.utils.aoa_to_sheet(scoringData);
  scoringSheet['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 8 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, scoringSheet, 'Scoring');

  // 4. TICKETS SHEET
  const allTickets = [...data.openTickets, ...data.closedTickets];
  const ticketsData: any[] = [
    ['ID', 'Typ', 'Firma', 'Grupa', 'Handlowiec', 'Status', 'Priorytet', 'Wykorzystanie', 'Oczekiwane', 'Dni otwarte', 'Powód zamknięcia'],
  ];

  allTickets.forEach(ticket => {
    const closedTicket = data.closedTickets.find(t => t.id === ticket.id);
    ticketsData.push([
      ticket.id,
      formatTicketType(ticket.type),
      ticket.companyName,
      ticket.groupName,
      ticket.salesPersonName,
      formatTicketStatus(ticket.status),
      formatRiskLevel(ticket.riskLevel),
      `${ticket.utilizationPercent}%`,
      `${ticket.expectedUtilizationPercent}%`,
      ticket.daysOpen,
      closedTicket ? formatClosedReason(closedTicket.closedReason) : '',
    ]);
  });

  const ticketsSheet = XLSX.utils.aoa_to_sheet(ticketsData);
  ticketsSheet['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, ticketsSheet, 'Tickety');

  // Write to buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function generatePersonalReport(
  salesPersonName: string,
  data: ReportData
): Buffer {
  // Filter data for this salesperson
  const personActivities = data.activities.filter(a => a.salesPersonName === salesPersonName);
  const personOpenTickets = data.openTickets.filter(t => t.salesPersonName === salesPersonName);
  const personClosedTickets = data.closedTickets.filter(t => t.salesPersonName === salesPersonName);
  const personScore = data.scores.find(s => s.salesPersonName === salesPersonName);

  const workbook = XLSX.utils.book_new();

  // 1. SUMMARY SHEET
  const summaryData: any[] = [
    [`Raport osobisty: ${salesPersonName}`],
    [],
    ['Okres raportu'],
    [
      'Od:',
      formatDate(data.dateRange.start),
    ],
    [
      'Do:',
      formatDate(data.dateRange.end),
    ],
    [],
    ['OGÓLNE STATYSTYKI'],
    ['Całkowita liczba aktywności', personActivities.length],
    ['Aktywności - Telefon', personActivities.filter(a => a.type === 'phone').length],
    ['Aktywności - Email', personActivities.filter(a => a.type === 'email').length],
    ['Aktywności - Spotkanie', personActivities.filter(a => a.type === 'meeting').length],
    [],
    ['TICKETY'],
    ['Tickety otwarte', personOpenTickets.length],
    ['Tickety zamknięte', personClosedTickets.length],
    ['Razem tickety', personOpenTickets.length + personClosedTickets.length],
    [],
    ['WYNIK INDYWIDUALNY'],
  ];

  if (personScore) {
    summaryData.push(
      ['Całkowity score', personScore.totalScore],
      ['Czas reakcji', `${personScore.avgReactionDays} dni`],
      ['Rozwiązane tickety', personScore.resolvedTickets],
      ['Regularność', personScore.regularityScore],
      ['Upsell', personScore.upsellScore],
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Podsumowanie');

  // 2. ACTIVITIES SHEET
  const activitiesData: any[] = [
    ['Data', 'Typ', 'Ticket', 'Grupa', 'Firma', 'Notatka'],
  ];

  personActivities.forEach(activity => {
    const ticket = [...personOpenTickets, ...personClosedTickets].find(t => t.id === activity.ticketId);
    activitiesData.push([
      formatDate(activity.createdAt),
      formatActivityType(activity.type),
      activity.ticketId,
      activity.groupId,
      ticket?.companyName || '',
      activity.note,
    ]);
  });

  const activitiesSheet = XLSX.utils.aoa_to_sheet(activitiesData);
  activitiesSheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 25 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, activitiesSheet, 'Aktywności');

  // 3. TICKETS SHEET
  const allPersonTickets = [...personOpenTickets, ...personClosedTickets];
  const ticketsData: any[] = [
    ['ID', 'Typ', 'Firma', 'Grupa', 'Status', 'Priorytet', 'Wykorzystanie', 'Oczekiwane', 'Dni otwarte', 'Powód zamknięcia'],
  ];

  allPersonTickets.forEach(ticket => {
    const closedTicket = personClosedTickets.find(t => t.id === ticket.id);
    ticketsData.push([
      ticket.id,
      formatTicketType(ticket.type),
      ticket.companyName,
      ticket.groupName,
      formatTicketStatus(ticket.status),
      formatRiskLevel(ticket.riskLevel),
      `${ticket.utilizationPercent}%`,
      `${ticket.expectedUtilizationPercent}%`,
      ticket.daysOpen,
      closedTicket ? formatClosedReason(closedTicket.closedReason) : '',
    ]);
  });

  const ticketsSheet = XLSX.utils.aoa_to_sheet(ticketsData);
  ticketsSheet['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, ticketsSheet, 'Tickety');

  // Write to buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
