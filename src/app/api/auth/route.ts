import { NextRequest, NextResponse } from 'next/server';
import { SALESPEOPLE } from '@/lib/data';

const HEAD_OF_SALES = {
  firstName: 'Jan',
  lastName: 'Administrator',
  role: 'head_of_sales',
  id: 'admin',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, password } = body;

    // Password is always "tutlo"
    if (password !== 'tutlo') {
      return NextResponse.json(
        { error: 'Nieprawidłowe hasło' },
        { status: 401 }
      );
    }

    // Check if it's the head of sales
    if (firstName === HEAD_OF_SALES.firstName && lastName === HEAD_OF_SALES.lastName) {
      const token = Buffer.from(
        JSON.stringify({ id: HEAD_OF_SALES.id, role: HEAD_OF_SALES.role })
      ).toString('base64');

      return NextResponse.json({
        success: true,
        user: HEAD_OF_SALES,
        token,
      });
    }

    // Check if it's a salesperson
    const salesperson = SALESPEOPLE.find(
      (sp) => sp.firstName === firstName && sp.lastName === lastName
    );

    if (!salesperson) {
      return NextResponse.json(
        { error: 'Użytkownik nie znaleziony' },
        { status: 401 }
      );
    }

    const token = Buffer.from(
      JSON.stringify({ id: salesperson.id, role: salesperson.role })
    ).toString('base64');

    return NextResponse.json({
      success: true,
      user: {
        id: salesperson.id,
        firstName: salesperson.firstName,
        lastName: salesperson.lastName,
        role: salesperson.role,
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
