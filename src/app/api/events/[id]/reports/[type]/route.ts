import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { ReportingService, ReportType, REPORT_METADATA } from '@/services/reporting-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, type } = await params;

    if (!REPORT_METADATA[type as ReportType]) {
      return NextResponse.json(
        { success: false, error: `Invalid report type: ${type}` },
        { status: 400 }
      );
    }

    const data = await ReportingService.getReportData(auth.user.id, id, type as ReportType);

    return NextResponse.json({
      success: true,
      report: data,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch report data');
    return NextResponse.json(body, { status });
  }
}
