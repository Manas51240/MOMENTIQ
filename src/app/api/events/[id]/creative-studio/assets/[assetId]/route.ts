import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { CreativeStudioService } from '@/services/creative-studio-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, assetId } = await params;
    const body = await req.json();

    const asset = await CreativeStudioService.updateAsset(id, auth.user.id, assetId, body);

    return NextResponse.json({
      success: true,
      asset,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to update creative asset'
    );
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id, assetId } = await params;

    const result = await CreativeStudioService.deleteAsset(id, auth.user.id, assetId);

    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to delete creative asset'
    );
    return NextResponse.json(body, { status });
  }
}
