/**
 * GitVan Integration Layer
 *
 * Bridges NextJS Studio with GitVan's autonomic hook system.
 * Enables knowledge hooks, git hooks, and workflow automation from Studio.
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const exec = promisify(require('child_process').exec);

/**
 * GitVan Integration Engine
 * Provides programmatic access to GitVan hooks and workflows
 */
export class GitVanIntegration {
  private gitvanRoot: string;
  private studioRoot: string;

  constructor(gitvanRoot: string = '../..', studioRoot: string = '.') {
    this.gitvanRoot = path.resolve(gitvanRoot);
    this.studioRoot = path.resolve(studioRoot);
  }

  /**
   * Execute a GitVan hook from Studio
   * @param hookName - Name of the hook to execute
   * @param context - Context data for the hook
   */
  async executeHook(hookName: string, context: any): Promise<any> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan hook:execute -- "${hookName}" --context '${JSON.stringify(context)}'`;
      const { stdout, stderr } = await exec(cmd);

      if (stderr) {
        console.error(`Hook ${hookName} warning:`, stderr);
      }

      return JSON.parse(stdout);
    } catch (error) {
      console.error(`Failed to execute hook ${hookName}:`, error);
      throw error;
    }
  }

  /**
   * Register a knowledge hook for JTBD scenario
   * @param scenarioId - JTBD scenario identifier
   * @param definition - Hook definition in Turtle/TTL format
   */
  async registerScenarioHook(scenarioId: string, definition: string): Promise<void> {
    try {
      const hookPath = `${this.gitvanRoot}/.gitvan/hooks/${scenarioId}.ttl`;
      const { stdout } = await exec(`mkdir -p "${path.dirname(hookPath)}"`);

      // Write the hook definition
      await exec(`cat > "${hookPath}" << 'EOF'\n${definition}\nEOF`);

      console.log(`Registered knowledge hook for scenario: ${scenarioId}`);
    } catch (error) {
      console.error(`Failed to register scenario hook:`, error);
      throw error;
    }
  }

  /**
   * List all available knowledge hooks
   */
  async listHooks(): Promise<string[]> {
    try {
      const cmd = `find "${this.gitvanRoot}/.gitvan/hooks" -name "*.ttl" -type f 2>/dev/null | xargs basename -a`;
      const { stdout } = await exec(cmd);
      return stdout.trim().split('\n').filter(h => h.length > 0);
    } catch (error) {
      console.error('Failed to list hooks:', error);
      return [];
    }
  }

  /**
   * Run a GitVan workflow
   * @param workflowName - Name of the workflow
   * @param params - Workflow parameters
   */
  async runWorkflow(workflowName: string, params: any = {}): Promise<any> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan workflow:run -- "${workflowName}" --params '${JSON.stringify(params)}'`;
      const { stdout } = await exec(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`Failed to run workflow ${workflowName}:`, error);
      throw error;
    }
  }

  /**
   * Execute git hooks for validation
   * @param hookType - Type of git hook (pre-commit, commit-msg, etc.)
   * @param data - Data to validate
   */
  async executeGitHook(hookType: string, data: any): Promise<boolean> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan git-hook -- "${hookType}" --data '${JSON.stringify(data)}'`;
      const { stdout } = await exec(cmd);
      return stdout.includes('success');
    } catch (error) {
      console.error(`Git hook ${hookType} failed:`, error);
      return false;
    }
  }

  /**
   * Get knowledge hook registry
   */
  async getKnowledgeRegistry(): Promise<any> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan knowledge:registry --format json`;
      const { stdout } = await exec(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Failed to get knowledge registry:', error);
      return {};
    }
  }

  /**
   * Store JTBD scenario result in knowledge hooks
   * @param scenarioId - Scenario identifier
   * @param result - Execution result
   */
  async storeScenarioResult(scenarioId: string, result: any): Promise<void> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan knowledge:store -- "scenario:${scenarioId}" --value '${JSON.stringify(result)}'`;
      await exec(cmd);
      console.log(`Stored result for scenario: ${scenarioId}`);
    } catch (error) {
      console.error('Failed to store scenario result:', error);
      throw error;
    }
  }

  /**
   * Retrieve learning from previous scenario executions
   * @param scenarioId - Scenario identifier
   */
  async getScenarioLearning(scenarioId: string): Promise<any> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan knowledge:retrieve -- "scenario:${scenarioId}" --format json`;
      const { stdout } = await exec(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Failed to retrieve scenario learning:', error);
      return null;
    }
  }

  /**
   * Trigger Studio automation hook
   * @param triggerType - Type of trigger (test, deploy, review, etc.)
   * @param metadata - Additional metadata
   */
  async triggerAutomation(triggerType: string, metadata: any = {}): Promise<any> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan automation:trigger -- "${triggerType}" --metadata '${JSON.stringify(metadata)}'`;
      const { stdout } = await exec(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      console.error(`Failed to trigger automation ${triggerType}:`, error);
      throw error;
    }
  }

  /**
   * Get Studio automation hooks status
   */
  async getAutomationStatus(): Promise<any> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan automation:status --format json`;
      const { stdout } = await exec(cmd);
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Failed to get automation status:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * Initialize Studio with GitVan hooks
   */
  async initialize(): Promise<void> {
    try {
      const cmd = `cd "${this.gitvanRoot}" && npm run gitvan studio:init`;
      const { stdout } = await exec(cmd);
      console.log('GitVan Studio initialized:', stdout);
    } catch (error) {
      console.warn('GitVan Studio initialization warning:', error);
      // Non-fatal - Studio can work without full GitVan integration
    }
  }
}

// Singleton instance
export const gitvanIntegration = new GitVanIntegration();

/**
 * JTBD-Specific Hook Definitions
 * These are Turtle/TTL format knowledge hooks for JTBD scenarios
 */
export const jtbdHookDefinitions = {
  'semantic-commit': `
@prefix jtbd: <http://gitvan.local/jtbd/> .
@prefix hook: <http://gitvan.local/hook/> .

jtbd:semanticCommit a jtbd:Job ;
  jtbd:jobType "functional" ;
  jtbd:description "Developer enforces semantic commit messages" ;
  jtbd:trigger hook:preCommit ;
  jtbd:outcome [
    jtbd:expectation "commit message matches semantic format" ;
    jtbd:metric "100% of commits match pattern" ;
    jtbd:pattern "^(feat|fix|refactor|docs|style|test|chore):" ;
  ] ;
  hook:priority "high" .
`,

  'code-review': `
@prefix jtbd: <http://gitvan.local/jtbd/> .
@prefix hook: <http://gitvan.local/hook/> .

jtbd:codeReview a jtbd:Job ;
  jtbd:jobType "social" ;
  jtbd:description "Team collaborates on code quality" ;
  jtbd:trigger hook:pullRequest ;
  jtbd:outcome [
    jtbd:expectation "code review provides actionable feedback" ;
    jtbd:metric "2+ reviewers per PR" ;
    jtbd:quality "comprehensive" ;
  ] ;
  hook:priority "high" .
`,

  'deployment': `
@prefix jtbd: <http://gitvan.local/jtbd/> .
@prefix hook: <http://gitvan.local/hook/> .

jtbd:deployment a jtbd:Job ;
  jtbd:jobType "functional" ;
  jtbd:description "Release and deploy safely" ;
  jtbd:trigger hook:release ;
  jtbd:outcome [
    jtbd:expectation "deployment succeeds with rollback capability" ;
    jtbd:metric "100% successful deployments" ;
    jtbd:validation "pre-flight checks passed" ;
  ] ;
  hook:priority "critical" .
`,

  'metrics': `
@prefix jtbd: <http://gitvan.local/jtbd/> .
@prefix hook: <http://gitvan.local/hook/> .

jtbd:metrics a jtbd:Job ;
  jtbd:jobType "emotional" ;
  jtbd:description "Track developer productivity and team health" ;
  jtbd:trigger hook:continuous ;
  jtbd:outcome [
    jtbd:expectation "real-time insights into team performance" ;
    jtbd:metric "metrics collected every 5 minutes" ;
    jtbd:visibility "dashboard and reports" ;
  ] ;
  hook:priority "medium" .
`,
};

/**
 * Git Hook Definitions for Studio Workflows
 */
export const gitHookDefinitions = {
  'pre-commit-studio': `#!/bin/bash
# GitVan Studio Pre-commit Hook
# Validate commits before they're created

SCENARIO_ID="semantic-commit"
COMMIT_MSG="$1"

# Execute JTBD hook via Studio
gitvan hook:execute "studio:validate-commit" \\
  --scenario "$SCENARIO_ID" \\
  --message "$COMMIT_MSG" \\
  --strict

exit $?
`,

  'commit-msg-studio': `#!/bin/bash
# GitVan Studio Commit Message Hook
# Enforce commit message patterns

gitvan hook:execute "studio:check-commit-msg" \\
  --pattern "^(feat|fix|refactor|docs|style|test|chore):" \\
  --file "$1"

exit $?
`,

  'post-merge-studio': `#!/bin/bash
# GitVan Studio Post-merge Hook
# Track merge metrics and trigger deployment checks

gitvan automation:trigger "post-merge" \\
  --type "merge" \\
  --timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

exit 0
`,
};

/**
 * Workflow Generation using Knowledge Hooks
 */
export const workflowTemplates = {
  'studio-test': {
    name: 'Studio Test Workflow',
    description: 'Run JTBD scenarios with validation',
    hooks: ['semantic-commit', 'code-review'],
    steps: [
      { type: 'scenario', id: 'semantic-commit', timeout: 30000 },
      { type: 'scenario', id: 'code-review', timeout: 30000 },
      { type: 'assert', condition: 'all_passed' },
    ],
  },

  'studio-deploy': {
    name: 'Studio Deploy Workflow',
    description: 'Deploy with JTBD scenario validation',
    hooks: ['deployment', 'metrics'],
    steps: [
      { type: 'validation', hook: 'deployment' },
      { type: 'scenario', id: 'deployment', timeout: 60000 },
      { type: 'metrics', hook: 'metrics', aggregate: true },
      { type: 'notification', channel: 'slack', message: 'Deployment complete' },
    ],
  },

  'studio-review': {
    name: 'Studio Code Review Workflow',
    description: 'Run code review JTBD scenario',
    hooks: ['code-review'],
    steps: [
      { type: 'scenario', id: 'code-review', timeout: 45000 },
      { type: 'collect', metric: 'review_quality' },
      { type: 'store', target: 'knowledge:code-review' },
    ],
  },
};
