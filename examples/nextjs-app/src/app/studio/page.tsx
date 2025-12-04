'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StudioCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  status: 'ready' | 'in-progress' | 'coming-soon';
}

/**
 * GitVan Studio Home Page
 *
 * Central hub for:
 * - Workflow development and testing
 * - JTBD scenario execution
 * - Code analysis and review
 * - Release management
 * - Team metrics and collaboration
 */
export default function StudioHome() {
  const [cards, setCards] = useState<StudioCard[]>([
    {
      id: 'workflows',
      title: 'Workflows',
      description: 'Create and test automation workflows with visual editor',
      href: '/studio/workflows',
      icon: '⚙️',
      status: 'ready',
    },
    {
      id: 'hooks',
      title: 'Git Hooks',
      description: 'Define and validate git hooks with pattern enforcement',
      href: '/studio/hooks',
      icon: '🪝',
      status: 'ready',
    },
    {
      id: 'editor',
      title: 'Code Editor',
      description: 'Edit code with Monaco editor and syntax highlighting',
      href: '/studio/editor',
      icon: '📝',
      status: 'ready',
    },
    {
      id: 'analyze',
      title: 'Code Analysis',
      description: 'AI-powered code quality analysis and suggestions',
      href: '/studio/analyze',
      icon: '🔍',
      status: 'ready',
    },
    {
      id: 'review',
      title: 'Code Review',
      description: 'Review code with AI insights and team collaboration',
      href: '/studio/review',
      icon: '👥',
      status: 'ready',
    },
    {
      id: 'releases',
      title: 'Release Management',
      description: 'Generate changelogs and manage deployments',
      href: '/studio/releases',
      icon: '🚀',
      status: 'ready',
    },
    {
      id: 'deployments',
      title: 'Deployments',
      description: 'Monitor and control application deployments',
      href: '/studio/deployments',
      icon: '📦',
      status: 'ready',
    },
    {
      id: 'scenarios',
      title: 'JTBD Scenarios',
      description: 'Run Jobs to Be Done scenarios and track progress',
      href: '/studio/scenarios',
      icon: '🎯',
      status: 'ready',
    },
    {
      id: 'metrics',
      title: 'Metrics Dashboard',
      description: 'View developer and team metrics in real-time',
      href: '/studio/metrics',
      icon: '📊',
      status: 'ready',
    },
  ]);

  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch health status
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/gitvan/health');
        const data = await res.json();
        setHealth(data);
      } catch (error) {
        console.error('Failed to fetch health:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '40px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          GitVan Studio
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
          Development automation platform with JTBD scenarios, AI-powered insights, and end-to-end testing
        </p>
      </div>

      {/* Health Status */}
      {!loading && health && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            marginBottom: '32px',
          }}
          data-testid="health-status-card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                System Status
              </h3>
              <p style={{ fontSize: '12px', color: '#666' }}>
                {health.status === 'healthy' ? '✓ All systems operational' : '⚠ Some systems degraded'}
              </p>
            </div>
            <div>
              <span
                style={{
                  padding: '6px 12px',
                  backgroundColor:
                    health.status === 'healthy' ? '#d1fae5' : '#fef3c7',
                  color:
                    health.status === 'healthy' ? '#065f46' : '#92400e',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {health.status}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#666', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <strong>API:</strong> {health.components?.api || 'unknown'}
              </div>
              <div>
                <strong>AI Engine:</strong> {health.components?.['ai-engine'] || 'unknown'}
              </div>
              <div>
                <strong>Workflows:</strong> {health.components?.workflows || 'unknown'}
              </div>
              <div>
                <strong>Hooks:</strong> {health.components?.hooks || 'unknown'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Studio Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}
      >
        {cards.map((card) => (
          <Link key={card.id} href={card.href}>
            <div
              style={{
                padding: '20px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                opacity: card.status === 'coming-soon' ? 0.6 : 1,
                pointerEvents: card.status === 'coming-soon' ? 'none' : 'auto',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
              data-testid={`studio-card-${card.id}`}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                {card.icon}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                {card.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {card.status === 'ready' && '✓ Ready'}
                  {card.status === 'in-progress' && '⏳ In Progress'}
                  {card.status === 'coming-soon' && '🔜 Coming Soon'}
                </span>
                {card.status === 'ready' && (
                  <span style={{ fontSize: '14px', color: '#3b82f6' }}>→</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Start Section */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Quick Start
        </h2>
        <div
          style={{
            padding: '20px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        >
          <ol style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li>
              <strong>Create a Workflow:</strong> Go to{' '}
              <Link href="/studio/workflows" style={{ color: '#3b82f6' }}>
                Workflows
              </Link>{' '}
              and build your first automation
            </li>
            <li>
              <strong>Define Git Hooks:</strong> Create hooks in{' '}
              <Link href="/studio/hooks" style={{ color: '#3b82f6' }}>
                Git Hooks
              </Link>{' '}
              to enforce patterns
            </li>
            <li>
              <strong>Analyze Code:</strong> Use{' '}
              <Link href="/studio/analyze" style={{ color: '#3b82f6' }}>
                Code Analysis
              </Link>{' '}
              for AI-powered insights
            </li>
            <li>
              <strong>Run JTBD Scenarios:</strong> Test user workflows in{' '}
              <Link href="/studio/scenarios" style={{ color: '#3b82f6' }}>
                JTBD Scenarios
              </Link>
            </li>
            <li>
              <strong>Deploy Safely:</strong> Use{' '}
              <Link href="/studio/releases" style={{ color: '#3b82f6' }}>
                Release Management
              </Link>{' '}
              for automated deployments
            </li>
          </ol>
        </div>
      </div>

      {/* Documentation Links */}
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
        }}
      >
        <p style={{ margin: 0, color: '#1e40af' }}>
          📚{' '}
          <strong>Learn more:</strong>
          <a
            href="/docs"
            style={{ color: '#2563eb', marginLeft: '8px', textDecoration: 'underline' }}
          >
            Full Documentation
          </a>
          {' | '}
          <a
            href="/docs/jtbd"
            style={{ color: '#2563eb', marginLeft: '8px', textDecoration: 'underline' }}
          >
            JTBD Guide
          </a>
          {' | '}
          <a
            href="/docs/api"
            style={{ color: '#2563eb', marginLeft: '8px', textDecoration: 'underline' }}
          >
            API Reference
          </a>
        </p>
      </div>
    </div>
  );
}
