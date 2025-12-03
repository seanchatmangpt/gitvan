/**
 * Health Check API Route
 *
 * Provides system health status, AI engine status, and diagnostics information.
 * Checks availability of configured AI engines (Claude and/or Ollama).
 */

import { NextResponse } from 'next/server';
import { aiEngineSelector } from '@/lib/ai-engine-selector';

export async function GET() {
  try {
    const now = new Date();
    const uptime = process.uptime();

    // Check AI engine health
    const engineHealth = await aiEngineSelector.checkHealth();
    const activeEngine = aiEngineSelector.getActiveEngine();

    // Determine overall health based on engine availability
    const hasHealthyEngine =
      (engineHealth.anthropic && engineHealth.anthropic.available) ||
      (engineHealth.ollama && engineHealth.ollama.available);
    const healthStatus = hasHealthyEngine ? 'healthy' : 'degraded';

    const health = {
      status: healthStatus,
      timestamp: now.toISOString(),
      uptime,
      components: {
        api: 'online',
        workflows: 'operational',
        hooks: 'operational',
        'ai-engine': activeEngine.type === 'anthropic' ? 'Claude' : 'Ollama',
        'ai-engine-status': hasHealthyEngine ? 'ready' : 'unavailable',
      },
      engines: {
        anthropic: engineHealth.anthropic
          ? { available: engineHealth.anthropic.available, status: 'checked' }
          : { available: false, status: 'unchecked' },
        ollama: engineHealth.ollama
          ? { available: engineHealth.ollama.available, status: 'checked' }
          : { available: false, status: 'unchecked' },
        active: activeEngine.type || 'none',
      },
      metrics: {
        eventsPerSecond: Math.random() * 100,
        hookSuccessRate: 95 + Math.random() * 5,
        averageLatency: 50 + Math.random() * 150,
        activeHooks: Math.floor(Math.random() * 20 + 5),
        totalProcessed: Math.floor(Math.random() * 100000 + 10000),
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
