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

/**
 * Persists an immutable activity log record to the database.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        eventId: params.eventId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        detailsJson: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    // Fail-safe: Audit logging failures should be safely logged without crashing the main user action
    console.error('[AUDIT LOGGING FAILURE]', error);
  }
}

