'use client';

import { useState } from 'react';
import MonacoEditor from '@/components/MonacoEditor';

/**
 * Workflows Editor Page
 *
 * Create and test automation workflows with visual editor
 * and Monaco code editing
 */
export default function WorkflowsPage() {
  const [workflowName, setWorkflowName] = useState('');
  const [workflowCode, setWorkflowCode] = useState(`{
  "name": "semantic-commit",
  "description": "Enforce semantic commit messages",
  "triggers": ["commit"],
  "steps": [
    {
      "type": "analyze",
      "input": "{{diff}}",
      "description": "Analyze the commit diff"
    },
    {
      "type": "suggest",
      "input": "{{analysis}}",
      "description": "Generate commit message suggestion"
    },
    {
      "type": "validate",
      "pattern": "^(feat|fix|refactor|docs|style|test|chore):",
      "description": "Validate message format"
    }
  ]
}`);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const executeWorkflow = async () => {
    setExecuting(true);
    try {
      const response = await fetch('/api/gitvan/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName || 'test-workflow',
          definition: workflowCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      setResult({ error: String(error) });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px' }}>
        Workflow Builder
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Editor Panel */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              Workflow Name
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g., semantic-commit, auto-deploy"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            Workflow Definition (JSON)
          </label>
          <MonacoEditor
            defaultValue={workflowCode}
            language="json"
            onChange={setWorkflowCode}
            height="400px"
          />

          <button
            onClick={executeWorkflow}
            disabled={executing}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: executing ? 'not-allowed' : 'pointer',
              opacity: executing ? 0.6 : 1,
            }}
            data-testid="execute-workflow-button"
          >
            {executing ? 'Executing...' : 'Execute Workflow'}
          </button>
        </div>

        {/* Results Panel */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            Execution Result
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
                fontFamily: 'monospace',
                fontSize: '12px',
                maxHeight: '500px',
                overflow: 'auto',
              }}
              data-testid="workflow-result"
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
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
              <p>Execute workflow to see results</p>
            </div>
          )}

          {/* Template Library */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
              Quick Templates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Semantic Commit', id: 'semantic-commit' },
                { name: 'Auto Deploy', id: 'auto-deploy' },
                { name: 'Quality Gate', id: 'quality-gate' },
              ].map((template) => (
                <button
                  key={template.id}
                  onClick={() => setWorkflowName(template.name)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
