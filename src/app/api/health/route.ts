import { NextResponse } from 'next/server';
import db from '@/lib/database';

// ==============================================================================
// CELEBRA — Health Check & Diagnostics Endpoint
// Verifies application status, database connectivity, and uptime
// ==============================================================================

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    // Fast scalar query to verify active database pool
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'degraded';
    console.error('[HEALTH CHECK DB ERROR]', error);
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: dbStatus === 'healthy' ? 'pass' : 'warn',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      service: 'CELEBRA Event Management Platform',
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
        },
      },
      metrics: {
        totalLatencyMs: responseTimeMs,
      },
    },
    {
      status: dbStatus === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

