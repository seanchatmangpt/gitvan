/**
 * JTBD Scenarios API Route
 *
 * Execute Jobs to Be Done scenarios and return results
 */

import { NextRequest, NextResponse } from 'next/server';
import { jtbdEngine } from '@/lib/jtbd-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId } = body;

    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'scenarioId required' },
        { status: 400 }
      );
    }

    // Execute scenario
    const result = await jtbdEngine.executeScenario(scenarioId);

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scenario execution error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const scenarios = jtbdEngine.getScenarios();
    const summary = jtbdEngine.getSummaryReport();

    return NextResponse.json({
      success: true,
      scenarios,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch scenarios:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
