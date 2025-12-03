/**
 * Analytics API Route
 *
 * Provides access to real-time SPARQL analytics for velocity, quality, performance,
 * security, and technical debt metrics.
 */

import { sparqlEngine } from '@/lib/sparql-engine';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const analyticsType = searchParams.get('type') || 'all';

    const analytics: Record<string, any> = {};

    if (analyticsType === 'all' || analyticsType === 'velocity') {
      analytics.velocity = await sparqlEngine.detectVelocityTrends();
    }

    if (analyticsType === 'all' || analyticsType === 'quality') {
      analytics.quality = await sparqlEngine.detectQualityIssues();
    }

    if (analyticsType === 'all' || analyticsType === 'performance') {
      analytics.performance = await sparqlEngine.findPerformanceBottlenecks();
    }

    if (analyticsType === 'all' || analyticsType === 'security') {
      analytics.security = await sparqlEngine.identifySecurityRisks();
    }

    if (analyticsType === 'all' || analyticsType === 'debt') {
      analytics.debt = await sparqlEngine.detectTechnicalDebt();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analytics,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'SPARQL query required' },
        { status: 400 }
      );
    }

    const results = await sparqlEngine.executeQuery(query);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Query execution failed' },
      { status: 500 }
    );
  }
}
