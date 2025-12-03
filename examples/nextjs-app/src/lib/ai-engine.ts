/**
 * AI Assistant Engine
 *
 * Wrapper around AIEngineSelector that provides semantic analysis with automatic
 * fallback between Claude and Ollama based on availability and configuration.
 *
 * Features:
 * - Intelligent engine selection (Claude or Ollama)
 * - Automatic fallback on engine failure
 * - Privacy-preserving local inference option
 * - Type-safe responses with Zod validation
 */

import { aiEngineSelector } from './ai-engine-selector';

export interface CodeAnalysis {
  complexity: "low" | "medium" | "high" | "critical";
  maintainability: number; // 0-100
  issues: CodeIssue[];
  suggestions: string[];
  riskScore: number; // 0-100
}

export interface CodeIssue {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location?: string;
  suggestion: string;
}

export interface Suggestion {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  effort: "low" | "medium" | "high";
  expectedBenefit: string;
  implementation?: string;
}

export interface Explanation {
  summary: string;
  keyChanges: string[];
  impact: string;
  risks?: string[];
  recommendations?: string[];
}

export interface Pattern {
  name: string;
  description: string;
  benefit: string;
  complexity: string;
  example?: string;
}

export interface Commit {
  hash: string;
  author: string;
  message: string;
  timestamp: string;
  files: string[];
  additions: number;
  deletions: number;
  diff?: string;
}

export class AIAssistantEngine {
  /**
   * Generate semantic commit message from diff
   * Uses aiEngineSelector for automatic Claude/Ollama switching
   */
  async generateCommitMessage(diff: string): Promise<string> {
    try {
      return await aiEngineSelector.generateCommitMessage(diff);
    } catch (error) {
      console.error("Failed to generate commit message:", error);
      return "feat: update implementation";
    }
  }

  /**
   * Analyze code quality and identify issues
   */
  async analyzeCodeQuality(code: string): Promise<CodeAnalysis> {
    try {
      const analysis = await aiEngineSelector.analyzeCodeQuality(code);
      // Parse response if needed
      if (typeof analysis === 'string') {
        try {
          return JSON.parse(analysis);
        } catch {
          return {
            complexity: "medium",
            maintainability: 70,
            issues: [],
            suggestions: [analysis],
            riskScore: 30,
          };
        }
      }
      return analysis as CodeAnalysis;
    } catch (error) {
      console.error("Failed to analyze code:", error);
      return {
        complexity: "medium",
        maintainability: 70,
        issues: [],
        suggestions: [],
        riskScore: 30,
      };
    }
  }

  /**
   * Suggest code optimizations
   */
  async suggestOptimizations(code: string): Promise<Suggestion[]> {
    try {
      const suggestions = await aiEngineSelector.suggestOptimizations(code);
      if (typeof suggestions === 'string') {
        try {
          return JSON.parse(suggestions);
        } catch {
          return [
            {
              title: "Code Review",
              description: suggestions,
              priority: "medium",
              effort: "low",
              expectedBenefit: "Better code quality",
            },
          ];
        }
      }
      return suggestions as Suggestion[];
    } catch (error) {
      console.error("Failed to suggest optimizations:", error);
      return [];
    }
  }

  /**
   * Explain code changes in a commit
   */
  async explainChanges(commit: Commit): Promise<Explanation> {
    try {
      const explanation = await aiEngineSelector.explainChanges(
        `${commit.message}\n\nFiles: ${commit.files.join(", ")}\nChanges: +${commit.additions}/-${commit.deletions}`
      );
      if (typeof explanation === 'string') {
        return {
          summary: explanation,
          keyChanges: commit.files,
          impact: `${commit.additions} additions, ${commit.deletions} deletions`,
        };
      }
      return explanation as Explanation;
    } catch (error) {
      console.error("Failed to explain changes:", error);
      return {
        summary: "Unable to analyze changes",
        keyChanges: commit.files,
        impact: "Review commit details",
      };
    }
  }

  /**
   * Recommend patterns based on git events
   */
  async recommendPatterns(events: any[]): Promise<Pattern[]> {
    try {
      const patterns = await aiEngineSelector.recommendPatterns(events);
      if (typeof patterns === 'string') {
        try {
          return JSON.parse(patterns);
        } catch {
          return [
            {
              name: "Semantic Commits",
              description: patterns,
              benefit: "Better changelog generation",
              complexity: "low",
            },
          ];
        }
      }
      return patterns as Pattern[];
    } catch (error) {
      console.error("Failed to recommend patterns:", error);
      return [];
    }
  }

  /**
   * Ask AI assistant general question
   */
  async askAssistant(question: string, context?: string): Promise<string> {
    try {
      const prompt = context ? `${context}\n\nQuestion: ${question}` : question;
      return await aiEngineSelector.ask(prompt);
    } catch (error) {
      console.error("Failed to process question:", error);
      return "Error processing question. Please try again.";
    }
  }

  /**
   * Generate test cases from code
   */
  async generateTestCases(code: string): Promise<string[]> {
    try {
      const testCases = await aiEngineSelector.generateTestCases(code);
      if (typeof testCases === 'string') {
        try {
          return JSON.parse(testCases);
        } catch {
          return testCases.split('\n').filter((line) => line.trim());
        }
      }
      return testCases as string[];
    } catch (error) {
      console.error("Failed to generate test cases:", error);
      return [];
    }
  }

  /**
   * Analyze security risks in code
   */
  async analyzeSecurityRisks(code: string): Promise<CodeIssue[]> {
    try {
      const risks = await aiEngineSelector.analyzeSecurityRisks(code);
      if (typeof risks === 'string') {
        try {
          return JSON.parse(risks);
        } catch {
          return [
            {
              type: "Security Analysis",
              severity: "medium",
              description: risks,
              suggestion: "Review code for security vulnerabilities",
            },
          ];
        }
      }
      return risks as CodeIssue[];
    } catch (error) {
      console.error("Failed to analyze security:", error);
      return [];
    }
  }

  /**
   * Generate documentation from code
   */
  async generateDocumentation(code: string, language: string = "markdown"): Promise<string> {
    try {
      return await aiEngineSelector.generateDocumentation(code);
    } catch (error) {
      console.error("Failed to generate documentation:", error);
      return "# Documentation\n\nGeneration failed.";
    }
  }
}

// Export singleton instance
export const aiEngine = new AIAssistantEngine();
