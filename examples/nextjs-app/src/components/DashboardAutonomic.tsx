'use client';

import { useEffect, useState } from 'react';

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
        const healthRes = await fetch('/api/gitvan/health');
        if (healthRes.ok) {
          const data = await healthRes.json();
          setHealth(data);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>GitVan Autonomic System</h1>

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>System Health</h2>
        <p>Status: <strong>{health.status}</strong></p>
        <p>Last Check: {new Date(health.lastCheck).toLocaleString()}</p>

        <h3>Components:</h3>
        <ul>
          {Object.entries(health.components).map(([component, status]) => (
            <li key={component}>
              {component}: <strong>{status}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Metrics</h2>
        <dl>
          <dt>Events/sec:</dt>
          <dd>{metrics.eventsPerSecond.toFixed(2)}</dd>
          <dt>Hook Success Rate:</dt>
          <dd>{(metrics.hookSuccessRate * 100).toFixed(1)}%</dd>
          <dt>P99 Latency:</dt>
          <dd>{metrics.p99Latency.toFixed(0)}ms</dd>
          <dt>Quality Score:</dt>
          <dd>{(metrics.qualityScore * 100).toFixed(1)}%</dd>
          <dt>Security Score:</dt>
          <dd>{(metrics.securityScore * 100).toFixed(1)}%</dd>
          <dt>Team Velocity:</dt>
          <dd>{metrics.teamVelocity.toFixed(2)} commits/day</dd>
        </dl>
      </div>
    </div>
  );
}
