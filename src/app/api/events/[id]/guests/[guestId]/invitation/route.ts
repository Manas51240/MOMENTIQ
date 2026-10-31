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
    const body = await req.json();

    if (body.action === 'dispatch') {
      const channel = body.channel || 'EMAIL';
      const result = await GuestService.dispatchInvitation(
        auth.user.id,
        id,
        guestId,
        channel
      );
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Default action: generate wording
    const tone = body.tone || 'CELEBRATORY';
    const invitation = await GuestService.generateInvitationCopy(
      auth.user.id,
      id,
      guestId,
      tone
    );

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to process invitation action'
    );
    return NextResponse.json(body, { status });
  }
}
