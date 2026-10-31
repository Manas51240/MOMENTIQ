import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { TimelineService } from '@/services/timeline-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, taskId } = await params;
    const body = await req.json();

    const updated = await TimelineService.updateTask(
      auth.user.id,
      id,
      taskId,
      body
    );

    return NextResponse.json({
      success: true,
      task: updated,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update task'
    );
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, taskId } = await params;

    const result = await TimelineService.deleteTask(auth.user.id, id, taskId);
    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to delete task'
    );
    return NextResponse.json(body, { status });
  }
}

