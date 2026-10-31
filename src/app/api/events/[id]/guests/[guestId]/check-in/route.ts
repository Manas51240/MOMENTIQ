import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { GuestService } from '@/services/guest-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, guestId } = await params;
    const body = await req.json().catch(() => ({ checkedIn: true }));
    const checkedIn = body.checkedIn !== undefined ? Boolean(body.checkedIn) : true;

    const guest = await GuestService.checkInGuest(auth.user.id, id, guestId, checkedIn);

    return NextResponse.json({
      success: true,
      guest,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update check-in status'
    );
    return NextResponse.json(body, { status });
  }
}
