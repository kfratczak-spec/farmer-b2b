import { NextRequest, NextResponse } from 'next/server';
import { fetchGroups } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    // Get user from headers (client sends in Authorization header)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    let userRole = '';
    let fullName = '';

    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        userRole = decoded.role;
        fullName = decoded.fullName || '';
      } catch (e) {
        // Invalid token, return empty
      }
    }

    // Fetch real data
    const allGroups = await fetchGroups();

    // Filter groups based on role
    let groups = allGroups;
    if (userRole === 'salesperson' && fullName) {
      groups = allGroups.filter((g) => g.salesPersonName === fullName && g.isActive);
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
