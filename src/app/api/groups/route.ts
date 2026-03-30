import { NextRequest, NextResponse } from 'next/server';
import { fetchGroups } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    // Get user from headers (client sends in Authorization header)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    let userId = '';
    let userRole = '';

    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        userId = decoded.id;
        userRole = decoded.role;
      } catch (e) {
        // Invalid token, return empty
      }
    }

    // Fetch real data
    const allGroups = await fetchGroups();

    // Filter groups based on role
    let groups = allGroups;
    if (userRole === 'salesperson') {
      groups = allGroups.filter((g) => g.salesPersonId === userId && g.isActive);
    } else {
      groups = allGroups.filter((g) => g.isActive);
    }

    return NextResponse.json({
      success: true,
      groups,
      total: groups.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
