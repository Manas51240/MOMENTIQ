import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/lib/database';
import { AuthService } from '../src/services/auth-service';
import { verifySessionToken, createSignedSessionToken } from '../src/lib/security/session';
import { authRateLimiter } from '../src/lib/security/rate-limiter';

describe('AuthService & Cryptographic Security Suite', () => {
  beforeEach(async () => {
    authRateLimiter.reset();
  });

  it('registers a new user with secure password hashing and returns a signed session token', async () => {
    const email = `test_reg_${Date.now()}@example.com`;
    const result = await AuthService.register({
      email,
      name: 'Alice Planner',
      password: 'SecurePassword123!',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe('Alice Planner');
    expect(result.token).toBeDefined();

    // Verify session token signature
    const tokenVerification = verifySessionToken(result.token);
    expect(tokenVerification.valid).toBe(true);

    // Verify password is NOT stored in plaintext
    const dbUser = await db.user.findUnique({ where: { email } });
    expect(dbUser).toBeDefined();
    expect(dbUser?.passwordHash).not.toBe('SecurePassword123!');
    expect(dbUser?.passwordHash.length).toBeGreaterThan(60);
    expect(dbUser?.salt).toBeDefined();
  });

  it('rejects duplicate email registrations', async () => {
    const email = `dup_${Date.now()}@example.com`;
    await AuthService.register({
      email,
      name: 'User One',
      password: 'SecurePassword123!',
    });

    await expect(
      AuthService.register({
        email,
        name: 'User Duplicate',
        password: 'AnotherPassword123!',
      })
    ).rejects.toThrow(/already exists/);
  });

  it('rejects passwords failing complexity requirements (min 8 chars, uppercase, lowercase, number, symbol)', async () => {
    const email = `weak_${Date.now()}@example.com`;

    // Too short
    await expect(
      AuthService.register({
        email,
        name: 'Weak User',
        password: 'short',
      })
    ).rejects.toThrow();

    // Missing symbol
    await expect(
      AuthService.register({
        email,
        name: 'Weak User',
        password: 'Password1234',
      })
    ).rejects.toThrow(/special character/);
  });

  it('authenticates valid credentials and rejects invalid passwords', async () => {
    const email = `login_${Date.now()}@example.com`;
    await AuthService.register({
      email,
      name: 'Bob Organizer',
      password: 'StrongPassword123!',
    });

    // Valid login
    const loginSuccess = await AuthService.login({
      email,
      password: 'StrongPassword123!',
    });

    expect(loginSuccess.user.email).toBe(email);
    expect(verifySessionToken(loginSuccess.token).valid).toBe(true);

    // Invalid login attempt
    await expect(
      AuthService.login({
        email,
        password: 'WrongPassword999!',
      })
    ).rejects.toThrow(/Invalid email or password/);
  });

  it('invalidates sessions upon logout', async () => {
    const email = `logout_${Date.now()}@example.com`;
    const reg = await AuthService.register({
      email,
      name: 'Charlie Logout',
      password: 'StrongPassword123!',
    });

    // Verify session exists in DB
    const sessionBefore = await db.userSession.findUnique({
      where: { sessionToken: reg.token },
    });
    expect(sessionBefore).toBeDefined();

    // Perform logout
    await AuthService.logout(reg.token);

    // Session must no longer exist in DB
    const sessionAfter = await db.userSession.findUnique({
      where: { sessionToken: reg.token },
    });
    expect(sessionAfter).toBeNull();
  });

  it('handles password reset requests and password updates', async () => {
    const email = `reset_${Date.now()}@example.com`;
    await AuthService.register({
      email,
      name: 'David Reset',
      password: 'InitialPassword123!',
    });

    // Request reset
    const resetReq = await AuthService.requestPasswordReset(email);
    expect(resetReq.success).toBe(true);
    expect(resetReq.resetToken).toBeDefined();

    // Confirm reset
    const confirmRes = await AuthService.resetPassword({
      token: resetReq.resetToken!,
      newPassword: 'NewPassword123!',
    });
    expect(confirmRes.success).toBe(true);

    // Old password must fail
    await expect(
      AuthService.login({
        email,
        password: 'InitialPassword123!',
      })
    ).rejects.toThrow(/Invalid email or password/);

    // New password must succeed
    const newLogin = await AuthService.login({
      email,
      password: 'NewPassword123!',
    });
    expect(newLogin.user.email).toBe(email);
  });

  it('fails closed in production if SESSION_SECRET is not configured', () => {
    const env = process.env as Record<string, string | undefined>;
    const originalEnv = env.NODE_ENV;
    const originalSecret = env.SESSION_SECRET;

    try {
      env.NODE_ENV = 'production';
      delete env.SESSION_SECRET;

      expect(() => {
        createSignedSessionToken();
      }).toThrow(/\[SECURITY CONFIGURATION ERROR\]/);
    } finally {
      env.NODE_ENV = originalEnv;
      env.SESSION_SECRET = originalSecret;
    }
  });

  it('detects tampered session token signatures', () => {
    const validToken = createSignedSessionToken();
    const parts = validToken.split('.');
    // Tamper with session identifier
    const tampered = `${parts[0]}_forged.${parts[1]}.${parts[2]}`;
    const result = verifySessionToken(tampered);
    expect(result.valid).toBe(false);
  });
});

