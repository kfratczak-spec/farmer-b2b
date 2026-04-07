import { kv } from '@vercel/kv';

export type UserRole = 'admin' | 'salesperson';
export type UserStatus = 'active' | 'inactive';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  createdBy: string;     // admin who created this user
  lastLoginAt?: string;
}

const KV_USERS_KEY = 'farmer-b2b:users';

// Check if KV is available (env vars set)
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Fallback in-memory store for local dev / when KV not configured
let inMemoryUsers: AppUser[] | null = null;

function getDefaultUsers(): AppUser[] {
  return [
    { id: 'u1', email: 'admin@tutlo.pl', fullName: 'Konrad Frątczak', role: 'admin', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u2', email: 'anna.nas@tutlo.pl', fullName: 'Anna Nas', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u3', email: 'roza.donat@tutlo.pl', fullName: 'Róża Donat', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u4', email: 'wanda.lizm@tutlo.pl', fullName: 'Wanda Lizm', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u5', email: 'piotr.pan@tutlo.pl', fullName: 'Piotr Pan', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u6', email: 'antoni.ogorki@tutlo.pl', fullName: 'Antoni Ogórkiewicz', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u7', email: 'stefek.burczy@tutlo.pl', fullName: 'Stefek Burczymucha', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u8', email: 'zygzak.mcqueen@tutlo.pl', fullName: 'Zygzak Mcqueen', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u9', email: 'anna.conda@tutlo.pl', fullName: 'Anna Conda', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u10', email: 'ewa.boliglowa@tutlo.pl', fullName: 'Ewa Boligłowa', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u11', email: 'roman.tyczny@tutlo.pl', fullName: 'Roman Tyczny', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u12', email: 'maria.pinda@tutlo.pl', fullName: 'Maria Pinda', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u13', email: 'dobra.kielbasa@tutlo.pl', fullName: 'Dobrosława Kiełbasa', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u14', email: 'tytus.bomba@tutlo.pl', fullName: 'Tytus Bomba', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
    { id: 'u15', email: 'jan.moczymorda@tutlo.pl', fullName: 'Jan Moczymorda', role: 'salesperson', status: 'active', createdAt: '2026-01-01', createdBy: 'system' },
  ];
}

// Get all users
export async function getAllUsers(): Promise<AppUser[]> {
  if (isKVAvailable()) {
    try {
      const users = await kv.get<AppUser[]>(KV_USERS_KEY);
      if (users && users.length > 0) return users;
      // First time: seed with defaults
      const defaults = getDefaultUsers();
      await kv.set(KV_USERS_KEY, defaults);
      return defaults;
    } catch (error) {
      console.error('KV error, falling back to in-memory:', error);
    }
  }

  // Fallback: in-memory
  if (!inMemoryUsers) {
    inMemoryUsers = getDefaultUsers();
  }
  return inMemoryUsers;
}

// Save all users
async function saveUsers(users: AppUser[]): Promise<void> {
  if (isKVAvailable()) {
    try {
      await kv.set(KV_USERS_KEY, users);
    } catch (error) {
      console.error('Failed to save users to KV:', error);
      throw new Error('Nie udało się zapisać zmian');
    }
  }
  inMemoryUsers = users;
}

// Get active users (for login page)
export async function getActiveUsers(): Promise<AppUser[]> {
  const users = await getAllUsers();
  return users.filter(u => u.status === 'active');
}

// Get user by fullName (for auth compatibility)
export async function getUserByFullName(fullName: string): Promise<AppUser | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.fullName === fullName && u.status === 'active');
}

// Get user by email
export async function getUserByEmail(email: string): Promise<AppUser | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.email === email);
}

// Add new user
export async function addUser(
  email: string,
  fullName: string,
  role: UserRole,
  createdBy: string
): Promise<AppUser> {
  const users = await getAllUsers();

  // Check for duplicate email
  if (users.find(u => u.email === email)) {
    throw new Error('Użytkownik z tym adresem email już istnieje');
  }

  // Check for duplicate fullName
  if (users.find(u => u.fullName === fullName)) {
    throw new Error('Użytkownik o tym imieniu i nazwisku już istnieje');
  }

  const newUser: AppUser = {
    id: `u${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    email,
    fullName,
    role,
    status: 'active',
    createdAt: new Date().toISOString().split('T')[0],
    createdBy,
  };

  users.push(newUser);
  await saveUsers(users);
  return newUser;
}

// Update user role
export async function updateUserRole(userId: string, newRole: UserRole): Promise<AppUser | null> {
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  user.role = newRole;
  await saveUsers(users);
  return user;
}

// Toggle user status (activate/deactivate)
export async function toggleUserStatus(userId: string): Promise<AppUser | null> {
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  user.status = user.status === 'active' ? 'inactive' : 'active';
  await saveUsers(users);
  return user;
}

// Update last login
export async function updateLastLogin(fullName: string): Promise<void> {
  const users = await getAllUsers();
  const user = users.find(u => u.fullName === fullName);
  if (user) {
    user.lastLoginAt = new Date().toISOString().split('T')[0];
    await saveUsers(users);
  }
}
