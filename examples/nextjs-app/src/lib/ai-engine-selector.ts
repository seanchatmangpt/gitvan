/**
 * AI Engine Selector
 *
 * Intelligent selection between Anthropic Claude and Ollama ministral-3b
 * based on availability and configuration.
 */

import { AIAssistantEngine } from './ai-engine';
import { OllamaLLMEngine } from './ollama-engine';

export type AIEngineType = 'anthropic' | 'ollama' | 'auto';

interface AIEngineConfig {
  type: AIEngineType;
  ollamaUrl?: string;
  ollamaModel?: string;
  anthropicKey?: string;
  fallback?: boolean;
}

/**
 * Smart AI Engine Selector
 *
 * Features:
 * - Auto-detect best available engine
 * - Fallback support (Claude → Ollama or vice versa)
 * - Health checks before routing
 * - Same interface for both engines
 * - Transparent switching
 */
export class AIEngineSelector {
  private claudeEngine?: AIAssistantEngine;
  private ollamaEngine?: OllamaLLMEngine;
  private activeEngine: 'anthropic' | 'ollama';
  private config: AIEngineConfig;

  constructor(config: AIEngineConfig = { type: 'auto' }) {
    this.config = config;

    // Initialize engines based on config
    if (config.type === 'anthropic' || config.type === 'auto') {
      try {
        this.claudeEngine = new AIAssistantEngine();
      } catch (error) {
        console.warn('Failed to initialize Anthropic engine:', error);
      }
    }

    if (config.type === 'ollama' || config.type === 'auto') {
      try {
        this.ollamaEngine = new OllamaLLMEngine(
          config.ollamaUrl || 'http://localhost:11434',
          config.ollamaModel || 'ministral-3b'
        );
      } catch (error) {
        console.warn('Failed to initialize Ollama engine:', error);
      }
    }

    // Set active engine based on config or availability
    this.activeEngine = this.selectActiveEngine();
  }

  /**
   * Select the best available engine
   */
  private selectActiveEngine(): 'anthropic' | 'ollama' {
    if (this.config.type === 'anthropic') {
      if (!this.claudeEngine) {
        throw new Error('Anthropic engine not available');
      }
      return 'anthropic';
    }

    if (this.config.type === 'ollama') {
      if (!this.ollamaEngine) {
        throw new Error('Ollama engine not available');
      }
      return 'ollama';
    }

    // Auto mode: try to pick best engine
    // Prefer Anthropic if available and key is set
    if (this.claudeEngine && process.env.ANTHROPIC_API_KEY) {
      return 'anthropic';
    }

    // Fall back to Ollama
    if (this.ollamaEngine) {
      return 'ollama';
    }

    // No engines available
    throw new Error('No AI engines available. Configure Anthropic or Ollama.');
  }

  /**
   * Get active engine info
   */
  getActiveEngine(): { type: 'anthropic' | 'ollama'; name: string } {
    return {
      type: this.activeEngine,
      name: this.activeEngine === 'anthropic' ? 'Claude (Anthropic)' : 'Ministral-3b (Ollama)',
    };
  }

  /**
   * Check health of engines
   */
  async checkHealth(): Promise<{
    anthropic: { available: boolean; ready: boolean };
    ollama: { available: boolean; ready: boolean };
    active: 'anthropic' | 'ollama';
  }> {
    const health = {
      anthropic: { available: !!this.claudeEngine, ready: false },
      ollama: { available: !!this.ollamaEngine, ready: false },
      active: this.activeEngine,
    };

    // Check Claude health
    if (this.claudeEngine) {
      try {
        // Claude doesn't have a direct health check, assume ready if initialized
        health.anthropic.ready = !!process.env.ANTHROPIC_API_KEY;
      } catch {
        health.anthropic.ready = false;
      }
    }

    // Check Ollama health
    if (this.ollamaEngine) {
      try {
        health.ollama.ready = await this.ollamaEngine.health();
      } catch {
        health.ollama.ready = false;
      }
    }

    return health;
  }

  /**
   * Switch active engine at runtime
   */
  async switchEngine(engine: 'anthropic' | 'ollama'): Promise<boolean> {
    if (engine === 'anthropic' && this.claudeEngine) {
      this.activeEngine = 'anthropic';
      return true;
    }

    if (engine === 'ollama' && this.ollamaEngine) {
      const available = await this.ollamaEngine.health();
      if (available) {
        this.activeEngine = 'ollama';
        return true;
      }
    }

    return false;
  }

  /**
   * Generate commit message with automatic fallback
   */
  async generateCommitMessage(diff: string): Promise<string> {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.generateCommitMessage(diff);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.generateCommitMessage(diff);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        // Try fallback engine
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.generateCommitMessage(diff);
        }
      }
      throw error;
    }
  }

  /**
   * Analyze code quality with automatic fallback
   */
  async analyzeCodeQuality(code: string) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.analyzeCodeQuality(code);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.analyzeCodeQuality(code);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.analyzeCodeQuality(code);
        }
      }
      throw error;
    }
  }

  /**
   * Suggest optimizations with automatic fallback
   */
  async suggestOptimizations(code: string) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.suggestOptimizations(code);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.suggestOptimizations(code);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.suggestOptimizations(code);
        }
      }
      throw error;
    }
  }

  /**
   * Explain changes with automatic fallback
   */
  async explainChanges(commit: any) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.explainChanges(commit);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.explainChanges(commit);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.explainChanges(commit);
        }
      }
      throw error;
    }
  }

  /**
   * Recommend patterns with automatic fallback
   */
  async recommendPatterns(events: any[]) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.recommendPatterns(events);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.recommendPatterns(events);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.recommendPatterns(events);
        }
      }
      throw error;
    }
  }

  /**
   * Ask question with automatic fallback
   */
  async ask(question: string, context?: string) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.askAssistant(question, context);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.ask(question, context);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.ask(question, context);
        }
      }
      throw error;
    }
  }

  /**
   * Analyze security risks with automatic fallback
   */
  async analyzeSecurityRisks(code: string) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.analyzeSecurityRisks(code);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.analyzeSecurityRisks(code);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.analyzeSecurityRisks(code);
        }
      }
      throw error;
    }
  }

  /**
   * Generate test cases with automatic fallback
   */
  async generateTestCases(code: string) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.generateTestCases(code);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.generateTestCases(code);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.generateTestCases(code);
        }
      }
      throw error;
    }
  }

  /**
   * Generate documentation with automatic fallback
   */
  async generateDocumentation(code: string, language?: string) {
    try {
      if (this.activeEngine === 'anthropic' && this.claudeEngine) {
        return await this.claudeEngine.generateDocumentation(code, language);
      } else if (this.ollamaEngine) {
        return await this.ollamaEngine.generateDocumentation(code, language);
      }
      throw new Error('No engine available');
    } catch (error) {
      if (this.config.fallback) {
        const fallbackEngine = this.activeEngine === 'anthropic' ? 'ollama' : 'anthropic';
        if (await this.switchEngine(fallbackEngine)) {
          return this.generateDocumentation(code, language);
        }
      }
      throw error;
    }
  }
}

// Export singleton instances with auto-detection
const defaultConfig: AIEngineConfig = {
  type: 'auto',
  ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'ministral-3b',
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  fallback: true,
};

export const aiEngineSelector = new AIEngineSelector(defaultConfig);

export default AIEngineSelector;
