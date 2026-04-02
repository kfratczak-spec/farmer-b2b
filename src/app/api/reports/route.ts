import { NextRequest, NextResponse } from 'next/server';
import { generateActivityReport, generatePersonalReport } from '@/lib/reports';
import { getOpenTickets, getClosedTickets } from '@/lib/tickets';
import { getAllActivities } from '@/lib/activities';
import { calculateSalespersonScores } from '@/lib/scoring';

export async function GET(request: NextRequest) {
  try {
    // Get user from headers
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    let userRole = '';
    let fullName = '';

    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        userRole = decoded.role;
        fullName = decoded.fullName || '';
      } catch (e) {
        // Invalid token
      }
    }

    if (!token || !fullName) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'personal'; // 'full' or 'personal'

    // Authorization check
    const isHeadOfSales = userRole === 'head_of_sales';

    if (reportType === 'full' && !isHeadOfSales) {
      return NextResponse.json(
        { error: 'Only head of sales can generate full reports' },
        { status: 403 }
      );
    }

    // Fetch data
    const openTickets = await getOpenTickets();
    const closedTickets = getClosedTickets();
    const allActivities = getAllActivities();
    const scores = calculateSalespersonScores(openTickets, closedTickets, allActivities);

    // Date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const reportData = {
      activities: allActivities,
      openTickets,
      closedTickets,
      scores,
      dateRange: { start: startDate, end: endDate },
    };

    // Generate report
    let buffer: Buffer;
    if (reportType === 'full') {
      buffer = generateActivityReport(reportData);
    } else {
      // Personal report
      buffer = generatePersonalReport(fullName, reportData);
    }

    // Generate filename with current date
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const filename = `raport-farmer-${dateStr}.xlsx`;

    // Return file with proper headers
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
