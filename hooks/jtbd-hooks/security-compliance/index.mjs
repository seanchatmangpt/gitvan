import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "security-compliance-jtbd-hooks",
    desc: "Master orchestrator for Security & Compliance JTBD Hooks",
    tags: ["jtbd", "master-orchestrator", "security-compliance"],
    version: "1.0.0",
  },
  hooks: ["pre-commit", "pre-push", "post-merge", "timer-daily"],
  async run(context) {
    const { hookName } = context;
    const timestamp = new Date().toISOString();

    try {
      // Load Security & Compliance JTBD hooks
      const hooks = await this.loadSecurityComplianceHooks();

      // Run appropriate hook based on context
      const result = await this.runAppropriateHook(hooks, hookName, context);

      // Generate master summary
      const masterSummary = this.generateMasterSummary(result);

      // Generate master recommendations
      const masterRecommendations = this.generateMasterRecommendations(result);

      // Log results
      console.log(
        `🔒 Security & Compliance JTBD Hooks (${hookName}): ${
          result.success ? "SUCCESS" : "FAILURE"
        }`
      );
      console.log(`📊 Overall Score: ${masterSummary.overallScore}/100`);

      return {
        success: result.success,
        result,
        masterSummary,
        masterRecommendations,
        message: `Security & Compliance JTBD hooks ${
          result.success ? "completed successfully" : "failed"
        }`,
      };
    } catch (error) {
      console.error(
        `❌ Security & Compliance JTBD Hooks Error (${hookName}):`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        message: "Security & Compliance JTBD hooks failed due to error",
      };
    }
  },

  async loadSecurityComplianceHooks() {
    const hooks = {};

    try {
      // Load JTBD #11: Security Policy Enforcer
      const { default: securityPolicyEnforcer } = await import(
        "./security-policy-enforcer.mjs"
      );
      hooks.securityPolicyEnforcer = securityPolicyEnforcer;

      // Load JTBD #12: License Compliance Validator
      const { default: licenseComplianceValidator } = await import(
        "./license-compliance-validator.mjs"
      );
      hooks.licenseComplianceValidator = licenseComplianceValidator;

      // Load JTBD #13: Security Vulnerability Scanner
      const { default: securityVulnerabilityScanner } = await import(
        "./security-vulnerability-scanner.mjs"
      );
      hooks.securityVulnerabilityScanner = securityVulnerabilityScanner;

      // Load JTBD #14: Access Control Validator
      const { default: accessControlValidator } = await import(
        "./access-control-validator.mjs"
      );
      hooks.accessControlValidator = accessControlValidator;

      // Load JTBD #15: Data Privacy Guardian
      const { default: dataPrivacyGuardian } = await import(
        "./data-privacy-guardian.mjs"
      );
      hooks.dataPrivacyGuardian = dataPrivacyGuardian;

      return hooks;
    } catch (error) {
      console.error(
        "Error loading Security & Compliance JTBD hooks:",
        error.message
      );
      throw error;
    }
  },

  async runAppropriateHook(hooks, hookName, context) {
    const results = {};

    try {
      // Run Security Policy Enforcer for pre-commit and pre-push
      if (hookName === "pre-commit" || hookName === "pre-push") {
        if (hooks.securityPolicyEnforcer) {
          results.securityPolicyEnforcer =
            await hooks.securityPolicyEnforcer.run(context);
        }
      }

      // Run License Compliance Validator for pre-commit and post-merge
      if (hookName === "pre-commit" || hookName === "post-merge") {
        if (hooks.licenseComplianceValidator) {
          results.licenseComplianceValidator =
            await hooks.licenseComplianceValidator.run(context);
        }
      }

      // Run Security Vulnerability Scanner for pre-commit and timer-daily
      if (hookName === "pre-commit" || hookName === "timer-daily") {
        if (hooks.securityVulnerabilityScanner) {
          results.securityVulnerabilityScanner =
            await hooks.securityVulnerabilityScanner.run(context);
        }
      }

      // Run Access Control Validator for pre-commit and post-merge
      if (hookName === "pre-commit" || hookName === "post-merge") {
        if (hooks.accessControlValidator) {
          results.accessControlValidator =
            await hooks.accessControlValidator.run(context);
        }
      }

      // Run Data Privacy Guardian for pre-commit and post-merge
      if (hookName === "pre-commit" || hookName === "post-merge") {
        if (hooks.dataPrivacyGuardian) {
          results.dataPrivacyGuardian = await hooks.dataPrivacyGuardian.run(
            context
          );
        }
      }

      // Determine overall success
      const success = Object.values(results).every((result) => result.success);

      return {
        success,
        results,
        hookName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        "Error running Security & Compliance JTBD hooks:",
        error.message
      );
      return {
        success: false,
        error: error.message,
        hookName,
        timestamp: new Date().toISOString(),
      };
    }
  },

  generateMasterSummary(result) {
    if (!result.success) {
      return {
        overallScore: 0,
        status: "FAILURE",
        message: "Security & Compliance JTBD hooks failed",
        timestamp: new Date().toISOString(),
      };
    }

    const results = result.results || {};
    const scores = [];

    // Extract scores from each hook result
    if (
      results.securityPolicyEnforcer?.report?.securityValidation
        ?.overallStatus === "PASS"
    ) {
      scores.push(85);
    } else {
      scores.push(60);
    }

    if (
      results.licenseComplianceValidator?.report?.licenseValidation
        ?.overallStatus === "PASS"
    ) {
      scores.push(80);
    } else {
      scores.push(65);
    }

    if (
      results.securityVulnerabilityScanner?.report?.vulnerabilityScan
        ?.overallStatus === "PASS"
    ) {
      scores.push(90);
    } else {
      scores.push(70);
    }

    if (
      results.accessControlValidator?.report?.accessControlValidation
        ?.overallStatus === "PASS"
    ) {
      scores.push(88);
    } else {
      scores.push(68);
    }

    if (
      results.dataPrivacyGuardian?.report?.privacyValidation?.overallStatus ===
      "PASS"
    ) {
      scores.push(87);
    } else {
      scores.push(67);
    }

    const overallScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );

    return {
      overallScore,
      status: overallScore >= 80 ? "SUCCESS" : "NEEDS_ATTENTION",
      message: `Security & Compliance JTBD hooks completed with score: ${overallScore}/100`,
      individualScores: {
        securityPolicy: scores[0] || 0,
        licenseCompliance: scores[1] || 0,
        vulnerabilityScanner: scores[2] || 0,
        accessControl: scores[3] || 0,
        dataPrivacy: scores[4] || 0,
      },
      timestamp: new Date().toISOString(),
    };
  },

  generateMasterRecommendations(result) {
    const recommendations = [];

    if (!result.success) {
      recommendations.push("🚨 Fix Security & Compliance JTBD hook failures");
      return recommendations;
    }

    const results = result.results || {};

    // Security Policy Enforcer recommendations
    if (
      results.securityPolicyEnforcer?.report?.securityValidation
        ?.overallStatus === "FAIL"
    ) {
      recommendations.push("🔒 Address security policy violations");
    }

    // License Compliance Validator recommendations
    if (
      results.licenseComplianceValidator?.report?.licenseValidation
        ?.overallStatus === "FAIL"
    ) {
      recommendations.push("📄 Fix license compliance issues");
    }

    // Security Vulnerability Scanner recommendations
    if (
      results.securityVulnerabilityScanner?.report?.vulnerabilityScan
        ?.overallStatus === "FAIL"
    ) {
      recommendations.push("🔍 Address security vulnerabilities");
    }

    // Access Control Validator recommendations
    if (
      results.accessControlValidator?.report?.accessControlValidation
        ?.overallStatus === "FAIL"
    ) {
      recommendations.push("🔐 Improve access control mechanisms");
    }

    // Data Privacy Guardian recommendations
    if (
      results.dataPrivacyGuardian?.report?.privacyValidation?.overallStatus ===
      "FAIL"
    ) {
      recommendations.push("🔒 Enhance data privacy measures");
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        "✅ All Security & Compliance JTBD hooks passed successfully"
      );
    }

    return recommendations;
  },

  getHookMetrics() {
    return {
      totalHooks: 5,
      supportedHooks: ["pre-commit", "pre-push", "post-merge", "timer-daily"],
      hookCategories: [
        "Security Policy Enforcement",
        "License Compliance",
        "Vulnerability Scanning",
        "Access Control Validation",
        "Data Privacy Protection",
      ],
      coveragePercentage: 100,
      timestamp: new Date().toISOString(),
    };
  },
});
