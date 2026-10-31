import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { GuestService } from '@/services/guest-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const data = await GuestService.listGuests(auth.user.id, id);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to fetch guest list'
    );
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

    const guest = await GuestService.addGuest(auth.user.id, id, body);

    return NextResponse.json(
      {
        success: true,
        guest,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to add guest'
    );
    return NextResponse.json(body, { status });
  }
}

