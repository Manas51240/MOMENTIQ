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

    const event = await EventService.getEventDetails(auth.user.id, id);
    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch event details');
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const updated = await EventService.updateEvent(auth.user.id, id, body);
    return NextResponse.json({
      success: true,
      event: updated,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to update event');
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

    const result = await EventService.deleteEvent(auth.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to delete event');
    return NextResponse.json(body, { status });
  }
}

