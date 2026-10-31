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

    const data = await CollaborationService.listCollaboratorsAndInvites(auth.user.id, id);
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch collaborators');
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const result = await CollaborationService.inviteCollaborator(auth.user.id, id, body);
    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to invite collaborator');
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const memberUserId = searchParams.get('userId');

    if (!memberUserId) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing userId query parameter', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    const result = await CollaborationService.revokeCollaboratorAccess(auth.user.id, id, memberUserId);
    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to revoke collaborator access');
    return NextResponse.json(body, { status });
  }
}
