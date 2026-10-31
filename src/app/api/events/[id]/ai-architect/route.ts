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

    // Check if single-section regeneration was requested
    if (body.sectionName) {
      const result = await AiEventArchitectService.regenerateSection(
        auth.user.id,
        id,
        body.sectionName,
        body.input
      );
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Default: Full 12-section master plan generation
    const result = await AiEventArchitectService.generatePlan(
      auth.user.id,
      id,
      body.input || body
    );

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'AI Event Architect generation failed');
    return NextResponse.json(body, { status });
  }
}

