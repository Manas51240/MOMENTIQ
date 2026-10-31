import { describe, it, expect } from 'vitest';
import { GET as healthHandler } from '../src/app/api/health/route';
import { sanitizeSensitiveString, formatSafeErrorResponse } from '../src/lib/security/error-sanitizer';
import { SlidingWindowRateLimiter } from '../src/lib/security/rate-limiter';

describe('Health Check, Error Sanitization & Rate Limiter Security Suite', () => {
  it('returns valid health diagnostics and database connectivity from /api/health', async () => {
    const response = await healthHandler();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe('pass');
    expect(json.version).toBe('1.0.0');
    expect(json.checks.database.status).toBe('healthy');
    expect(json.metrics.totalLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('sanitizes database URIs, passwords, and API keys from error messages', () => {
    const rawError =
      'Failed connecting to postgresql://admin:SuperSecretPassword123@db.internal.celebra.com:5432/celebra_prod with key AIzaSyA1234567890abcdefghijklmnopqrstuv';
    const sanitized = sanitizeSensitiveString(rawError);

    expect(sanitized).not.toContain('postgresql://');
    expect(sanitized).not.toContain('SuperSecretPassword123');
    expect(sanitized).not.toContain('AIzaSyA1234567890abcdefghijklmnopqrstuv');
    expect(sanitized).toContain('[REDACTED_SENSITIVE_INFO]');
  });

  it('formats standardized, safe client error payloads with correlated request IDs', () => {
    const { body, status } = formatSafeErrorResponse(
      new Error('Access denied: You do not have access to this event'),
      'Forbidden'
    );

    expect(status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.requestId).toMatch(/^req_/);
    expect(body.error.message).toContain('You do not have permission');
  });

  it('enforces sliding window rate limits and resets correctly', () => {
    const limiter = new SlidingWindowRateLimiter(1000, 3); // 3 requests per 1000ms

    expect(limiter.check('ip_1').allowed).toBe(true);
    expect(limiter.check('ip_1').allowed).toBe(true);
    expect(limiter.check('ip_1').allowed).toBe(true);

    // 4th request must be blocked
    const fourth = limiter.check('ip_1');
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.resetMs).toBeGreaterThan(0);

    // Another IP must remain unaffected (IP isolation)
    expect(limiter.check('ip_2').allowed).toBe(true);
  });
});

