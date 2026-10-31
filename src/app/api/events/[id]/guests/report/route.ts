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

    const report = await GuestService.generateAttendanceReport(auth.user.id, id);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to generate attendance report'
    );
    return NextResponse.json(body, { status });
  }
}

