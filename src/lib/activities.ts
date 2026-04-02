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
