import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { AiEventArchitectService } from '@/services/ai-event-architect-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const history = await AiEventArchitectService.getGenerationHistory(auth.user.id, id);
    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to fetch AI generation history'
    );
    return NextResponse.json(body, { status });
  }
}

