// Documentation Sync Enforcer - JTBD #5
// "I want documentation to stay in sync with code changes"

import { defineJob } from "../../../src/core/job-registry.mjs";
import { useGitVan } from "../../../src/core/context.mjs";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "documentation-sync-enforcer",
    desc: "Ensures documentation stays in sync with code changes",
    tags: ["jtbd", "documentation", "sync", "maintenance"],
    version: "1.0.0",
  },

  hooks: ["post-commit", "pre-push"],

  async run(context) {
    console.log("📚 Documentation Sync Enforcer - JTBD #5");

    try {
      const gitvanContext = useGitVan();
      const { execSync } = await import("node:child_process");

      // Create reports directory
      const reportsDir = join(
        process.cwd(),
        "reports",
        "jtbd",
        "documentation"
      );
      mkdirSync(reportsDir, { recursive: true });

      // Analyze documentation sync status
      const syncReport = await this.analyzeDocumentationSync();

      // Generate comprehensive report
      const enforcerReport = {
        timestamp: new Date().toISOString(),
        hookType: context.hookName || "unknown",
        jtbd: {
          id: 5,
          name: "Documentation Sync Enforcer",
          description: "I want documentation to stay in sync with code changes",
          impact:
            "Ensures 80% of code changes have corresponding documentation updates",
        },
        syncAnalysis: syncReport,
        summary: {
          totalCodeFiles: syncReport.totalCodeFiles,
          documentedFiles: syncReport.documentedFiles,
          undocumentedFiles: syncReport.undocumentedFiles,
          outdatedDocs: syncReport.outdatedDocs,
          missingDocs: syncReport.missingDocs,
          syncScore: syncReport.syncScore,
          criticalGaps: syncReport.criticalGaps,
        },
        recommendations: this.generateDocumentationRecommendations(syncReport),
        blockingIssues: this.getDocumentationBlockingIssues(syncReport),
      };

      // Write report to disk
      const reportPath = join(
        reportsDir,
        `documentation-sync-enforcer-${Date.now()}.json`
      );
      writeFileSync(reportPath, JSON.stringify(enforcerReport, null, 2));

      console.log(`   📊 Documentation Sync Report: ${reportPath}`);
      console.log(`   📁 Total code files: ${syncReport.totalCodeFiles}`);
      console.log(`   ✅ Documented files: ${syncReport.documentedFiles}`);
      console.log(`   ❌ Undocumented files: ${syncReport.undocumentedFiles}`);
      console.log(`   📝 Outdated docs: ${syncReport.outdatedDocs}`);
      console.log(`   📊 Sync score: ${syncReport.syncScore}/100`);

      // Block push if critical documentation gaps exist
      if (syncReport.criticalGaps > 0) {
        console.log("   🚫 BLOCKING: Critical documentation gaps detected");
        throw new Error(
          `Documentation sync enforcer blocked push: ${syncReport.criticalGaps} critical documentation gaps found`
        );
      }

      return {
        success: true,
        reportPath: reportPath,
        syncScore: syncReport.syncScore,
        artifacts: [reportPath],
      };
    } catch (error) {
      console.error("❌ Documentation Sync Enforcer failed:", error.message);
      throw error;
    }
  },

  async analyzeDocumentationSync() {
    const syncReport = {
      totalCodeFiles: 0,
      documentedFiles: 0,
      undocumentedFiles: 0,
      outdatedDocs: 0,
      missingDocs: 0,
      syncScore: 0,
      criticalGaps: 0,
      fileAnalysis: {},
      documentationTypes: {
        apiDocs: 0,
        codeComments: 0,
        readmeFiles: 0,
        inlineDocs: 0,
      },
    };

    // Find all code files
    const codeFiles = await this.findCodeFiles();
    syncReport.totalCodeFiles = codeFiles.length;

    // Find all documentation files
    const docFiles = await this.findDocumentationFiles();

    // Analyze each code file for documentation coverage
    for (const codeFile of codeFiles) {
      const fileAnalysis = await this.analyzeFileDocumentation(
        codeFile,
        docFiles
      );
      syncReport.fileAnalysis[codeFile] = fileAnalysis;

      if (fileAnalysis.hasDocumentation) {
        syncReport.documentedFiles++;
        if (fileAnalysis.isOutdated) {
          syncReport.outdatedDocs++;
        }
      } else {
        syncReport.undocumentedFiles++;
        if (fileAnalysis.isCritical) {
          syncReport.missingDocs++;
          syncReport.criticalGaps++;
        }
      }
    }

    // Analyze documentation types
    syncReport.documentationTypes = await this.analyzeDocumentationTypes(
      docFiles
    );

    // Calculate sync score
    syncReport.syncScore = this.calculateSyncScore(syncReport);

    return syncReport;
  },

  async findCodeFiles() {
    const { execSync } = await import("node:child_process");

    try {
      const codeFiles = execSync(
        "find . -name '*.js' -o -name '*.ts' -o -name '*.jsx' -o -name '*.tsx' -o -name '*.py' -o -name '*.java' -o -name '*.go' -o -name '*.rs' -o -name '*.php' -o -name '*.rb' | grep -v node_modules | grep -v .git | head -50",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      return codeFiles;
    } catch (error) {
      console.warn("⚠️ Could not find code files:", error.message);
      return [];
    }
  },

  async findDocumentationFiles() {
    const { execSync } = await import("node:child_process");

    try {
      const docFiles = execSync(
        "find . -name '*.md' -o -name '*.rst' -o -name '*.txt' -o -name 'README*' -o -name 'CHANGELOG*' -o -name 'LICENSE*' | grep -v node_modules | grep -v .git",
        {
          encoding: "utf8",
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      return docFiles;
    } catch (error) {
      console.warn("⚠️ Could not find documentation files:", error.message);
      return [];
    }
  },

  async analyzeFileDocumentation(codeFile, docFiles) {
    const fileAnalysis = {
      hasDocumentation: false,
      isOutdated: false,
      isCritical: false,
      documentationTypes: [],
      lastModified: null,
      docLastModified: null,
      coverageScore: 0,
      issues: [],
    };

    try {
      // Get file modification time
      const { execSync } = await import("node:child_process");
      const fileStats = execSync(`stat -f "%m" "${codeFile}"`, {
        encoding: "utf8",
      }).trim();
      fileAnalysis.lastModified = parseInt(fileStats);

      // Check for inline documentation (comments)
      const content = readFileSync(codeFile, "utf8");
      const hasInlineDocs = this.checkInlineDocumentation(content);
      if (hasInlineDocs) {
        fileAnalysis.hasDocumentation = true;
        fileAnalysis.documentationTypes.push("inline");
        fileAnalysis.coverageScore += 30;
      }

      // Check for JSDoc/TSDoc comments
      const hasJSDoc = this.checkJSDocDocumentation(content);
      if (hasJSDoc) {
        fileAnalysis.hasDocumentation = true;
        fileAnalysis.documentationTypes.push("jsdoc");
        fileAnalysis.coverageScore += 40;
      }

      // Check for corresponding documentation files
      const correspondingDocs = this.findCorrespondingDocs(codeFile, docFiles);
      if (correspondingDocs.length > 0) {
        fileAnalysis.hasDocumentation = true;
        fileAnalysis.documentationTypes.push("external");
        fileAnalysis.coverageScore += 30;

        // Check if documentation is outdated
        for (const docFile of correspondingDocs) {
          try {
            const docStats = execSync(`stat -f "%m" "${docFile}"`, {
              encoding: "utf8",
            }).trim();
            const docLastModified = parseInt(docStats);

            if (docLastModified < fileAnalysis.lastModified) {
              fileAnalysis.isOutdated = true;
              fileAnalysis.issues.push(`Documentation ${docFile} is outdated`);
            }
          } catch (statError) {
            // Skip if can't get stats
          }
        }
      }

      // Determine if file is critical (needs documentation)
      fileAnalysis.isCritical = this.isCriticalFile(codeFile, content);

      // Calculate final coverage score
      if (fileAnalysis.hasDocumentation) {
        fileAnalysis.coverageScore = Math.min(100, fileAnalysis.coverageScore);
      } else {
        fileAnalysis.coverageScore = 0;
      }
    } catch (error) {
      fileAnalysis.issues.push(`Error analyzing file: ${error.message}`);
    }

    return fileAnalysis;
  },

  checkInlineDocumentation(content) {
    // Check for meaningful comments (not just single line comments)
    const commentLines = content.split("\n").filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*")
      );
    });

    // Count meaningful comments (more than 10 characters)
    const meaningfulComments = commentLines.filter(
      (line) => line.trim().length > 10
    );

    // Check for function/class documentation
    const hasFunctionDocs =
      content.includes("/**") ||
      content.includes("@param") ||
      content.includes("@returns");

    return meaningfulComments.length > 5 || hasFunctionDocs;
  },

  checkJSDocDocumentation(content) {
    // Check for JSDoc/TSDoc patterns
    const jsdocPatterns = [
      /\/\*\*[\s\S]*?\*\//g,
      /@param\s+\w+/g,
      /@returns?\s+/g,
      /@throws?\s+/g,
      /@example\s+/g,
      /@deprecated\s+/g,
    ];

    return jsdocPatterns.some((pattern) => pattern.test(content));
  },

  findCorrespondingDocs(codeFile, docFiles) {
    const baseName = codeFile.replace(
      /\.(js|ts|jsx|tsx|py|java|go|rs|php|rb)$/,
      ""
    );
    const fileName = baseName.split("/").pop();

    return docFiles.filter((docFile) => {
      const docName = docFile.toLowerCase();
      const codeName = codeFile.toLowerCase();

      return (
        docName.includes(fileName.toLowerCase()) ||
        docName.includes(baseName.toLowerCase()) ||
        docName.includes(
          codeName.replace(/\.(js|ts|jsx|tsx|py|java|go|rs|php|rb)$/, "")
        )
      );
    });
  },

  isCriticalFile(codeFile, content) {
    // Determine if a file is critical and needs documentation
    const criticalIndicators = [
      // API endpoints
      /api|endpoint|route|controller/i,
      // Public functions/classes
      /export\s+(class|function|const|let|var)/i,
      // Configuration files
      /config|setting|environment/i,
      // Database operations
      /database|db|sql|query/i,
      // Security-related code
      /auth|security|password|token|key/i,
      // Business logic
      /business|logic|rule|policy/i,
    ];

    const hasCriticalPatterns = criticalIndicators.some((pattern) =>
      pattern.test(content)
    );
    const isPublicAPI =
      content.includes("export") && !content.includes("private");
    const isLargeFile = content.split("\n").length > 100;

    return hasCriticalPatterns || (isPublicAPI && isLargeFile);
  },

  async analyzeDocumentationTypes(docFiles) {
    const docTypes = {
      apiDocs: 0,
      codeComments: 0,
      readmeFiles: 0,
      inlineDocs: 0,
    };

    for (const docFile of docFiles) {
      if (docFile.toLowerCase().includes("readme")) {
        docTypes.readmeFiles++;
      } else if (docFile.toLowerCase().includes("api")) {
        docTypes.apiDocs++;
      } else if (docFile.toLowerCase().includes("changelog")) {
        docTypes.apiDocs++;
      } else {
        docTypes.inlineDocs++;
      }
    }

    return docTypes;
  },

  calculateSyncScore(syncReport) {
    if (syncReport.totalCodeFiles === 0) return 100;

    const documentedRatio =
      syncReport.documentedFiles / syncReport.totalCodeFiles;
    const outdatedPenalty = syncReport.outdatedDocs * 0.1;
    const missingPenalty = syncReport.missingDocs * 0.2;

    const baseScore = documentedRatio * 100;
    const finalScore = Math.max(
      0,
      baseScore - outdatedPenalty - missingPenalty
    );

    return Math.round(finalScore);
  },

  generateDocumentationRecommendations(syncReport) {
    const recommendations = [];

    if (syncReport.undocumentedFiles > 0) {
      recommendations.push(
        `📝 Add documentation for ${syncReport.undocumentedFiles} undocumented files`
      );
    }

    if (syncReport.outdatedDocs > 0) {
      recommendations.push(
        `🔄 Update ${syncReport.outdatedDocs} outdated documentation files`
      );
    }

    if (syncReport.missingDocs > 0) {
      recommendations.push(
        `🚨 URGENT: Add documentation for ${syncReport.missingDocs} critical files`
      );
    }

    if (syncReport.syncScore < 70) {
      recommendations.push(
        `📊 Documentation sync score is low (${syncReport.syncScore}/100)`
      );
    }

    // Specific recommendations for critical files
    const criticalUndocumentedFiles = Object.entries(syncReport.fileAnalysis)
      .filter(
        ([file, analysis]) => !analysis.hasDocumentation && analysis.isCritical
      )
      .map(([file]) => file);

    if (criticalUndocumentedFiles.length > 0) {
      recommendations.push(
        `🎯 Priority: Document critical files: ${criticalUndocumentedFiles.join(
          ", "
        )}`
      );
    }

    recommendations.push("💡 Consider implementing JSDoc/TSDoc standards");
    recommendations.push(
      "📚 Create documentation templates for common patterns"
    );
    recommendations.push("🔧 Set up automated documentation generation");
    recommendations.push("📖 Establish documentation review process");

    return recommendations;
  },

  getDocumentationBlockingIssues(syncReport) {
    const blockingIssues = [];

    if (syncReport.criticalGaps > 0) {
      blockingIssues.push(
        `${syncReport.criticalGaps} critical files lack documentation`
      );
    }

    if (syncReport.syncScore < 50) {
      blockingIssues.push(
        `Documentation sync score is critically low (${syncReport.syncScore}/100)`
      );
    }

    // Check for specific critical files without documentation
    const criticalUndocumentedFiles = Object.entries(syncReport.fileAnalysis)
      .filter(
        ([file, analysis]) => !analysis.hasDocumentation && analysis.isCritical
      )
      .map(([file]) => file);

    if (criticalUndocumentedFiles.length > 0) {
      blockingIssues.push(
        `Critical files without documentation: ${criticalUndocumentedFiles.join(
          ", "
        )}`
      );
    }

    return blockingIssues;
  },
});
