import { NextResponse } from 'next/server';
import { VendorService } from '@/services/vendor-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET() {
  try {
    const categories = await VendorService.listCategories();
    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to fetch vendor categories'
    );
    return NextResponse.json(body, { status });
  }
}

