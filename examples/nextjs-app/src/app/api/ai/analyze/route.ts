/**
 * AI Analysis API Route
 *
 * Provides AI-powered code analysis, recommendations, and semantic insights.
 */

import { aiEngine } from '@/lib/ai-engine';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, code, diff, commit, question, context } = body;

    if (action === 'analyze-code') {
      if (!code) {
        return NextResponse.json(
          { success: false, error: 'Code required for analysis' },
          { status: 400 }
        );
      }
      const analysis = await aiEngine.analyzeCodeQuality(code);
      return NextResponse.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'generate-message') {
      if (!diff) {
        return NextResponse.json(
          { success: false, error: 'Diff required for message generation' },
          { status: 400 }
        );
      }
      const message = await aiEngine.generateCommitMessage(diff);
      return NextResponse.json({
        success: true,
        message,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'explain-changes') {
      if (!commit) {
        return NextResponse.json(
          { success: false, error: 'Commit required for explanation' },
          { status: 400 }
        );
      }
      const explanation = await aiEngine.explainChanges(commit);
      return NextResponse.json({
        success: true,
        explanation,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'suggest-optimizations') {
      if (!code) {
        return NextResponse.json(
          { success: false, error: 'Code required for optimization suggestions' },
          { status: 400 }
        );
      }
      const suggestions = await aiEngine.suggestOptimizations(code);
      return NextResponse.json({
        success: true,
        suggestions,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'ask') {
      if (!question) {
        return NextResponse.json(
          { success: false, error: 'Question required' },
          { status: 400 }
        );
      }
      const response = await aiEngine.askAssistant(question, context);
      return NextResponse.json({
        success: true,
        response,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'security-analysis') {
      if (!code) {
        return NextResponse.json(
          { success: false, error: 'Code required for security analysis' },
          { status: 400 }
        );
      }
      const risks = await aiEngine.analyzeSecurityRisks(code);
      return NextResponse.json({
        success: true,
        risks,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { success: false, error: 'AI analysis failed' },
      { status: 500 }
    );
  }
}
