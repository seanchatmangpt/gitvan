import { defineJob } from "../../../src/core/job.js";
import { execSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:path";

export default defineJob({
  meta: {
    name: "data-privacy-guardian",
    desc: "Ensures data privacy compliance and protection (JTBD #15)",
    tags: ["git-hook", "pre-commit", "post-merge", "privacy", "gdpr", "jtbd"],
    version: "1.0.0",
  },
  hooks: ["pre-commit", "post-merge"],
  async run(context) {
    const { hookName } = context;
    const timestamp = new Date().toISOString();
    
    try {
      // Capture Git state
      const gitState = await this.captureGitState();
      
      // Data privacy validation
      const privacyValidation = await this.validateDataPrivacy(gitState);
      
      // GDPR compliance check
      const gdprCompliance = await this.checkGDPRCompliance(gitState);
      
      // Data protection analysis
      const dataProtectionAnalysis = await this.analyzeDataProtection(gitState);
      
      // Generate privacy report
      const privacyReport = {
        timestamp,
        hookName,
        gitState,
        privacyValidation,
        gdprCompliance,
        dataProtectionAnalysis,
        recommendations: this.generatePrivacyRecommendations(privacyValidation, gdprCompliance, dataProtectionAnalysis),
        summary: this.generatePrivacySummary(privacyValidation, gdprCompliance, dataProtectionAnalysis),
      };
      
      // Write report to disk
      await this.writePrivacyReport(privacyReport);
      
      // Log results
      console.log(`🔒 Data Privacy Guardian (${hookName}): ${privacyValidation.overallStatus}`);
      console.log(`📊 Privacy Score: ${privacyValidation.overallScore}/100`);
      
      return {
        success: privacyValidation.overallStatus === "PASS",
        report: privacyReport,
        message: `Data privacy validation ${privacyValidation.overallStatus.toLowerCase()}`,
      };
    } catch (error) {
      console.error(`❌ Data Privacy Guardian Error (${hookName}):`, error.message);
      return {
        success: false,
        error: error.message,
        message: "Data privacy validation failed due to error",
      };
    }
  },
  
  async captureGitState() {
    const { execSync } = await import("node:child_process");
    
    return {
      branch: execSync("git branch --show-current", { encoding: "utf8" }).trim(),
      stagedFiles: execSync("git diff --cached --name-only", { encoding: "utf8" })
        .trim()
        .split("\n")
        .filter(Boolean),
      unstagedFiles: execSync("git diff --name-only", { encoding: "utf8" })
        .trim()
        .split("\n")
        .filter(Boolean),
      lastCommit: execSync("git log -1 --pretty=format:%H", { encoding: "utf8" }).trim(),
      commitMessage: execSync("git log -1 --pretty=format:%s", { encoding: "utf8" }).trim(),
      repositoryHealth: await this.checkRepositoryHealth(),
    };
  },
  
  async validateDataPrivacy(gitState) {
    const validations = {
      personalDataDetection: await this.detectPersonalData(gitState),
      dataMinimization: await this.validateDataMinimization(gitState),
      consentManagement: await this.validateConsentManagement(gitState),
      dataRetention: await this.validateDataRetention(gitState),
      dataAnonymization: await this.validateDataAnonymization(gitState),
    };
    
    const scores = Object.values(validations).map(v => v.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const overallStatus = overallScore >= 80 ? "PASS" : "FAIL";
    
    return {
      ...validations,
      overallScore,
      overallStatus,
      timestamp: new Date().toISOString(),
    };
  },
  
  async checkGDPRCompliance(gitState) {
    const compliance = {
      lawfulBasis: await this.checkLawfulBasis(gitState),
      dataSubjectRights: await this.checkDataSubjectRights(gitState),
      dataProtectionImpact: await this.checkDataProtectionImpact(gitState),
      breachNotification: await this.checkBreachNotification(gitState),
      privacyByDesign: await this.checkPrivacyByDesign(gitState),
    };
    
    const scores = Object.values(compliance).map(c => c.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return {
      ...compliance,
      overallScore,
      timestamp: new Date().toISOString(),
    };
  },
  
  async analyzeDataProtection(gitState) {
    const analysis = {
      dataClassification: await this.classifyData(gitState),
      encryptionStatus: await this.checkEncryptionStatus(gitState),
      accessControls: await this.checkDataAccessControls(gitState),
      dataFlow: await this.analyzeDataFlow(gitState),
      thirdPartySharing: await this.checkThirdPartySharing(gitState),
    };
    
    return {
      ...analysis,
      timestamp: new Date().toISOString(),
    };
  },
  
  async detectPersonalData(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for personal data patterns
      const personalDataPatterns = [
        "email\\s*=",
        "phone\\s*=",
        "address\\s*=",
        "name\\s*=",
        "ssn\\s*=",
        "credit_card\\s*=",
        "birth_date\\s*=",
        "personal_id\\s*=",
      ];
      
      let personalDataFound = [];
      
      for (const file of gitState.stagedFiles) {
        if (file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".py") || file.endsWith(".sql")) {
          try {
            const content = execSync(`git show :${file}`, { encoding: "utf8" });
            for (const pattern of personalDataPatterns) {
              const regex = new RegExp(pattern, "gi");
              const matches = content.match(regex);
              if (matches) {
                personalDataFound.push({
                  file,
                  pattern,
                  matches: matches.length,
                });
              }
            }
          } catch (error) {
            // File might not be staged yet
          }
        }
      }
      
      const score = personalDataFound.length === 0 ? 95 : 60;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Personal data detection score: ${score}/100`,
        personalDataFound,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Personal data detection failed: ${error.message}`,
      };
    }
  },
  
  async validateDataMinimization(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for data minimization patterns
      const minimizationFiles = gitState.stagedFiles.filter(f => 
        f.includes("data") || f.includes("user") || f.includes("personal")
      );
      
      if (minimizationFiles.length === 0) {
        return {
          score: 85,
          status: "COMPLIANT",
          message: "No data files modified",
        };
      }
      
      // Check for proper data minimization
      let properMinimization = 0;
      let improperMinimization = 0;
      
      for (const file of minimizationFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper minimization
          if (content.includes("required") || content.includes("minimal") || content.includes("necessary")) {
            properMinimization++;
          } else {
            improperMinimization++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properMinimization > improperMinimization ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Data minimization score: ${score}/100`,
        minimizationFiles,
        properMinimization,
        improperMinimization,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Data minimization validation failed: ${error.message}`,
      };
    }
  },
  
  async validateConsentManagement(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for consent-related files
      const consentFiles = gitState.stagedFiles.filter(f => 
        f.includes("consent") || f.includes("agreement") || f.includes("terms")
      );
      
      if (consentFiles.length === 0) {
        return {
          score: 75,
          status: "NEEDS_ATTENTION",
          message: "No consent files modified",
        };
      }
      
      // Check for proper consent management
      let properConsent = 0;
      let improperConsent = 0;
      
      for (const file of consentFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper consent
          if (content.includes("explicit") || content.includes("informed") || content.includes("withdraw")) {
            properConsent++;
          } else {
            improperConsent++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properConsent > improperConsent ? 88 : 68;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Consent management score: ${score}/100`,
        consentFiles,
        properConsent,
        improperConsent,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Consent management validation failed: ${error.message}`,
      };
    }
  },
  
  async validateDataRetention(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for data retention patterns
      const retentionFiles = gitState.stagedFiles.filter(f => 
        f.includes("retention") || f.includes("expire") || f.includes("delete")
      );
      
      if (retentionFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No retention files modified",
        };
      }
      
      // Check for proper data retention
      let properRetention = 0;
      let improperRetention = 0;
      
      for (const file of retentionFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper retention
          if (content.includes("period") || content.includes("policy") || content.includes("schedule")) {
            properRetention++;
          } else {
            improperRetention++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properRetention > improperRetention ? 85 : 65;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Data retention score: ${score}/100`,
        retentionFiles,
        properRetention,
        improperRetention,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Data retention validation failed: ${error.message}`,
      };
    }
  },
  
  async validateDataAnonymization(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for data anonymization patterns
      const anonymizationFiles = gitState.stagedFiles.filter(f => 
        f.includes("anonymize") || f.includes("pseudonymize") || f.includes("mask")
      );
      
      if (anonymizationFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No anonymization files modified",
        };
      }
      
      // Check for proper anonymization
      let properAnonymization = 0;
      let improperAnonymization = 0;
      
      for (const file of anonymizationFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper anonymization
          if (content.includes("hash") || content.includes("encrypt") || content.includes("mask")) {
            properAnonymization++;
          } else {
            improperAnonymization++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properAnonymization > improperAnonymization ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Data anonymization score: ${score}/100`,
        anonymizationFiles,
        properAnonymization,
        improperAnonymization,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Data anonymization validation failed: ${error.message}`,
      };
    }
  },
  
  async checkLawfulBasis(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for lawful basis documentation
      const basisFiles = gitState.stagedFiles.filter(f => 
        f.includes("lawful") || f.includes("basis") || f.includes("legal")
      );
      
      if (basisFiles.length === 0) {
        return {
          score: 70,
          status: "NEEDS_ATTENTION",
          message: "No lawful basis files modified",
        };
      }
      
      // Check for proper lawful basis
      let properBasis = 0;
      let improperBasis = 0;
      
      for (const file of basisFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper basis
          if (content.includes("consent") || content.includes("contract") || content.includes("legitimate")) {
            properBasis++;
          } else {
            improperBasis++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properBasis > improperBasis ? 85 : 65;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Lawful basis score: ${score}/100`,
        basisFiles,
        properBasis,
        improperBasis,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Lawful basis check failed: ${error.message}`,
      };
    }
  },
  
  async checkDataSubjectRights(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for data subject rights implementation
      const rightsFiles = gitState.stagedFiles.filter(f => 
        f.includes("rights") || f.includes("subject") || f.includes("gdpr")
      );
      
      if (rightsFiles.length === 0) {
        return {
          score: 75,
          status: "NEEDS_ATTENTION",
          message: "No data subject rights files modified",
        };
      }
      
      // Check for proper rights implementation
      let properRights = 0;
      let improperRights = 0;
      
      for (const file of rightsFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper rights
          if (content.includes("access") || content.includes("rectify") || content.includes("erase")) {
            properRights++;
          } else {
            improperRights++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properRights > improperRights ? 88 : 68;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Data subject rights score: ${score}/100`,
        rightsFiles,
        properRights,
        improperRights,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Data subject rights check failed: ${error.message}`,
      };
    }
  },
  
  async checkDataProtectionImpact(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for DPIA documentation
      const dpiaFiles = gitState.stagedFiles.filter(f => 
        f.includes("dpia") || f.includes("impact") || f.includes("assessment")
      );
      
      if (dpiaFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No DPIA files modified",
        };
      }
      
      // Check for proper DPIA
      let properDPIA = 0;
      let improperDPIA = 0;
      
      for (const file of dpiaFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper DPIA
          if (content.includes("risk") || content.includes("mitigation") || content.includes("assessment")) {
            properDPIA++;
          } else {
            improperDPIA++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properDPIA > improperDPIA ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `DPIA score: ${score}/100`,
        dpiaFiles,
        properDPIA,
        improperDPIA,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `DPIA check failed: ${error.message}`,
      };
    }
  },
  
  async checkBreachNotification(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for breach notification procedures
      const breachFiles = gitState.stagedFiles.filter(f => 
        f.includes("breach") || f.includes("incident") || f.includes("notification")
      );
      
      if (breachFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No breach notification files modified",
        };
      }
      
      // Check for proper breach notification
      let properBreach = 0;
      let improperBreach = 0;
      
      for (const file of breachFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper breach notification
          if (content.includes("72") || content.includes("hour") || content.includes("supervisor")) {
            properBreach++;
          } else {
            improperBreach++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properBreach > improperBreach ? 85 : 65;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Breach notification score: ${score}/100`,
        breachFiles,
        properBreach,
        improperBreach,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Breach notification check failed: ${error.message}`,
      };
    }
  },
  
  async checkPrivacyByDesign(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for privacy by design implementation
      const privacyFiles = gitState.stagedFiles.filter(f => 
        f.includes("privacy") || f.includes("design") || f.includes("default")
      );
      
      if (privacyFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No privacy by design files modified",
        };
      }
      
      // Check for proper privacy by design
      let properPrivacy = 0;
      let improperPrivacy = 0;
      
      for (const file of privacyFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper privacy by design
          if (content.includes("default") || content.includes("minimal") || content.includes("necessary")) {
            properPrivacy++;
          } else {
            improperPrivacy++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPrivacy > improperPrivacy ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Privacy by design score: ${score}/100`,
        privacyFiles,
        properPrivacy,
        improperPrivacy,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Privacy by design check failed: ${error.message}`,
      };
    }
  },
  
  async classifyData(gitState) {
    // Classify data based on sensitivity
    const dataClassification = {
      public: 0,
      internal: 0,
      confidential: 0,
      restricted: 0,
    };
    
    // This would analyze the staged files and classify data
    // For now, return a mock classification
    return {
      classification: dataClassification,
      timestamp: new Date().toISOString(),
    };
  },
  
  async checkEncryptionStatus(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for encryption patterns
      const encryptionFiles = gitState.stagedFiles.filter(f => 
        f.includes("encrypt") || f.includes("cipher") || f.includes("hash")
      );
      
      if (encryptionFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No encryption files modified",
        };
      }
      
      // Check for proper encryption
      let properEncryption = 0;
      let improperEncryption = 0;
      
      for (const file of encryptionFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper encryption
          if (content.includes("AES") || content.includes("RSA") || content.includes("SHA256")) {
            properEncryption++;
          } else {
            improperEncryption++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properEncryption > improperEncryption ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Encryption status score: ${score}/100`,
        encryptionFiles,
        properEncryption,
        improperEncryption,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Encryption status check failed: ${error.message}`,
      };
    }
  },
  
  async checkDataAccessControls(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for data access control patterns
      const accessFiles = gitState.stagedFiles.filter(f => 
        f.includes("access") || f.includes("permission") || f.includes("role")
      );
      
      if (accessFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No access control files modified",
        };
      }
      
      // Check for proper access controls
      let properAccess = 0;
      let improperAccess = 0;
      
      for (const file of accessFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper access controls
          if (content.includes("role") || content.includes("permission") || content.includes("auth")) {
            properAccess++;
          } else {
            improperAccess++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properAccess > improperAccess ? 88 : 68;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Data access controls score: ${score}/100`,
        accessFiles,
        properAccess,
        improperAccess,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Data access controls check failed: ${error.message}`,
      };
    }
  },
  
  async analyzeDataFlow(gitState) {
    // Analyze data flow patterns
    const dataFlow = {
      inbound: 0,
      outbound: 0,
      internal: 0,
      thirdParty: 0,
    };
    
    // This would analyze the staged files and determine data flow
    // For now, return a mock analysis
    return {
      flow: dataFlow,
      timestamp: new Date().toISOString(),
    };
  },
  
  async checkThirdPartySharing(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for third-party sharing patterns
      const sharingFiles = gitState.stagedFiles.filter(f => 
        f.includes("third") || f.includes("partner") || f.includes("vendor")
      );
      
      if (sharingFiles.length === 0) {
        return {
          score: 85,
          status: "COMPLIANT",
          message: "No third-party sharing files modified",
        };
      }
      
      // Check for proper third-party sharing
      let properSharing = 0;
      let improperSharing = 0;
      
      for (const file of sharingFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper sharing
          if (content.includes("agreement") || content.includes("contract") || content.includes("consent")) {
            properSharing++;
          } else {
            improperSharing++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properSharing > improperSharing ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Third-party sharing score: ${score}/100`,
        sharingFiles,
        properSharing,
        improperSharing,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Third-party sharing check failed: ${error.message}`,
      };
    }
  },
  
  async checkRepositoryHealth() {
    const { execSync } = await import("node:child_process");
    
    try {
      const status = execSync("git status --porcelain", { encoding: "utf8" });
      const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
      const lastCommit = execSync("git log -1 --pretty=format:%H", { encoding: "utf8" }).trim();
      
      return {
        status: "HEALTHY",
        branch,
        lastCommit,
        hasUncommittedChanges: status.trim().length > 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },
  
  generatePrivacyRecommendations(privacyValidation, gdprCompliance, dataProtectionAnalysis) {
    const recommendations = [];
    
    if (privacyValidation.overallStatus === "FAIL") {
      recommendations.push("🔒 Address data privacy issues before proceeding");
    }
    
    if (privacyValidation.overallScore < 80) {
      recommendations.push("🛡️ Improve data privacy measures");
    }
    
    if (gdprCompliance.overallScore < 80) {
      recommendations.push("📋 Enhance GDPR compliance");
    }
    
    if (privacyValidation.personalDataDetection.score < 80) {
      recommendations.push("🔍 Review personal data handling");
    }
    
    if (privacyValidation.consentManagement.score < 80) {
      recommendations.push("📝 Improve consent management");
    }
    
    return recommendations;
  },
  
  generatePrivacySummary(privacyValidation, gdprCompliance, dataProtectionAnalysis) {
    return {
      overallStatus: privacyValidation.overallStatus,
      privacyScore: privacyValidation.overallScore,
      gdprScore: gdprCompliance.overallScore,
      privacyChecks: Object.keys(privacyValidation).filter(k => k !== "overallScore" && k !== "overallStatus" && k !== "timestamp"),
      gdprChecks: Object.keys(gdprCompliance).filter(k => k !== "overallScore" && k !== "timestamp"),
      dataProtectionChecks: Object.keys(dataProtectionAnalysis).filter(k => k !== "timestamp"),
      timestamp: new Date().toISOString(),
    };
  },
  
  async writePrivacyReport(report) {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    
    const reportsDir = join(process.cwd(), "reports", "jtbd", "security-compliance");
    mkdirSync(reportsDir, { recursive: true });
    
    const filename = `data-privacy-guardian-${report.hookName}-${Date.now()}.json`;
    const filepath = join(reportsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Privacy report written to: ${filepath}`);
  },
});
