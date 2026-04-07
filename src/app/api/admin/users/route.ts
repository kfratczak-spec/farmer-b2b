import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, addUser, updateUserRole, toggleUserStatus, UserRole } from '@/lib/users';

function getTokenData(request: NextRequest): { isAdmin: boolean; fullName: string } | null {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return {
      isAdmin: decoded.isAdmin === true || decoded.role === 'head_of_sales',
      fullName: decoded.fullName || '',
    };
  } catch {
    return null;
  }
}

// GET: list all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const tokenData = getTokenData(request);
    if (!tokenData || !tokenData.isAdmin) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      users: users.sort((a, b) => {
        // Admins first, then active before inactive, then alphabetical
        if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      }),
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      inactive: users.filter(u => u.status === 'inactive').length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

// POST: add new user or update existing
export async function POST(request: NextRequest) {
  try {
    const tokenData = getTokenData(request);
    if (!tokenData || !tokenData.isAdmin) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'add') {
      const { email, fullName, role } = body;

      if (!email || !fullName || !role) {
        return NextResponse.json({ error: 'Wszystkie pola są wymagane' }, { status: 400 });
      }

      if (!['admin', 'salesperson'].includes(role)) {
        return NextResponse.json({ error: 'Nieprawidłowa rola' }, { status: 400 });
      }

      try {
        const newUser = await addUser(email, fullName, role as UserRole, tokenData.fullName);
        return NextResponse.json({ success: true, user: newUser });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Błąd dodawania użytkownika';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (action === 'updateRole') {
      const { userId, role } = body;
      if (!userId || !role || !['admin', 'salesperson'].includes(role)) {
        return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 });
      }

      const updated = await updateUserRole(userId, role as UserRole);
      if (!updated) {
        return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404 });
      }
      return NextResponse.json({ success: true, user: updated });
    }

    if (action === 'toggleStatus') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ error: 'Brak ID użytkownika' }, { status: 400 });
      }

      const updated = await toggleUserStatus(userId);
      if (!updated) {
        return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404 });
      }
      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
