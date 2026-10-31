// ==============================================================================
// CELEBRA — Distributed & Memory Sliding-Window Rate Limiter
// ASVS Level 2: Prevention of Brute-Force & Credential Stuffing
// ==============================================================================

interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private store: Map<string, RateLimitRecord>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(windowMs: number = 60 * 1000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.store = new Map();

    // Auto-cleanup stale records every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Evaluates if a request from a given key (e.g. IP or user ID) is within quota.
   */
  public check(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Keep only timestamps within the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldestInWindow = record.timestamps[0];
      const resetMs = Math.max(0, oldestInWindow + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetMs: this.windowMs,
    };
  }

  /**
   * Resets rate limit records (useful in test teardown).
   */
  public reset(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// Global pre-configured limiters
export const authRateLimiter = new SlidingWindowRateLimiter(60 * 1000, 10); // 10 attempts per minute for auth
export const apiRateLimiter = new SlidingWindowRateLimiter(60 * 1000, 120);  // 120 calls per minute for general API

