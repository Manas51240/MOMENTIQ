import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { GuestService } from '@/services/guest-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, guestId } = await params;
    const body = await req.json();

    const guest = await GuestService.updateGuest(auth.user.id, id, guestId, body);

    return NextResponse.json({
      success: true,
      guest,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update guest'
    );
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, guestId } = await params;

    const result = await GuestService.deleteGuest(auth.user.id, id, guestId);

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to remove guest'
    );
    return NextResponse.json(body, { status });
  }
}

