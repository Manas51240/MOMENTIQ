import { NextRequest, NextResponse } from 'next/server';
import { GuestService } from '@/services/guest-service';
import { apiRateLimiter } from '@/lib/security/rate-limiter';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'direct';
    const rateCheck = apiRateLimiter.check(`rsvp_get_${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const { code } = await params;
    const invitation = await GuestService.publicGetInvitation(code);

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Unable to locate invitation'
    );
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'direct';
    const rateCheck = apiRateLimiter.check(`rsvp_post_${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please wait before retrying.' },
        { status: 429 }
      );
    }

    const { code } = await params;
    const body = await req.json();

    const result = await GuestService.publicSubmitRsvp(code, body);

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to submit RSVP response'
    );
    return NextResponse.json(body, { status });
  }
}
