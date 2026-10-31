import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get('momentiq_session')?.value || req.cookies.get('celebra_session')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (token) {
      await AuthService.logout(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.delete('momentiq_session');
    response.cookies.delete('celebra_session');

    return response;
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Logout failed');
    return NextResponse.json(body, { status });
  }
}

