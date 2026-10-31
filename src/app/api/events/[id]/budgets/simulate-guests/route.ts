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

    const newGuestCount = parseInt(body.newGuestCount, 10);
    if (isNaN(newGuestCount) || newGuestCount <= 0) {
      return NextResponse.json(
        { success: false, error: { message: 'newGuestCount must be a positive integer', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const simulation = await BudgetService.simulateGuestCountAdjustment(
      auth.user.id,
      id,
      newGuestCount
    );

    return NextResponse.json({
      success: true,
      simulation,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to simulate guest count adjustment'
    );
    return NextResponse.json(body, { status });
  }
}

