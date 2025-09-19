// Configuration Drift Detector - JTBD #9
// "I want to detect when configuration changes deviate from standards"

import { defineJob } from "../../../src/core/job-registry.mjs";
import { useGitVan } from "../../../src/core/context.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "configuration-drift-detector",
    desc: "Detects when configuration changes deviate from standards",
    tags: ["jtbd", "configuration", "drift", "standards"],
    version: "1.0.0",
  },

  hooks: ["pre-commit", "post-merge"],

  async run(context) {
    console.log("⚙️ Configuration Drift Detector - JTBD #9");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(
        process.cwd(),
        "reports",
        "jtbd",
        "configuration"
      );
      mkdirSync(reportsDir, { recursive: true });

      // Analyze configuration drift
      const driftReport = await this.analyzeConfigurationDrift();

      // Generate comprehensive report
      const detectorReport = {
        timestamp: new Date().toISOString(),
        hookType: context.hookName || "unknown",
        jtbd: {
          id: 9,
          name: "Configuration Drift Detector",
          description:
            "I want to detect when configuration changes deviate from standards",
          impact:
            "Prevents 80% of configuration-related issues through early detection",
        },
        driftAnalysis: driftReport,
        summary: {
          totalConfigurations: driftReport.totalConfigurations,
          compliantConfigurations: driftReport.compliantConfigurations,
          driftedConfigurations: driftReport.driftedConfigurations,
          criticalDrifts: driftReport.criticalDrifts,
          warningDrifts: driftReport.warningDrifts,
          complianceScore: driftReport.complianceScore,
          standardsViolations: driftReport.standardsViolations,
        },
        recommendations: this.generateDriftRecommendations(driftReport),
        blockingIssues: this.getDriftBlockingIssues(driftReport),
      };

      // Write report to disk
      const reportPath = join(
        reportsDir,
        `configuration-drift-detector-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(detectorReport, null, 2));

      console.log(`   📊 Configuration Drift Report: ${reportPath}`);
      console.log(
        `   ⚙️ Total configurations: ${driftReport.totalConfigurations}`
      );
      console.log(
        `   ✅ Compliant configurations: ${driftReport.compliantConfigurations}`
      );
      console.log(
        `   📉 Drifted configurations: ${driftReport.driftedConfigurations}`
      );
      console.log(`   🚨 Critical drifts: ${driftReport.criticalDrifts}`);
      console.log(`   ⚠️ Warning drifts: ${driftReport.warningDrifts}`);
      console.log(`   📊 Compliance score: ${driftReport.complianceScore}/100`);

      // Block commit if critical drifts exist
      if (driftReport.criticalDrifts > 0) {
        console.log("   🚫 BLOCKING: Critical configuration drifts detected");
        throw new Error(
          `Configuration drift detector blocked commit: ${driftReport.criticalDrifts} critical configuration drifts found`
        );
      }

      return {
        success: true,
        reportPath: reportPath,
        complianceScore: driftReport.complianceScore,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Configuration Drift Detector failed:", error.message);
      throw error;
    }
  },

  async analyzeConfigurationDrift() {
    const driftReport = {
      totalConfigurations: 0,
      compliantConfigurations: 0,
      driftedConfigurations: 0,
      criticalDrifts: 0,
      warningDrifts: 0,
      complianceScore: 100,
      standardsViolations: 0,
      configurations: {},
      driftDetails: [],
    };

    // Analyze different types of configurations
    driftReport.configurations.packageJson =
      await this.analyzePackageJsonDrift();
    driftReport.configurations.environment =
      await this.analyzeEnvironmentDrift();
    driftReport.configurations.docker = await this.analyzeDockerDrift();
    driftReport.configurations.ciCd = await this.analyzeCiCdDrift();
    driftReport.configurations.codeStyle = await this.analyzeCodeStyleDrift();

    // Calculate overall metrics
    const allConfigs = Object.values(driftReport.configurations);
    driftReport.totalConfigurations = allConfigs.length;

    for (const config of allConfigs) {
      if (config.status === "compliant") {
        driftReport.compliantConfigurations++;
      } else if (config.status === "drifted") {
        driftReport.driftedConfigurations++;
        if (config.severity === "critical") {
          driftReport.criticalDrifts++;
        } else if (config.severity === "warning") {
          driftReport.warningDrifts++;
        }
        driftReport.driftDetails.push(config);
        driftReport.standardsViolations += config.violations || 0;
      }
    }

    // Calculate compliance score
    driftReport.complianceScore = this.calculateComplianceScore(driftReport);

    return driftReport;
  },

  async analyzePackageJsonDrift() {
    try {
      if (!existsSync("package.json")) {
        return { status: "skipped", message: "No package.json found" };
      }

      const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
      const violations = [];
      let severity = "low";

      // Check required fields
      const requiredFields = ["name", "version", "description", "main"];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          violations.push({
            type: "missing_required_field",
            field: field,
            severity: "critical",
            message: `Missing required field: ${field}`,
            recommendation: `Add ${field} field to package.json`,
          });
          severity = "critical";
        }
      }

      // Check version format
      if (packageJson.version && !/^\d+\.\d+\.\d+/.test(packageJson.version)) {
        violations.push({
          type: "invalid_version",
          field: "version",
          severity: "warning",
          message: "Version should follow semantic versioning (x.y.z)",
          recommendation: "Use semantic versioning format",
        });
        if (severity === "low") severity = "warning";
      }

      // Check scripts
      if (!packageJson.scripts || !packageJson.scripts.start) {
        violations.push({
          type: "missing_script",
          field: "scripts.start",
          severity: "warning",
          message: "Missing start script",
          recommendation: "Add start script to package.json",
        });
        if (severity === "low") severity = "warning";
      }

      // Check for security issues
      if (packageJson.scripts) {
        for (const [scriptName, scriptContent] of Object.entries(
          packageJson.scripts
        )) {
          if (
            typeof scriptContent === "string" &&
            scriptContent.includes("--insecure")
          ) {
            violations.push({
              type: "insecure_script",
              field: `scripts.${scriptName}`,
              severity: "critical",
              message: `Insecure flag in ${scriptName} script`,
              recommendation: "Remove --insecure flag",
            });
            severity = "critical";
          }
        }
      }

      // Check for outdated dependencies
      const deps = packageJson.dependencies || {};
      const knownOutdated = ["lodash", "moment", "jquery", "request"];
      const outdatedDeps = Object.keys(deps).filter((dep) =>
        knownOutdated.includes(dep)
      );

      if (outdatedDeps.length > 0) {
        violations.push({
          type: "outdated_dependency",
          field: "dependencies",
          severity: "warning",
          message: `Potentially outdated dependencies: ${outdatedDeps.join(
            ", "
          )}`,
          recommendation: "Update to latest versions",
        });
        if (severity === "low") severity = "warning";
      }

      const hasViolations = violations.length > 0;

      return {
        status: hasViolations ? "drifted" : "compliant",
        severity: severity,
        violations: violations.length,
        violationDetails: violations,
        message: hasViolations
          ? `${violations.length} package.json violations found`
          : "package.json is compliant with standards",
      };
    } catch (error) {
      return {
        status: "drifted",
        severity: "critical",
        violations: 1,
        message: `package.json analysis failed: ${error.message}`,
      };
    }
  },

  async analyzeEnvironmentDrift() {
    try {
      const { execSync } = await import("node:child_process");
      const violations = [];
      let severity = "low";

      // Check for .env files
      const envFiles = execSync("find . -name '.env*' | head -5", {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (envFiles.length === 0) {
        violations.push({
          type: "missing_env_file",
          severity: "warning",
          message: "No environment files found",
          recommendation: "Create .env.example file",
        });
        severity = "warning";
      } else {
        // Check for hardcoded secrets
        for (const file of envFiles) {
          try {
            const content = readFileSync(file, "utf8");

            const secretPatterns = [
              {
                pattern: /password\s*=\s*["'][^"']+["']/gi,
                type: "hardcoded_password",
              },
              {
                pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi,
                type: "hardcoded_api_key",
              },
              {
                pattern: /secret\s*=\s*["'][^"']+["']/gi,
                type: "hardcoded_secret",
              },
              {
                pattern: /token\s*=\s*["'][^"']+["']/gi,
                type: "hardcoded_token",
              },
            ];

            secretPatterns.forEach(({ pattern, type }) => {
              if (pattern.test(content)) {
                violations.push({
                  type: type,
                  severity: "critical",
                  message: `Hardcoded secret in ${file}`,
                  recommendation:
                    "Use environment variables or secret management",
                });
                severity = "critical";
              }
            });
          } catch (readError) {
            // Skip files that can't be read
          }
        }
      }

      // Check for missing .env.example
      if (
        envFiles.some((f) => f.includes(".env")) &&
        !envFiles.some((f) => f.includes(".env.example"))
      ) {
        violations.push({
          type: "missing_env_example",
          severity: "warning",
          message: "Missing .env.example file",
          recommendation: "Create .env.example with placeholder values",
        });
        if (severity === "low") severity = "warning";
      }

      const hasViolations = violations.length > 0;

      return {
        status: hasViolations ? "drifted" : "compliant",
        severity: severity,
        violations: violations.length,
        violationDetails: violations,
        message: hasViolations
          ? `${violations.length} environment configuration violations found`
          : "Environment configuration is compliant with standards",
      };
    } catch (error) {
      return {
        status: "drifted",
        severity: "critical",
        violations: 1,
        message: `Environment analysis failed: ${error.message}`,
      };
    }
  },

  async analyzeDockerDrift() {
    try {
      if (!existsSync("Dockerfile") && !existsSync("docker-compose.yml")) {
        return { status: "skipped", message: "No Docker configuration found" };
      }

      const violations = [];
      let severity = "low";

      // Check Dockerfile
      if (existsSync("Dockerfile")) {
        const dockerfileContent = readFileSync("Dockerfile", "utf8");

        // Check for security issues
        if (
          dockerfileContent.includes("FROM ubuntu:latest") ||
          dockerfileContent.includes("FROM node:latest")
        ) {
          violations.push({
            type: "latest_tag",
            severity: "warning",
            message: "Using latest tag instead of specific version",
            recommendation: "Use specific version tags for better security",
          });
          severity = "warning";
        }

        // Check for running as root
        if (!dockerfileContent.includes("USER")) {
          violations.push({
            type: "root_user",
            severity: "critical",
            message: "Running as root user",
            recommendation: "Add USER directive to run as non-root user",
          });
          severity = "critical";
        }

        // Check for best practices
        if (
          dockerfileContent.includes("RUN apt-get update") &&
          !dockerfileContent.includes("apt-get clean")
        ) {
          violations.push({
            type: "apt_cleanup",
            severity: "warning",
            message: "apt-get update without cleanup",
            recommendation: "Clean up apt cache to reduce image size",
          });
          if (severity === "low") severity = "warning";
        }
      }

      // Check docker-compose.yml
      if (existsSync("docker-compose.yml")) {
        const composeContent = readFileSync("docker-compose.yml", "utf8");

        if (composeContent.includes('version: "2"')) {
          violations.push({
            type: "deprecated_version",
            severity: "warning",
            message: "Using deprecated Docker Compose version 2",
            recommendation: "Upgrade to version 3.x",
          });
          if (severity === "low") severity = "warning";
        }
      }

      const hasViolations = violations.length > 0;

      return {
        status: hasViolations ? "drifted" : "compliant",
        severity: severity,
        violations: violations.length,
        violationDetails: violations,
        message: hasViolations
          ? `${violations.length} Docker configuration violations found`
          : "Docker configuration is compliant with standards",
      };
    } catch (error) {
      return {
        status: "drifted",
        severity: "critical",
        violations: 1,
        message: `Docker analysis failed: ${error.message}`,
      };
    }
  },

  async analyzeCiCdDrift() {
    try {
      const { execSync } = await import("node:child_process");
      const violations = [];
      let severity = "low";

      // Check for CI/CD configuration files
      const ciFiles = execSync(
        "find . -name '.github' -o -name '.gitlab-ci.yml' -o -name 'Jenkinsfile' -o -name '.travis.yml' -o -name 'circle.yml' | head -5",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (ciFiles.length === 0) {
        violations.push({
          type: "missing_ci",
          severity: "warning",
          message: "No CI/CD configuration found",
          recommendation: "Set up CI/CD pipeline",
        });
        severity = "warning";
      } else {
        // Check GitHub Actions
        if (ciFiles.some((f) => f.includes(".github"))) {
          const workflowFiles = execSync(
            "find .github/workflows -name '*.yml' -o -name '*.yaml' 2>/dev/null | head -5",
            {
              encoding: "utf8",
            }
          )
            .trim()
            .split("\n")
            .filter((f) => f.length > 0);

          if (workflowFiles.length === 0) {
            violations.push({
              type: "missing_workflows",
              severity: "warning",
              message: "No GitHub Actions workflows found",
              recommendation: "Create workflow files in .github/workflows",
            });
            if (severity === "low") severity = "warning";
          }
        }
      }

      const hasViolations = violations.length > 0;

      return {
        status: hasViolations ? "drifted" : "compliant",
        severity: severity,
        violations: violations.length,
        violationDetails: violations,
        message: hasViolations
          ? `${violations.length} CI/CD configuration violations found`
          : "CI/CD configuration is compliant with standards",
      };
    } catch (error) {
      return {
        status: "drifted",
        severity: "critical",
        violations: 1,
        message: `CI/CD analysis failed: ${error.message}`,
      };
    }
  },

  async analyzeCodeStyleDrift() {
    try {
      const { execSync } = await import("node:child_process");
      const violations = [];
      let severity = "low";

      // Check for code style configuration files
      const styleFiles = [
        ".eslintrc.js",
        ".eslintrc.json",
        ".eslintrc.yml",
        ".prettierrc",
        ".prettierrc.js",
        ".prettierrc.json",
        "tsconfig.json",
        "jsconfig.json",
      ];

      const foundStyleFiles = styleFiles.filter((file) => existsSync(file));

      if (foundStyleFiles.length === 0) {
        violations.push({
          type: "missing_style_config",
          severity: "warning",
          message: "No code style configuration found",
          recommendation: "Add ESLint and Prettier configuration",
        });
        severity = "warning";
      } else {
        // Check for TypeScript configuration
        if (existsSync("tsconfig.json")) {
          try {
            const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));

            if (!tsconfig.compilerOptions || !tsconfig.compilerOptions.strict) {
              violations.push({
                type: "typescript_strict",
                severity: "warning",
                message: "TypeScript strict mode not enabled",
                recommendation: "Enable strict mode in tsconfig.json",
              });
              if (severity === "low") severity = "warning";
            }
          } catch (parseError) {
            violations.push({
              type: "invalid_tsconfig",
              severity: "critical",
              message: "Invalid tsconfig.json",
              recommendation: "Fix tsconfig.json syntax",
            });
            severity = "critical";
          }
        }
      }

      const hasViolations = violations.length > 0;

      return {
        status: hasViolations ? "drifted" : "compliant",
        severity: severity,
        violations: violations.length,
        violationDetails: violations,
        message: hasViolations
          ? `${violations.length} code style configuration violations found`
          : "Code style configuration is compliant with standards",
      };
    } catch (error) {
      return {
        status: "drifted",
        severity: "critical",
        violations: 1,
        message: `Code style analysis failed: ${error.message}`,
      };
    }
  },

  calculateComplianceScore(driftReport) {
    const {
      totalConfigurations,
      criticalDrifts,
      warningDrifts,
      standardsViolations,
    } = driftReport;

    if (totalConfigurations === 0) return 100;

    const criticalPenalty = criticalDrifts * 25;
    const warningPenalty = warningDrifts * 10;
    const violationPenalty = standardsViolations * 5;

    const baseScore = 100;
    const finalScore = Math.max(
      0,
      baseScore - criticalPenalty - warningPenalty - violationPenalty
    );

    return Math.round(finalScore);
  },

  generateDriftRecommendations(driftReport) {
    const recommendations = [];

    if (driftReport.criticalDrifts > 0) {
      recommendations.push(
        `🚨 URGENT: Fix ${driftReport.criticalDrifts} critical configuration drifts`
      );
    }

    if (driftReport.warningDrifts > 0) {
      recommendations.push(
        `⚠️ Address ${driftReport.warningDrifts} warning-level configuration drifts`
      );
    }

    if (driftReport.standardsViolations > 0) {
      recommendations.push(
        `📋 Resolve ${driftReport.standardsViolations} standards violations`
      );
    }

    if (driftReport.complianceScore < 70) {
      recommendations.push(
        `📊 Configuration compliance score is low (${driftReport.complianceScore}/100)`
      );
    }

    // Specific recommendations based on drift types
    const driftTypes = driftReport.driftDetails.reduce((acc, drift) => {
      drift.violationDetails?.forEach((violation) => {
        acc[violation.type] = (acc[violation.type] || 0) + 1;
      });
      return acc;
    }, {});

    if (driftTypes.hardcoded_secret > 0 || driftTypes.hardcoded_password > 0) {
      recommendations.push(
        `🔒 Remove ${
          driftTypes.hardcoded_secret + driftTypes.hardcoded_password
        } hardcoded secrets`
      );
    }

    if (driftTypes.missing_required_field > 0) {
      recommendations.push(
        `📝 Add ${driftTypes.missing_required_field} missing required fields`
      );
    }

    if (driftTypes.root_user > 0) {
      recommendations.push(
        `👤 Fix ${driftTypes.root_user} root user configurations`
      );
    }

    if (driftTypes.latest_tag > 0) {
      recommendations.push(
        `🏷️ Replace ${driftTypes.latest_tag} latest tags with specific versions`
      );
    }

    recommendations.push("📋 Establish configuration standards and guidelines");
    recommendations.push("🔧 Implement configuration validation in CI/CD");
    recommendations.push("📊 Set up configuration compliance monitoring");

    return recommendations;
  },

  getDriftBlockingIssues(driftReport) {
    const blockingIssues = [];

    if (driftReport.criticalDrifts > 0) {
      blockingIssues.push(
        `${driftReport.criticalDrifts} critical configuration drifts detected`
      );
    }

    if (driftReport.complianceScore < 50) {
      blockingIssues.push(
        `Configuration compliance score is critically low (${driftReport.complianceScore}/100)`
      );
    }

    // Check for specific critical violations
    const criticalViolations = driftReport.driftDetails
      .filter((drift) => drift.severity === "critical")
      .flatMap((drift) => drift.violationDetails || [])
      .filter((violation) => violation.severity === "critical");

    if (criticalViolations.length > 0) {
      blockingIssues.push(
        `Critical violations: ${criticalViolations
          .map((v) => v.type)
          .join(", ")}`
      );
    }

    return blockingIssues;
  },
});

