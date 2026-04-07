import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsers, updateLastLogin } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, password } = body;

    // Password is always "tutlo"
    if (password !== 'tutlo') {
      return NextResponse.json(
        { error: 'Nieprawidłowe hasło' },
        { status: 401 }
      );
    }

    // Find active user by fullName
    const users = await getActiveUsers();
    const user = users.find(u => u.fullName === fullName);

    if (!user) {
      return NextResponse.json(
        { error: 'Użytkownik nie znaleziony lub nieaktywny' },
        { status: 401 }
      );
    }

    // Map role for backward compatibility
    const tokenRole = user.role === 'admin' ? 'head_of_sales' : 'salesperson';

    const token = Buffer.from(
      JSON.stringify({
        id: user.id,
        role: tokenRole,
        fullName: user.fullName,
        email: user.email,
        isAdmin: user.role === 'admin',
      })
    ).toString('base64');

    // Update last login
    await updateLastLogin(user.fullName);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: tokenRole,
        isAdmin: user.role === 'admin',
      },
      token,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}

// GET: return list of active users for login page dropdown
export async function GET() {
  try {
    const users = await getActiveUsers();
    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        fullName: u.fullName,
        role: u.role === 'admin' ? 'head_of_sales' : 'salesperson',
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
