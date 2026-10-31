import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { VendorService } from '@/services/vendor-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;

    const data = await VendorService.getVendorComparisonMatrix(
      auth.user.id,
      id,
      categoryId
    );

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to fetch vendors and quotation comparisons'
    );
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const vendor = await VendorService.registerVendor(auth.user.id, id, body);
    return NextResponse.json(
      {
        success: true,
        vendor,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to register vendor'
    );
    return NextResponse.json(body, { status });
  }
}

