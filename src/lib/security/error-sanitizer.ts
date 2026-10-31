import crypto from 'crypto';

// ==============================================================================
// CELEBRA — Centralized Error Sanitizer & Secure Response Formatter
// ASVS Level 2: Prevention of Information Exposure through Errors
// ==============================================================================

export interface SafeErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    requestId: string;
    details?: unknown;
  };
}

const SENSITIVE_PATTERNS = [
  /postgres(ql)?:\/\/[^\s]+/gi,
  /file:\/\/[^\s]+/gi,
  /bearer\s+[a-z0-9_\-\.]+/gi,
  /session_secret[^\s,;]+/gi,
  /gemini_api_key[^\s,;]+/gi,
  /password[=:][^\s,;]+/gi,
  /aiza[0-9a-z\-_]{35}/gi,
  /AQ\.[0-9a-zA-Z_\-\.]{30,}/gi,
];

/**
 * Strips secrets, database URIs, API keys, and stack internals from strings.
 */
export function sanitizeSensitiveString(input: string): string {
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SENSITIVE_INFO]');
  }
  return sanitized;
}

/**
 * Formats a clean, safe JSON error payload for client consumption.
 */
export function formatSafeErrorResponse(
  error: unknown,
  fallbackMessage: string = 'An unexpected server error occurred',
  fallbackCode: string = 'INTERNAL_ERROR',
  details?: unknown
): { body: SafeErrorResponse; status: number } {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  let message = fallbackMessage;
  let code = fallbackCode;
  let status = 500;

  if (error instanceof Error) {
    // Check known application error types
    if (error.name === 'ZodError') {
      message = 'Request validation failed';
      code = 'VALIDATION_ERROR';
      status = 400;
    } else if (error instanceof SyntaxError || error.message.includes('JSON') || error.message.includes('Unexpected token')) {
      message = 'Malformed request payload';
      code = 'MALFORMED_PAYLOAD';
      status = 400;
    } else if (error.message.includes('File storage security violation') || error.message.includes('Path traversal')) {
      message = error.message;
      code = 'SECURITY_POLICY_VIOLATION';
      status = 400;
    } else if (error.message.includes('Malicious prompt injection')) {
      message = error.message;
      code = 'PROMPT_INJECTION_DETECTED';
      status = 400;
    } else if (error.message.includes('Unauthorized') || error.message.includes('Authentication required')) {
      message = 'Authentication required';
      code = 'UNAUTHORIZED';
      status = 401;
    } else if (error.message.includes('Forbidden') || error.message.includes('Access denied')) {
      message = 'You do not have permission to access this resource';
      code = 'FORBIDDEN';
      status = 403;
    } else if (error.message.includes('Not found')) {
      message = error.message;
      code = 'NOT_FOUND';
      status = 404;
    } else if (error.message.includes('Rate limit')) {
      message = 'Too many requests. Please try again later.';
      code = 'RATE_LIMITED';
      status = 429;
    } else if (process.env.NODE_ENV !== 'production') {
      message = sanitizeSensitiveString(error.message);
    }
  }

  // Safe logging in dev / audit log
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Celebra Error] [${requestId}] ${code}:`, error);
  }

  return {
    body: {
      success: false,
      error: {
        message,
        code,
        requestId,
        details: details ? details : undefined,
      },
    },
    status,
  };
}

