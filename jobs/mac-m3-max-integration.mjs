// jobs/mac-m3-max-integration.mjs
// Mac M3 Max Native System Integration for Developer Workflow Detection
// Integrates with Mail.app, Calendar.app, Accessibility API, and FSEvents

import { defineJob } from "../src/core/job-registry.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan } from "../src/core/context.mjs";
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "mac-m3-max-integration",
    desc: "Mac M3 Max native system integration for developer workflow detection",
    tags: [
      "mac-integration",
      "email-monitoring",
      "keyboard-monitoring",
      "file-system-monitoring",
      "accessibility",
      "developer-workflow",
      "m3-max",
      "native-integration"
    ],
    version: "1.0.0",
  },

  // Mac-specific signals (not Git hooks)
  hooks: [
    "start-of-day",
    "email-work-detected",
    "keyboard-activity",
    "file-modification",
    "calendar-event",
    "application-switch",
    "git-activity"
  ],

  async run(context) {
    console.log("🍎 Mac M3 Max Integration - Native System Detection");
    console.log(`   📡 Signal: ${context.hookName}`);
    console.log(`   🏗️ Architecture: M3 Max`);

    try {
      // Get GitVan context
      const gitvanContext = useGitVan();

      // Initialize Knowledge Hook Orchestrator
      const orchestrator = new HookOrchestrator({
        graphDir: "./hooks/developer-workflow",
        context: gitvanContext,
        logger: console,
      });

      // Extract Mac-specific context
      const macContext = await this.extractMacContext(context);

      console.log(`   📧 Email context: ${macContext.email.workEmails} work emails`);
      console.log(`   ⌨️ Keyboard activity: ${macContext.keyboard.activityLevel}`);
      console.log(`   📁 File changes: ${macContext.fileSystem.modifiedFiles} files`);
      console.log(`   📅 Calendar events: ${macContext.calendar.workEventsToday} work events`);

      // Evaluate Knowledge Hooks with Mac context
      const evaluationResult = await orchestrator.evaluate({
        macContext: macContext,
        verbose: true,
        macSignal: context.hookName,
      });

      console.log(
        `   🧠 Mac Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`
      );
      console.log(
        `   ⚡ Mac Hooks triggered: ${evaluationResult.hooksTriggered}`
      );
      console.log(
        `   🔄 Mac Workflows executed: ${evaluationResult.workflowsExecuted}`
      );

      if (evaluationResult.hooksTriggered > 0) {
        console.log("   🎯 Triggered Mac Knowledge Hooks:");
        for (const hook of evaluationResult.triggeredHooks) {
          console.log(
            `     ✅ ${hook.id} (${hook.predicateType}) - ${hook.workflowCategory}`
          );
        }
      }

      // Generate Mac-integrated daily report
      const dailyReport = await this.generateMacDailyReport(macContext);

      // Deliver report through Mac-native channels
      await this.deliverMacReport(dailyReport);

      // Generate Mac integration report
      const macReport = {
        timestamp: new Date().toISOString(),
        macSignal: context.hookName,
        macContext: macContext,
        evaluationSummary: {
          hooksEvaluated: evaluationResult.hooksEvaluated,
          hooksTriggered: evaluationResult.hooksTriggered,
          workflowsExecuted: evaluationResult.workflowsExecuted,
          triggeredHooks: evaluationResult.triggeredHooks.map((h) => ({
            id: h.id,
            title: h.title,
            predicateType: h.predicateType,
            workflowCategory: h.workflowCategory,
            evaluationResult: h.evaluationResult,
          })),
        },
        dailyReport: dailyReport,
        status:
          evaluationResult.hooksTriggered > 0 ? "TRIGGERED" : "NO_TRIGGER",
        message: `Mac signal '${context.hookName}' processed.`,
      };

      // Write Mac integration report to disk
      const reportsDir = join(
        process.cwd(),
        "reports",
        "mac-integration"
      );
      mkdirSync(reportsDir, { recursive: true });
      const filename = `mac-integration-report-${context.hookName}-${Date.now()}.json`;
      const filepath = join(reportsDir, filename);

      writeFileSync(filepath, JSON.stringify(macReport, null, 2));

      console.log(`📄 Mac Integration Report written to: ${filepath}`);

      return {
        success: true,
        report: macReport,
      };
    } catch (error) {
      console.error(
        `❌ Mac M3 Max Integration Error (${context.hookName}):`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        macSignal: context.hookName,
      };
    }
  },

  /**
   * Extract Mac-specific context using native APIs
   */
  async extractMacContext(context) {
    return {
      timestamp: new Date().toISOString(),
      mac: {
        systemVersion: await this.getMacSystemVersion(),
        architecture: "M3 Max",
        permissions: await this.checkMacPermissions(),
        hardware: await this.getMacHardwareInfo(),
      },
      email: await this.extractEmailContext(),
      keyboard: await this.extractKeyboardContext(),
      fileSystem: await this.extractFileSystemContext(),
      calendar: await this.extractCalendarContext(),
      applications: await this.extractApplicationContext(),
      signal: context.hookName,
    };
  },

  /**
   * Get Mac system version
   */
  async getMacSystemVersion() {
    try {
      const result = execSync("sw_vers", { encoding: "utf8" });
      const lines = result.split("\n");
      const productName = lines[0].split(":")[1].trim();
      const productVersion = lines[1].split(":")[1].trim();
      return `${productName} ${productVersion}`;
    } catch (error) {
      return "macOS (version unknown)";
    }
  },

  /**
   * Check Mac permissions
   */
  async checkMacPermissions() {
    return {
      accessibility: await this.checkAccessibilityPermission(),
      mail: await this.checkMailPermission(),
      calendar: await this.checkCalendarPermission(),
      documents: await this.checkDocumentsPermission(),
    };
  },

  /**
   * Check Accessibility permission
   */
  async checkAccessibilityPermission() {
    try {
      // Try to get current application (requires accessibility permission)
      execSync("osascript -e 'tell application \"System Events\" to get name of first application process whose frontmost is true'", { encoding: "utf8" });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check Mail permission
   */
  async checkMailPermission() {
    try {
      execSync("osascript -e 'tell application \"Mail\" to get count of messages in inbox'", { encoding: "utf8" });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check Calendar permission
   */
  async checkCalendarPermission() {
    try {
      execSync("osascript -e 'tell application \"Calendar\" to get count of calendars'", { encoding: "utf8" });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Check Documents permission
   */
  async checkDocumentsPermission() {
    try {
      const homeDir = process.env.HOME;
      const testFile = join(homeDir, "Documents", ".gitvan-test");
      writeFileSync(testFile, "test");
      const exists = existsSync(testFile);
      if (exists) {
        execSync(`rm "${testFile}"`);
      }
      return exists;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get Mac hardware info
   */
  async getMacHardwareInfo() {
    try {
      const cpuInfo = execSync("sysctl -n machdep.cpu.brand_string", { encoding: "utf8" }).trim();
      const memoryInfo = execSync("sysctl -n hw.memsize", { encoding: "utf8" }).trim();
      const memoryGB = Math.round(parseInt(memoryInfo) / (1024 * 1024 * 1024));
      
      return {
        cpu: cpuInfo,
        memory: `${memoryGB}GB`,
        architecture: "M3 Max"
      };
    } catch (error) {
      return {
        cpu: "Apple M3 Max",
        memory: "Unknown",
        architecture: "M3 Max"
      };
    }
  },

  /**
   * Extract email context using AppleScript
   */
  async extractEmailContext() {
    const emailScript = `
      tell application "Mail"
        try
          set workEmails to messages in inbox whose subject contains "work" or subject contains "sprint" or subject contains "meeting" or subject contains "daily"
          set unreadCount to count of messages in inbox whose read status is false
          set totalEmails to count of messages in inbox
          return {count of workEmails, unreadCount, totalEmails}
        on error
          return {0, 0, 0}
        end try
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${emailScript}'`, { encoding: "utf8" });
      const parts = result.trim().split(", ");
      return {
        workEmails: parseInt(parts[0]) || 0,
        unreadCount: parseInt(parts[1]) || 0,
        totalEmails: parseInt(parts[2]) || 0,
        lastChecked: new Date().toISOString(),
        status: "success"
      };
    } catch (error) {
      return {
        workEmails: 0,
        unreadCount: 0,
        totalEmails: 0,
        error: "Email access not available",
        status: "error"
      };
    }
  },

  /**
   * Extract keyboard context (simulated - would require native app)
   */
  async extractKeyboardContext() {
    // This would require a native macOS app with accessibility permissions
    // For now, we'll simulate based on system activity
    try {
      const lastActivity = await this.getLastSystemActivity();
      const currentApp = await this.getCurrentApplication();
      
      return {
        lastActivity: lastActivity,
        currentApplication: currentApp,
        activityLevel: await this.getSystemActivityLevel(),
        workAppsActive: await this.getWorkAppsActive(),
        status: "simulated"
      };
    } catch (error) {
      return {
        lastActivity: "unknown",
        currentApplication: "unknown",
        activityLevel: 0,
        workAppsActive: false,
        error: "Keyboard monitoring not available",
        status: "error"
      };
    }
  },

  /**
   * Get last system activity (simulated)
   */
  async getLastSystemActivity() {
    try {
      // Check last login time as proxy for activity
      const result = execSync("last -1 | head -1", { encoding: "utf8" });
      return result.trim();
    } catch (error) {
      return "unknown";
    }
  },

  /**
   * Get current application (requires accessibility permission)
   */
  async getCurrentApplication() {
    try {
      const result = execSync("osascript -e 'tell application \"System Events\" to get name of first application process whose frontmost is true'", { encoding: "utf8" });
      return result.trim();
    } catch (error) {
      return "unknown";
    }
  },

  /**
   * Get system activity level (simulated)
   */
  async getSystemActivityLevel() {
    try {
      // Use CPU usage as proxy for activity
      const result = execSync("top -l 1 -n 0 | grep 'CPU usage'", { encoding: "utf8" });
      const cpuMatch = result.match(/(\d+\.\d+)% user/);
      return cpuMatch ? parseFloat(cpuMatch[1]) : 0;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Get work apps active status
   */
  async getWorkAppsActive() {
    const workApps = [
      "Visual Studio Code",
      "Xcode",
      "Terminal",
      "GitHub Desktop",
      "Slack",
      "Zoom",
      "Chrome",
      "Safari"
    ];

    try {
      const result = execSync("ps aux | grep -E '(Code|Xcode|Terminal|GitHub|Slack|Zoom|Chrome|Safari)' | grep -v grep", { encoding: "utf8" });
      return result.length > 0;
    } catch (error) {
      return false;
    }
  },

  /**
   * Extract file system context
   */
  async extractFileSystemContext() {
    try {
      const homeDir = process.env.HOME;
      const codeDirectories = [
        join(homeDir, "Documents"),
        join(homeDir, "Desktop"),
        join(homeDir, "Code"),
        join(homeDir, "Development"),
        join(homeDir, "GitHub"),
        join(homeDir, "GitLab")
      ];

      let modifiedFiles = 0;
      let activeProjects = 0;
      let gitRepositories = 0;

      for (const dir of codeDirectories) {
        if (existsSync(dir)) {
          try {
            // Count recent files (last 24 hours)
            const result = execSync(`find "${dir}" -type f -mtime -1 2>/dev/null | wc -l`, { encoding: "utf8" });
            modifiedFiles += parseInt(result.trim()) || 0;

            // Count Git repositories
            const gitResult = execSync(`find "${dir}" -name ".git" -type d 2>/dev/null | wc -l`, { encoding: "utf8" });
            gitRepositories += parseInt(gitResult.trim()) || 0;

            // Count active projects (directories with recent activity)
            const projectResult = execSync(`find "${dir}" -maxdepth 2 -type d -mtime -1 2>/dev/null | wc -l`, { encoding: "utf8" });
            activeProjects += parseInt(projectResult.trim()) || 0;
          } catch (error) {
            // Ignore permission errors
          }
        }
      }

      return {
        modifiedFiles: modifiedFiles,
        activeProjects: activeProjects,
        gitRepositories: gitRepositories,
        codeDirectories: codeDirectories.filter(dir => existsSync(dir)),
        lastChecked: new Date().toISOString(),
        status: "success"
      };
    } catch (error) {
      return {
        modifiedFiles: 0,
        activeProjects: 0,
        gitRepositories: 0,
        codeDirectories: [],
        error: "File system monitoring error",
        status: "error"
      };
    }
  },

  /**
   * Extract calendar context using AppleScript
   */
  async extractCalendarContext() {
    const calendarScript = `
      tell application "Calendar"
        try
          set today to current date
          set workEvents to events of calendar "Work" whose start date is today
          set allEvents to events whose start date is today
          return {count of workEvents, count of allEvents}
        on error
          return {0, 0}
        end try
      end tell
    `;

    try {
      const result = execSync(`osascript -e '${calendarScript}'`, { encoding: "utf8" });
      const parts = result.trim().split(", ");
      return {
        workEventsToday: parseInt(parts[0]) || 0,
        allEventsToday: parseInt(parts[1]) || 0,
        lastChecked: new Date().toISOString(),
        status: "success"
      };
    } catch (error) {
      return {
        workEventsToday: 0,
        allEventsToday: 0,
        error: "Calendar access not available",
        status: "error"
      };
    }
  },

  /**
   * Extract application context
   */
  async extractApplicationContext() {
    try {
      const runningApps = execSync("ps aux | grep -E '(Code|Xcode|Terminal|GitHub|Slack|Zoom|Chrome|Safari)' | grep -v grep", { encoding: "utf8" });
      const appList = runningApps.split("\n").filter(line => line.trim()).map(line => {
        const parts = line.split(" ");
        return parts[parts.length - 1];
      });

      return {
        runningApps: appList,
        workAppsActive: appList.length > 0,
        lastChecked: new Date().toISOString(),
        status: "success"
      };
    } catch (error) {
      return {
        runningApps: [],
        workAppsActive: false,
        error: "Application monitoring error",
        status: "error"
      };
    }
  },

  /**
   * Generate Mac-integrated daily report
   */
  async generateMacDailyReport(macContext) {
    const recommendations = await this.generateMacRecommendations(macContext);

    return {
      timestamp: new Date().toISOString(),
      platform: "Mac M3 Max",
      systemInfo: macContext.mac,
      detection: {
        emailBased: macContext.email.workEmails > 0,
        keyboardBased: macContext.keyboard.activityLevel > 0,
        fileSystemBased: macContext.fileSystem.modifiedFiles > 0,
        calendarBased: macContext.calendar.workEventsToday > 0,
        applicationBased: macContext.applications.workAppsActive
      },
      context: macContext,
      recommendations: recommendations,
      dailyPlan: await this.generateDailyPlan(macContext)
    };
  },

  /**
   * Generate Mac-specific recommendations
   */
  async generateMacRecommendations(macContext) {
    const recommendations = [];

    if (macContext.email.workEmails > 0) {
      recommendations.push(`📧 You have ${macContext.email.workEmails} work-related emails to review`);
    }

    if (macContext.calendar.workEventsToday > 0) {
      recommendations.push(`📅 You have ${macContext.calendar.workEventsToday} work events scheduled today`);
    }

    if (macContext.fileSystem.modifiedFiles > 0) {
      recommendations.push(`📁 ${macContext.fileSystem.modifiedFiles} files modified recently - review changes`);
    }

    if (macContext.fileSystem.gitRepositories > 0) {
      recommendations.push(`🔗 ${macContext.fileSystem.gitRepositories} Git repositories detected - check for updates`);
    }

    if (macContext.applications.workAppsActive) {
      recommendations.push(`💻 Work applications are active - continue your development session`);
    }

    if (recommendations.length === 0) {
      recommendations.push("🌅 Good morning! Ready to start your development day?");
    }

    return recommendations;
  },

  /**
   * Generate daily plan based on Mac context
   */
  async generateDailyPlan(macContext) {
    return {
      emailReview: macContext.email.workEmails > 0 ? "Review work emails" : "No urgent emails",
      calendarCheck: macContext.calendar.workEventsToday > 0 ? "Check calendar events" : "No meetings scheduled",
      codeReview: macContext.fileSystem.modifiedFiles > 0 ? "Review recent code changes" : "Start fresh development",
      gitSync: macContext.fileSystem.gitRepositories > 0 ? "Sync Git repositories" : "No Git activity needed",
      focusTime: "Schedule focused development time",
      breaks: "Plan regular breaks for optimal productivity"
    };
  },

  /**
   * Deliver report through Mac-native channels
   */
  async deliverMacReport(report) {
    // Deliver via macOS Notification Center
    const notificationScript = `
      display notification "${report.recommendations[0]}" with title "GitVan Daily Report - Mac M3 Max"
    `;

    try {
      execSync(`osascript -e '${notificationScript}'`);
      console.log("📱 macOS notification delivered");
    } catch (error) {
      console.log("📱 Notification delivery failed:", error.message);
    }

    // Save to local file
    const reportsDir = join(process.cwd(), "reports", "mac-integration");
    mkdirSync(reportsDir, { recursive: true });
    const filename = `mac-daily-report-${Date.now()}.json`;
    const filepath = join(reportsDir, filename);

    writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📄 Mac daily report saved to: ${filepath}`);

    // Try to open in default application
    try {
      execSync(`open "${filepath}"`);
      console.log("📂 Report opened in default application");
    } catch (error) {
      console.log("📂 Could not open report automatically");
    }
  },
});

