import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, authorizeEventAccess } from '@/lib/security/auth-middleware';
import { AiEventArchitectService } from '@/services/ai-event-architect-service';
import { formatSafeErrorResponse } from '@/lib/security/error-sanitizer';
import db from '@/lib/database';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    await authorizeEventAccess(auth.user.id, id, 'EVENT_VIEW');

    const latestGen = await db.aiGeneration.findFirst({
      where: { eventId: id, serviceType: 'EVENT_ARCHITECT_FULL' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestGen) {
      return NextResponse.json({ success: true, plan: null });
    }

    let structuredPlan = null;
    try {
      structuredPlan = JSON.parse(latestGen.outputJson);
    } catch {
      structuredPlan = null;
    }

    return NextResponse.json({
      success: true,
      plan: {
        id: latestGen.id,
        structuredPlan,
        createdAt: latestGen.createdAt,
      },
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to fetch AI Event Plan');
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    // Check if single-section regeneration was requested
    if (body.sectionName) {
      const result = await AiEventArchitectService.regenerateSection(
        auth.user.id,
        id,
        body.sectionName,
        body.input || body
      );
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Default: Full 12-section master plan generation
    const result = await AiEventArchitectService.generatePlan(
      auth.user.id,
      id,
      body.input || body
    );

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'AI Event Architect generation failed');
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    if (!body.sectionName) {
      return NextResponse.json(
        { success: false, error: 'sectionName is required for regeneration' },
        { status: 400 }
      );
    }

    const result = await AiEventArchitectService.regenerateSection(
      auth.user.id,
      id,
      body.sectionName,
      body.input || body
    );

    return NextResponse.json({
      success: true,
      sectionContent: result.sectionData,
      ...result,
    });
  } catch (error) {
    const { body, status } = formatSafeErrorResponse(error, 'Failed to regenerate plan section');
    return NextResponse.json(body, { status });
  }
}

