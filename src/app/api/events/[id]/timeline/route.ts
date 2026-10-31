import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { TimelineService } from '@/services/timeline-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const timeline = await TimelineService.getTimelineOverview(auth.user.id, id);
    return NextResponse.json({
      success: true,
      timeline,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to fetch timeline overview'
    );
    return NextResponse.json(body, { status });
  }
}

