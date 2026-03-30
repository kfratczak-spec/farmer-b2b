import { NextRequest, NextResponse } from 'next/server';
import { fetchGroups } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allGroups = await fetchGroups();
    const group = allGroups.find((g) => g.id === id);

    if (!group) {
      return NextResponse.json(
        { error: 'Grupa nie znaleziona' },
        { status: 404 }
      );
    }

    // Verify user has access
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    let userRole = 'salesperson';

    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        userRole = decoded.role;
        const userId = decoded.id;

        if (userRole === 'salesperson' && group.salesPersonId !== userId) {
          return NextResponse.json(
            { error: 'Brak dostępu' },
            { status: 403 }
          );
        }
      } catch (e) {
        // Invalid token
      }
    }

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
