// src/process-mining/event-log-extractor.mjs
import { useGit } from '../composables/git/index.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:extractor');

export class EventLogExtractor {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.git = useGit();
    this.logger = options.logger || logger;
  }

  async extractTraces(options = {}) {
    const { since, workflowId, branch = 'main' } = options;

    try {
      // Get Git log with workflow execution events
      const logArgs = [
        `--since=${since || '1 month ago'}`,
        '--grep=\\[workflow-execution\\]',
        '--pretty=format:%H|%ai|%s',
        branch
      ];

      const { stdout } = await this.git.log({ args: logArgs });
      const traces = this._parseLogEntries(stdout, workflowId);

      this.logger.info(`Extracted ${traces.length} event traces`);
      return traces;
    } catch (error) {
      this.logger.error(`Failed to extract traces: ${error.message}`);
      throw error;
    }
  }

  _parseLogEntries(logOutput, workflowIdFilter) {
    const entries = logOutput.trim().split('\n');
    const traces = new Map(); // caseId -> activities
    const caseIdRegex = /workflow-execution:([\w-]+)/;
    const activityRegex = /\[step:(\w+)\]/;
    const resourceRegex = /\[resource:(\w+)\]/;

    for (const entry of entries) {
      if (!entry) continue;

      const [hash, timestamp, subject] = entry.split('|');

      const caseIdMatch = subject.match(caseIdRegex);
      if (!caseIdMatch) continue;

      const caseId = caseIdMatch[1];
      if (workflowIdFilter && !caseId.includes(workflowIdFilter)) continue;

      const activityMatch = subject.match(activityRegex);
      const resourceMatch = subject.match(resourceRegex);

      const activity = {
        name: activityMatch ? activityMatch[1] : 'unknown',
        timestamp: new Date(timestamp).toISOString(),
        resource: resourceMatch ? resourceMatch[1] : 'unknown',
        commit: hash
      };

      if (!traces.has(caseId)) {
        traces.set(caseId, {
          caseId,
          activities: []
        });
      }

      traces.get(caseId).activities.push(activity);
    }

    return Array.from(traces.values()).sort((a, b) =>
      a.activities[0]?.timestamp?.localeCompare(b.activities[0]?.timestamp) || 0
    );
  }

  async extractWorkflowStats(workflowId) {
    const traces = await this.extractTraces({ workflowId });

    return {
      workflowId,
      totalExecutions: traces.length,
      avgStepsPerExecution: traces.length > 0
        ? traces.reduce((sum, t) => sum + t.activities.length, 0) / traces.length
        : 0,
      uniqueActivities: this._getUniqueActivities(traces),
      timeRange: this._getTimeRange(traces)
    };
  }

  _getUniqueActivities(traces) {
    const activities = new Set();
    for (const trace of traces) {
      for (const activity of trace.activities) {
        activities.add(activity.name);
      }
    }
    return Array.from(activities);
  }

  _getTimeRange(traces) {
    if (traces.length === 0) return null;

    const allTimestamps = traces.flatMap(t => t.activities.map(a => a.timestamp));
    return {
      start: Math.min(...allTimestamps),
      end: Math.max(...allTimestamps)
    };
  }
}
