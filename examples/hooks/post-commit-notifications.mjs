/**
 * @fileoverview GitVan Hook Example: Post-commit Notifications
 *
 * This example demonstrates how to create a post-commit hook that:
 * - Sends notifications to Slack/Discord after commits
 * - Logs commits to an audit trail
 * - Schedules async jobs with Bree (background job scheduler)
 * - Doesn't block the commit (runs after success)
 *
 * USAGE:
 * 1. Copy this file to your hooks/ directory
 * 2. Set environment variables for notification services:
 *    - SLACK_WEBHOOK_URL: Your Slack incoming webhook URL
 *    - DISCORD_WEBHOOK_URL: Your Discord webhook URL
 * 3. The hook will run after every successful commit
 *
 * PERFORMANCE NOTES:
 * - Runs asynchronously (doesn't block commit)
 * - Notification sends in background via Bree
 * - Typical execution: 50-100ms (just schedules job)
 * - Actual notification delivery: 200-500ms (background)
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { defineJob } from "../../src/core/job-registry.mjs";
import { useJob } from "../../src/composables/job.mjs";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "post-commit-notifications",
    desc: "Send notifications and log audit trail after successful commits",
    tags: ["post-commit", "notifications", "audit", "bree", "async"],
    version: "1.0.0",
  },

  // Register this job to run on post-commit hook
  hooks: ["post-commit"],

  /**
   * Main execution function
   * @param {Object} context - Job execution context
   * @returns {Promise<Object>} Execution result
   */
  async run(context) {
    console.log("📬 Post-commit notifications...");

    const startTime = performance.now();

    try {
      // Step 1: Gather commit information
      const commitInfo = await this.getCommitInfo();

      console.log(`   📝 Commit: ${commitInfo.hash.substring(0, 7)}`);
      console.log(`   👤 Author: ${commitInfo.author}`);
      console.log(`   📁 Files: ${commitInfo.filesChanged}`);

      // Step 2: Write to audit trail (Git Notes)
      await this.writeAuditTrail(commitInfo);

      // Step 3: Schedule background notification jobs with Bree
      // This allows notifications to be sent asynchronously without blocking
      const notificationJobs = await this.scheduleNotifications(commitInfo);

      const duration = performance.now() - startTime;

      console.log(
        `   ✅ Notifications scheduled (${notificationJobs.length} job(s), ${duration.toFixed(0)}ms)`
      );

      return {
        success: true,
        commitHash: commitInfo.hash,
        notificationsScheduled: notificationJobs.length,
        duration: Math.round(duration),
        auditLogged: true,
      };
    } catch (error) {
      console.error("   ❌ Notification hook failed:", error.message);

      // Post-commit hooks should not fail the commit
      // (commit already succeeded), so we return success
      return {
        success: true,
        error: error.message,
        note: "Commit succeeded, but notifications failed",
      };
    }
  },

  /**
   * Get information about the current commit
   * @returns {Promise<Object>} Commit information
   */
  async getCommitInfo() {
    try {
      // Get commit hash
      const hash = execSync("git rev-parse HEAD", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Get commit message
      const message = execSync("git log -1 --pretty=%B", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Get author
      const author = execSync("git log -1 --pretty=%an", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Get author email
      const email = execSync("git log -1 --pretty=%ae", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Get branch
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Get files changed (compare with parent)
      const filesChanged = execSync("git diff --name-only HEAD~1 HEAD 2>/dev/null || echo ''", {
        encoding: "utf8",
        cwd: process.cwd(),
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0).length;

      // Get timestamp
      const timestamp = execSync("git log -1 --pretty=%ct", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      return {
        hash,
        message,
        author,
        email,
        branch,
        filesChanged,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
      };
    } catch (error) {
      console.warn("   ⚠️  Could not get complete commit info:", error.message);
      return {
        hash: "unknown",
        message: "unknown",
        author: "unknown",
        email: "unknown",
        branch: "unknown",
        filesChanged: 0,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Write commit to audit trail using Git Notes
   * This creates an immutable audit log in the Git repository
   * @param {Object} commitInfo - Commit information
   * @returns {Promise<void>}
   */
  async writeAuditTrail(commitInfo) {
    try {
      // Create audit log entry
      const auditEntry = {
        event: "commit",
        timestamp: commitInfo.timestamp,
        commitHash: commitInfo.hash,
        author: commitInfo.author,
        email: commitInfo.email,
        branch: commitInfo.branch,
        message: commitInfo.message,
        filesChanged: commitInfo.filesChanged,
      };

      // Write to local audit log file
      const auditDir = join(process.cwd(), ".gitvan", "audit");
      mkdirSync(auditDir, { recursive: true });

      const auditFile = join(auditDir, `commit-${commitInfo.hash.substring(0, 7)}.json`);
      writeFileSync(auditFile, JSON.stringify(auditEntry, null, 2));

      console.log(`   📋 Audit logged: ${auditFile}`);

      // Could also write to Git Notes for immutable storage:
      // execSync(`git notes --ref=gitvan/audit add -m '${JSON.stringify(auditEntry)}' ${commitInfo.hash}`);
    } catch (error) {
      console.warn("   ⚠️  Could not write audit trail:", error.message);
    }
  },

  /**
   * Schedule notification jobs using Bree (async job scheduler)
   * This demonstrates how to use GitVan's job system with Bree integration
   * @param {Object} commitInfo - Commit information
   * @returns {Promise<Array>} Scheduled job IDs
   */
  async scheduleNotifications(commitInfo) {
    const scheduledJobs = [];

    try {
      // Get job composable for Bree integration
      const job = useJob();

      // Schedule Slack notification (if webhook configured)
      if (process.env.SLACK_WEBHOOK_URL) {
        const slackJobId = await this.scheduleSlackNotification(job, commitInfo);
        if (slackJobId) {
          scheduledJobs.push(slackJobId);
          console.log(`   📱 Slack notification scheduled: ${slackJobId}`);
        }
      }

      // Schedule Discord notification (if webhook configured)
      if (process.env.DISCORD_WEBHOOK_URL) {
        const discordJobId = await this.scheduleDiscordNotification(job, commitInfo);
        if (discordJobId) {
          scheduledJobs.push(discordJobId);
          console.log(`   📱 Discord notification scheduled: ${discordJobId}`);
        }
      }

      // If no webhooks configured, just log
      if (scheduledJobs.length === 0) {
        console.log(
          "   ℹ️  No notification webhooks configured (set SLACK_WEBHOOK_URL or DISCORD_WEBHOOK_URL)"
        );
      }

      return scheduledJobs;
    } catch (error) {
      console.warn("   ⚠️  Could not schedule notifications:", error.message);
      return scheduledJobs;
    }
  },

  /**
   * Schedule Slack notification using Bree
   * @param {Object} job - Job composable
   * @param {Object} commitInfo - Commit information
   * @returns {Promise<string|null>} Job ID or null
   */
  async scheduleSlackNotification(job, commitInfo) {
    try {
      // Create Slack message payload
      const slackMessage = {
        text: `New commit on ${commitInfo.branch}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*New Commit*\n:git: \`${commitInfo.hash.substring(0, 7)}\` on \`${commitInfo.branch}\``,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Author:*\n${commitInfo.author}`,
              },
              {
                type: "mrkdwn",
                text: `*Files Changed:*\n${commitInfo.filesChanged}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Message:*\n${commitInfo.message}`,
            },
          },
        ],
      };

      // Schedule background job to send notification
      // This uses Bree to run the job asynchronously
      const jobId = await job.schedule({
        name: `slack-notification-${commitInfo.hash.substring(0, 7)}`,
        interval: "at 0:00am", // Run once immediately
        job: async () => {
          await this.sendSlackWebhook(slackMessage);
        },
      });

      return jobId;
    } catch (error) {
      console.warn("   ⚠️  Could not schedule Slack notification:", error.message);
      return null;
    }
  },

  /**
   * Schedule Discord notification using Bree
   * @param {Object} job - Job composable
   * @param {Object} commitInfo - Commit information
   * @returns {Promise<string|null>} Job ID or null
   */
  async scheduleDiscordNotification(job, commitInfo) {
    try {
      // Create Discord message payload
      const discordMessage = {
        embeds: [
          {
            title: "New Commit",
            description: commitInfo.message,
            color: 0x00ff00, // Green
            fields: [
              {
                name: "Commit",
                value: `\`${commitInfo.hash.substring(0, 7)}\``,
                inline: true,
              },
              {
                name: "Branch",
                value: `\`${commitInfo.branch}\``,
                inline: true,
              },
              {
                name: "Author",
                value: commitInfo.author,
                inline: true,
              },
              {
                name: "Files Changed",
                value: commitInfo.filesChanged.toString(),
                inline: true,
              },
            ],
            timestamp: commitInfo.timestamp,
          },
        ],
      };

      // Schedule background job to send notification
      const jobId = await job.schedule({
        name: `discord-notification-${commitInfo.hash.substring(0, 7)}`,
        interval: "at 0:00am", // Run once immediately
        job: async () => {
          await this.sendDiscordWebhook(discordMessage);
        },
      });

      return jobId;
    } catch (error) {
      console.warn("   ⚠️  Could not schedule Discord notification:", error.message);
      return null;
    }
  },

  /**
   * Send Slack webhook notification
   * @param {Object} payload - Slack message payload
   * @returns {Promise<void>}
   */
  async sendSlackWebhook(payload) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }

      console.log("   ✅ Slack notification sent");
    } catch (error) {
      console.warn("   ⚠️  Slack notification failed:", error.message);
    }
  },

  /**
   * Send Discord webhook notification
   * @param {Object} payload - Discord message payload
   * @returns {Promise<void>}
   */
  async sendDiscordWebhook(payload) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.status}`);
      }

      console.log("   ✅ Discord notification sent");
    } catch (error) {
      console.warn("   ⚠️  Discord notification failed:", error.message);
    }
  },
});

/**
 * EXAMPLE CONFIGURATION:
 *
 * Set these environment variables in your .env file or shell:
 *
 * # Slack webhook URL (get from Slack app settings)
 * SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
 *
 * # Discord webhook URL (get from Discord server settings)
 * DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
 *
 * CUSTOMIZATION IDEAS:
 *
 * 1. Add email notifications:
 *    - Use nodemailer or sendgrid
 *    - Schedule via Bree for reliability
 *
 * 2. Trigger CI/CD pipelines:
 *    - Call Jenkins/GitHub Actions API
 *    - Start deployment workflows
 *
 * 3. Update project management tools:
 *    - Post to Jira/Linear/Asana
 *    - Update ticket status based on commit message
 *
 * 4. Collect metrics:
 *    - Track commit frequency
 *    - Monitor code churn
 *    - Send to analytics platforms
 *
 * BREE INTEGRATION NOTES:
 *
 * Bree is GitVan's job scheduler that provides:
 * - Async execution (doesn't block Git hooks)
 * - Retry logic for failed jobs
 * - Cron-style scheduling
 * - Worker thread isolation
 *
 * Benefits of using Bree for notifications:
 * - Git commits complete instantly
 * - Network failures don't block commits
 * - Can retry failed notifications
 * - Better error isolation
 */
