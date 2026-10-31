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
    await params; // Consume params
    const body = await req.json();

    const feedback = await AiEventArchitectService.submitFeedback(
      auth.user.id,
      body
    );

    return NextResponse.json(
      {
        success: true,
        feedback,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to submit AI feedback');
    return NextResponse.json(body, { status });
  }
}

