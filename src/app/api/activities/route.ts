import { NextRequest, NextResponse } from 'next/server';
import {
  addActivity,
  getActivitiesByTicketId,
  getActivitiesByGroupId,
  getActivityStats,
  getAllActivities,
} from '@/lib/activities';

export async function GET(request: NextRequest) {
  try {
    // Get user from token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    let userRole = '';
    let fullName = '';
    let salesPersonName = '';

    if (token) {
      try {
        const decoded = JSON.parse(
          Buffer.from(token, 'base64').toString('utf-8')
        );
        userRole = decoded.role;
        fullName = decoded.fullName || '';
        salesPersonName = decoded.fullName || '';
      } catch (e) {
        // Invalid token
      }
    }

    // Check if user is authenticated
    if (!fullName) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get('ticketId');
    const groupId = searchParams.get('groupId');

    let activities = [];

    if (ticketId) {
      activities = getActivitiesByTicketId(ticketId);
    } else if (groupId) {
      activities = getActivitiesByGroupId(groupId);
    } else {
      // Return all activities
      activities = getAllActivities();
    }

    // Sort newest first
    activities = activities.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      activities,
      total: activities.length,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    let fullName = '';
    let salesPersonName = '';

    if (token) {
      try {
        const decoded = JSON.parse(
          Buffer.from(token, 'base64').toString('utf-8')
        );
        fullName = decoded.fullName || '';
        salesPersonName = decoded.fullName || '';
      } catch (e) {
        // Invalid token
      }
    }

    // Check if user is authenticated
    if (!fullName || !salesPersonName) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { ticketId, groupId, type, note } = body;

    // Validate required fields
    if (!ticketId || !groupId || !type || !note) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól' },
        { status: 400 }
      );
    }

    // Validate activity type
    if (!['phone', 'email', 'meeting'].includes(type)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ aktywności' },
        { status: 400 }
      );
    }

    // Validate note length
    if (typeof note !== 'string' || note.trim().length < 3) {
      return NextResponse.json(
        { error: 'Notatka musi mieć co najmniej 3 znaki' },
        { status: 400 }
      );
    }

    // Add activity
    const activity = addActivity(
      ticketId,
      groupId,
      salesPersonName,
      type,
      note.trim(),
      fullName
    );

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
