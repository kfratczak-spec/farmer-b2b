export interface DailyUsage {
  date: string;
  minutes: number;
}

export interface Group {
  id: string;
  name: string;
  companyName: string;
  salesPersonId: string;
  salesPersonName: string;
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

const CSV_URLS = {
  validgroup: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQh4Z62z-rQvNN_F5nwv3T-5HKu72UvuSPtaxn_NVH5cNgogU3c0TkO3G_85290bBbQ95AQC0Hsh6K9/pub?gid=87092747&single=true&output=csv',
  talksession: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQh4Z62z-rQvNN_F5nwv3T-5HKu72UvuSPtaxn_NVH5cNgogU3c0TkO3G_85290bBbQ95AQC0Hsh6K9/pub?gid=1064918157&single=true&output=csv',
};

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const cache: { [key: string]: CacheEntry } = {};

function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current);
    result.push(row);
  }

  return result;
}

async function fetchCSV(url: string): Promise<string> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching CSV:', error);
    throw error;
  }
}

interface ValidgroupRow {
  id: string;
  created: string;
  secondsavailable: string;
  secondsused: string;
  second_to_used: string;
  name: string;
  internalname: string;
  validuntil: string;
  salesmanid: string;
  hr_manager_name: string;
  hr_manager_email: string;
  hr_manager_phone: string;
  salesperson_name: string;
}

async function parseValidgroupData(): Promise<ValidgroupRow[]> {
  const csvText = await fetchCSV(CSV_URLS.validgroup);
  const rows = parseCSV(csvText);

  if (rows.length < 2) return [];

  const headers = rows[0];
  const data: ValidgroupRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 14 || !row[0].trim()) continue;

    data.push({
      id: row[0].trim(),
      created: row[1].trim(),
      secondsavailable: row[2].trim(),
      secondsused: row[3].trim(),
      second_to_used: row[4].trim(),
      name: row[5].trim(),
      internalname: row[6].trim(),
      validuntil: row[7].trim(),
      salesmanid: row[9].trim(),
      hr_manager_name: row[10].trim(),
      hr_manager_email: row[11].trim(),
      hr_manager_phone: row[12].trim(),
      salesperson_name: row[13].trim().replace(/^\s+/, ''),
    });
  }

  return data;
}

interface TalksessionRow {
  usersgroupid: string;
  start_pl: string;
  duration_min: string;
}

async function parseTalksessionData(): Promise<TalksessionRow[]> {
  const csvText = await fetchCSV(CSV_URLS.talksession);
  const rows = parseCSV(csvText);

  if (rows.length < 2) return [];

  const data: TalksessionRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row[0].trim()) continue;

    data.push({
      usersgroupid: row[0].trim(),
      start_pl: row[1].trim(),
      duration_min: row[2].trim(),
    });
  }

  return data;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return '';

  dateStr = dateStr.trim();

  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return '';
}

function isGroupActive(endDate: string): boolean {
  const now = new Date();
  const end = new Date(endDate);
  return end > now;
}

async function buildGroups(): Promise<Group[]> {
  const validgroupData = await parseValidgroupData();
  const talksessionData = await parseTalksessionData();

  const groups: Group[] = [];
  const uniqueSalespeople = new Set<string>();

  const talksessionByGroup: { [key: string]: DailyUsage[] } = {};
  for (const session of talksessionData) {
    const groupId = session.usersgroupid;
    const date = parseDate(session.start_pl);
    const minutes = parseInt(session.duration_min) || 0;

    if (!talksessionByGroup[groupId]) {
      talksessionByGroup[groupId] = [];
    }

    const existing = talksessionByGroup[groupId].find(du => du.date === date);
    if (existing) {
      existing.minutes += minutes;
    } else {
      talksessionByGroup[groupId].push({ date, minutes });
    }
  }

  for (const vg of validgroupData) {
    const startDate = parseDate(vg.created);
    const endDate = parseDate(vg.validuntil);

    if (!startDate || !endDate) continue;

    const totalSeconds = parseInt(vg.second_to_used) || 0;
    const usedSeconds = parseInt(vg.secondsused) || 0;

    const totalMinutes = Math.round(totalSeconds / 60);
    const usedMinutes = Math.round(usedSeconds / 60);

    const isActive = isGroupActive(endDate);

    const dailyUsage = talksessionByGroup[vg.id] || [];
    dailyUsage.sort((a, b) => a.date.localeCompare(b.date));

    const salesPersonName = vg.salesperson_name.trim();
    uniqueSalespeople.add(salesPersonName);

    groups.push({
      id: vg.id,
      name: vg.name,
      companyName: vg.name,
      salesPersonId: vg.salesmanid,
      salesPersonName: salesPersonName,
      totalMinutes,
      usedMinutes,
      startDate,
      endDate,
      dailyUsage,
      hrManager: {
        name: vg.hr_manager_name,
        email: vg.hr_manager_email,
        phone: vg.hr_manager_phone,
      },
      isActive,
    });
  }

  return groups;
}

export function getSalespeopleFromData(): Salesperson[] {
  const realSalespeople = [
    'Anna Nas',
    'Róża Donat',
    'Wanda Lizm',
    'Piotr Pan',
    'Antoni Ogórkiewicz',
    'Stefek Burczymucha',
    'Zygzak Mcqueen',
    'Anna Conda',
    'Ewa Boligłowa',
    'Roman Tyczny',
    'Maria Pinda',
    'Dobrosława Kiełbasa',
    'Tytus Bomba',
    'Jan Moczymorda',
  ];

  const salespeople: Salesperson[] = realSalespeople.map((name, idx) => {
    const parts = name.trim().split(' ');
    return {
      id: `sp${idx + 1}`,
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
      role: 'salesperson',
    };
  });

  return salespeople;
}

export async function fetchGroups(): Promise<Group[]> {
  const cacheKey = 'groups';
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  const groups = await buildGroups();
  cache[cacheKey] = { data: groups, timestamp: now };
  return groups;
}

export async function getProcessedData() {
  return {
    groups: await fetchGroups(),
    salespeople: getSalespeopleFromData(),
  };
}

export const SALESPEOPLE = getSalespeopleFromData();
