import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { CollaborationService } from '@/services/collaboration-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, memberId } = await params;
    const body = await req.json();

    const updated = await CollaborationService.updateCollaboratorRole(
      auth.user.id,
      id,
      memberId,
      body.role
    );

    return NextResponse.json({
      success: true,
      member: updated,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to update member role');
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, memberId } = await params;

    const result = await CollaborationService.revokeCollaboratorAccess(
      auth.user.id,
      id,
      memberId
    );

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to revoke collaborator');
    return NextResponse.json(body, { status });
  }
}
