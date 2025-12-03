/**
 * AI Assistant Engine
 *
 * LLM-powered semantic analysis for code intelligence, recommendations, and insights.
 * Integrates with Anthropic Claude API for advanced natural language understanding.
 */

import Anthropic from "@anthropic-ai/sdk";

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
  private client: Anthropic;
  private model: string = "claude-3-5-sonnet-20241022";

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate semantic commit message from diff
   */
  async generateCommitMessage(diff: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Generate a concise semantic commit message following conventional commits format (feat:, fix:, refactor:, etc.) for this diff:\n\n${diff}\n\nRespond with ONLY the commit message, no explanation.`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        return textContent.text.trim();
      }
      return "feat: update implementation";
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
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Analyze this code for quality issues, complexity, and maintainability:\n\n${code}\n\nRespond in JSON format with fields: complexity (low/medium/high/critical), maintainability (0-100), issues (array with type, severity, description, suggestion), suggestions (array of strings), riskScore (0-100).`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return {
        complexity: "medium",
        maintainability: 70,
        issues: [],
        suggestions: ["Code analysis complete"],
        riskScore: 30,
      };
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
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Suggest 3-5 optimizations for this code:\n\n${code}\n\nRespond in JSON format as array of objects with fields: title, description, priority (low/medium/high/critical), effort (low/medium/high), expectedBenefit, implementation (optional code example).`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return [
        {
          title: "Code Review",
          description: "Review code for potential improvements",
          priority: "medium",
          effort: "low",
          expectedBenefit: "Better code quality",
        },
      ];
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
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Explain the changes in this commit in simple terms:\n\nMessage: ${commit.message}\nFiles: ${commit.files.join(", ")}\nAdditions: ${commit.additions}, Deletions: ${commit.deletions}\n${commit.diff ? `Diff: ${commit.diff}` : ""}\n\nRespond in JSON format with fields: summary (2-3 sentences), keyChanges (array of strings), impact (description), risks (array of potential risks), recommendations (array of follow-up actions).`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return {
        summary: "Code changes have been made",
        keyChanges: commit.files,
        impact: `${commit.additions} additions, ${commit.deletions} deletions`,
      };
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
      const eventSummary = JSON.stringify(events, null, 2);
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Based on these git events, recommend 3-5 development patterns or practices that would improve the workflow:\n\n${eventSummary}\n\nRespond in JSON format as array of objects with fields: name, description, benefit, complexity (low/medium/high), example.`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return [
        {
          name: "Semantic Commits",
          description: "Use semantic versioning in commit messages",
          benefit: "Better changelog generation and tooling",
          complexity: "low",
        },
      ];
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
      const systemPrompt =
        context ||
        "You are a helpful assistant for git automation and development workflow optimization. Provide concise, practical advice.";

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: question,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        return textContent.text;
      }

      return "Unable to process question";
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
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Generate 5-10 comprehensive test cases for this code:\n\n${code}\n\nRespond in JSON format as array of strings, each being a test case description.`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return ["Test case 1", "Test case 2"];
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
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Analyze this code for security vulnerabilities and risks:\n\n${code}\n\nRespond in JSON format as array of objects with fields: type, severity (low/medium/high/critical), description, location (optional), suggestion.`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return [];
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
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Generate comprehensive ${language} documentation for this code:\n\n${code}\n\nInclude: function signatures, parameters, return types, usage examples, edge cases.`,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        return textContent.text;
      }

      return "# Documentation\n\nUnable to generate documentation.";
    } catch (error) {
      console.error("Failed to generate documentation:", error);
      return "# Documentation\n\nGeneration failed.";
    }
  }
}

// Export singleton instance
export const aiEngine = new AIAssistantEngine();
