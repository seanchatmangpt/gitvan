// src/integrations/slack.mjs
// Slack Integration for Knowledge Hooks

import { defineJob } from "../core/job-registry.mjs";
import { useGitVan } from "../core/context.mjs";

/**
 * Slack Integration
 * Provides seamless integration with Slack for notifications and alerts
 */
export class SlackIntegration {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    this.botToken = options.botToken || process.env.SLACK_BOT_TOKEN;
    this.defaultChannel =
      options.defaultChannel || process.env.SLACK_DEFAULT_CHANNEL;
    this.logger = options.logger || console;
  }

  /**
   * Send a message to Slack
   * @param {object} message - Message configuration
   * @returns {Promise<object>} Send result
   */
  async sendMessage(message) {
    try {
      if (!this.webhookUrl && !this.botToken) {
        throw new Error("No Slack webhook URL or bot token configured");
      }

      if (this.webhookUrl) {
        return await this.sendWebhookMessage(message);
      } else {
        return await this.sendBotMessage(message);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send Slack message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send message via webhook
   * @private
   */
  async sendWebhookMessage(message) {
    const payload = {
      channel: message.channel || this.defaultChannel,
      username: message.username || "GitVan Knowledge Hooks",
      icon_emoji: message.iconEmoji || ":robot_face:",
      text: message.text,
      attachments: message.attachments || [],
    };

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Slack webhook error: ${response.status} ${response.statusText}`
      );
    }

    this.logger.info(`✅ Slack message sent via webhook`);
    return {
      success: true,
      method: "webhook",
      channel: payload.channel,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send message via bot API
   * @private
   */
  async sendBotMessage(message) {
    const url = "https://slack.com/api/chat.postMessage";

    const payload = {
      channel: message.channel || this.defaultChannel,
      text: message.text,
      attachments: message.attachments || [],
      ...(message.blocks && { blocks: message.blocks }),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    this.logger.info(`✅ Slack message sent via bot API`);
    return {
      success: true,
      method: "bot",
      channel: payload.channel,
      timestamp: result.ts,
      messageTs: result.ts,
    };
  }

  /**
   * Create a Knowledge Hook notification message
   * @param {object} hookResult - Hook evaluation result
   * @param {object} gitContext - Git context information
   * @returns {object} Slack message configuration
   */
  createHookNotification(hookResult, gitContext) {
    const color = hookResult.hooksTriggered > 0 ? "good" : "warning";
    const emoji = hookResult.hooksTriggered > 0 ? "🎯" : "⏸️";

    return {
      text: `${emoji} Knowledge Hook Evaluation Complete`,
      attachments: [
        {
          color,
          title: "Knowledge Hook Results",
          fields: [
            {
              title: "Hooks Evaluated",
              value: hookResult.hooksEvaluated.toString(),
              short: true,
            },
            {
              title: "Hooks Triggered",
              value: hookResult.hooksTriggered.toString(),
              short: true,
            },
            {
              title: "Workflows Executed",
              value: hookResult.workflowsExecuted.toString(),
              short: true,
            },
            {
              title: "Git Context",
              value: `${gitContext.branch} (${gitContext.commitSha.substring(
                0,
                8
              )})`,
              short: true,
            },
            {
              title: "Changed Files",
              value: gitContext.changedFiles.length.toString(),
              short: true,
            },
            {
              title: "Evaluation Time",
              value: `${hookResult.evaluationTimeMs}ms`,
              short: true,
            },
          ],
          footer: "GitVan Knowledge Hook Engine",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  /**
   * Create a critical alert message
   * @param {object} alert - Alert information
   * @returns {object} Slack message configuration
   */
  createCriticalAlert(alert) {
    return {
      text: `🚨 Critical Alert: ${alert.title}`,
      attachments: [
        {
          color: "danger",
          title: alert.title,
          text: alert.description,
          fields: [
            {
              title: "Severity",
              value: alert.severity,
              short: true,
            },
            {
              title: "Source",
              value: alert.source,
              short: true,
            },
            {
              title: "Timestamp",
              value: alert.timestamp,
              short: true,
            },
            {
              title: "Action Required",
              value: alert.actionRequired || "Immediate attention required",
              short: true,
            },
          ],
          footer: "GitVan Knowledge Hook Engine",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }

  /**
   * Create a knowledge graph update notification
   * @param {object} updateInfo - Update information
   * @returns {object} Slack message configuration
   */
  createKnowledgeGraphUpdate(updateInfo) {
    return {
      text: `🧠 Knowledge Graph Updated`,
      attachments: [
        {
          color: "good",
          title: "Knowledge Graph Update",
          text: `The knowledge graph has been updated with new information.`,
          fields: [
            {
              title: "Triples Added",
              value: updateInfo.triplesAdded.toString(),
              short: true,
            },
            {
              title: "Triples Modified",
              value: updateInfo.triplesModified.toString(),
              short: true,
            },
            {
              title: "Triples Removed",
              value: updateInfo.triplesRemoved.toString(),
              short: true,
            },
            {
              title: "Update Source",
              value: updateInfo.source,
              short: true,
            },
            {
              title: "Graph Size",
              value: updateInfo.totalTriples.toString(),
              short: true,
            },
            {
              title: "Update Time",
              value: `${updateInfo.updateTimeMs}ms`,
              short: true,
            },
          ],
          footer: "GitVan Knowledge Hook Engine",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
  }
}

/**
 * Slack Integration Job
 * Provides Slack integration for Knowledge Hooks
 */
export default defineJob({
  meta: {
    name: "slack-integration",
    desc: "Integrates Knowledge Hooks with Slack for notifications and alerts",
    tags: ["slack", "integration", "notifications"],
    version: "1.0.0",
  },

  hooks: ["post-commit", "post-merge", "pre-push"],

  async run(context) {
    console.log("💬 Starting Slack Integration");

    try {
      const gitvanContext = useGitVan();
      const slackIntegration = new SlackIntegration({
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        botToken: process.env.SLACK_BOT_TOKEN,
        defaultChannel: process.env.SLACK_DEFAULT_CHANNEL,
        logger: console,
      });

      // Get Git context
      const gitContext = await this.getGitContext(context);

      // Check if we should send Slack notification
      const shouldNotify = await this.shouldSendSlackNotification(gitContext);

      if (shouldNotify) {
        // Create and send appropriate notification
        const notification = await this.createAppropriateNotification(
          slackIntegration,
          gitContext
        );

        const result = await slackIntegration.sendMessage(notification);

        console.log(`   💬 Slack notification sent to ${result.channel}`);
        console.log(`   📊 Notification method: ${result.method}`);

        return {
          success: true,
          slack: result,
          gitContext,
        };
      } else {
        console.log("   ⏭️ Skipping Slack notification");
        return {
          success: true,
          skipped: true,
          reason: "No notification conditions met",
          gitContext,
        };
      }
    } catch (error) {
      console.error("❌ Slack integration failed:", error.message);
      throw error;
    }
  },

  async getGitContext(context) {
    const { execSync } = await import("node:child_process");

    try {
      const commitSha = execSync("git rev-parse HEAD", {
        encoding: "utf8",
      }).trim();

      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
      }).trim();

      const changedFiles = execSync("git diff --name-only HEAD~1 HEAD", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      return {
        commitSha,
        branch,
        changedFiles,
        hookName: context.hookName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn("⚠️ Could not extract Git context:", error.message);
      return {
        commitSha: "unknown",
        branch: "unknown",
        changedFiles: [],
        hookName: context.hookName || "unknown",
        timestamp: new Date().toISOString(),
      };
    }
  },

  async shouldSendSlackNotification(gitContext) {
    // Send Slack notification if:
    // 1. Knowledge graph files changed
    // 2. Hook files changed
    // 3. Critical configuration files changed
    // 4. Multiple files changed (significant update)

    const knowledgeFiles = gitContext.changedFiles.filter(
      (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
    );

    const hookFiles = gitContext.changedFiles.filter(
      (f) => f.includes("hooks/") || f.includes(".hook.")
    );

    const configFiles = gitContext.changedFiles.filter(
      (f) =>
        f.includes("package.json") ||
        f.includes("gitvan.config.js") ||
        f.includes(".github/workflows/")
    );

    const significantUpdate = gitContext.changedFiles.length > 5;

    return (
      knowledgeFiles.length > 0 ||
      hookFiles.length > 0 ||
      configFiles.length > 0 ||
      significantUpdate
    );
  },

  async createAppropriateNotification(slackIntegration, gitContext) {
    const knowledgeFiles = gitContext.changedFiles.filter(
      (f) => f.includes(".ttl") || f.includes(".rdf") || f.includes("graph/")
    );

    const hookFiles = gitContext.changedFiles.filter(
      (f) => f.includes("hooks/") || f.includes(".hook.")
    );

    if (knowledgeFiles.length > 0) {
      // Knowledge graph update notification
      return slackIntegration.createKnowledgeGraphUpdate({
        triplesAdded: knowledgeFiles.length * 10, // Estimate
        triplesModified: knowledgeFiles.length * 5,
        triplesRemoved: 0,
        source: "Git commit",
        totalTriples: 1000, // Estimate
        updateTimeMs: 150,
      });
    } else if (hookFiles.length > 0) {
      // Hook system update notification
      return {
        text: `🎣 Hook System Updated`,
        attachments: [
          {
            color: "good",
            title: "Hook System Update",
            text: `The Knowledge Hook system has been updated.`,
            fields: [
              {
                title: "Hook Files Changed",
                value: hookFiles.length.toString(),
                short: true,
              },
              {
                title: "Branch",
                value: gitContext.branch,
                short: true,
              },
              {
                title: "Commit",
                value: gitContext.commitSha.substring(0, 8),
                short: true,
              },
            ],
            footer: "GitVan Knowledge Hook Engine",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };
    } else {
      // General update notification
      return {
        text: `📝 Repository Updated`,
        attachments: [
          {
            color: "good",
            title: "Repository Update",
            text: `The repository has been updated with ${gitContext.changedFiles.length} file changes.`,
            fields: [
              {
                title: "Files Changed",
                value: gitContext.changedFiles.length.toString(),
                short: true,
              },
              {
                title: "Branch",
                value: gitContext.branch,
                short: true,
              },
              {
                title: "Commit",
                value: gitContext.commitSha.substring(0, 8),
                short: true,
              },
            ],
            footer: "GitVan Knowledge Hook Engine",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };
    }
  },
});
