/**
 * Recommendations API Route
 *
 * Provides AI-powered recommendations, risk warnings, and learning opportunities
 * based on workflow analysis.
 */

import { workflowGenerator } from '@/lib/workflow-generator';
import { patternDetector } from '@/lib/pattern-detector';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get hook recommendations from workflow generator
    const mockMetrics = {
      largeCommits: 3,
      testCoverage: 75,
      hookFailureRate: 2,
    };

    const recommendations = await workflowGenerator.recommendHooks(mockMetrics);

    // Get anti-patterns from pattern detector
    const antiPatterns = await patternDetector.detectAntiPatterns();

    // Get predictions from pattern detector
    const predictions = await patternDetector.predictNextIssues();

    // Convert anti-patterns to warnings
    const warnings = antiPatterns.map((ap) => ({
      type: ap.type,
      severity: ap.severity,
      description: ap.description,
      suggestion: ap.suggestion,
    }));

    // Convert predictions to learning opportunities
    const opportunities = predictions.map((p) => ({
      topic: p.type,
      description: p.recommendation,
      resources: [`Learn more`, `Documentation`],
    }));

    return NextResponse.json({
      success: true,
      recommendations,
      warnings,
      opportunities,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
