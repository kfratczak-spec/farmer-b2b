import { NextRequest, NextResponse } from 'next/server';
import { generateTickets, closeTicketManually } from '@/lib/tickets';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  try {
    // Get user from headers for auth check
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    // Validate reason
    const validReasons = ['upsell_won', 'upsell_lost', 'manual'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid close reason' },
        { status: 400 }
      );
    }

    // Get all tickets to find the one being closed
    const tickets = await generateTickets();
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Only upsell tickets can be closed manually
    if (ticket.type !== 'upsell') {
      return NextResponse.json(
        { error: `Ręczne zamykanie jest dostępne tylko dla ticketów upsell. Typ ticketu: ${ticket.type}` },
        { status: 400 }
      );
    }

    // Close the ticket and persist to in-memory store
    const closedTicket = closeTicketManually(ticket, reason);

    return NextResponse.json({
      success: true,
      ticket: closedTicket,
    });
  } catch (error) {
    console.error('Error closing ticket:', error);
    return NextResponse.json(
      { error: 'Failed to close ticket' },
      { status: 500 }
    );
  }
}
