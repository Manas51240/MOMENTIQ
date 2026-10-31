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
    const format = req.nextUrl.searchParams.get('format') || 'csv';

    if (!REPORT_METADATA[type as ReportType]) {
      return NextResponse.json(
        { success: false, error: `Invalid report type: ${type}` },
        { status: 400 }
      );
    }

    if (format === 'pdf') {
      const { filename, mimeType, buffer } = await ReportingService.exportReportPdf(
        auth.user.id,
        id,
        type as ReportType
      );

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } else {
      const { filename, mimeType, content } = await ReportingService.exportReportCsv(
        auth.user.id,
        id,
        type as ReportType
      );

      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to export report');
    return NextResponse.json(body, { status });
  }
}
