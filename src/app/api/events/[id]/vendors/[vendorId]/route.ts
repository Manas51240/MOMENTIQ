import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { VendorService } from '@/services/vendor-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, vendorId } = await params;
    const body = await req.json();

    const updated = await VendorService.updateVendor(
      auth.user.id,
      id,
      vendorId,
      body
    );

    return NextResponse.json({
      success: true,
      vendor: updated,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update vendor'
    );
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, vendorId } = await params;

    const result = await VendorService.deleteVendor(
      auth.user.id,
      id,
      vendorId
    );

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to delete vendor'
    );
    return NextResponse.json(body, { status });
  }
}

