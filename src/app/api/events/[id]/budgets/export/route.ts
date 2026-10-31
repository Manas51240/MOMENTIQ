import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { BudgetService } from '@/services/budget-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const csvContent = await BudgetService.generateFinancialReportCsv(auth.user.id, id);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="celebra_event_${id}_financial_report.csv"`,
      },
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to export financial report'
    );
    return NextResponse.json(body, { status });
  }
}

