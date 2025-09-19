/**
 * Test suite for GitVan prompting system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptingContext, promptForInputs, validateInputValue, createPromptFromInput } from '../src/utils/prompts.mjs';

describe('PromptingContext', () => {
  it('should create context with default options', () => {
    const context = new PromptingContext();
    expect(context.options.noPrompt).toBe(false);
    expect(context.options.nonInteractive).toBe(false);
    expect(context.options.defaults).toEqual({});
    expect(context.options.answers).toEqual({});
  });

  it('should respect noPrompt option', () => {
    const context = new PromptingContext({ noPrompt: true });
    expect(context.shouldPrompt()).toBe(false);
  });

  it('should respect nonInteractive option', () => {
    const context = new PromptingContext({ nonInteractive: true });
    expect(context.shouldPrompt()).toBe(false);
  });

  it('should return pre-answers correctly', () => {
    const context = new PromptingContext({
      answers: { test: 'answer' },
      defaults: { test: 'default', other: 'default2' }
    });

    expect(context.getPreAnswer('test')).toBe('answer');
    expect(context.getPreAnswer('other')).toBe('default2');
    expect(context.getPreAnswer('missing')).toBeUndefined();
    expect(context.getPreAnswer('missing', 'fallback')).toBe('fallback');
  });
});

describe('createPromptFromInput', () => {
  let context;

  beforeEach(() => {
    context = new PromptingContext();
  });

  it('should create text prompt correctly', () => {
    const inputDef = {
      key: 'name',
      type: 'text',
      description: 'Enter your name',
      default: 'John'
    };

    const prompt = createPromptFromInput(inputDef, context);
    expect(prompt.name).toBe('name');
    expect(prompt.type).toBe('text');
    expect(prompt.message).toBe('Enter your name');
    expect(prompt.initial).toBe('John');
  });

  it('should create boolean prompt correctly', () => {
    const inputDef = {
      key: 'enabled',
      type: 'boolean',
      description: 'Enable feature?',
      default: true
    };

    const prompt = createPromptFromInput(inputDef, context);
    expect(prompt.type).toBe('confirm');
    expect(prompt.initial).toBe(true);
  });

  it('should create select prompt correctly', () => {
    const inputDef = {
      key: 'framework',
      type: 'select',
      description: 'Choose framework',
      enum: ['react', 'vue', 'angular'],
      default: 'react'
    };

    const prompt = createPromptFromInput(inputDef, context);
    expect(prompt.type).toBe('select');
    expect(prompt.choices).toHaveLength(3);
    expect(prompt.choices[0].value).toBe('react');
    expect(prompt.initial).toBe(0); // index of 'react'
  });

  it('should create multiselect prompt correctly', () => {
    const inputDef = {
      key: 'plugins',
      type: 'multiselect',
      description: 'Choose plugins',
      enum: ['eslint', 'prettier', 'jest'],
      required: true
    };

    const prompt = createPromptFromInput(inputDef, context);
    expect(prompt.type).toBe('multiselect');
    expect(prompt.choices).toHaveLength(3);
    expect(prompt.min).toBe(1);
  });

  it('should create number prompt with validation', () => {
    const inputDef = {
      key: 'port',
      type: 'number',
      description: 'Server port',
      min: 1000,
      max: 9999,
      default: 3000
    };

    const prompt = createPromptFromInput(inputDef, context);
    expect(prompt.type).toBe('number');
    expect(prompt.min).toBe(1000);
    expect(prompt.max).toBe(9999);
    expect(prompt.validate(2000)).toBe(true);
    expect(prompt.validate(500)).toContain('at least 1000');
  });

  it('should throw error for select without enum values', () => {
    const inputDef = {
      key: 'invalid',
      type: 'select',
      description: 'Invalid select'
    };

    expect(() => createPromptFromInput(inputDef, context)).toThrow('requires \'enum\' values array');
  });
});

describe('validateInputValue', () => {
  it('should validate text inputs correctly', () => {
    const inputDef = {
      key: 'name',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 50
    };

    expect(() => validateInputValue('John', inputDef)).not.toThrow();
    expect(() => validateInputValue('', inputDef)).toThrow('is required');
    expect(() => validateInputValue('J', inputDef)).toThrow('at least 2 characters');
    expect(() => validateInputValue('x'.repeat(51), inputDef)).toThrow('at most 50 characters');
  });

  it('should validate boolean inputs correctly', () => {
    const inputDef = { key: 'enabled', type: 'boolean' };

    expect(() => validateInputValue(true, inputDef)).not.toThrow();
    expect(() => validateInputValue(false, inputDef)).not.toThrow();
    expect(() => validateInputValue('not boolean', inputDef)).toThrow('must be a boolean');
  });

  it('should validate number inputs correctly', () => {
    const inputDef = {
      key: 'port',
      type: 'number',
      min: 1000,
      max: 9999
    };

    expect(() => validateInputValue(3000, inputDef)).not.toThrow();
    expect(() => validateInputValue('not number', inputDef)).toThrow('must be a valid number');
    expect(() => validateInputValue(500, inputDef)).toThrow('at least 1000');
    expect(() => validateInputValue(10000, inputDef)).toThrow('at most 9999');
  });

  it('should validate enum inputs correctly', () => {
    const inputDef = {
      key: 'framework',
      type: 'enum',
      enum: ['react', 'vue', 'angular']
    };

    expect(() => validateInputValue('react', inputDef)).not.toThrow();
    expect(() => validateInputValue('invalid', inputDef)).toThrow('must be one of');
  });

  it('should validate multiselect inputs correctly', () => {
    const inputDef = {
      key: 'plugins',
      type: 'multiselect',
      enum: ['eslint', 'prettier', 'jest']
    };

    expect(() => validateInputValue(['eslint', 'jest'], inputDef)).not.toThrow();
    expect(() => validateInputValue('not array', inputDef)).toThrow('must be an array');
    expect(() => validateInputValue(['invalid'], inputDef)).toThrow('contains invalid value');
  });

  it('should handle optional inputs correctly', () => {
    const inputDef = { key: 'optional', type: 'text', required: false };

    expect(() => validateInputValue(undefined, inputDef)).not.toThrow();
    expect(() => validateInputValue(null, inputDef)).not.toThrow();
    expect(() => validateInputValue('', inputDef)).not.toThrow();
  });

  it('should validate pattern matching', () => {
    const inputDef = {
      key: 'email',
      type: 'text',
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
      patternMessage: 'Must be a valid email'
    };

    expect(() => validateInputValue('test@example.com', inputDef)).not.toThrow();
    expect(() => validateInputValue('invalid-email', inputDef)).toThrow('Must be a valid email');
  });
});

describe('promptForInputs integration', () => {
  it('should handle pre-provided answers without prompting', async () => {
    const inputDefs = [
      { key: 'name', type: 'text', required: true },
      { key: 'enabled', type: 'boolean', default: false }
    ];

    const context = new PromptingContext({
      answers: { name: 'TestUser' }
    });

    const results = await promptForInputs(inputDefs, context);
    expect(results.name).toBe('TestUser');
    expect(results.enabled).toBe(false); // default value
  });

  it('should throw error for missing required inputs with noPrompt', async () => {
    const inputDefs = [
      { key: 'name', type: 'text', required: true }
    ];

    const context = new PromptingContext({ noPrompt: true });

    await expect(promptForInputs(inputDefs, context)).rejects.toThrow('is missing and prompting is disabled');
  });

  it('should use defaults when available', async () => {
    const inputDefs = [
      { key: 'port', type: 'number', default: 3000 },
      { key: 'host', type: 'text', default: 'localhost' }
    ];

    const context = new PromptingContext({ noPrompt: true });

    const results = await promptForInputs(inputDefs, context);
    expect(results.port).toBe(3000);
    expect(results.host).toBe('localhost');
  });

  it('should respect provided defaults over input defaults', async () => {
    const inputDefs = [
      { key: 'port', type: 'number', default: 3000 }
    ];

    const context = new PromptingContext({
      noPrompt: true,
      defaults: { port: 8080 }
    });

    const results = await promptForInputs(inputDefs, context);
    expect(results.port).toBe(8080);
  });
});