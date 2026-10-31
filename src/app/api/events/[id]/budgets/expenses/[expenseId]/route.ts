import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { BudgetService } from '@/services/budget-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, expenseId } = await params;
    const body = await req.json();

    const updated = await BudgetService.updateExpense(
      auth.user.id,
      id,
      expenseId,
      body
    );

    return NextResponse.json({
      success: true,
      expense: updated,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update expense'
    );
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, expenseId } = await params;

    const result = await BudgetService.deleteExpense(
      auth.user.id,
      id,
      expenseId
    );

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to delete expense'
    );
    return NextResponse.json(body, { status });
  }
}

