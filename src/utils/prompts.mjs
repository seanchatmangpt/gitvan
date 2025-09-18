/**
 * GitVan User Input Prompting System
 * Provides interactive prompting for pack inputs with validation and type support
 */

import prompts from 'prompts';
import { createLogger } from './logger.mjs';

const logger = createLogger('prompts');

/**
 * Prompting context for managing prompt behavior
 */
export class PromptingContext {
  constructor(options = {}) {
    this.options = {
      // Skip prompting and fail if required inputs are missing
      noPrompt: options.noPrompt || false,
      // Non-interactive mode for programmatic usage
      nonInteractive: options.nonInteractive || false,
      // Default values to use instead of prompting
      defaults: options.defaults || {},
      // Pre-answered values (for testing or automation)
      answers: options.answers || {},
      ...options
    };
    this.logger = logger;
  }

  /**
   * Determine if we should prompt for user input
   */
  shouldPrompt() {
    return !this.options.noPrompt && !this.options.nonInteractive;
  }

  /**
   * Get a pre-provided answer or default value
   */
  getPreAnswer(key, defaultValue) {
    if (this.options.answers[key] !== undefined) {
      return this.options.answers[key];
    }
    if (this.options.defaults[key] !== undefined) {
      return this.options.defaults[key];
    }
    return defaultValue;
  }
}

/**
 * Convert pack input definition to prompts format
 */
export function createPromptFromInput(inputDef, context) {
  const { key, type, description, default: defaultValue, enum: enumValues, required = false } = inputDef;

  const basePrompt = {
    name: key,
    message: description || `Enter value for ${key}:`,
    initial: context.getPreAnswer(key, defaultValue),
  };

  // Handle different input types
  switch (type) {
    case 'boolean':
      return {
        ...basePrompt,
        type: 'confirm',
        initial: context.getPreAnswer(key, defaultValue) || false,
      };

    case 'select':
    case 'enum':
      if (!enumValues || !Array.isArray(enumValues)) {
        throw new Error(`Input '${key}' of type '${type}' requires 'enum' values array`);
      }
      return {
        ...basePrompt,
        type: 'select',
        choices: enumValues.map(value => ({
          title: value,
          value,
          description: `Select ${value}`
        })),
        initial: enumValues.indexOf(context.getPreAnswer(key, defaultValue)) || 0,
      };

    case 'multiselect':
      if (!enumValues || !Array.isArray(enumValues)) {
        throw new Error(`Input '${key}' of type 'multiselect' requires 'enum' values array`);
      }
      return {
        ...basePrompt,
        type: 'multiselect',
        choices: enumValues.map(value => ({
          title: value,
          value,
          description: `Include ${value}`
        })),
        min: required ? 1 : 0,
        hint: '- Space to select. Return to submit'
      };

    case 'autocomplete':
      return {
        ...basePrompt,
        type: 'autocomplete',
        choices: enumValues ? enumValues.map(value => ({ title: value, value })) : [],
        suggest: (input, choices) =>
          choices.filter(choice => choice.title.toLowerCase().includes(input.toLowerCase()))
      };

    case 'number':
      return {
        ...basePrompt,
        type: 'number',
        min: inputDef.min,
        max: inputDef.max,
        increment: inputDef.step || 1,
        validate: value => {
          if (isNaN(value)) return 'Please enter a valid number';
          if (inputDef.min !== undefined && value < inputDef.min) {
            return `Value must be at least ${inputDef.min}`;
          }
          if (inputDef.max !== undefined && value > inputDef.max) {
            return `Value must be at most ${inputDef.max}`;
          }
          return true;
        }
      };

    case 'password':
      return {
        ...basePrompt,
        type: 'password',
        mask: '*',
      };

    case 'path':
      return {
        ...basePrompt,
        type: 'text',
        validate: value => {
          if (!value && required) return 'Path is required';
          // Basic path validation - could be enhanced with fs checks
          if (value && typeof value !== 'string') return 'Path must be a string';
          return true;
        }
      };

    case 'text':
    case 'string':
    default:
      return {
        ...basePrompt,
        type: 'text',
        validate: value => {
          if (!value && required) return `${key} is required`;
          if (inputDef.minLength && value.length < inputDef.minLength) {
            return `Must be at least ${inputDef.minLength} characters`;
          }
          if (inputDef.maxLength && value.length > inputDef.maxLength) {
            return `Must be at most ${inputDef.maxLength} characters`;
          }
          if (inputDef.pattern) {
            const regex = new RegExp(inputDef.pattern);
            if (!regex.test(value)) {
              return inputDef.patternMessage || `Value must match pattern: ${inputDef.pattern}`;
            }
          }
          return true;
        }
      };
  }
}

/**
 * Prompt for a single input value
 */
export async function promptForInput(inputDef, context = new PromptingContext()) {
  const { key, required = false } = inputDef;

  // Check for pre-provided answer
  const preAnswer = context.getPreAnswer(key);
  if (preAnswer !== undefined) {
    context.logger.debug(`Using pre-provided value for ${key}`);
    return preAnswer;
  }

  // If no prompting allowed and required, throw error
  if (!context.shouldPrompt() && required) {
    throw new Error(
      `Required input '${key}' is missing and prompting is disabled. ` +
      `Use --defaults or provide the value programmatically.`
    );
  }

  // If no prompting allowed, return default or undefined
  if (!context.shouldPrompt()) {
    return inputDef.default;
  }

  try {
    const promptConfig = createPromptFromInput(inputDef, context);
    const response = await prompts(promptConfig, {
      onCancel: () => {
        throw new Error('User cancelled input prompt');
      }
    });

    return response[key];
  } catch (error) {
    context.logger.error(`Failed to prompt for input '${key}': ${error.message}`);
    throw error;
  }
}

/**
 * Prompt for multiple inputs in sequence or batch
 */
export async function promptForInputs(inputDefs, context = new PromptingContext()) {
  const results = {};
  const promptsToShow = [];

  // Process all inputs, collecting those that need prompting
  for (const inputDef of inputDefs) {
    const { key } = inputDef;

    // Check for pre-provided answer
    const preAnswer = context.getPreAnswer(key);
    if (preAnswer !== undefined) {
      results[key] = preAnswer;
      context.logger.debug(`Using pre-provided value for ${key}`);
      continue;
    }

    // Check for default value
    if (inputDef.default !== undefined) {
      results[key] = inputDef.default;
      continue;
    }

    // If required but no prompting allowed, fail
    if (inputDef.required && !context.shouldPrompt()) {
      throw new Error(
        `Required input '${key}' is missing and prompting is disabled. ` +
        `Use --defaults or provide the value programmatically.`
      );
    }

    // If prompting allowed, add to prompts list
    if (context.shouldPrompt()) {
      promptsToShow.push(createPromptFromInput(inputDef, context));
    }
  }

  // Show all prompts at once if any are needed
  if (promptsToShow.length > 0) {
    try {
      const responses = await prompts(promptsToShow, {
        onCancel: () => {
          throw new Error('User cancelled input prompts');
        }
      });

      // Merge responses with existing results
      Object.assign(results, responses);
    } catch (error) {
      context.logger.error(`Failed to collect user inputs: ${error.message}`);
      throw error;
    }
  }

  return results;
}

/**
 * Validate a resolved input value against its definition
 */
export function validateInputValue(value, inputDef) {
  const { key, type, required = false, enum: enumValues } = inputDef;

  // Check required
  if (required && (value === undefined || value === null || value === '')) {
    throw new Error(`Input '${key}' is required but not provided`);
  }

  // Skip further validation if value is undefined/null and not required
  if (value === undefined || value === null) {
    return true;
  }

  // Type-specific validation
  switch (type) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`Input '${key}' must be a boolean, got ${typeof value}`);
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Input '${key}' must be a valid number`);
      }
      if (inputDef.min !== undefined && value < inputDef.min) {
        throw new Error(`Input '${key}' must be at least ${inputDef.min}`);
      }
      if (inputDef.max !== undefined && value > inputDef.max) {
        throw new Error(`Input '${key}' must be at most ${inputDef.max}`);
      }
      break;

    case 'select':
    case 'enum':
      if (enumValues && !enumValues.includes(value)) {
        throw new Error(`Input '${key}' must be one of: ${enumValues.join(', ')}`);
      }
      break;

    case 'multiselect':
      if (!Array.isArray(value)) {
        throw new Error(`Input '${key}' must be an array for multiselect`);
      }
      if (enumValues) {
        for (const item of value) {
          if (!enumValues.includes(item)) {
            throw new Error(`Input '${key}' contains invalid value '${item}'. Must be one of: ${enumValues.join(', ')}`);
          }
        }
      }
      break;

    case 'string':
    case 'text':
    case 'path':
    default:
      if (typeof value !== 'string') {
        throw new Error(`Input '${key}' must be a string, got ${typeof value}`);
      }
      if (inputDef.minLength && value.length < inputDef.minLength) {
        throw new Error(`Input '${key}' must be at least ${inputDef.minLength} characters`);
      }
      if (inputDef.maxLength && value.length > inputDef.maxLength) {
        throw new Error(`Input '${key}' must be at most ${inputDef.maxLength} characters`);
      }
      if (inputDef.pattern) {
        const regex = new RegExp(inputDef.pattern);
        if (!regex.test(value)) {
          throw new Error(inputDef.patternMessage || `Input '${key}' must match pattern: ${inputDef.pattern}`);
        }
      }
      break;
  }

  return true;
}