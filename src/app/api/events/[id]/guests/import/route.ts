import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { GuestService } from '@/services/guest-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    let csvContent = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      csvContent = body.csvText || '';
    } else {
      csvContent = await req.text();
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV content cannot be empty' },
        { status: 400 }
      );
    }

    const result = await GuestService.importGuestsFromCsv(auth.user.id, id, csvContent);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to import guest list CSV'
    );
    return NextResponse.json(body, { status });
  }
}

