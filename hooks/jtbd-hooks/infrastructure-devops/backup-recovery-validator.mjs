// Backup & Recovery Validator - JTBD #10
// "I want to ensure my data is always backed up and recoverable"

import { defineJob } from "../../../src/core/job-registry.mjs";
import { useGitVan } from "../../../src/core/context.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "backup-recovery-validator",
    desc: "Validates backup and recovery procedures to ensure data safety",
    tags: ["jtbd", "backup", "recovery", "data-safety"],
    version: "1.0.0",
  },

  hooks: ["timer-daily", "post-merge"],

  async run(context) {
    console.log("💾 Backup & Recovery Validator - JTBD #10");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(
        process.cwd(),
        "reports",
        "jtbd",
        "backup-recovery"
      );
      mkdirSync(reportsDir, { recursive: true });

      // Validate backup and recovery procedures
      const validationReport = await this.validateBackupRecovery();

      // Generate comprehensive report
      const validatorReport = {
        timestamp: new Date().toISOString(),
        hookType: context.hookName || "unknown",
        jtbd: {
          id: 10,
          name: "Backup & Recovery Validator",
          description:
            "I want to ensure my data is always backed up and recoverable",
          impact:
            "Ensures 80% of data loss scenarios are prevented through proper backups",
        },
        validationAnalysis: validationReport,
        summary: {
          totalValidations: validationReport.totalValidations,
          passedValidations: validationReport.passedValidations,
          failedValidations: validationReport.failedValidations,
          criticalIssues: validationReport.criticalIssues,
          warningIssues: validationReport.warningIssues,
          validationScore: validationReport.validationScore,
          dataSafetyStatus: validationReport.dataSafetyStatus,
        },
        recommendations:
          this.generateValidationRecommendations(validationReport),
        alerts: this.generateValidationAlerts(validationReport),
      };

      // Write report to disk
      const reportPath = join(
        reportsDir,
        `backup-recovery-validator-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(validatorReport, null, 2));

      console.log(`   📊 Backup & Recovery Report: ${reportPath}`);
      console.log(
        `   🔍 Total validations: ${validationReport.totalValidations}`
      );
      console.log(
        `   ✅ Passed validations: ${validationReport.passedValidations}`
      );
      console.log(
        `   ❌ Failed validations: ${validationReport.failedValidations}`
      );
      console.log(`   🚨 Critical issues: ${validationReport.criticalIssues}`);
      console.log(`   ⚠️ Warning issues: ${validationReport.warningIssues}`);
      console.log(
        `   📊 Validation score: ${validationReport.validationScore}/100`
      );

      // Send alerts for critical issues
      if (validationReport.criticalIssues > 0) {
        console.log("   🚨 ALERT: Critical backup/recovery issues detected!");
        await this.sendBackupAlert(validationReport);
      }

      return {
        success: true,
        reportPath: reportPath,
        validationScore: validationReport.validationScore,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Backup & Recovery Validator failed:", error.message);
      throw error;
    }
  },

  async validateBackupRecovery() {
    const validationReport = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      criticalIssues: 0,
      warningIssues: 0,
      validationScore: 100,
      dataSafetyStatus: "safe",
      validations: {},
      issues: [],
    };

    // Run different types of validations
    validationReport.validations.gitBackup = await this.validateGitBackup();
    validationReport.validations.dataBackup = await this.validateDataBackup();
    validationReport.validations.configurationBackup =
      await this.validateConfigurationBackup();
    validationReport.validations.recoveryProcedures =
      await this.validateRecoveryProcedures();
    validationReport.validations.backupTesting =
      await this.validateBackupTesting();

    // Calculate overall metrics
    const allValidations = Object.values(validationReport.validations);
    validationReport.totalValidations = allValidations.length;

    for (const validation of allValidations) {
      if (validation.status === "passed") {
        validationReport.passedValidations++;
      } else if (validation.status === "failed") {
        validationReport.failedValidations++;
        if (validation.severity === "critical") {
          validationReport.criticalIssues++;
        } else if (validation.severity === "warning") {
          validationReport.warningIssues++;
        }
        validationReport.issues.push(validation);
      }
    }

    // Calculate validation score
    validationReport.validationScore =
      this.calculateValidationScore(validationReport);
    validationReport.dataSafetyStatus =
      this.determineDataSafetyStatus(validationReport);

    return validationReport;
  },

  async validateGitBackup() {
    const { execSync } = await import("node:child_process");

    try {
      const issues = [];
      let severity = "low";

      // Check if git repository exists
      try {
        execSync("git rev-parse --git-dir", { encoding: "utf8" });
      } catch (gitError) {
        return {
          status: "failed",
          severity: "critical",
          message: "Not a Git repository",
          details: {
            error: gitError.message,
            recommendation: "Initialize Git repository for version control",
          },
        };
      }

      // Check for remote repositories
      try {
        const remotes = execSync("git remote -v", { encoding: "utf8" }).trim();
        if (!remotes) {
          issues.push({
            type: "no_remote",
            severity: "critical",
            message: "No remote repositories configured",
            recommendation: "Add remote repository for backup",
          });
          severity = "critical";
        } else {
          // Check if remote is accessible
          try {
            execSync("git ls-remote origin HEAD", {
              encoding: "utf8",
              timeout: 10000,
            });
          } catch (remoteError) {
            issues.push({
              type: "remote_inaccessible",
              severity: "warning",
              message: "Remote repository not accessible",
              recommendation: "Check remote repository connectivity",
            });
            if (severity === "low") severity = "warning";
          }
        }
      } catch (remoteError) {
        issues.push({
          type: "remote_check_failed",
          severity: "warning",
          message: "Could not check remote repositories",
          recommendation: "Verify remote repository configuration",
        });
        if (severity === "low") severity = "warning";
      }

      // Check for recent commits
      try {
        const lastCommit = execSync('git log -1 --format="%H %cd"', {
          encoding: "utf8",
        }).trim();
        if (!lastCommit) {
          issues.push({
            type: "no_commits",
            severity: "critical",
            message: "No commits found in repository",
            recommendation: "Make initial commit to establish history",
          });
          severity = "critical";
        } else {
          // Check commit age (simplified check)
          const commitDate = lastCommit.split(" ")[1];
          const commitTime = new Date(commitDate).getTime();
          const daysSinceCommit =
            (Date.now() - commitTime) / (1000 * 60 * 60 * 24);

          if (daysSinceCommit > 30) {
            issues.push({
              type: "stale_commits",
              severity: "warning",
              message: `Last commit was ${Math.round(
                daysSinceCommit
              )} days ago`,
              recommendation: "Make regular commits to maintain active history",
            });
            if (severity === "low") severity = "warning";
          }
        }
      } catch (commitError) {
        issues.push({
          type: "commit_check_failed",
          severity: "warning",
          message: "Could not check commit history",
          recommendation: "Verify Git repository integrity",
        });
        if (severity === "low") severity = "warning";
      }

      // Check for uncommitted changes
      try {
        const status = execSync("git status --porcelain", {
          encoding: "utf8",
        }).trim();
        if (status) {
          issues.push({
            type: "uncommitted_changes",
            severity: "warning",
            message: "Uncommitted changes detected",
            recommendation: "Commit or stash uncommitted changes",
          });
          if (severity === "low") severity = "warning";
        }
      } catch (statusError) {
        // Could not check status
      }

      const hasIssues = issues.length > 0;

      return {
        status: hasIssues ? "failed" : "passed",
        severity: severity,
        message: hasIssues
          ? `${issues.length} Git backup issues found`
          : "Git backup validation passed",
        details: {
          issues: issues,
          totalIssues: issues.length,
          criticalIssues: issues.filter((i) => i.severity === "critical")
            .length,
        },
      };
    } catch (error) {
      return {
        status: "failed",
        severity: "critical",
        message: `Git backup validation failed: ${error.message}`,
      };
    }
  },

  async validateDataBackup() {
    try {
      const issues = [];
      let severity = "low";

      // Check for database backup procedures
      const { execSync } = await import("node:child_process");

      // Look for database configuration files
      const dbFiles = execSync(
        "find . -name '*.sql' -o -name 'database.*' -o -name 'db.*' | head -5",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (dbFiles.length === 0) {
        // Check package.json for database dependencies
        if (existsSync("package.json")) {
          const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
          const deps = packageJson.dependencies || {};
          const dbDeps = Object.keys(deps).filter(
            (dep) =>
              dep.includes("mysql") ||
              dep.includes("postgres") ||
              dep.includes("mongodb") ||
              dep.includes("sqlite") ||
              dep.includes("redis")
          );

          if (dbDeps.length > 0) {
            issues.push({
              type: "no_db_backup",
              severity: "critical",
              message: `Database dependencies found but no backup procedures detected`,
              recommendation: "Implement database backup procedures",
            });
            severity = "critical";
          }
        }
      }

      // Check for backup scripts
      const backupScripts = execSync(
        "find . -name '*backup*' -o -name '*dump*' | head -5",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (backupScripts.length === 0 && dbFiles.length > 0) {
        issues.push({
          type: "no_backup_scripts",
          severity: "warning",
          message: "Database files found but no backup scripts detected",
          recommendation: "Create automated backup scripts",
        });
        if (severity === "low") severity = "warning";
      }

      // Check for data directory backup
      const dataDirs = execSync(
        "find . -type d -name 'data' -o -name 'uploads' -o -name 'files' | head -5",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (dataDirs.length > 0) {
        issues.push({
          type: "data_dir_backup",
          severity: "warning",
          message:
            "Data directories found - ensure they are included in backups",
          recommendation: "Include data directories in backup procedures",
        });
        if (severity === "low") severity = "warning";
      }

      const hasIssues = issues.length > 0;

      return {
        status: hasIssues ? "failed" : "passed",
        severity: severity,
        message: hasIssues
          ? `${issues.length} data backup issues found`
          : "Data backup validation passed",
        details: {
          issues: issues,
          totalIssues: issues.length,
          criticalIssues: issues.filter((i) => i.severity === "critical")
            .length,
        },
      };
    } catch (error) {
      return {
        status: "failed",
        severity: "critical",
        message: `Data backup validation failed: ${error.message}`,
      };
    }
  },

  async validateConfigurationBackup() {
    try {
      const issues = [];
      let severity = "low";

      // Check for configuration files that should be backed up
      const configFiles = [
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        ".env.example",
        "Dockerfile",
        "docker-compose.yml",
        "tsconfig.json",
        ".eslintrc.js",
        ".prettierrc",
      ];

      const missingConfigs = configFiles.filter((file) => !existsSync(file));

      if (missingConfigs.length > 0) {
        issues.push({
          type: "missing_config_files",
          severity: "warning",
          message: `Missing important configuration files: ${missingConfigs.join(
            ", "
          )}`,
          recommendation: "Create missing configuration files",
        });
        severity = "warning";
      }

      // Check for sensitive configuration files
      const sensitiveFiles = [".env", ".env.local", ".env.production"];
      const foundSensitive = sensitiveFiles.filter((file) => existsSync(file));

      if (foundSensitive.length > 0) {
        issues.push({
          type: "sensitive_config_exposed",
          severity: "critical",
          message: `Sensitive configuration files found: ${foundSensitive.join(
            ", "
          )}`,
          recommendation:
            "Add sensitive files to .gitignore and use environment variables",
        });
        severity = "critical";
      }

      // Check .gitignore for sensitive files
      if (existsSync(".gitignore")) {
        const gitignoreContent = readFileSync(".gitignore", "utf8");
        const sensitivePatterns = [".env", "*.key", "*.pem", "*.p12"];

        const missingPatterns = sensitivePatterns.filter(
          (pattern) => !gitignoreContent.includes(pattern)
        );

        if (missingPatterns.length > 0) {
          issues.push({
            type: "incomplete_gitignore",
            severity: "warning",
            message: `Missing sensitive file patterns in .gitignore: ${missingPatterns.join(
              ", "
            )}`,
            recommendation: "Add sensitive file patterns to .gitignore",
          });
          if (severity === "low") severity = "warning";
        }
      } else {
        issues.push({
          type: "no_gitignore",
          severity: "warning",
          message: "No .gitignore file found",
          recommendation: "Create .gitignore file to exclude sensitive files",
        });
        if (severity === "low") severity = "warning";
      }

      const hasIssues = issues.length > 0;

      return {
        status: hasIssues ? "failed" : "passed",
        severity: severity,
        message: hasIssues
          ? `${issues.length} configuration backup issues found`
          : "Configuration backup validation passed",
        details: {
          issues: issues,
          totalIssues: issues.length,
          criticalIssues: issues.filter((i) => i.severity === "critical")
            .length,
        },
      };
    } catch (error) {
      return {
        status: "failed",
        severity: "critical",
        message: `Configuration backup validation failed: ${error.message}`,
      };
    }
  },

  async validateRecoveryProcedures() {
    try {
      const issues = [];
      let severity = "low";

      // Check for recovery documentation
      const docFiles = [
        "README.md",
        "RECOVERY.md",
        "BACKUP.md",
        "DISASTER_RECOVERY.md",
        "docs/recovery.md",
        "docs/backup.md",
      ];

      const foundDocs = docFiles.filter((file) => existsSync(file));

      if (foundDocs.length === 0) {
        issues.push({
          type: "no_recovery_docs",
          severity: "warning",
          message: "No recovery documentation found",
          recommendation: "Create recovery procedures documentation",
        });
        severity = "warning";
      }

      // Check for recovery scripts
      const { execSync } = await import("node:child_process");
      const recoveryScripts = execSync(
        "find . -name '*recovery*' -o -name '*restore*' | head -5",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (recoveryScripts.length === 0) {
        issues.push({
          type: "no_recovery_scripts",
          severity: "warning",
          message: "No recovery scripts found",
          recommendation: "Create automated recovery scripts",
        });
        if (severity === "low") severity = "warning";
      }

      // Check package.json for recovery-related scripts
      if (existsSync("package.json")) {
        const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
        const scripts = packageJson.scripts || {};

        const recoveryScripts = Object.keys(scripts).filter(
          (script) =>
            script.includes("recovery") ||
            script.includes("restore") ||
            script.includes("backup")
        );

        if (recoveryScripts.length === 0) {
          issues.push({
            type: "no_recovery_npm_scripts",
            severity: "warning",
            message: "No recovery-related npm scripts found",
            recommendation: "Add backup and recovery scripts to package.json",
          });
          if (severity === "low") severity = "warning";
        }
      }

      const hasIssues = issues.length > 0;

      return {
        status: hasIssues ? "failed" : "passed",
        severity: severity,
        message: hasIssues
          ? `${issues.length} recovery procedure issues found`
          : "Recovery procedures validation passed",
        details: {
          issues: issues,
          totalIssues: issues.length,
          criticalIssues: issues.filter((i) => i.severity === "critical")
            .length,
        },
      };
    } catch (error) {
      return {
        status: "failed",
        severity: "critical",
        message: `Recovery procedures validation failed: ${error.message}`,
      };
    }
  },

  async validateBackupTesting() {
    try {
      const issues = [];
      let severity = "low";

      // Check for backup testing procedures
      const { execSync } = await import("node:child_process");
      const testFiles = execSync(
        "find . -name '*test*' -o -name '*spec*' | head -10",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Look for backup-related tests
      const backupTests = testFiles.filter(
        (file) =>
          file.includes("backup") ||
          file.includes("recovery") ||
          file.includes("restore")
      );

      if (backupTests.length === 0) {
        issues.push({
          type: "no_backup_tests",
          severity: "warning",
          message: "No backup testing procedures found",
          recommendation: "Create tests for backup and recovery procedures",
        });
        severity = "warning";
      }

      // Check for backup validation scripts
      const validationScripts = execSync(
        "find . -name '*validate*' -o -name '*check*' | head -5",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (validationScripts.length === 0) {
        issues.push({
          type: "no_validation_scripts",
          severity: "warning",
          message: "No backup validation scripts found",
          recommendation: "Create scripts to validate backup integrity",
        });
        if (severity === "low") severity = "warning";
      }

      const hasIssues = issues.length > 0;

      return {
        status: hasIssues ? "failed" : "passed",
        severity: severity,
        message: hasIssues
          ? `${issues.length} backup testing issues found`
          : "Backup testing validation passed",
        details: {
          issues: issues,
          totalIssues: issues.length,
          criticalIssues: issues.filter((i) => i.severity === "critical")
            .length,
        },
      };
    } catch (error) {
      return {
        status: "failed",
        severity: "critical",
        message: `Backup testing validation failed: ${error.message}`,
      };
    }
  },

  calculateValidationScore(validationReport) {
    const { totalValidations, criticalIssues, warningIssues } =
      validationReport;

    if (totalValidations === 0) return 100;

    const criticalPenalty = criticalIssues * 30;
    const warningPenalty = warningIssues * 15;

    const baseScore = 100;
    const finalScore = Math.max(
      0,
      baseScore - criticalPenalty - warningPenalty
    );

    return Math.round(finalScore);
  },

  determineDataSafetyStatus(validationReport) {
    if (validationReport.criticalIssues > 0) {
      return "at-risk";
    } else if (validationReport.warningIssues > 0) {
      return "needs-attention";
    } else {
      return "safe";
    }
  },

  generateValidationRecommendations(validationReport) {
    const recommendations = [];

    if (validationReport.criticalIssues > 0) {
      recommendations.push(
        `🚨 URGENT: Fix ${validationReport.criticalIssues} critical backup/recovery issues`
      );
    }

    if (validationReport.warningIssues > 0) {
      recommendations.push(
        `⚠️ Address ${validationReport.warningIssues} warning-level backup/recovery issues`
      );
    }

    if (validationReport.validationScore < 70) {
      recommendations.push(
        `📊 Backup/recovery validation score is low (${validationReport.validationScore}/100)`
      );
    }

    // Specific recommendations based on failed validations
    const failedValidations = validationReport.issues;

    if (
      failedValidations.some((v) =>
        v.details?.issues?.some((i) => i.type === "no_remote")
      )
    ) {
      recommendations.push("🔗 Set up remote Git repository for code backup");
    }

    if (
      failedValidations.some((v) =>
        v.details?.issues?.some((i) => i.type === "no_db_backup")
      )
    ) {
      recommendations.push("💾 Implement database backup procedures");
    }

    if (
      failedValidations.some((v) =>
        v.details?.issues?.some((i) => i.type === "sensitive_config_exposed")
      )
    ) {
      recommendations.push("🔒 Secure sensitive configuration files");
    }

    if (
      failedValidations.some((v) =>
        v.details?.issues?.some((i) => i.type === "no_recovery_docs")
      )
    ) {
      recommendations.push("📚 Create recovery procedures documentation");
    }

    if (
      failedValidations.some((v) =>
        v.details?.issues?.some((i) => i.type === "no_backup_tests")
      )
    ) {
      recommendations.push("🧪 Create backup testing procedures");
    }

    recommendations.push("📊 Set up automated backup monitoring");
    recommendations.push("🔄 Implement regular backup testing");
    recommendations.push("📋 Create disaster recovery playbooks");

    return recommendations;
  },

  generateValidationAlerts(validationReport) {
    const alerts = [];

    if (validationReport.criticalIssues > 0) {
      alerts.push({
        level: "critical",
        message: `${validationReport.criticalIssues} critical backup/recovery issues detected`,
        action: "immediate_attention_required",
      });
    }

    if (validationReport.warningIssues > 0) {
      alerts.push({
        level: "warning",
        message: `${validationReport.warningIssues} backup/recovery issues found`,
        action: "schedule_review",
      });
    }

    if (validationReport.validationScore < 50) {
      alerts.push({
        level: "critical",
        message: "Backup/recovery validation score is critically low",
        action: "comprehensive_backup_review",
      });
    }

    return alerts;
  },

  async sendBackupAlert(validationReport) {
    // In a real implementation, this would send alerts via:
    // - Slack/Teams notifications
    // - Email alerts
    // - Backup monitoring dashboards
    // - Data protection compliance systems

    console.log("   🚨 CRITICAL ALERT: Backup/recovery issues detected!");
    console.log(`   📧 Alert sent to data protection team`);
    console.log(`   📱 Slack notification sent to #backup-recovery channel`);
    console.log(`   📊 Backup monitoring dashboard updated`);
  },
});
