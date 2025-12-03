'use client';

import { useState } from 'react';

interface GeneratedHook {
  name: string;
  trigger: string;
  condition: string;
  action: string;
  priority: number;
  autoExecute: boolean;
  ttl: string;
}

interface DetectedPattern {
  type: string;
  description: string;
  confidence: number;
  suggestedHook: string;
}

/**
 * Workflow Generator Component
 *
 * Visual interface for autonomic hook generation from detected patterns.
 * Shows detected patterns, generated hooks, and allows manual execution.
 */
export function WorkflowGenerator() {
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [hooks, setHooks] = useState<GeneratedHook[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedHook, setSelectedHook] = useState<GeneratedHook | null>(null);

  const handleDetectPatterns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gitvan/workflows/detect-patterns');
      if (response.ok) {
        const data = await response.json();
        setPatterns(data.patterns || []);
      }
    } catch (error) {
      console.error('Failed to detect patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHooks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gitvan/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patterns }),
      });
      if (response.ok) {
        const data = await response.json();
        setHooks(data.hooks || []);
      }
    } catch (error) {
      console.error('Failed to generate hooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteHook = async (hook: GeneratedHook) => {
    setExecuting(true);
    try {
      const response = await fetch('/api/gitvan/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook }),
      });
      if (response.ok) {
        alert('Hook executed successfully');
      }
    } catch (error) {
      console.error('Failed to execute hook:', error);
      alert('Failed to execute hook');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Autonomic Workflow Generator</h1>
      <p>Automatically detect patterns and generate hooks from your git events</p>

      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Workflow Generation Pipeline</h2>
        <p>Two-step process to detect patterns and create hooks</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={handleDetectPatterns}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Detecting...' : '1. Detect Patterns'}
          </button>
          <button
            onClick={handleGenerateHooks}
            disabled={loading || patterns.length === 0}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || patterns.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || patterns.length === 0 ? 0.6 : 1,
            }}
          >
            {loading ? 'Generating...' : '2. Generate Hooks'}
          </button>
        </div>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          {patterns.length > 0 && `${patterns.length} patterns detected`}
          {hooks.length > 0 && ` → ${hooks.length} hooks generated`}
        </p>
      </div>

      {patterns.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Detected Patterns ({patterns.length})</h2>
          {patterns.map((pattern, idx) => (
            <div key={idx} style={{ marginTop: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <h3>{pattern.type} - {(pattern.confidence * 100).toFixed(0)}% confidence</h3>
              <p>{pattern.description}</p>
              <p style={{ fontSize: '12px', color: '#666' }}>Suggested Hook: {pattern.suggestedHook}</p>
            </div>
          ))}
        </div>
      )}

      {hooks.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Generated Hooks ({hooks.length})</h2>
          {hooks.map((hook, idx) => (
            <div
              key={idx}
              style={{
                marginTop: '10px',
                padding: '10px',
                border: '1px solid #eee',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedHook === hook ? '#f0f0f0' : 'white',
              }}
              onClick={() => setSelectedHook(hook)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>{hook.name}</h3>
                  <p style={{ fontSize: '12px', color: '#666' }}>Priority: {hook.priority} {hook.autoExecute && '| Auto Execute'}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExecuteHook(hook);
                  }}
                  disabled={executing}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: executing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {executing ? 'Executing...' : 'Execute'}
                </button>
              </div>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Trigger: {hook.trigger} | Condition: {hook.condition} | Action: {hook.action}
              </p>
            </div>
          ))}
        </div>
      )}

      {selectedHook && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>Hook TTL Preview</h2>
          <p>RDF/Turtle representation of generated hook</p>
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '12px',
            }}
          >
            {selectedHook.ttl}
          </pre>
        </div>
      )}

      {patterns.length === 0 && hooks.length === 0 && (
        <div style={{ marginTop: '20px', padding: '40px', textAlign: 'center', color: '#666' }}>
          <p>No patterns detected yet</p>
          <p>Click "Detect Patterns" to analyze your git history and find automation opportunities</p>
        </div>
      )}
    </div>
  );
}
