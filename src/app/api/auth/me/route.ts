import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security/auth-middleware';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: auth.user,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Authentication required');
    return NextResponse.json(body, { status });
  }
}

