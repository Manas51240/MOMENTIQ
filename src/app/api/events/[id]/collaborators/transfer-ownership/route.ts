import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { CollaborationService } from '@/services/collaboration-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    if (!body.newOwnerUserId) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing newOwnerUserId in request body', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    const result = await CollaborationService.transferOwnership(
      auth.user.id,
      id,
      body.newOwnerUserId
    );

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to transfer event ownership');
    return NextResponse.json(body, { status });
  }
}
