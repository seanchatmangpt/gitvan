'use client';

import { useState, useEffect } from 'react';

/**
 * GitVan Hooks Management Dashboard
 *
 * Manage knowledge hooks, git hooks, and automation triggers for Studio.
 * Provides real-time hook execution and configuration.
 */
export default function HooksPage() {
  const [hooks, setHooks] = useState<string[]>([]);
  const [jtbdHooks, setJtbdHooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [registrationStatus, setRegistrationStatus] = useState<any>(null);

  // Load available hooks
  useEffect(() => {
    const loadHooks = async () => {
      try {
        const response = await fetch('/api/gitvan/hooks?action=list');
        if (response.ok) {
          const data = await response.json();
          setHooks(data.hooks || []);
          setJtbdHooks(data.jtbdHooks || []);
        }
      } catch (error) {
        console.error('Failed to load hooks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHooks();
  }, []);

  // Execute a hook
  const executeHook = async (hookName: string) => {
    setExecuting(true);
    try {
      const response = await fetch('/api/gitvan/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          hookName,
          context: {
            timestamp: new Date().toISOString(),
            source: 'studio',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Failed to execute hook:', error);
      setResult({ error: String(error) });
    } finally {
      setExecuting(false);
    }
  };

  // Register a JTBD hook
  const registerJTBDHook = async (scenarioId: string) => {
    setRegistrationStatus({ loading: true, scenarioId });
    try {
      const response = await fetch('/api/gitvan/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          scenarioId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRegistrationStatus({ success: true, data, scenarioId });
      }
    } catch (error) {
      console.error('Failed to register hook:', error);
      setRegistrationStatus({ error: String(error), scenarioId });
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px' }}>
        Knowledge Hooks Management
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Panel: Hook Types */}
        <div>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              JTBD Scenario Hooks
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {jtbdHooks.length > 0 ? (
                jtbdHooks.map((hook) => (
                  <div
                    key={hook}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{hook}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Scenario-based knowledge hook
                      </div>
                    </div>
                    <button
                      onClick={() => registerJTBDHook(hook)}
                      disabled={registrationStatus?.loading}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Register
                    </button>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '24px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  <p>No JTBD hooks available</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Registered Hooks
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hooks.length > 0 ? (
                hooks.map((hook) => (
                  <div
                    key={hook}
                    onClick={() => setSelectedHook(hook)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor:
                        selectedHook === hook ? '#eff6ff' : 'white',
                      border:
                        selectedHook === hook
                          ? '2px solid #3b82f6'
                          : '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{hook}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Click to execute
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        executeHook(hook);
                      }}
                      disabled={executing}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      {executing ? 'Running...' : 'Execute'}
                    </button>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '24px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  <p>No hooks registered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Execution Results */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Hook Execution Results
          </h2>

          {result ? (
            <div
              style={{
                padding: '16px',
                backgroundColor: result.error ? '#fef2f2' : '#f0fdf4',
                border: result.error
                  ? '1px solid #fecaca'
                  : '1px solid #86efac',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {result.error ? '❌ Failed' : '✅ Success'}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  backgroundColor: result.error ? '#faf5f5' : '#f0fef0',
                  padding: '12px',
                  borderRadius: '4px',
                  maxHeight: '400px',
                  overflow: 'auto',
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
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
              <p>Select a hook to execute it</p>
            </div>
          )}

          {/* Registration Status */}
          {registrationStatus && (
            <div
              style={{
                padding: '16px',
                backgroundColor: registrationStatus.error ? '#fef2f2' : '#f0fdf4',
                border: registrationStatus.error
                  ? '1px solid #fecaca'
                  : '1px solid #86efac',
                borderRadius: '8px',
                marginTop: '16px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                {registrationStatus.error ? '❌ Registration Failed' : '✅ Hook Registered'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {registrationStatus.error || registrationStatus.data?.message}
              </div>
            </div>
          )}

          {/* Hook Statistics */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
              Hook Statistics
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontSize: '12px', color: '#666' }}>Registered</div>
                <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>
                  {hooks.length}
                </div>
              </div>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontSize: '12px', color: '#666' }}>Available JTBD</div>
                <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>
                  {jtbdHooks.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hook Information Panel */}
      <div
        style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          📚 What are Knowledge Hooks?
        </h3>
        <p style={{ fontSize: '14px', color: '#333', margin: '0 0 12px 0' }}>
          Knowledge Hooks are GitVan's autonomic system for capturing, storing, and executing
          domain knowledge. They enable:
        </p>
        <ul style={{ fontSize: '14px', color: '#333', margin: '0', paddingLeft: '20px' }}>
          <li>JTBD scenario definitions in Turtle/TTL format</li>
          <li>Git hook automation for validation and testing</li>
          <li>Real-time metric collection and reporting</li>
          <li>Workflow pattern learning and optimization</li>
          <li>Cross-project knowledge sharing and reuse</li>
        </ul>
      </div>
    </div>
  );
}
