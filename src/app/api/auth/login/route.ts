import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await AuthService.login(body, clientIp, userAgent);

    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    };

    response.cookies.set('momentiq_session', result.token, cookieOptions);
    response.cookies.set('celebra_session', result.token, cookieOptions);

    return response;
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Login failed');
    return NextResponse.json(body, { status });
  }
}

