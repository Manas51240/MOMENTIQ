import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    const result = await AuthService.register(body, clientIp);

    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        token: result.token,
      },
      { status: 201 }
    );

    // Set HttpOnly, SameSite, Secure Cookie
    response.cookies.set('celebra_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Registration failed');
    return NextResponse.json(body, { status });
  }
}

