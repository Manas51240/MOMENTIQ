import db from './index';

// ==============================================================================
// CELEBRA — Centralized Activity Audit Logger
// ASVS Level 2: Immutable Security & Operational Audit Trails
// ==============================================================================

export interface LogActivityParams {
  eventId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'salt',
  'token',
  'sessiontoken',
  'secret',
  'authorization',
  'creditcard',
  'cvv',
  'apikey',
  'key',
]);

/**
 * Recursively redacts sensitive fields from audit log payloads.
 */
export function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = k.toLowerCase().replace(/[^a-z]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      sanitized[k] = redactSensitiveData(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Persists an immutable activity log record to the database.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const sanitizedDetails = params.details ? redactSensitiveData(params.details) : null;
    await db.activityLog.create({
      data: {
        eventId: params.eventId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        detailsJson: sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
      },
    });
  } catch (error) {
    // Fail-safe: Audit logging failures should be safely logged without crashing the main user action
    console.error('[AUDIT LOGGING FAILURE]', error);
  }
}

