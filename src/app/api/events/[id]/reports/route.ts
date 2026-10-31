import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authorizeEventAccess } from '@/lib/security/auth-middleware';
import { REPORT_METADATA, ReportType } from '@/services/reporting-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    await authorizeEventAccess(auth.user.id, id, 'EVENT_VIEW');

    const reports = Object.entries(REPORT_METADATA).map(([type, meta]) => ({
      type: type as ReportType,
      title: meta.title,
      description: meta.description,
      availableFormats: ['csv', 'pdf'],
    }));

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch available reports');
    return NextResponse.json(body, { status });
  }
}
