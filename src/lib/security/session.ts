import crypto from 'crypto';

// ==============================================================================
// MOMENTIQ — Cryptographic Session Token Generation & Verification
// ASVS Level 2: HMAC-SHA256 Signed Tokens, Timing-Safe Comparison & Expiry
// ==============================================================================

const TOKEN_PREFIX = 'ses_';
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[SECURITY CONFIGURATION ERROR] Missing required SESSION_SECRET in production mode. Refusing to boot with insecure fallback secret.'
      );
    }
    return 'momentiq_dev_fallback_secret_not_for_production_min_64_chars_length_1234567890';
  }
  return secret;
}

export interface SessionVerificationResult {
  valid: boolean;
  sessionId?: string;
  expiresAt?: number;
  expired?: boolean;
  error?: string;
}

/**
 * Creates a cryptographically signed session token.
 * Format: ses_<randomBytes>.<expiresAtTimestamp>.<hmacSignature>
 */
export function createSignedSessionToken(
  customExpiryMs: number = DEFAULT_EXPIRY_MS,
  customSessionId?: string
): string {
  const secret = getSessionSecret();
  const sessionId = customSessionId || `${TOKEN_PREFIX}${crypto.randomBytes(24).toString('hex')}`;
  const expiresAt = Date.now() + customExpiryMs;
  const payload = `${sessionId}.${expiresAt}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token.
 * Defends against signature tampering, token forgery, and expired sessions.
 */
export function verifySessionToken(token: string | null | undefined): SessionVerificationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid type' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [sessionId, expiresAtStr, signature] = parts;
  if (!sessionId.startsWith(TOKEN_PREFIX)) {
    return { valid: false, error: 'Invalid session ID format' };
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) {
    return { valid: false, error: 'Invalid expiration timestamp' };
  }

  // Check expiration
  if (Date.now() > expiresAt) {
    return { valid: false, expired: true, error: 'Session expired' };
  }

  // Recalculate HMAC signature
  try {
    const secret = getSessionSecret();
    const payload = `${sessionId}.${expiresAtStr}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    if (!isValid) {
      return { valid: false, error: 'Signature verification failed (tampered token)' };
    }

    return {
      valid: true,
      sessionId,
      expiresAt,
    };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

