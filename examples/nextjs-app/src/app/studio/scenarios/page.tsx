'use client';

import { useState, useEffect } from 'react';

/**
 * JTBD Scenarios Dashboard
 *
 * Run and track Jobs to Be Done scenarios with progress indicators
 */
export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const defaultScenarios = [
    {
      id: 'semantic-commit',
      name: 'Semantic Commit Workflow',
      description: 'Developer writes code, gets AI suggestions, commits with validation',
      jobType: 'functional',
      steps: 4,
      status: 'ready',
    },
    {
      id: 'code-review',
      name: 'Team Code Review',
      description: 'Team collaborates on code with AI-powered insights',
      jobType: 'social',
      steps: 5,
      status: 'ready',
    },
    {
      id: 'deployment',
      name: 'Release & Deploy',
      description: 'Automated changelog generation and safe deployment',
      jobType: 'functional',
      steps: 6,
      status: 'ready',
    },
    {
      id: 'metrics-tracking',
      name: 'Metrics Collection',
      description: 'Track developer and team metrics in real-time',
      jobType: 'emotional',
      steps: 3,
      status: 'ready',
    },
  ];

  useEffect(() => {
    setScenarios(defaultScenarios);
  }, []);

  const runScenario = async (scenarioId: string) => {
    setRunning(true);
    setSelectedScenario(scenarioId);

    try {
      const response = await fetch('/api/gitvan/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });

      if (response.ok) {
        const result = await response.json();
        setResults([...results, result]);
      }
    } catch (error) {
      console.error('Failed to run scenario:', error);
    } finally {
      setRunning(false);
    }
  };

  const scenarioResults = selectedScenario
    ? results.filter((r) => r.scenarioId === selectedScenario)
    : [];

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px' }}>
        JTBD Scenarios
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Scenarios List */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Available Scenarios
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                style={{
                  padding: '16px',
                  backgroundColor:
                    selectedScenario === scenario.id ? '#eff6ff' : 'white',
                  border:
                    selectedScenario === scenario.id
                      ? '2px solid #3b82f6'
                      : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                data-testid={`scenario-item-${scenario.id}`}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '8px',
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                    {scenario.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      backgroundColor:
                        scenario.jobType === 'functional'
                          ? '#dbeafe'
                          : scenario.jobType === 'emotional'
                            ? '#fce7f3'
                            : '#d1fae5',
                      color:
                        scenario.jobType === 'functional'
                          ? '#0369a1'
                          : scenario.jobType === 'emotional'
                            ? '#be185d'
                            : '#065f46',
                      borderRadius: '4px',
                    }}
                  >
                    {scenario.jobType}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#666',
                    margin: '0 0 8px 0',
                  }}
                >
                  {scenario.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#999',
                  }}
                >
                  <span>{scenario.steps} steps</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      runScenario(scenario.id);
                    }}
                    disabled={running}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: running ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      opacity: running ? 0.6 : 1,
                    }}
                    data-testid={`run-scenario-${scenario.id}`}
                  >
                    {running && selectedScenario === scenario.id ? 'Running...' : 'Run'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results Panel */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Execution Results
          </h2>
          {scenarioResults.length === 0 ? (
            <div
              style={{
                padding: '32px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#999',
              }}
            >
              <p>Select a scenario and run it to see results</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scenarioResults.map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    backgroundColor:
                      result.status === 'passed' ? '#f0fdf4' : '#fef2f2',
                    border:
                      result.status === 'passed'
                        ? '1px solid #86efac'
                        : '1px solid #fecaca',
                    borderRadius: '8px',
                  }}
                  data-testid="scenario-result"
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
                      {result.status === 'passed' ? '✓ Passed' : '✗ Failed'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {result.duration}ms
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '8px',
                    }}
                  >
                    <strong>{result.stepsCompleted}</strong> of{' '}
                    <strong>{result.stepsTotal}</strong> steps completed
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        backgroundColor:
                          result.status === 'passed' ? '#22c55e' : '#ef4444',
                        width: `${(result.stepsCompleted / result.stepsTotal) * 100}%`,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Assertions */}
                  {result.assertions && result.assertions.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong
                        style={{
                          fontSize: '12px',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        Assertions:
                      </strong>
                      {result.assertions.map((assertion: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            fontSize: '11px',
                            color: assertion.passed ? '#16a34a' : '#dc2626',
                            marginLeft: '8px',
                          }}
                        >
                          Step {assertion.step}: {assertion.passed ? '✓' : '✗'}{' '}
                          {assertion.assertion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {results.length > 0 && (
        <div
          style={{
            marginTop: '32px',
            padding: '20px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Summary
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Runs</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>
                {results.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Success Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>
                {results.length > 0
                  ? Math.round(
                      (results.filter((r) => r.status === 'passed').length /
                        results.length) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Avg Duration</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>
                {results.length > 0
                  ? Math.round(
                      results.reduce((sum, r) => sum + r.duration, 0) /
                        results.length
                    )
                  : 0}
                ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
