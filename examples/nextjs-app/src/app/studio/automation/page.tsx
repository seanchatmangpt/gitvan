'use client';

import { useState, useEffect } from 'react';

/**
 * Studio Automation Hooks Dashboard
 *
 * Manage workflow automation triggers, deployment hooks, and continuous integration.
 * Configure and monitor autonomic development workflows.
 */
export default function AutomationPage() {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [automationStatus, setAutomationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Load automation triggers and status
  useEffect(() => {
    const loadAutomation = async () => {
      try {
        const [triggersRes, statusRes] = await Promise.all([
          fetch('/api/gitvan/automation?action=list-triggers'),
          fetch('/api/gitvan/automation?action=status'),
        ]);

        if (triggersRes.ok) {
          const triggersData = await triggersRes.json();
          setTriggers(triggersData.triggers || []);
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setAutomationStatus(statusData.status);
        }
      } catch (error) {
        console.error('Failed to load automation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAutomation();
  }, []);

  // Test a trigger
  const testTrigger = async (triggerId: string) => {
    setTesting(true);
    try {
      const response = await fetch('/api/gitvan/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-trigger',
          metadata: { triggerId },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(data.result);
      }
    } catch (error) {
      console.error('Failed to test trigger:', error);
      setTestResult({ error: String(error) });
    } finally {
      setTesting(false);
    }
  };

  // Toggle trigger
  const toggleTrigger = async (triggerId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/gitvan/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enabled ? 'disable-trigger' : 'enable-trigger',
          metadata: { triggerId },
        }),
      });

      if (response.ok) {
        // Update local state
        setTriggers(
          triggers.map((t) =>
            t.id === triggerId ? { ...t, enabled: !enabled } : t
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle trigger:', error);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px' }}>
        Automation Hooks
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Triggers List */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Automation Triggers
          </h2>

          {loading ? (
            <div
              style={{
                padding: '32px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#999',
              }}
            >
              <p>Loading automation triggers...</p>
            </div>
          ) : triggers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  onClick={() => setSelectedTrigger(trigger.id)}
                  style={{
                    padding: '16px',
                    backgroundColor:
                      selectedTrigger === trigger.id ? '#eff6ff' : 'white',
                    border:
                      selectedTrigger === trigger.id
                        ? '2px solid #3b82f6'
                        : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                        {trigger.id}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Type: <strong>{trigger.type}</strong> • Event: <strong>{trigger.event}</strong>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testTrigger(trigger.id);
                        }}
                        disabled={testing}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        Test
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrigger(trigger.id, trigger.enabled);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: trigger.enabled ? '#22c55e' : '#9ca3af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        {trigger.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>

                  {/* Hooks List */}
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <strong>Hooks:</strong> {trigger.hooks.join(', ')}
                  </div>

                  {/* Status Badge */}
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '6px 8px',
                      backgroundColor: trigger.enabled ? '#d1fae5' : '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: trigger.enabled ? '#065f46' : '#6b7280',
                      width: 'fit-content',
                    }}
                  >
                    {trigger.enabled ? '✓ Active' : '○ Inactive'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '32px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#999',
              }}
            >
              <p>No automation triggers configured</p>
            </div>
          )}
        </div>

        {/* Right Panel: Status & Results */}
        <div>
          {/* System Status */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              System Status
            </h2>
            {automationStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Studio</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
                    {automationStatus.studio}
                  </div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Hooks</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
                    {automationStatus.hooks}
                  </div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Workflows</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>
                    {automationStatus.workflows}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#999' }}>Loading status...</div>
            )}
          </div>

          {/* Test Results */}
          {testResult && (
            <div
              style={{
                padding: '16px',
                backgroundColor: testResult.error ? '#fef2f2' : '#f0fdf4',
                border: testResult.error
                  ? '1px solid #fecaca'
                  : '1px solid #86efac',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0' }}>
                {testResult.error ? '❌ Test Failed' : '✅ Test Passed'}
              </h3>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <div>Duration: {testResult.duration}ms</div>
                <div>Status: {testResult.status}</div>
                {testResult.output && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Output:</strong>
                    <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                      {JSON.stringify(testResult.output, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {!testResult && (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#333' }}>
                <strong>Active Triggers:</strong>{' '}
                {triggers.filter((t) => t.enabled).length}/{triggers.length}
              </div>
              <div style={{ fontSize: '12px', color: '#333', marginTop: '8px' }}>
                <strong>Trigger Types:</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {[...new Set(triggers.map((t) => t.type))].join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Information Panel */}
      <div
        style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          ⚙️ How Automation Hooks Work
        </h3>
        <p style={{ fontSize: '14px', color: '#333', margin: '0 0 12px 0' }}>
          Automation hooks trigger workflows based on Git events and system triggers:
        </p>
        <ul style={{ fontSize: '14px', color: '#333', margin: '0', paddingLeft: '20px' }}>
          <li><strong>Git Hooks:</strong> Pre-commit, commit-msg, post-merge validation</li>
          <li><strong>Workflow Triggers:</strong> Pull request, release, merge events</li>
          <li><strong>Continuous Hooks:</strong> Ongoing metrics collection and monitoring</li>
          <li><strong>Manual Triggers:</strong> On-demand workflow execution</li>
        </ul>
      </div>
    </div>
  );
}
