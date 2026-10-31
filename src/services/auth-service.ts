import db from '@/lib/database';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { createSignedSessionToken } from '@/lib/security/session';
import { authRateLimiter } from '@/lib/security/rate-limiter';
import { registerSchema, loginSchema, passwordResetConfirmSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import crypto from 'crypto';

// In-memory or database token store for password resets
const passwordResetTokens = new Map<string, { email: string; expiresAt: number }>();

export class AuthService {
  /**
   * Registers a new user account.
   */
  static async register(data: z.infer<typeof registerSchema>, clientIp: string = '127.0.0.1') {
    // 1. Rate limiting check
    const rateCheck = authRateLimiter.check(`reg_${clientIp}`);
    if (!rateCheck.allowed) {
      throw new Error('Rate limit exceeded: Too many registration attempts. Please try again later.');
    }

    // 2. Validate input
    const parsed = registerSchema.parse(data);

    // 3. Check for existing email (case-insensitive)
    const existing = await db.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
    });

    if (existing) {
      throw new Error('An account with this email address already exists');
    }

    // 4. Secure password hashing
    const { hash, salt } = await hashPassword(parsed.password);

    // 5. Create user
    const user = await db.user.create({
      data: {
        email: parsed.email.toLowerCase(),
        name: parsed.name,
        passwordHash: hash,
        salt,
        role: 'USER',
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // 6. Create session token
    const token = createSignedSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.userSession.create({
      data: {
        userId: user.id,
        sessionToken: token,
        expiresAt,
        ipAddress: clientIp,
      },
    });

    return {
      user,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Authenticates user with credentials and issues a signed session token.
   */
  static async login(
    data: z.infer<typeof loginSchema>,
    clientIp: string = '127.0.0.1',
    userAgent?: string
  ) {
    // 1. Rate limiting check
    const rateCheck = authRateLimiter.check(`login_${clientIp}`);
    if (!rateCheck.allowed) {
      throw new Error('Rate limit exceeded: Too many login attempts. Please try again later.');
    }

    // 2. Validate input
    const parsed = loginSchema.parse(data);
    const normalizedEmail = parsed.email.toLowerCase();

    // 2b. Account-level brute-force defense (prevents IP-rotation / X-Forwarded-For spoofing bypass)
    const acctRateCheck = authRateLimiter.check(`login_acct_${normalizedEmail}`);
    if (!acctRateCheck.allowed) {
      throw new Error('Rate limit exceeded: Too many login attempts for this account. Please try again later.');
    }

    // 3. Lookup user
    const user = await db.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
    });

    // Defend against timing attacks: Always run password verification
    const dummyHash = '0'.repeat(128);
    const dummySalt = '0'.repeat(32);
    const hashToVerify = user ? user.passwordHash : dummyHash;
    const saltToVerify = user ? user.salt : dummySalt;

    const isValid = await verifyPassword(parsed.password, hashToVerify, saltToVerify);

    if (!user || !isValid) {
      throw new Error('Invalid email or password');
    }

    // 4. Issue new cryptographically signed session token
    const token = createSignedSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.userSession.create({
      data: {
        userId: user.id,
        sessionToken: token,
        expiresAt,
        ipAddress: clientIp,
        userAgent: userAgent || null,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Invalidates and deletes an active session.
   */
  static async logout(sessionToken: string) {
    if (!sessionToken) return;
    await db.userSession.deleteMany({
      where: { sessionToken },
    });
  }

  /**
   * Creates a secure password reset token.
   */
  static async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always succeed superficially to prevent email enumeration
    if (!user) {
      return { success: true, message: 'If an account exists, a reset instructions token was generated' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

    passwordResetTokens.set(resetToken, {
      email: normalizedEmail,
      expiresAt,
    });

    return {
      success: true,
      resetToken, // Returned for testing and development email mocks
      message: 'Password reset token generated successfully',
    };
  }

  /**
   * Completes password reset using a valid reset token.
   */
  static async resetPassword(data: z.infer<typeof passwordResetConfirmSchema>) {
    const parsed = passwordResetConfirmSchema.parse(data);
    const record = passwordResetTokens.get(parsed.token);

    if (!record || Date.now() > record.expiresAt) {
      throw new Error('Invalid or expired password reset token');
    }

    const user = await db.user.findUnique({
      where: { email: record.email },
    });

    if (!user) {
      throw new Error('User account not found');
    }

    // Hash new password
    const { hash, salt } = await hashPassword(parsed.newPassword);

    // Update user password and invalidate all existing active sessions
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hash,
          salt,
        },
      }),
      db.userSession.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Invalidate used reset token
    passwordResetTokens.delete(parsed.token);

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }
}

