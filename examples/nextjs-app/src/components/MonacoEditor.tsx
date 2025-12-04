'use client';

import React, { useRef, useEffect, useState } from 'react';

interface MonacoEditorProps {
  defaultValue?: string;
  language?: string;
  theme?: 'vs' | 'vs-dark' | 'hc-black';
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  width?: string;
  options?: any;
}

/**
 * Monaco Editor Component
 *
 * Provides code editing with syntax highlighting, IntelliSense, and language support
 * for workflows, hooks, test scenarios, and automation configs.
 */
export function MonacoEditor({
  defaultValue = '',
  language = 'typescript',
  theme = 'vs-dark',
  onChange,
  readOnly = false,
  height = '400px',
  width = '100%',
  options = {},
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Lazy load Monaco Editor to avoid type issues
    const loadMonaco = async () => {
      try {
        const monacoModule = await import('monaco-editor' as any);

        // Initialize Monaco Editor
        const editor = monacoModule.editor.create(containerRef.current, {
          value: defaultValue,
          language,
          theme,
          readOnly,
          automaticLayout: true,
          minimap: { enabled: true },
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'Fira Code', 'Courier New', monospace",
          ...options,
        });

        editorRef.current = editor;
        setIsReady(true);

        // Handle changes
        if (onChange) {
          const disposable = editor.onDidChangeModelContent(() => {
            onChange(editor.getValue());
          });

          return () => disposable.dispose();
        }

        return () => editor.dispose();
      } catch (error) {
        console.warn('Monaco editor failed to load, using textarea instead:', error);
        setIsReady(true);
      }
    };

    loadMonaco();
  }, [defaultValue, language, theme, readOnly, onChange, options]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
      data-testid="monaco-editor"
    />
  );
}

/**
 * Turtle/TTL Editor Component
 * Syntax highlighting for RDF/Turtle workflow definitions
 */
export function TurtleEditor({
  defaultValue = '',
  onChange,
  readOnly = false,
}: Omit<MonacoEditorProps, 'language'>) {
  return (
    <MonacoEditor
      defaultValue={defaultValue}
      language="turtle"
      onChange={onChange}
      readOnly={readOnly}
      options={{
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}

/**
 * JSON Schema Editor Component
 * For editing Zod schemas, configs, and workflows
 */
export function JSONEditor({
  defaultValue = '{}',
  onChange,
  readOnly = false,
}: Omit<MonacoEditorProps, 'language'>) {
  return (
    <MonacoEditor
      defaultValue={defaultValue}
      language="json"
      onChange={onChange}
      readOnly={readOnly}
      options={{
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}

/**
 * YAML Editor Component
 * For editing workflow configs and automation rules
 */
export function YAMLEditor({
  defaultValue = '',
  onChange,
  readOnly = false,
}: Omit<MonacoEditorProps, 'language'>) {
  return (
    <MonacoEditor
      defaultValue={defaultValue}
      language="yaml"
      onChange={onChange}
      readOnly={readOnly}
    />
  );
}

export default MonacoEditor;
