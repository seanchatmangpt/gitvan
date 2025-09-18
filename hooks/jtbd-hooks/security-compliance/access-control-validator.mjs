import { defineJob } from "../../../src/core/job.js";
import { execSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "access-control-validator",
    desc: "Validates access control and authorization mechanisms (JTBD #14)",
    tags: ["git-hook", "pre-commit", "post-merge", "access-control", "authorization", "jtbd"],
    version: "1.0.0",
  },
  hooks: ["pre-commit", "post-merge"],
  async run(context) {
    const { hookName } = context;
    const timestamp = new Date().toISOString();
    
    try {
      // Capture Git state
      const gitState = await this.captureGitState();
      
      // Access control validation
      const accessControlValidation = await this.validateAccessControl(gitState);
      
      // Authorization mechanism analysis
      const authorizationAnalysis = await this.analyzeAuthorizationMechanisms(gitState);
      
      // Permission model validation
      const permissionValidation = await this.validatePermissionModel(gitState);
      
      // Generate access control report
      const accessControlReport = {
        timestamp,
        hookName,
        gitState,
        accessControlValidation,
        authorizationAnalysis,
        permissionValidation,
        recommendations: this.generateAccessControlRecommendations(accessControlValidation, authorizationAnalysis, permissionValidation),
        summary: this.generateAccessControlSummary(accessControlValidation, authorizationAnalysis, permissionValidation),
      };
      
      // Write report to disk
      await this.writeAccessControlReport(accessControlReport);
      
      // Log results
      console.log(`🔐 Access Control Validator (${hookName}): ${accessControlValidation.overallStatus}`);
      console.log(`📊 Authorization Score: ${authorizationAnalysis.overallScore}/100`);
      
      return {
        success: accessControlValidation.overallStatus === "PASS",
        report: accessControlReport,
        message: `Access control validation ${accessControlValidation.overallStatus.toLowerCase()}`,
      };
    } catch (error) {
      console.error(`❌ Access Control Validator Error (${hookName}):`, error.message);
      return {
        success: false,
        error: error.message,
        message: "Access control validation failed due to error",
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
  
  async validateAccessControl(gitState) {
    const validations = {
      authenticationMechanisms: await this.validateAuthenticationMechanisms(gitState),
      authorizationPolicies: await this.validateAuthorizationPolicies(gitState),
      sessionManagement: await this.validateSessionManagement(gitState),
      roleBasedAccess: await this.validateRoleBasedAccess(gitState),
      resourceProtection: await this.validateResourceProtection(gitState),
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
  
  async analyzeAuthorizationMechanisms(gitState) {
    const analysis = {
      jwtValidation: await this.analyzeJWTValidation(gitState),
      oauthImplementation: await this.analyzeOAuthImplementation(gitState),
      apiKeyManagement: await this.analyzeAPIKeyManagement(gitState),
      tokenSecurity: await this.analyzeTokenSecurity(gitState),
      middlewareSecurity: await this.analyzeMiddlewareSecurity(gitState),
    };
    
    const scores = Object.values(analysis).map(a => a.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return {
      ...analysis,
      overallScore,
      timestamp: new Date().toISOString(),
    };
  },
  
  async validatePermissionModel(gitState) {
    const validation = {
      permissionStructure: await this.validatePermissionStructure(gitState),
      permissionInheritance: await this.validatePermissionInheritance(gitState),
      permissionEscalation: await this.validatePermissionEscalation(gitState),
      permissionAudit: await this.validatePermissionAudit(gitState),
    };
    
    const scores = Object.values(validation).map(v => v.score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return {
      ...validation,
      overallScore,
      timestamp: new Date().toISOString(),
    };
  },
  
  async validateAuthenticationMechanisms(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for authentication-related files
      const authFiles = gitState.stagedFiles.filter(f => 
        f.includes("auth") || f.includes("login") || f.includes("signin") || f.includes("authentication")
      );
      
      if (authFiles.length === 0) {
        return {
          score: 70,
          status: "NEEDS_ATTENTION",
          message: "No authentication files modified",
        };
      }
      
      // Check for secure authentication patterns
      let securePatterns = 0;
      let insecurePatterns = 0;
      
      for (const file of authFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for secure patterns
          if (content.includes("bcrypt") || content.includes("argon2") || content.includes("scrypt")) {
            securePatterns++;
          }
          
          // Check for insecure patterns
          if (content.includes("md5") || content.includes("sha1") || content.includes("password")) {
            insecurePatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = securePatterns > insecurePatterns ? 90 : 60;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Authentication mechanism score: ${score}/100`,
        authFiles,
        securePatterns,
        insecurePatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Authentication validation failed: ${error.message}`,
      };
    }
  },
  
  async validateAuthorizationPolicies(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for authorization-related files
      const authzFiles = gitState.stagedFiles.filter(f => 
        f.includes("authorization") || f.includes("permission") || f.includes("policy") || f.includes("rbac")
      );
      
      if (authzFiles.length === 0) {
        return {
          score: 75,
          status: "NEEDS_ATTENTION",
          message: "No authorization files modified",
        };
      }
      
      // Check for proper authorization patterns
      let properPatterns = 0;
      let improperPatterns = 0;
      
      for (const file of authzFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper patterns
          if (content.includes("role") || content.includes("permission") || content.includes("policy")) {
            properPatterns++;
          }
          
          // Check for improper patterns
          if (content.includes("admin") && content.includes("hardcoded")) {
            improperPatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPatterns > improperPatterns ? 85 : 65;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Authorization policy score: ${score}/100`,
        authzFiles,
        properPatterns,
        improperPatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Authorization validation failed: ${error.message}`,
      };
    }
  },
  
  async validateSessionManagement(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for session-related files
      const sessionFiles = gitState.stagedFiles.filter(f => 
        f.includes("session") || f.includes("cookie") || f.includes("jwt") || f.includes("token")
      );
      
      if (sessionFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No session files modified",
        };
      }
      
      // Check for secure session patterns
      let securePatterns = 0;
      let insecurePatterns = 0;
      
      for (const file of sessionFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for secure patterns
          if (content.includes("httpOnly") || content.includes("secure") || content.includes("sameSite")) {
            securePatterns++;
          }
          
          // Check for insecure patterns
          if (content.includes("session") && content.includes("client")) {
            insecurePatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = securePatterns > insecurePatterns ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Session management score: ${score}/100`,
        sessionFiles,
        securePatterns,
        insecurePatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Session management validation failed: ${error.message}`,
      };
    }
  },
  
  async validateRoleBasedAccess(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for RBAC-related files
      const rbacFiles = gitState.stagedFiles.filter(f => 
        f.includes("role") || f.includes("rbac") || f.includes("permission") || f.includes("acl")
      );
      
      if (rbacFiles.length === 0) {
        return {
          score: 75,
          status: "NEEDS_ATTENTION",
          message: "No RBAC files modified",
        };
      }
      
      // Check for proper RBAC patterns
      let properPatterns = 0;
      let improperPatterns = 0;
      
      for (const file of rbacFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper patterns
          if (content.includes("role") && content.includes("permission")) {
            properPatterns++;
          }
          
          // Check for improper patterns
          if (content.includes("admin") && content.includes("hardcoded")) {
            improperPatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPatterns > improperPatterns ? 88 : 68;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `RBAC score: ${score}/100`,
        rbacFiles,
        properPatterns,
        improperPatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `RBAC validation failed: ${error.message}`,
      };
    }
  },
  
  async validateResourceProtection(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for resource protection patterns
      const resourceFiles = gitState.stagedFiles.filter(f => 
        f.includes("resource") || f.includes("endpoint") || f.includes("api") || f.includes("route")
      );
      
      if (resourceFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No resource files modified",
        };
      }
      
      // Check for proper resource protection
      let protectedResources = 0;
      let unprotectedResources = 0;
      
      for (const file of resourceFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for protection patterns
          if (content.includes("auth") || content.includes("permission") || content.includes("middleware")) {
            protectedResources++;
          } else {
            unprotectedResources++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = protectedResources > unprotectedResources ? 92 : 72;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Resource protection score: ${score}/100`,
        resourceFiles,
        protectedResources,
        unprotectedResources,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Resource protection validation failed: ${error.message}`,
      };
    }
  },
  
  async analyzeJWTValidation(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for JWT-related files
      const jwtFiles = gitState.stagedFiles.filter(f => 
        f.includes("jwt") || f.includes("token") || f.includes("auth")
      );
      
      if (jwtFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No JWT files modified",
        };
      }
      
      // Check for proper JWT patterns
      let properPatterns = 0;
      let improperPatterns = 0;
      
      for (const file of jwtFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper patterns
          if (content.includes("verify") || content.includes("sign") || content.includes("exp")) {
            properPatterns++;
          }
          
          // Check for improper patterns
          if (content.includes("jwt") && content.includes("decode") && !content.includes("verify")) {
            improperPatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPatterns > improperPatterns ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `JWT validation score: ${score}/100`,
        jwtFiles,
        properPatterns,
        improperPatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `JWT validation analysis failed: ${error.message}`,
      };
    }
  },
  
  async analyzeOAuthImplementation(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for OAuth-related files
      const oauthFiles = gitState.stagedFiles.filter(f => 
        f.includes("oauth") || f.includes("openid") || f.includes("sso")
      );
      
      if (oauthFiles.length === 0) {
        return {
          score: 85,
          status: "COMPLIANT",
          message: "No OAuth files modified",
        };
      }
      
      // Check for proper OAuth patterns
      let properPatterns = 0;
      let improperPatterns = 0;
      
      for (const file of oauthFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper patterns
          if (content.includes("state") || content.includes("nonce") || content.includes("pkce")) {
            properPatterns++;
          }
          
          // Check for improper patterns
          if (content.includes("oauth") && content.includes("client_secret")) {
            improperPatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPatterns > improperPatterns ? 88 : 68;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `OAuth implementation score: ${score}/100`,
        oauthFiles,
        properPatterns,
        improperPatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `OAuth implementation analysis failed: ${error.message}`,
      };
    }
  },
  
  async analyzeAPIKeyManagement(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for API key-related files
      const apiKeyFiles = gitState.stagedFiles.filter(f => 
        f.includes("api") || f.includes("key") || f.includes("token")
      );
      
      if (apiKeyFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No API key files modified",
        };
      }
      
      // Check for proper API key patterns
      let properPatterns = 0;
      let improperPatterns = 0;
      
      for (const file of apiKeyFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper patterns
          if (content.includes("hash") || content.includes("encrypt") || content.includes("rotate")) {
            properPatterns++;
          }
          
          // Check for improper patterns
          if (content.includes("api_key") && content.includes("hardcoded")) {
            improperPatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPatterns > improperPatterns ? 85 : 65;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `API key management score: ${score}/100`,
        apiKeyFiles,
        properPatterns,
        improperPatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `API key management analysis failed: ${error.message}`,
      };
    }
  },
  
  async analyzeTokenSecurity(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for token-related files
      const tokenFiles = gitState.stagedFiles.filter(f => 
        f.includes("token") || f.includes("jwt") || f.includes("session")
      );
      
      if (tokenFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No token files modified",
        };
      }
      
      // Check for proper token patterns
      let properPatterns = 0;
      let improperPatterns = 0;
      
      for (const file of tokenFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper patterns
          if (content.includes("expire") || content.includes("refresh") || content.includes("revoke")) {
            properPatterns++;
          }
          
          // Check for improper patterns
          if (content.includes("token") && content.includes("localStorage")) {
            improperPatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPatterns > improperPatterns ? 87 : 67;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Token security score: ${score}/100`,
        tokenFiles,
        properPatterns,
        improperPatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Token security analysis failed: ${error.message}`,
      };
    }
  },
  
  async analyzeMiddlewareSecurity(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for middleware-related files
      const middlewareFiles = gitState.stagedFiles.filter(f => 
        f.includes("middleware") || f.includes("guard") || f.includes("interceptor")
      );
      
      if (middlewareFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No middleware files modified",
        };
      }
      
      // Check for proper middleware patterns
      let properPatterns = 0;
      let improperPatterns = 0;
      
      for (const file of middlewareFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper patterns
          if (content.includes("auth") || content.includes("permission") || content.includes("role")) {
            properPatterns++;
          }
          
          // Check for improper patterns
          if (content.includes("middleware") && content.includes("bypass")) {
            improperPatterns++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properPatterns > improperPatterns ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Middleware security score: ${score}/100`,
        middlewareFiles,
        properPatterns,
        improperPatterns,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Middleware security analysis failed: ${error.message}`,
      };
    }
  },
  
  async validatePermissionStructure(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for permission-related files
      const permissionFiles = gitState.stagedFiles.filter(f => 
        f.includes("permission") || f.includes("acl") || f.includes("policy")
      );
      
      if (permissionFiles.length === 0) {
        return {
          score: 75,
          status: "NEEDS_ATTENTION",
          message: "No permission files modified",
        };
      }
      
      // Check for proper permission structure
      let properStructure = 0;
      let improperStructure = 0;
      
      for (const file of permissionFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper structure
          if (content.includes("resource") && content.includes("action") && content.includes("role")) {
            properStructure++;
          } else {
            improperStructure++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properStructure > improperStructure ? 88 : 68;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Permission structure score: ${score}/100`,
        permissionFiles,
        properStructure,
        improperStructure,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Permission structure validation failed: ${error.message}`,
      };
    }
  },
  
  async validatePermissionInheritance(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for permission inheritance patterns
      const inheritanceFiles = gitState.stagedFiles.filter(f => 
        f.includes("inheritance") || f.includes("hierarchy") || f.includes("parent")
      );
      
      if (inheritanceFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No inheritance files modified",
        };
      }
      
      // Check for proper inheritance patterns
      let properInheritance = 0;
      let improperInheritance = 0;
      
      for (const file of inheritanceFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper inheritance
          if (content.includes("inherit") || content.includes("extends") || content.includes("parent")) {
            properInheritance++;
          } else {
            improperInheritance++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properInheritance > improperInheritance ? 85 : 65;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Permission inheritance score: ${score}/100`,
        inheritanceFiles,
        properInheritance,
        improperInheritance,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Permission inheritance validation failed: ${error.message}`,
      };
    }
  },
  
  async validatePermissionEscalation(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for permission escalation patterns
      const escalationFiles = gitState.stagedFiles.filter(f => 
        f.includes("escalation") || f.includes("privilege") || f.includes("admin")
      );
      
      if (escalationFiles.length === 0) {
        return {
          score: 80,
          status: "COMPLIANT",
          message: "No escalation files modified",
        };
      }
      
      // Check for proper escalation patterns
      let properEscalation = 0;
      let improperEscalation = 0;
      
      for (const file of escalationFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper escalation
          if (content.includes("approval") || content.includes("workflow") || content.includes("audit")) {
            properEscalation++;
          } else {
            improperEscalation++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properEscalation > improperEscalation ? 90 : 70;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Permission escalation score: ${score}/100`,
        escalationFiles,
        properEscalation,
        improperEscalation,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Permission escalation validation failed: ${error.message}`,
      };
    }
  },
  
  async validatePermissionAudit(gitState) {
    const { execSync } = await import("node:child_process");
    
    try {
      // Check for permission audit patterns
      const auditFiles = gitState.stagedFiles.filter(f => 
        f.includes("audit") || f.includes("log") || f.includes("track")
      );
      
      if (auditFiles.length === 0) {
        return {
          score: 75,
          status: "NEEDS_ATTENTION",
          message: "No audit files modified",
        };
      }
      
      // Check for proper audit patterns
      let properAudit = 0;
      let improperAudit = 0;
      
      for (const file of auditFiles) {
        try {
          const content = execSync(`git show :${file}`, { encoding: "utf8" });
          
          // Check for proper audit
          if (content.includes("timestamp") || content.includes("user") || content.includes("action")) {
            properAudit++;
          } else {
            improperAudit++;
          }
        } catch (error) {
          // File might not be staged yet
        }
      }
      
      const score = properAudit > improperAudit ? 88 : 68;
      
      return {
        score,
        status: score >= 80 ? "COMPLIANT" : "NEEDS_ATTENTION",
        message: `Permission audit score: ${score}/100`,
        auditFiles,
        properAudit,
        improperAudit,
      };
    } catch (error) {
      return {
        score: 0,
        status: "ERROR",
        message: `Permission audit validation failed: ${error.message}`,
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
  
  generateAccessControlRecommendations(accessControlValidation, authorizationAnalysis, permissionValidation) {
    const recommendations = [];
    
    if (accessControlValidation.overallStatus === "FAIL") {
      recommendations.push("🔐 Address access control issues before proceeding");
    }
    
    if (accessControlValidation.overallScore < 80) {
      recommendations.push("🛡️ Improve access control mechanisms");
    }
    
    if (authorizationAnalysis.overallScore < 80) {
      recommendations.push("🔑 Enhance authorization mechanisms");
    }
    
    if (permissionValidation.overallScore < 80) {
      recommendations.push("📋 Improve permission model");
    }
    
    return recommendations;
  },
  
  generateAccessControlSummary(accessControlValidation, authorizationAnalysis, permissionValidation) {
    return {
      overallStatus: accessControlValidation.overallStatus,
      accessControlScore: accessControlValidation.overallScore,
      authorizationScore: authorizationAnalysis.overallScore,
      permissionScore: permissionValidation.overallScore,
      accessControlChecks: Object.keys(accessControlValidation).filter(k => k !== "overallScore" && k !== "overallStatus" && k !== "timestamp"),
      authorizationChecks: Object.keys(authorizationAnalysis).filter(k => k !== "overallScore" && k !== "timestamp"),
      permissionChecks: Object.keys(permissionValidation).filter(k => k !== "overallScore" && k !== "timestamp"),
      timestamp: new Date().toISOString(),
    };
  },
  
  async writeAccessControlReport(report) {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    
    const reportsDir = join(process.cwd(), "reports", "jtbd", "security-compliance");
    mkdirSync(reportsDir, { recursive: true });
    
    const filename = `access-control-validator-${report.hookName}-${Date.now()}.json`;
    const filepath = join(reportsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Access control report written to: ${filepath}`);
  },
});
