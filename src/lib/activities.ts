export type ActivityType = 'phone' | 'email' | 'meeting';

export interface Activity {
  id: string;
  ticketId: string;
  groupId: string;
  salesPersonName: string;
  type: ActivityType;
  note: string;
  createdAt: string; // ISO string
  createdBy: string; // fullName
}

export interface ActivityStats {
  totalActivities: number;
  byType: {
    phone: number;
    email: number;
    meeting: number;
  };
  byPerson: Record<string, number>;
  thisWeek: number;
  thisMonth: number;
}

// Global in-memory store for activities
// Key: ticketId, Value: array of activities
let activitiesStore = new Map<string, Activity[]>();

function generateId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isDateInRange(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days && diffDays >= 0;
}

export function addActivity(
  ticketId: string,
  groupId: string,
  salesPersonName: string,
  type: ActivityType,
  note: string,
  createdBy: string
): Activity {
  const activity: Activity = {
    id: generateId(),
    ticketId,
    groupId,
    salesPersonName,
    type,
    note,
    createdAt: new Date().toISOString(),
    createdBy,
  };

  if (!activitiesStore.has(ticketId)) {
    activitiesStore.set(ticketId, []);
  }

  const ticketActivities = activitiesStore.get(ticketId)!;
  ticketActivities.push(activity);

  return activity;
}

export function getActivitiesByTicketId(ticketId: string): Activity[] {
  return activitiesStore.get(ticketId) || [];
}

export function getActivitiesByGroupId(groupId: string): Activity[] {
  const allActivities: Activity[] = [];

  activitiesStore.forEach((activities) => {
    allActivities.push(
      ...activities.filter((a) => a.groupId === groupId)
    );
  });

  return allActivities.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getActivitiesBySalesperson(salesPersonName: string): Activity[] {
  const allActivities: Activity[] = [];

  activitiesStore.forEach((activities) => {
    allActivities.push(
      ...activities.filter((a) => a.salesPersonName === salesPersonName)
    );
  });

  return allActivities.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getAllActivities(): Activity[] {
  const allActivities: Activity[] = [];

  activitiesStore.forEach((activities) => {
    allActivities.push(...activities);
  });

  return allActivities.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getActivityStats(): ActivityStats {
  const allActivities = getAllActivities();
  const now = new Date();

  const byType = {
    phone: 0,
    email: 0,
    meeting: 0,
  };

  const byPerson: Record<string, number> = {};
  let thisWeekCount = 0;
  let thisMonthCount = 0;

  allActivities.forEach((activity) => {
    // Count by type
    byType[activity.type]++;

    // Count by person
    if (!byPerson[activity.createdBy]) {
      byPerson[activity.createdBy] = 0;
    }
    byPerson[activity.createdBy]++;

    // Count this week (7 days)
    if (isDateInRange(activity.createdAt, 7)) {
      thisWeekCount++;
    }

    // Count this month (30 days)
    if (isDateInRange(activity.createdAt, 30)) {
      thisMonthCount++;
    }
  });

  return {
    totalActivities: allActivities.length,
    byType,
    byPerson,
    thisWeek: thisWeekCount,
    thisMonth: thisMonthCount,
  };
}

export function getActivitiesCountForTicket(ticketId: string): number {
  return getActivitiesByTicketId(ticketId).length;
}

// Demo activity seeding
const salesPersonGroups: Record<string, string[]> = {
  'Anna Nas': ['62ff57788e7b2469103a2f1e', '6913a207aaab0b64bb2227d7'],
  'Róża Donat': ['5d8b46f252faff00016487d0'],
  'Wanda Lizm': ['697cf682f8855e663f1a57e5', '697cc933f8855e663f18eeb2', '69807564bb576d42cb4856c6', '685be2aaf2f3a9249121939a', '688cd9b2069bd02b19ccbabc', '6989df50eb1862425d16e6bd', '68122d80d39da60a7e0c7d0a'],
  'Antoni Ogórkiewicz': ['5fc66b6524aa9a00018abb58'],
  'Stefek Burczymucha': ['690355a22349c11f5fb39777', '687deae64625db0c9951f79c'],
  'Zygzak Mcqueen': ['6195169823729f712f6e4e77'],
  'Anna Conda': ['66d58bdeb5c6eb17cf020f1b', '671b54f929ad0834c691d7ac', '66d59219b5c6eb17cf022625', '66d57528b5c6eb17cf01c53a'],
  'Ewa Boligłowa': ['66d6109fb5c6eb17cf04a41b', '66d5a297b5c6eb17cf029d02'],
  'Roman Tyczny': ['69985db24fe66757bf67e4fe', '6989b970aef99970b2c4d781', '687f8c7c3f812f1e1a4533a1', '698b3bd7845e555869e8a2ab', '68efa7ca6020400d46a6d914', '678e2a721e73432bf2f9aed8', '69985a314fe66757bf67ce5b', '68ed0cb78306dc19ee10236a', '67e4150d34fa600a54bde997'],
  'Maria Pinda': ['6629146e311cdf7025e2e7ff'],
  'Dobrosława Kiełbasa': ['6998408b4fe66757bf6771f1', '6998477f4fe66757bf6788e3', '687f37343f812f1e1a43c115', '68ff2419f0633a62f976ed8f', '687f48133f812f1e1a440744', '688c6059069bd02b19ca69b3', '67c16ec1152f3b09a9613dbe', '68f201ef70043b73454fe639'],
  'Tytus Bomba': ['67f3805d0b26fa58b9b8aa87', '69983dce4fe66757bf6766ab'],
  'Jan Moczymorda': [],
};

const activityNotes = {
  phone: [
    'Rozmowa z decydentem - potencjalne rozszerzenie umowy',
    'Follow-up dotyczący oferty z poprzedniego tygodnia',
    'Omówienie warunków płatności i dostaw',
    'Prezentacja nowych rozwiązań dla klienta',
    'Dyskusja na temat obecnych wyzwań operacyjnych',
    'Negocjacja ceny i warunków umowy',
    'Potwierdzenie terminu spotkania biznesowego',
    'Omówienie szczegółów projektu wdrożeniowego',
    'Rozmowa o budżecie na kolejny rok',
    'Dyskusja dotycząca referencji i case studies',
  ],
  email: [
    'Wysłana propozycja handlowa z ceną',
    'Follow-up: dokumentacja techniczna do oferty',
    'Potwierdzenie umowy i warunków współpracy',
    'Przypomnienie o zaplanowanym spotkaniu',
    'Prezentacja katalogów produktów i usług',
    'Odpowiedź na pytania techniczne klienta',
    'Wysłane materiały marketingowe i broszury',
    'Potwierdzenie otrzymania zamówienia',
    'Aktualizacja statusu realizacji projektu',
    'Udostępnienie linku do webinaru produktowego',
  ],
  meeting: [
    'Spotkanie z zarządem - omówienie strategii',
    'Wizyta u klienta - audyt potrzeb biznesowych',
    'Pracownia strategiczna z zespołem sprzedazy',
    'Spotkanie z dyrektorem finansowym na temat budżetu',
    'Demonstracja produktów w biurze klienta',
    'Kick-off meeting dla nowego projektu',
    'Spotkanie follow-up po prezentacji',
    'Warsztaty szkoleniowe dla zespołu klienta',
    'Negocjacje finalne warunków umowy',
    'Spotkanie podsumowujące rok obrachunkowy',
  ],
};

function getRandomDate(daysBack: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const randomHours = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
  const randomMinutes = Math.floor(Math.random() * 60);

  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  date.setHours(randomHours, randomMinutes, 0, 0);

  // Skip weekends
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

function getRandomActivityType(): ActivityType {
  const rand = Math.random();
  if (rand < 0.4) return 'email';
  if (rand < 0.75) return 'phone';
  return 'meeting';
}

export function seedDemoActivities(): void {
  const salesPeople = Object.keys(salesPersonGroups);
  const activityCounts: Record<string, number> = {
    'Anna Nas': Math.floor(Math.random() * 5) + 5,
    'Róża Donat': Math.floor(Math.random() * 2) + 3,
    'Wanda Lizm': Math.floor(Math.random() * 5) + 15,
    'Antoni Ogórkiewicz': Math.floor(Math.random() * 5) + 5,
    'Stefek Burczymucha': Math.floor(Math.random() * 5) + 5,
    'Zygzak Mcqueen': Math.floor(Math.random() * 5) + 5,
    'Anna Conda': Math.floor(Math.random() * 5) + 5,
    'Ewa Boligłowa': Math.floor(Math.random() * 5) + 5,
    'Roman Tyczny': Math.floor(Math.random() * 5) + 15,
    'Maria Pinda': Math.floor(Math.random() * 5) + 5,
    'Dobrosława Kiełbasa': Math.floor(Math.random() * 3) + 12,
    'Tytus Bomba': Math.floor(Math.random() * 5) + 5,
    'Jan Moczymorda': Math.floor(Math.random() * 3) + 2,
  };

  let ticketCounter = 1;

  salesPeople.forEach((salesPerson) => {
    const groups = salesPersonGroups[salesPerson];
    const count = activityCounts[salesPerson];

    for (let i = 0; i < count; i++) {
      const activityType = getRandomActivityType();
      const groupId = groups.length > 0 ? groups[Math.floor(Math.random() * groups.length)] : 'group-demo';
      const date = getRandomDate(30);
      const ticketId = `tkt-demo-${String(ticketCounter).padStart(3, '0')}`;
      ticketCounter++;

      const notesArray = activityNotes[activityType];
      const note = notesArray[Math.floor(Math.random() * notesArray.length)];

      addActivity(ticketId, groupId, salesPerson, activityType, note, salesPerson);

      // Update the createdAt timestamp to the random date
      const ticketActivities = activitiesStore.get(ticketId)!;
      const lastActivity = ticketActivities[ticketActivities.length - 1];
      lastActivity.createdAt = date.toISOString();
    }
  });
}

// Auto-seed demo activities if store is empty
if (activitiesStore.size === 0) {
  seedDemoActivities();
}
