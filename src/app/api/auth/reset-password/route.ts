import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';
import { passwordResetRequestSchema, passwordResetConfirmSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if ('token' in body) {
      // Confirm password reset
      const parsed = passwordResetConfirmSchema.parse(body);
      const result = await AuthService.resetPassword(parsed);
      return NextResponse.json(result);
    } else {
      // Request password reset
      const parsed = passwordResetRequestSchema.parse(body);
      const result = await AuthService.requestPasswordReset(parsed.email);
      return NextResponse.json(result);
    }
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Password reset operation failed');
    return NextResponse.json(body, { status });
  }
}

