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
    const body = await req.json();

    const dependency = await TimelineService.addTaskDependency(
      auth.user.id,
      id,
      body.taskId,
      body.dependsOnTaskId
    );

    return NextResponse.json(
      {
        success: true,
        dependency,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to create task dependency'
    );
    return NextResponse.json(body, { status });
  }
}

