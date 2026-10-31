import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { BudgetService } from '@/services/budget-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const dashboard = await BudgetService.getFinancialDashboard(auth.user.id, id);
    return NextResponse.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to fetch financial dashboard'
    );
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const updated = await BudgetService.updatePlannedAllocations(
      auth.user.id,
      id,
      body
    );

    return NextResponse.json({
      success: true,
      dashboard: updated,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update budget allocations'
    );
    return NextResponse.json(body, { status });
  }
}

