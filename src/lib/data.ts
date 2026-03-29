export interface DailyUsage {
  date: string;
  minutes: number;
}

export interface Group {
  id: string;
  name: string;
  companyName: string;
  salesPersonId: string;
  totalMinutes: number;
  usedMinutes: number;
  startDate: string;
  endDate: string;
  dailyUsage: DailyUsage[];
  hrManager: {
    name: string;
    email: string;
    phone: string;
  };
  isActive: boolean;
}

export interface Salesperson {
  id: string;
  firstName: string;
  lastName: string;
  role: 'salesperson' | 'head_of_sales';
}

const salespeople: Salesperson[] = [
  { id: 'sp1', firstName: 'Andrzej', lastName: 'Nowak', role: 'salesperson' },
  { id: 'sp2', firstName: 'Barbara', lastName: 'Kowalski', role: 'salesperson' },
  { id: 'sp3', firstName: 'Czesław', lastName: 'Lewandowski', role: 'salesperson' },
  { id: 'sp4', firstName: 'Danuta', lastName: 'Wójcik', role: 'salesperson' },
  { id: 'sp5', firstName: 'Ewa', lastName: 'Kamiński', role: 'salesperson' },
  { id: 'sp6', firstName: 'Franciszek', lastName: 'Szymański', role: 'salesperson' },
];

const companyNames = [
  'PKO Bank Polski',
  'PGNiG',
  'KGHM Polska Miedź',
  'Orlen',
  'ZE PAK',
  'Pekao Bank',
  'Asseco Poland',
  'Computer Associates',
  'Plus Telecommunications',
  'Play Communications',
  'mBank',
  'Millennium Bank',
  'Deutsche Telekom Poland',
  'TP Link Poland',
  'Orange Polska',
  'Cyfrowy Polsat',
  'TVP',
  'PKNORLEN',
  'Dalkia Polska',
  'GE Poland',
  'Unilever Polska',
  'Nestlé Polska',
  'PepsiCo Polska',
  'Colgate-Palmolive',
  'Procter & Gamble',
  'Roche Diagnostics',
  'Johnson & Johnson',
  'Sanofi Pasteur',
  'Astrazeneca Poland',
  'GSK Poland',
  'Pfizer Polska',
  'Merck Sharp Dohme',
  'Novartis Polska',
  'Eli Lilly',
  'Toyota Motor',
  'Volkswagen Poznań',
  'BMW Poland',
  'Mercedes-Benz',
  'Audi Hungaria',
  'Bosch',
  'Siemens',
  'ABB Poland',
  'Eaton Poland',
  'Schneider Electric',
  'Philips Poland',
  'LG Electronics',
  'Samsung Poland',
  'Sony Poland',
  'Canon',
  'Xerox',
  'HP Poland',
  'Dell Technologies',
  'Lenovo Poland',
];

const hrManagers = [
  { name: 'Maria Schmidt', email: 'm.schmidt@company.pl', phone: '+48 22 123 4567' },
  { name: 'Piotr Górski', email: 'p.gorski@company.pl', phone: '+48 31 456 7890' },
  { name: 'Katarzyna Michalska', email: 'k.michalska@company.pl', phone: '+48 12 789 0123' },
  { name: 'Tomasz Zieliński', email: 't.zielinski@company.pl', phone: '+48 42 345 6789' },
  { name: 'Joanna Sikora', email: 'j.sikora@company.pl', phone: '+48 58 901 2345' },
  { name: 'Robert Czarnecki', email: 'r.czarnecki@company.pl', phone: '+48 61 567 8901' },
  { name: 'Anna Kowal', email: 'a.kowal@company.pl', phone: '+48 71 234 5678' },
  { name: 'Marcin Filipiak', email: 'm.filipiak@company.pl', phone: '+48 17 890 1234' },
];

function generateDailyUsage(
  startDate: Date,
  endDate: Date,
  totalMinutes: number,
  utilizationPattern: 'good' | 'declining' | 'critical' | 'completed'
): DailyUsage[] {
  const usage: DailyUsage[] = [];
  let currentDate = new Date(startDate);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let accumulatedMinutes = 0;

  while (currentDate < endDate) {
    let dailyMinutes = 0;

    if (utilizationPattern === 'good') {
      // Consistent, steady usage - aiming for 80%+ utilization
      const targetDaily = (totalMinutes * 0.8) / dayCount;
      dailyMinutes = Math.round(targetDaily * (0.8 + Math.random() * 0.4));
    } else if (utilizationPattern === 'declining') {
      // Started well but declined over time
      const daysElapsed = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const declineRatio = Math.max(0.2, 1 - (daysElapsed / dayCount) * 0.7);
      const targetDaily = (totalMinutes * 0.6) / dayCount;
      dailyMinutes = Math.round(targetDaily * declineRatio * (0.8 + Math.random() * 0.4));
    } else if (utilizationPattern === 'critical') {
      // Very low usage
      dailyMinutes = Math.round((totalMinutes * 0.3) / dayCount * (0.5 + Math.random() * 0.5));
    } else if (utilizationPattern === 'completed') {
      // High usage to reach 85%+
      const targetDaily = (totalMinutes * 0.88) / dayCount;
      dailyMinutes = Math.round(targetDaily * (0.9 + Math.random() * 0.2));
    }

    accumulatedMinutes += dailyMinutes;
    usage.push({
      date: currentDate.toISOString().split('T')[0],
      minutes: dailyMinutes,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Cap total to not exceed totalMinutes
  if (accumulatedMinutes > totalMinutes) {
    const ratio = totalMinutes / accumulatedMinutes;
    return usage.map(u => ({
      ...u,
      minutes: Math.round(u.minutes * ratio),
    }));
  }

  return usage;
}

function createGroups(): Group[] {
  const groups: Group[] = [];
  const patterns: ('good' | 'declining' | 'critical' | 'completed')[] = [
    'good',
    'declining',
    'critical',
    'completed',
  ];
  let groupId = 1;

  // Create ~50 groups distributed across 6 salespeople
  const groupsPerSalesperson = Math.floor(50 / 6);
  const remainder = 50 % 6;

  for (let spIdx = 0; spIdx < salespeople.length; spIdx++) {
    const count = spIdx < remainder ? groupsPerSalesperson + 1 : groupsPerSalesperson;

    for (let i = 0; i < count; i++) {
      const totalMinutes = Math.floor(Math.random() * 19000) + 1000;
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      // Mix of active (mostly) and completed groups
      const isActive = Math.random() > 0.2;

      // Start dates spread across 2025-2026
      const startMonthOffset = Math.floor(Math.random() * 12);
      const startDate = new Date(2025, startMonthOffset, Math.floor(Math.random() * 20) + 1);

      // End dates are 3-12 months after start
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (Math.floor(Math.random() * 9) + 3));

      const now = new Date('2026-03-29');
      const actualEndDate = isActive ? new Date(now.getFullYear(), now.getMonth() + 3) : endDate;

      const dailyUsage = generateDailyUsage(startDate, actualEndDate, totalMinutes, pattern);
      const usedMinutes = dailyUsage.reduce((sum, du) => sum + du.minutes, 0);

      const hrManager = hrManagers[Math.floor(Math.random() * hrManagers.length)];
      const companyName = companyNames[groupId % companyNames.length];

      groups.push({
        id: `grp${groupId}`,
        name: `Pakiet ${groupId} - ${companyName}`,
        companyName,
        salesPersonId: salespeople[spIdx].id,
        totalMinutes,
        usedMinutes,
        startDate: startDate.toISOString().split('T')[0],
        endDate: actualEndDate.toISOString().split('T')[0],
        dailyUsage,
        hrManager,
        isActive,
      });

      groupId++;
    }
  }

  return groups;
}

export const SALESPEOPLE = salespeople;
export const GROUPS = createGroups();
