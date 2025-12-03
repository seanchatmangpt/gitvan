'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MetricsData {
  eventsPerSecond: number;
  hookSuccessRate: number;
  p99Latency: number;
  qualityScore: number;
  securityScore: number;
  teamVelocity: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  lastCheck: string;
  components: Record<string, string>;
}

/**
 * Autonomic Dashboard Component
 *
 * Real-time display of GitVan metrics, health status, and system performance.
 * Shows autonomic features like self-healing, pattern detection, and recommendations.
 */
export function DashboardAutonomic() {
  const [metrics, setMetrics] = useState<MetricsData>({
    eventsPerSecond: 0,
    hookSuccessRate: 0,
    p99Latency: 0,
    qualityScore: 0,
    securityScore: 0,
    teamVelocity: 0,
  });

  const [health, setHealth] = useState<HealthStatus>({
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    components: {},
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [metricsRes, healthRes] = await Promise.all([
          fetch('/api/gitvan/analytics/metrics'),
          fetch('/api/gitvan/health'),
        ]);

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.metrics || {});
        }

        if (healthRes.ok) {
          const data = await healthRes.json();
          setHealth(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Autonomic Development Dashboard</h1>
        <p className="text-gray-600">Real-time GitVan metrics and system intelligence</p>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Health</span>
            <Badge className={getStatusColor(health.status)}>
              {health.status.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>Last updated: {new Date(health.lastCheck).toLocaleTimeString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(health.components).map(([component, status]) => (
              <div key={component} className="space-y-2">
                <div className="text-sm font-medium text-gray-700">{component}</div>
                <Badge variant="outline">{status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Events/Second</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.eventsPerSecond.toFixed(1)}</div>
            <p className="text-xs text-gray-500 mt-1">Real-time throughput</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Hook Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(metrics.hookSuccessRate)}`}>
              {metrics.hookSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Autonomous hook reliability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">P99 Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.p99Latency.toFixed(0)}ms</div>
            <p className="text-xs text-gray-500 mt-1">99th percentile</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(metrics.qualityScore)}`}>
              {metrics.qualityScore.toFixed(0)}/100
            </div>
            <p className="text-xs text-gray-500 mt-1">Code quality metrics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Security Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(metrics.securityScore)}`}>
              {metrics.securityScore.toFixed(0)}/100
            </div>
            <p className="text-xs text-gray-500 mt-1">Security posture</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Team Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.teamVelocity.toFixed(0)}</div>
            <p className="text-xs text-gray-500 mt-1">Features/sprint</p>
          </CardContent>
        </Card>
      </div>

      {/* Autonomic Features Status */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomic Features</CardTitle>
          <CardDescription>Real-time status of self-generating and self-healing systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div>
                <div className="font-medium text-green-900">Auto-Workflow Generation</div>
                <div className="text-sm text-green-700">Autonomically generating hooks from patterns</div>
              </div>
              <Badge className="bg-green-600">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <div className="font-medium text-blue-900">Pattern Detection</div>
                <div className="text-sm text-blue-700">Real-time analysis of git events</div>
              </div>
              <Badge className="bg-blue-600">Running</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <div className="font-medium text-purple-900">Self-Healing</div>
                <div className="text-sm text-purple-700">Autonomous failure recovery and optimization</div>
              </div>
              <Badge className="bg-purple-600">Monitoring</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div>
                <div className="font-medium text-orange-900">AI Recommendations</div>
                <div className="text-sm text-orange-700">LLM-powered analysis and suggestions</div>
              </div>
              <Badge className="bg-orange-600">Ready</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
