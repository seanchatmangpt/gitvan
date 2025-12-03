'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
      const response = await fetch('/api/gitvan/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook }),
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Hook executed: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to execute hook:', error);
      alert('Failed to execute hook');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Autonomic Workflow Generator</h1>
        <p className="text-gray-600">
          Automatically detect patterns and generate hooks from your git events
        </p>
      </div>

      {/* Detection and Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Generation Pipeline</CardTitle>
          <CardDescription>Three-step process to detect patterns and create hooks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleDetectPatterns}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Detecting...' : '1. Detect Patterns'}
            </Button>
            <Button
              onClick={handleGenerateHooks}
              disabled={loading || patterns.length === 0}
              className="flex-1"
            >
              {loading ? 'Generating...' : '2. Generate Hooks'}
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            {patterns.length > 0 && `${patterns.length} patterns detected`}
            {hooks.length > 0 && ` → ${hooks.length} hooks generated`}
          </div>
        </CardContent>
      </Card>

      {/* Detected Patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Patterns</CardTitle>
            <CardDescription>{patterns.length} patterns identified in your git workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-4 border rounded-lg space-y-2 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{pattern.type}</h3>
                      <p className="text-sm text-gray-600">{pattern.description}</p>
                    </div>
                    <Badge variant="secondary">
                      {(pattern.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    Suggested Hook: {pattern.suggestedHook}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Hooks */}
      {hooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Hooks</CardTitle>
            <CardDescription>{hooks.length} hooks ready for execution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hooks.map((hook, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg space-y-3 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => setSelectedHook(hook)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{hook.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">Priority: {hook.priority}</Badge>
                      {hook.autoExecute && (
                        <Badge className="bg-green-100 text-green-800">Auto Execute</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteHook(hook);
                    }}
                    disabled={executing}
                    size="sm"
                  >
                    {executing ? 'Executing...' : 'Execute'}
                  </Button>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Trigger: {hook.trigger}</div>
                  <div>Condition: {hook.condition}</div>
                  <div>Action: {hook.action}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hook Preview */}
      {selectedHook && (
        <Card>
          <CardHeader>
            <CardTitle>Hook TTL Preview</CardTitle>
            <CardDescription>RDF/Turtle representation of generated hook</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-96">
              {selectedHook.ttl}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {patterns.length === 0 && hooks.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No patterns detected yet</p>
              <p className="text-sm">
                Click "Detect Patterns" to analyze your git history and find automation opportunities
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
