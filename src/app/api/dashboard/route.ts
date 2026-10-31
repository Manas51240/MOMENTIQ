import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { DashboardService } from '@/services/dashboard-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const telemetry = await DashboardService.getUserDashboard(auth.user.id);

    return NextResponse.json({
      success: true,
      dashboard: telemetry,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch dashboard telemetry');
    return NextResponse.json(body, { status });
  }
}
