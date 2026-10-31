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

    const data = await CollaborationService.getNotifications(auth.user.id, id);
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch notifications');
    return NextResponse.json(body, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const body = await req.json();

    if (!body.notificationId) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing notificationId', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    const updated = await CollaborationService.markNotificationRead(auth.user.id, body.notificationId);
    return NextResponse.json({
      success: true,
      notification: updated,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to update notification');
    return NextResponse.json(body, { status });
  }
}
