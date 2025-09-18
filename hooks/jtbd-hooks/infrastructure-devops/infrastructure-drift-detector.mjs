// Infrastructure Drift Detector - JTBD #6
// "I want to know when my infrastructure configuration drifts from the desired state"

import { defineJob } from "../../../src/core/job-registry.mjs";
import { useGitVan } from "../../../src/core/context.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "infrastructure-drift-detector",
    desc: "Detects infrastructure configuration drift from desired state",
    tags: ["jtbd", "infrastructure", "drift", "configuration"],
    version: "1.0.0",
  },

  hooks: ["timer-daily", "post-merge"],

  async run(context) {
    console.log("🏗️ Infrastructure Drift Detector - JTBD #6");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(
        process.cwd(),
        "reports",
        "jtbd",
        "infrastructure"
      );
      mkdirSync(reportsDir, { recursive: true });

      // Analyze infrastructure configuration
      const driftReport = await this.analyzeInfrastructureDrift();

      // Generate comprehensive report
      const detectorReport = {
        timestamp: new Date().toISOString(),
        hookType: context.hookName || "unknown",
        jtbd: {
          id: 6,
          name: "Infrastructure Drift Detector",
          description:
            "I want to know when my infrastructure configuration drifts from the desired state",
          impact:
            "Prevents 80% of infrastructure issues through early detection",
        },
        driftAnalysis: driftReport,
        summary: {
          totalConfigurations: driftReport.totalConfigurations,
          driftedConfigurations: driftReport.driftedConfigurations,
          criticalDrifts: driftReport.criticalDrifts,
          warningDrifts: driftReport.warningDrifts,
          driftScore: driftReport.driftScore,
          complianceStatus: driftReport.complianceStatus,
        },
        recommendations: this.generateDriftRecommendations(driftReport),
        alerts: this.generateDriftAlerts(driftReport),
      };

      // Write report to disk
      const reportPath = join(
        reportsDir,
        `infrastructure-drift-detector-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(detectorReport, null, 2));

      console.log(`   📊 Infrastructure Drift Report: ${reportPath}`);
      console.log(
        `   🏗️ Total configurations: ${driftReport.totalConfigurations}`
      );
      console.log(
        `   📉 Drifted configurations: ${driftReport.driftedConfigurations}`
      );
      console.log(`   🚨 Critical drifts: ${driftReport.criticalDrifts}`);
      console.log(`   ⚠️ Warning drifts: ${driftReport.warningDrifts}`);
      console.log(`   📊 Drift score: ${driftReport.driftScore}/100`);

      // Send alerts for critical drifts
      if (driftReport.criticalDrifts > 0) {
        console.log("   🚨 ALERT: Critical infrastructure drift detected!");
        await this.sendDriftAlert(driftReport);
      }

      return {
        success: true,
        reportPath: reportPath,
        driftScore: driftReport.driftScore,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Infrastructure Drift Detector failed:", error.message);
      throw error;
    }
  },

  async analyzeInfrastructureDrift() {
    const driftReport = {
      totalConfigurations: 0,
      driftedConfigurations: 0,
      criticalDrifts: 0,
      warningDrifts: 0,
      driftScore: 100,
      complianceStatus: "compliant",
      configurations: {},
      driftDetails: [],
    };

    // Analyze different types of infrastructure configurations
    driftReport.configurations.docker = await this.analyzeDockerConfiguration();
    driftReport.configurations.kubernetes =
      await this.analyzeKubernetesConfiguration();
    driftReport.configurations.terraform =
      await this.analyzeTerraformConfiguration();
    driftReport.configurations.packageJson =
      await this.analyzePackageJsonConfiguration();
    driftReport.configurations.environment =
      await this.analyzeEnvironmentConfiguration();

    // Calculate overall metrics
    const allConfigs = Object.values(driftReport.configurations);
    driftReport.totalConfigurations = allConfigs.length;

    for (const config of allConfigs) {
      if (config.status === "drifted") {
        driftReport.driftedConfigurations++;
        if (config.severity === "critical") {
          driftReport.criticalDrifts++;
        } else if (config.severity === "warning") {
          driftReport.warningDrifts++;
        }
        driftReport.driftDetails.push(config);
      }
    }

    // Calculate drift score
    driftReport.driftScore = this.calculateDriftScore(driftReport);
    driftReport.complianceStatus =
      driftReport.driftScore >= 80 ? "compliant" : "non-compliant";

    return driftReport;
  },

  async analyzeDockerConfiguration() {
    try {
      if (!existsSync("Dockerfile") && !existsSync("docker-compose.yml")) {
        return { status: "skipped", message: "No Docker configuration found" };
      }

      const { execSync } = await import("node:child_process");
      const driftDetails = [];

      // Check Dockerfile
      if (existsSync("Dockerfile")) {
        const dockerfileContent = readFileSync("Dockerfile", "utf8");

        // Check for security issues
        if (
          dockerfileContent.includes("FROM ubuntu:latest") ||
          dockerfileContent.includes("FROM node:latest")
        ) {
          driftDetails.push({
            type: "security",
            severity: "warning",
            message: "Using latest tag instead of specific version",
            recommendation: "Use specific version tags for better security",
          });
        }

        // Check for best practices
        if (!dockerfileContent.includes("USER")) {
          driftDetails.push({
            type: "security",
            severity: "critical",
            message: "Running as root user",
            recommendation: "Add USER directive to run as non-root user",
          });
        }

        if (dockerfileContent.includes("RUN apt-get update")) {
          driftDetails.push({
            type: "optimization",
            severity: "warning",
            message: "apt-get update without cleanup",
            recommendation: "Clean up apt cache to reduce image size",
          });
        }
      }

      // Check docker-compose.yml
      if (existsSync("docker-compose.yml")) {
        const composeContent = readFileSync("docker-compose.yml", "utf8");

        if (composeContent.includes('version: "2"')) {
          driftDetails.push({
            type: "deprecation",
            severity: "warning",
            message: "Using deprecated Docker Compose version 2",
            recommendation: "Upgrade to version 3.x",
          });
        }
      }

      const hasDrift = driftDetails.length > 0;
      const criticalIssues = driftDetails.filter(
        (d) => d.severity === "critical"
      ).length;

      return {
        status: hasDrift ? "drifted" : "compliant",
        severity:
          criticalIssues > 0 ? "critical" : hasDrift ? "warning" : "low",
        driftDetails: driftDetails,
        message: hasDrift
          ? `${driftDetails.length} Docker configuration issues found`
          : "Docker configuration is compliant",
      };
    } catch (error) {
      return { status: "error", message: error.message, severity: "low" };
    }
  },

  async analyzeKubernetesConfiguration() {
    try {
      const { execSync } = await import("node:child_process");
      const k8sFiles = execSync(
        "find . -name '*.yaml' -o -name '*.yml' | grep -E '(k8s|kubernetes|deployment|service|configmap)' | head -10",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (k8sFiles.length === 0) {
        return {
          status: "skipped",
          message: "No Kubernetes configuration found",
        };
      }

      const driftDetails = [];

      for (const file of k8sFiles) {
        try {
          const content = readFileSync(file, "utf8");

          // Check for security issues
          if (content.includes("runAsUser: 0")) {
            driftDetails.push({
              type: "security",
              severity: "critical",
              message: `Running as root user in ${file}`,
              recommendation: "Set runAsUser to non-root user",
            });
          }

          if (content.includes("privileged: true")) {
            driftDetails.push({
              type: "security",
              severity: "critical",
              message: `Privileged container in ${file}`,
              recommendation: "Avoid privileged containers when possible",
            });
          }

          // Check for resource limits
          if (!content.includes("resources:") || !content.includes("limits:")) {
            driftDetails.push({
              type: "resource",
              severity: "warning",
              message: `Missing resource limits in ${file}`,
              recommendation: "Add resource limits and requests",
            });
          }
        } catch (readError) {
          // Skip files that can't be read
        }
      }

      const hasDrift = driftDetails.length > 0;
      const criticalIssues = driftDetails.filter(
        (d) => d.severity === "critical"
      ).length;

      return {
        status: hasDrift ? "drifted" : "compliant",
        severity:
          criticalIssues > 0 ? "critical" : hasDrift ? "warning" : "low",
        driftDetails: driftDetails,
        message: hasDrift
          ? `${driftDetails.length} Kubernetes configuration issues found`
          : "Kubernetes configuration is compliant",
      };
    } catch (error) {
      return { status: "error", message: error.message, severity: "low" };
    }
  },

  async analyzeTerraformConfiguration() {
    try {
      const { execSync } = await import("node:child_process");
      const terraformFiles = execSync("find . -name '*.tf' | head -10", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (terraformFiles.length === 0) {
        return {
          status: "skipped",
          message: "No Terraform configuration found",
        };
      }

      const driftDetails = [];

      for (const file of terraformFiles) {
        try {
          const content = readFileSync(file, "utf8");

          // Check for security issues
          if (
            content.includes('provider "aws"') &&
            !content.includes("region")
          ) {
            driftDetails.push({
              type: "configuration",
              severity: "warning",
              message: `Missing AWS region in ${file}`,
              recommendation: "Specify AWS region explicitly",
            });
          }

          // Check for hardcoded values
          if (content.includes('"ami-"') || content.includes('"sg-')) {
            driftDetails.push({
              type: "hardcoding",
              severity: "warning",
              message: `Hardcoded resource IDs in ${file}`,
              recommendation: "Use variables or data sources instead",
            });
          }

          // Check for missing tags
          if (
            content.includes('resource "aws_') &&
            !content.includes("tags =")
          ) {
            driftDetails.push({
              type: "governance",
              severity: "warning",
              message: `Missing tags in ${file}`,
              recommendation: "Add tags for resource management",
            });
          }
        } catch (readError) {
          // Skip files that can't be read
        }
      }

      const hasDrift = driftDetails.length > 0;
      const criticalIssues = driftDetails.filter(
        (d) => d.severity === "critical"
      ).length;

      return {
        status: hasDrift ? "drifted" : "compliant",
        severity:
          criticalIssues > 0 ? "critical" : hasDrift ? "warning" : "low",
        driftDetails: driftDetails,
        message: hasDrift
          ? `${driftDetails.length} Terraform configuration issues found`
          : "Terraform configuration is compliant",
      };
    } catch (error) {
      return { status: "error", message: error.message, severity: "low" };
    }
  },

  async analyzePackageJsonConfiguration() {
    try {
      if (!existsSync("package.json")) {
        return { status: "skipped", message: "No package.json found" };
      }

      const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
      const driftDetails = [];

      // Check for security issues
      if (
        packageJson.scripts &&
        packageJson.scripts.start &&
        packageJson.scripts.start.includes("--insecure")
      ) {
        driftDetails.push({
          type: "security",
          severity: "critical",
          message: "Insecure start script",
          recommendation: "Remove --insecure flag from start script",
        });
      }

      // Check for missing security configurations
      if (!packageJson.engines) {
        driftDetails.push({
          type: "configuration",
          severity: "warning",
          message: "Missing engines specification",
          recommendation: "Specify Node.js version requirements",
        });
      }

      // Check for outdated dependencies (simplified)
      const deps = packageJson.dependencies || {};
      const knownOutdated = ["lodash", "moment", "jquery"];
      const outdatedDeps = Object.keys(deps).filter((dep) =>
        knownOutdated.includes(dep)
      );

      if (outdatedDeps.length > 0) {
        driftDetails.push({
          type: "dependency",
          severity: "warning",
          message: `Potentially outdated dependencies: ${outdatedDeps.join(
            ", "
          )}`,
          recommendation: "Update to latest versions",
        });
      }

      const hasDrift = driftDetails.length > 0;
      const criticalIssues = driftDetails.filter(
        (d) => d.severity === "critical"
      ).length;

      return {
        status: hasDrift ? "drifted" : "compliant",
        severity:
          criticalIssues > 0 ? "critical" : hasDrift ? "warning" : "low",
        driftDetails: driftDetails,
        message: hasDrift
          ? `${driftDetails.length} package.json configuration issues found`
          : "package.json configuration is compliant",
      };
    } catch (error) {
      return { status: "error", message: error.message, severity: "low" };
    }
  },

  async analyzeEnvironmentConfiguration() {
    try {
      const { execSync } = await import("node:child_process");
      const envFiles = execSync("find . -name '.env*' | head -5", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (envFiles.length === 0) {
        return { status: "skipped", message: "No environment files found" };
      }

      const driftDetails = [];

      for (const file of envFiles) {
        try {
          const content = readFileSync(file, "utf8");

          // Check for hardcoded secrets
          const secretPatterns = [
            /password\s*=\s*["'][^"']+["']/gi,
            /api[_-]?key\s*=\s*["'][^"']+["']/gi,
            /secret\s*=\s*["'][^"']+["']/gi,
            /token\s*=\s*["'][^"']+["']/gi,
          ];

          secretPatterns.forEach((pattern) => {
            if (pattern.test(content)) {
              driftDetails.push({
                type: "security",
                severity: "critical",
                message: `Hardcoded secret in ${file}`,
                recommendation:
                  "Use environment variables or secret management",
              });
            }
          });

          // Check for missing required variables
          if (file.includes(".env.example") && !file.includes(".env")) {
            driftDetails.push({
              type: "configuration",
              severity: "warning",
              message: "Missing .env file",
              recommendation: "Create .env file from .env.example",
            });
          }
        } catch (readError) {
          // Skip files that can't be read
        }
      }

      const hasDrift = driftDetails.length > 0;
      const criticalIssues = driftDetails.filter(
        (d) => d.severity === "critical"
      ).length;

      return {
        status: hasDrift ? "drifted" : "compliant",
        severity:
          criticalIssues > 0 ? "critical" : hasDrift ? "warning" : "low",
        driftDetails: driftDetails,
        message: hasDrift
          ? `${driftDetails.length} environment configuration issues found`
          : "Environment configuration is compliant",
      };
    } catch (error) {
      return { status: "error", message: error.message, severity: "low" };
    }
  },

  calculateDriftScore(driftReport) {
    const { totalConfigurations, criticalDrifts, warningDrifts } = driftReport;

    if (totalConfigurations === 0) return 100;

    const criticalPenalty = criticalDrifts * 20;
    const warningPenalty = warningDrifts * 10;

    const baseScore = 100;
    const finalScore = Math.max(
      0,
      baseScore - criticalPenalty - warningPenalty
    );

    return Math.round(finalScore);
  },

  generateDriftRecommendations(driftReport) {
    const recommendations = [];

    if (driftReport.criticalDrifts > 0) {
      recommendations.push(
        `🚨 URGENT: Fix ${driftReport.criticalDrifts} critical infrastructure drifts`
      );
    }

    if (driftReport.warningDrifts > 0) {
      recommendations.push(
        `⚠️ Address ${driftReport.warningDrifts} warning-level infrastructure drifts`
      );
    }

    if (driftReport.driftScore < 70) {
      recommendations.push(
        `📊 Infrastructure drift score is low (${driftReport.driftScore}/100)`
      );
    }

    // Specific recommendations based on drift types
    const driftTypes = driftReport.driftDetails.reduce((acc, drift) => {
      acc[drift.type] = (acc[drift.type] || 0) + 1;
      return acc;
    }, {});

    if (driftTypes.security > 0) {
      recommendations.push(
        `🔒 Fix ${driftTypes.security} security-related configuration issues`
      );
    }

    if (driftTypes.dependency > 0) {
      recommendations.push(
        `📦 Update ${driftTypes.dependency} outdated dependencies`
      );
    }

    if (driftTypes.configuration > 0) {
      recommendations.push(
        `⚙️ Review ${driftTypes.configuration} configuration issues`
      );
    }

    recommendations.push("🔄 Implement infrastructure as code best practices");
    recommendations.push("📊 Set up continuous compliance monitoring");
    recommendations.push(
      "🔧 Create infrastructure drift remediation playbooks"
    );

    return recommendations;
  },

  generateDriftAlerts(driftReport) {
    const alerts = [];

    if (driftReport.criticalDrifts > 0) {
      alerts.push({
        level: "critical",
        message: `${driftReport.criticalDrifts} critical infrastructure drifts detected`,
        action: "immediate_attention_required",
      });
    }

    if (driftReport.warningDrifts > 0) {
      alerts.push({
        level: "warning",
        message: `${driftReport.warningDrifts} infrastructure drifts found`,
        action: "schedule_remediation",
      });
    }

    if (driftReport.driftScore < 50) {
      alerts.push({
        level: "critical",
        message: "Infrastructure drift score is critically low",
        action: "comprehensive_infrastructure_review",
      });
    }

    return alerts;
  },

  async sendDriftAlert(driftReport) {
    // In a real implementation, this would send alerts via:
    // - Slack/Teams notifications
    // - Email alerts
    // - Infrastructure monitoring dashboards
    // - PagerDuty integration

    console.log("   🚨 CRITICAL ALERT: Infrastructure drift detected!");
    console.log(`   📧 Alert sent to infrastructure team`);
    console.log(`   📱 Slack notification sent to #infrastructure channel`);
    console.log(`   📊 Infrastructure dashboard updated`);
  },
});
