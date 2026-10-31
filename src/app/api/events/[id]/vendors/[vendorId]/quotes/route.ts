import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { VendorService } from '@/services/vendor-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, vendorId } = await params;
    const body = await req.json();

    const quote = await VendorService.addVendorQuote(
      auth.user.id,
      id,
      vendorId,
      body
    );

    return NextResponse.json(
      {
        success: true,
        quote,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to add vendor quotation'
    );
    return NextResponse.json(body, { status });
  }
}

