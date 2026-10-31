import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { AiEventArchitectService } from '@/services/ai-event-architect-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const result = await AiEventArchitectService.approveAndApplyPlan(
      auth.user.id,
      id,
      body.approvedPlan || body
    );

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to apply approved AI event plan'
    );
    return NextResponse.json(body, { status });
  }
}

