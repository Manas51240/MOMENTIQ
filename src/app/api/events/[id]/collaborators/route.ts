import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { EventService } from '@/services/event-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const collaborators = await EventService.listCollaborators(auth.user.id, id);
    return NextResponse.json({
      success: true,
      ...collaborators,
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

    const member = await EventService.addCollaborator(auth.user.id, id, body);
    return NextResponse.json(
      {
        success: true,
        member,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to add collaborator');
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

    const result = await EventService.removeCollaborator(auth.user.id, id, memberUserId);
    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to remove collaborator');
    return NextResponse.json(body, { status });
  }
}

