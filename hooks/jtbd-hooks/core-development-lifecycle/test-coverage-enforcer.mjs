// Test Coverage Enforcer - JTBD #3
// "I want to ensure critical code paths are always tested"

import { defineJob } from "../../../src/core/job-registry.mjs";
import { useGitVan } from "../../../src/core/context.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "test-coverage-enforcer",
    desc: "Enforces minimum test coverage thresholds for critical code paths",
    tags: ["jtbd", "testing", "coverage", "quality"],
    version: "1.0.0",
  },

  hooks: ["pre-push", "post-merge"],

  async run(context) {
    console.log("🧪 Test Coverage Enforcer - JTBD #3");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(
        process.cwd(),
        "reports",
        "jtbd",
        "test-coverage"
      );
      mkdirSync(reportsDir, { recursive: true });

      // Analyze code changes and test coverage
      const coverageReport = await this.analyzeTestCoverage();

      // Generate comprehensive report
      const enforcerReport = {
        timestamp: new Date().toISOString(),
        hookType: context.hookName || "unknown",
        jtbd: {
          id: 3,
          name: "Test Coverage Enforcer",
          description: "I want to ensure critical code paths are always tested",
          impact: "Ensures 80% of critical functionality is tested",
        },
        coverageAnalysis: coverageReport,
        summary: {
          totalFiles: coverageReport.totalFiles,
          testedFiles: coverageReport.testedFiles,
          untestedFiles: coverageReport.untestedFiles,
          criticalFiles: coverageReport.criticalFiles,
          criticalFilesTested: coverageReport.criticalFilesTested,
          overallCoverage: coverageReport.overallCoverage,
          criticalCoverage: coverageReport.criticalCoverage,
          coverageThreshold: coverageReport.coverageThreshold,
          meetsThreshold: coverageReport.meetsThreshold,
        },
        recommendations: this.generateCoverageRecommendations(coverageReport),
        blockingIssues: this.getCoverageBlockingIssues(coverageReport),
      };

      // Write report to disk
      const reportPath = join(
        reportsDir,
        `test-coverage-enforcer-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(enforcerReport, null, 2));

      console.log(`   📊 Test Coverage Report: ${reportPath}`);
      console.log(`   📁 Total files: ${coverageReport.totalFiles}`);
      console.log(`   ✅ Tested files: ${coverageReport.testedFiles}`);
      console.log(`   ❌ Untested files: ${coverageReport.untestedFiles}`);
      console.log(
        `   🎯 Critical files tested: ${coverageReport.criticalFilesTested}/${coverageReport.criticalFiles}`
      );
      console.log(`   📊 Overall coverage: ${coverageReport.overallCoverage}%`);
      console.log(
        `   🔥 Critical coverage: ${coverageReport.criticalCoverage}%`
      );

      // Block push if critical files are untested
      if (!coverageReport.meetsThreshold) {
        console.log("   🚫 BLOCKING: Test coverage threshold not met");
        throw new Error(
          `Test coverage enforcer blocked push: ${coverageReport.untestedFiles} files lack tests, critical coverage: ${coverageReport.criticalCoverage}%`
        );
      }

      return {
        success: true,
        reportPath: reportPath,
        coverageScore: coverageReport.overallCoverage,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Test Coverage Enforcer failed:", error.message);
      throw error;
    }
  },

  async analyzeTestCoverage() {
    const coverageReport = {
      totalFiles: 0,
      testedFiles: 0,
      untestedFiles: 0,
      criticalFiles: 0,
      criticalFilesTested: 0,
      overallCoverage: 0,
      criticalCoverage: 0,
      coverageThreshold: 80,
      meetsThreshold: false,
      fileAnalysis: {},
      testFiles: [],
      sourceFiles: [],
      criticalFiles: [],
    };

    // Find all source files
    coverageReport.sourceFiles = await this.findSourceFiles();
    coverageReport.totalFiles = coverageReport.sourceFiles.length;

    // Find all test files
    coverageReport.testFiles = await this.findTestFiles();

    // Identify critical files
    coverageReport.criticalFiles = await this.identifyCriticalFiles(
      coverageReport.sourceFiles
    );
    coverageReport.criticalFiles = coverageReport.criticalFiles.length;

    // Analyze coverage for each file
    for (const sourceFile of coverageReport.sourceFiles) {
      const fileAnalysis = await this.analyzeFileCoverage(
        sourceFile,
        coverageReport.testFiles
      );
      coverageReport.fileAnalysis[sourceFile] = fileAnalysis;

      if (fileAnalysis.hasTests) {
        coverageReport.testedFiles++;
        if (coverageReport.criticalFiles.includes(sourceFile)) {
          coverageReport.criticalFilesTested++;
        }
      } else {
        coverageReport.untestedFiles++;
      }
    }

    // Calculate coverage percentages
    coverageReport.overallCoverage =
      coverageReport.totalFiles > 0
        ? Math.round(
            (coverageReport.testedFiles / coverageReport.totalFiles) * 100
          )
        : 100;

    coverageReport.criticalCoverage =
      coverageReport.criticalFiles > 0
        ? Math.round(
            (coverageReport.criticalFilesTested /
              coverageReport.criticalFiles) *
              100
          )
        : 100;

    // Check if threshold is met
    coverageReport.meetsThreshold =
      coverageReport.criticalCoverage >= coverageReport.coverageThreshold;

    return coverageReport;
  },

  async findSourceFiles() {
    const { execSync } = await import("node:child_process");

    try {
      // Find source files using git ls-files
      const sourceFiles = execSync("git ls-files", { encoding: "utf8" })
        .trim()
        .split("\n")
        .filter((file) => {
          // Include common source file extensions
          const sourceExtensions = [
            ".js",
            ".mjs",
            ".ts",
            ".tsx",
            ".jsx",
            ".py",
            ".java",
            ".go",
            ".rs",
            ".php",
            ".rb",
          ];
          const isSourceFile = sourceExtensions.some((ext) =>
            file.endsWith(ext)
          );

          // Exclude test files, node_modules, and other non-source directories
          const isTestFile =
            file.includes("test") ||
            file.includes("spec") ||
            file.includes("__tests__");
          const isNodeModules = file.includes("node_modules");
          const isBuildDir =
            file.includes("dist") ||
            file.includes("build") ||
            file.includes(".next");

          return isSourceFile && !isTestFile && !isNodeModules && !isBuildDir;
        });

      return sourceFiles;
    } catch (error) {
      console.warn("⚠️ Could not find source files:", error.message);
      return [];
    }
  },

  async findTestFiles() {
    const { execSync } = await import("node:child_process");

    try {
      // Find test files using git ls-files
      const testFiles = execSync("git ls-files", { encoding: "utf8" })
        .trim()
        .split("\n")
        .filter((file) => {
          // Include common test file patterns
          const testPatterns = [
            /\.test\.(js|ts|jsx|tsx|py|java|go)$/,
            /\.spec\.(js|ts|jsx|tsx|py|java|go)$/,
            /test\//,
            /spec\//,
            /__tests__\//,
            /tests\//,
          ];

          return testPatterns.some((pattern) => pattern.test(file));
        });

      return testFiles;
    } catch (error) {
      console.warn("⚠️ Could not find test files:", error.message);
      return [];
    }
  },

  async identifyCriticalFiles(sourceFiles) {
    const criticalFiles = [];

    for (const file of sourceFiles) {
      const criticality = await this.assessFileCriticality(file);
      if (criticality.isCritical) {
        criticalFiles.push(file);
      }
    }

    return criticalFiles;
  },

  async assessFileCriticality(file) {
    try {
      const content = readFileSync(file, "utf8");

      // Criticality indicators
      const criticalityIndicators = {
        isCritical: false,
        reasons: [],
        score: 0,
      };

      // Check for critical patterns
      const criticalPatterns = [
        // Security-related code
        {
          pattern: /password|secret|key|token|auth/i,
          weight: 10,
          reason: "Security-related code",
        },
        {
          pattern: /encrypt|decrypt|hash|crypto/i,
          weight: 10,
          reason: "Cryptographic operations",
        },

        // Database operations
        {
          pattern: /database|db|sql|query|migration/i,
          weight: 8,
          reason: "Database operations",
        },

        // API endpoints
        {
          pattern: /api|endpoint|route|controller/i,
          weight: 7,
          reason: "API endpoints",
        },

        // Business logic
        {
          pattern: /business|logic|rule|policy|validation/i,
          weight: 6,
          reason: "Business logic",
        },

        // Error handling
        {
          pattern: /error|exception|fail|throw/i,
          weight: 5,
          reason: "Error handling",
        },

        // Configuration
        {
          pattern: /config|setting|environment|env/i,
          weight: 4,
          reason: "Configuration",
        },

        // Utility functions
        {
          pattern: /util|helper|common|shared/i,
          weight: 3,
          reason: "Utility functions",
        },
      ];

      for (const { pattern, weight, reason } of criticalPatterns) {
        if (pattern.test(content)) {
          criticalityIndicators.score += weight;
          criticalityIndicators.reasons.push(reason);
        }
      }

      // Check file size (larger files are more critical)
      const lines = content.split("\n").length;
      if (lines > 100) {
        criticalityIndicators.score += 2;
        criticalityIndicators.reasons.push("Large file (>100 lines)");
      }

      // Check for complex functions
      const functionCount = (content.match(/function|=>|class/g) || []).length;
      if (functionCount > 5) {
        criticalityIndicators.score += 3;
        criticalityIndicators.reasons.push("Multiple functions/classes");
      }

      // Determine if critical based on score
      criticalityIndicators.isCritical = criticalityIndicators.score >= 10;

      return criticalityIndicators;
    } catch (error) {
      return { isCritical: false, reasons: ["Could not read file"], score: 0 };
    }
  },

  async analyzeFileCoverage(sourceFile, testFiles) {
    const fileAnalysis = {
      hasTests: false,
      testFiles: [],
      testCoverage: 0,
      testTypes: [],
      coverageDetails: {},
    };

    // Find test files that might test this source file
    const baseName = sourceFile.replace(/\.(js|ts|jsx|tsx|py|java|go)$/, "");
    const fileName = baseName.split("/").pop();

    for (const testFile of testFiles) {
      // Check if test file is related to this source file
      if (
        testFile.includes(baseName) ||
        testFile.includes(fileName) ||
        testFile.includes(baseName.split("/").slice(-2).join("/"))
      ) {
        fileAnalysis.hasTests = true;
        fileAnalysis.testFiles.push(testFile);

        // Determine test type
        if (testFile.includes(".test.")) {
          fileAnalysis.testTypes.push("unit");
        } else if (testFile.includes(".spec.")) {
          fileAnalysis.testTypes.push("spec");
        } else if (testFile.includes("integration")) {
          fileAnalysis.testTypes.push("integration");
        } else if (testFile.includes("e2e")) {
          fileAnalysis.testTypes.push("e2e");
        } else {
          fileAnalysis.testTypes.push("unknown");
        }
      }
    }

    // Calculate test coverage (simplified)
    if (fileAnalysis.hasTests) {
      fileAnalysis.testCoverage = Math.min(
        100,
        fileAnalysis.testFiles.length * 25
      ); // Simplified calculation
    }

    return fileAnalysis;
  },

  generateCoverageRecommendations(coverageReport) {
    const recommendations = [];

    if (coverageReport.untestedFiles > 0) {
      recommendations.push(
        `📝 Add tests for ${coverageReport.untestedFiles} untested files`
      );
    }

    if (coverageReport.criticalCoverage < coverageReport.coverageThreshold) {
      recommendations.push(
        `🎯 Critical files need more test coverage (${coverageReport.criticalCoverage}% < ${coverageReport.coverageThreshold}%)`
      );
    }

    if (coverageReport.overallCoverage < 70) {
      recommendations.push(
        `📊 Overall test coverage is low (${coverageReport.overallCoverage}%)`
      );
    }

    // Specific recommendations for untested critical files
    const untestedCriticalFiles = Object.entries(coverageReport.fileAnalysis)
      .filter(
        ([file, analysis]) =>
          !analysis.hasTests && coverageReport.criticalFiles.includes(file)
      )
      .map(([file]) => file);

    if (untestedCriticalFiles.length > 0) {
      recommendations.push(
        `🚨 URGENT: Add tests for critical files: ${untestedCriticalFiles.join(
          ", "
        )}`
      );
    }

    recommendations.push(
      "💡 Consider implementing test-driven development (TDD)"
    );
    recommendations.push("🔧 Set up automated test coverage reporting");
    recommendations.push("📚 Create testing guidelines for the team");

    return recommendations;
  },

  getCoverageBlockingIssues(coverageReport) {
    const blockingIssues = [];

    if (coverageReport.criticalCoverage < coverageReport.coverageThreshold) {
      blockingIssues.push(
        `Critical files lack sufficient test coverage (${coverageReport.criticalCoverage}% < ${coverageReport.coverageThreshold}%)`
      );
    }

    // Check for specific critical files without tests
    const untestedCriticalFiles = Object.entries(coverageReport.fileAnalysis)
      .filter(
        ([file, analysis]) =>
          !analysis.hasTests && coverageReport.criticalFiles.includes(file)
      )
      .map(([file]) => file);

    if (untestedCriticalFiles.length > 0) {
      blockingIssues.push(
        `Critical files without tests: ${untestedCriticalFiles.join(", ")}`
      );
    }

    return blockingIssues;
  },
});
