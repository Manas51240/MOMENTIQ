import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { CreativeStudioService } from '@/services/creative-studio-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const response = await CreativeStudioService.generate(id, auth.user.id, body);

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(
      error,
      'Failed to generate creative concept'
    );
    return NextResponse.json(body, { status });
  }
}
