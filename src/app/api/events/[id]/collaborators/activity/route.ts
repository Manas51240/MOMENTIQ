import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { CollaborationService } from '@/services/collaboration-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 30;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
    const entityType = searchParams.get('entityType') || undefined;

    const feed = await CollaborationService.getActivityFeed(auth.user.id, id, {
      limit,
      offset,
      entityType,
    });

    return NextResponse.json({
      success: true,
      ...feed,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch activity feed');
    return NextResponse.json(body, { status });
  }
}
