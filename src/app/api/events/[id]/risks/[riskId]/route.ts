import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { RiskService } from '@/services/risk-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, riskId } = await params;
    const body = await req.json();

    const risk = await RiskService.updateRisk(auth.user.id, id, riskId, body);

    return NextResponse.json({
      success: true,
      risk,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update risk'
    );
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, riskId } = await params;

    const result = await RiskService.deleteRisk(auth.user.id, id, riskId);

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to delete risk record'
    );
    return NextResponse.json(body, { status });
  }
}
