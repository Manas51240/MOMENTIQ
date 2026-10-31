import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { DashboardService } from '@/services/dashboard-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const data = await DashboardService.getEventDashboard(auth.user.id, id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch event dashboard');
    return NextResponse.json(body, { status });
  }
}
