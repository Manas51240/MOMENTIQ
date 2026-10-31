import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { BudgetService } from '@/services/budget-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const payment = await BudgetService.recordPayment(auth.user.id, id, body);
    return NextResponse.json(
      {
        success: true,
        payment,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to record payment'
    );
    return NextResponse.json(body, { status });
  }
}

