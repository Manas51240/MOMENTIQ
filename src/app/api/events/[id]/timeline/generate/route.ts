import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { TimelineService } from '@/services/timeline-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const preserveUserEdits = body.preserveUserEdits !== false;
    const result = await TimelineService.generateTimeline(
      auth.user.id,
      id,
      preserveUserEdits
    );

    return NextResponse.json({
      success: true,
      timeline: result,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to generate timeline'
    );
    return NextResponse.json(body, { status });
  }
}

