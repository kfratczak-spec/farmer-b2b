import { NextRequest, NextResponse } from 'next/server';
import { generateTickets, getClosedTickets } from '@/lib/tickets';
import { getAllActivities } from '@/lib/activities';
import { calculateSalespersonScores, SalespersonScore } from '@/lib/scoring';

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

    const allTickets = await generateTickets();
    const allClosedTickets = getClosedTickets();
    const allActivities = getAllActivities();

    // Calculate scores for all salespeople
    let scores = calculateSalespersonScores(allTickets, allClosedTickets, allActivities);

    // Filter based on role
    if (userRole === 'salesperson' && fullName) {
      scores = scores.filter((s) => s.salesPersonName === fullName);
    }

    // Calculate team average
    const teamAverage =
      scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length) * 10) / 10
        : 0;

    return NextResponse.json({
      success: true,
      scores,
      teamAverage,
    });
  } catch (error) {
    console.error('Scoring error:', error);
    return NextResponse.json(
      { error: 'Błąd serwera' },
      { status: 500 }
    );
  }
}
