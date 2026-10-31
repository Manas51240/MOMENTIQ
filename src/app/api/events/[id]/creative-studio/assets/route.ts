import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { CreativeStudioService } from '@/services/creative-studio-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const category = req.nextUrl.searchParams.get('category') || undefined;

    const assets = await CreativeStudioService.listAssets(id, auth.user.id, category);

    return NextResponse.json({
      success: true,
      assets,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to fetch creative assets'
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

    const asset = await CreativeStudioService.saveAsset(id, auth.user.id, body);

    return NextResponse.json(
      {
        success: true,
        asset,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to save approved creative asset'
    );
    return NextResponse.json(body, { status });
  }
}
