#!/usr/bin/env node
/**
 * GitVan Sprint Simulation with Ollama AI Integration
 *
 * This script simulates a realistic 4-week sprint with 8 developers using:
 * - Ollama AI for code reviews, sprint planning, and developer assistance
 * - Knowledge Hook system for intelligent automation
 * - Scrum@Scale detection and reporting
 * - Realistic developer workflow simulation
 */

import { KnowledgeHookRegistry } from "../src/hooks/KnowledgeHookRegistry.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { createAIProvider } from "../src/ai/provider-factory.mjs";

class OllamaSprintSimulator {
  constructor() {
    this.registry = null;
    this.orchestrator = null;
    this.ollama = null;
    this.sprintData = null;
    this.currentDay = 0;
    this.totalDays = 20; // 4 weeks = 20 working days
    this.aiModels = {
      codeReview: "codellama:7b",
      sprintPlanning: "llama3.1:8b",
      documentation: "mistral:7b",
      testing: "deepseek-coder:6.7b",
    };
  }

  async initialize() {
    console.log("🚀 Initializing GitVan Sprint Simulation with Ollama AI...");
    console.log("=".repeat(70));

    // Initialize Ollama AI Provider
    try {
      this.ollama = await createAIProvider({
        ai: {
          provider: "ollama",
          model: this.aiModels.codeReview,
          baseURL: "http://localhost:11434",
        },
      });
      console.log("🤖 Ollama AI Provider initialized");
    } catch (error) {
      console.log("⚠️ Ollama not available, using mock AI responses");
      this.ollama = this.createMockAI();
    }

    // Initialize Knowledge Hook Registry
    this.registry = new KnowledgeHookRegistry({
      hooksDir: "./hooks",
      logger: console,
    });
    await this.registry.initialize();

    // Initialize Hook Orchestrator
    this.orchestrator = new HookOrchestrator({
      graphDir: "./graph",
      context: { cwd: process.cwd() },
      logger: console,
    });

    // Load sprint simulation data
    await this.loadSprintData();

    console.log("✅ Sprint simulation initialized");
    console.log(
      `📊 Registry: ${this.registry.getAllHooks().length} hooks loaded`
    );
    console.log(`👥 Teams: 4 teams, 8 developers`);
    console.log(`📅 Sprint: 4 weeks (${this.totalDays} working days)`);
    console.log(
      `🤖 AI Models: ${Object.keys(this.aiModels).length} models available`
    );
    console.log("");
  }

  createMockAI() {
    return {
      async doGenerate({ prompt }) {
        // Mock AI responses for realistic simulation
        const responses = {
          codeReview: [
            "✅ Code looks good! Minor suggestion: consider extracting the validation logic into a separate function for better testability.",
            "🔍 Found a potential memory leak in the event listener. Consider using WeakMap for better garbage collection.",
            "💡 Great implementation! The error handling could be improved with more specific error types.",
            "⚠️ Security concern: The API key is exposed in the client-side code. Move to server-side environment variables.",
            "🎯 Excellent use of TypeScript generics! The type safety improvements are significant.",
          ],
          sprintPlanning: [
            "📊 Based on velocity analysis, I recommend prioritizing the Knowledge Hook Registry implementation. It's blocking 3 other stories.",
            "🎯 The Ollama integration story should be split into smaller tasks. Current estimate of 13 points seems high.",
            "⚡ Consider pairing Alice and Bob on the SPARQL engine - their complementary skills will accelerate delivery.",
            "🚨 Critical path analysis shows the frontend team is waiting on backend API completion. Suggest parallel development approach.",
            "📈 Sprint capacity looks good at 85% utilization. Room for buffer tasks and knowledge sharing.",
          ],
          documentation: [
            "📝 The Knowledge Hook architecture documentation needs a visual diagram showing the predicate evaluation flow.",
            "🔧 API documentation is missing error response examples. This will help frontend integration.",
            "💡 Consider adding a troubleshooting section for common Ollama connection issues.",
            "🎯 The README could benefit from a quick start section with Docker Compose examples.",
            "📊 Performance benchmarks section would be valuable for enterprise adoption.",
          ],
          testing: [
            "🧪 Test coverage is at 78%. Focus on Knowledge Hook predicate evaluation tests to reach 85%.",
            "🔍 Integration tests for Ollama provider are missing. Critical for production readiness.",
            "⚡ Mock the Ollama API responses in unit tests to avoid external dependencies.",
            "🎯 Add performance tests for SPARQL query execution with large datasets.",
            "🚨 Security tests needed for Knowledge Hook injection vulnerabilities.",
          ],
        };

        const promptText =
          typeof prompt === "string"
            ? prompt
            : prompt.text || JSON.stringify(prompt);
        const category =
          Object.keys(responses).find((key) =>
            promptText.toLowerCase().includes(key.toLowerCase())
          ) || "codeReview";

        const categoryResponses = responses[category];
        const response =
          categoryResponses[
            Math.floor(Math.random() * categoryResponses.length)
          ];

        return {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 30, totalTokens: 40 },
          text: response,
          warnings: [],
        };
      },
    };
  }

  async loadSprintData() {
    this.sprintData = {
      sprint: {
        name: "GitVan Q1 2025 Sprint - Knowledge Hooks + Ollama AI",
        startDate: "2025-01-20",
        endDate: "2025-02-17",
        goal: "Complete Knowledge Hook system with Ollama AI integration",
      },
      teams: [
        {
          name: "Knowledge Hooks Team",
          members: ["Alice Chen (Tech Lead)", "Bob Rodriguez (Senior Dev)"],
          focus: "Core Knowledge Hook engine and SPARQL predicates",
        },
        {
          name: "AI Integration Team",
          members: ["Carol Kim (AI Engineer)", "David Patel (ML Engineer)"],
          focus: "Ollama integration and AI-powered workflows",
        },
        {
          name: "Frontend Team",
          members: [
            "Eve Johnson (Frontend Dev)",
            "Frank Wilson (UI/UX Designer)",
          ],
          focus: "Knowledge Hook management UI and visualization",
        },
        {
          name: "Backend Team",
          members: ["Grace Lee (Backend Dev)", "Henry Brown (DevOps Engineer)"],
          focus: "Knowledge Hook API and performance optimization",
        },
      ],
      backlogItems: [
        {
          name: "Knowledge Hook Registry",
          team: "Knowledge Hooks",
          status: "done",
          points: 8,
          aiReview:
            "✅ Registry implementation is solid with good separation of concerns.",
        },
        {
          name: "SPARQL Predicate Engine",
          team: "Knowledge Hooks",
          status: "done",
          points: 13,
          aiReview:
            "🎯 Excellent predicate evaluation logic. Consider caching for performance.",
        },
        {
          name: "Turtle Hook Parser",
          team: "Knowledge Hooks",
          status: "done",
          points: 5,
          aiReview:
            "💡 Clean parser implementation. Good error handling for malformed Turtle.",
        },
        {
          name: "Workflow Execution Engine",
          team: "Knowledge Hooks",
          status: "in-progress",
          points: 8,
          aiReview:
            "⚡ Workflow engine shows good progress. DAG execution logic is sound.",
        },
        {
          name: "Ollama AI Provider",
          team: "AI Integration",
          status: "done",
          points: 5,
          aiReview:
            "🤖 Ollama integration is working well. Good fallback handling.",
        },
        {
          name: "Ollama Model Management",
          team: "AI Integration",
          status: "in-progress",
          points: 8,
          aiReview:
            "📊 Model switching logic needs refinement for production use.",
        },
        {
          name: "Ollama + Knowledge Hook Integration",
          team: "AI Integration",
          status: "todo",
          points: 13,
          aiReview:
            "🚨 High priority - this is the key integration point for AI-powered automation.",
        },
        {
          name: "Knowledge Hook Management UI",
          team: "Frontend",
          status: "todo",
          points: 8,
          aiReview:
            "🎨 UI mockups look great. Focus on real-time hook status updates.",
        },
        {
          name: "Hook Visualization Dashboard",
          team: "Frontend",
          status: "todo",
          points: 5,
          aiReview:
            "📈 Dashboard design is intuitive. Consider adding drill-down capabilities.",
        },
        {
          name: "Knowledge Hook REST API",
          team: "Backend",
          status: "in-progress",
          points: 8,
          aiReview:
            "🔧 API design is RESTful. Add rate limiting for production.",
        },
        {
          name: "Hook Performance Optimization",
          team: "Backend",
          status: "todo",
          points: 5,
          aiReview:
            "⚡ Performance optimization is critical for enterprise adoption.",
        },
      ],
      impediments: [
        {
          name: "Ollama model loading performance issues",
          age: 72.5,
          severity: "high",
          team: "AI Integration",
          aiAnalysis:
            "🔍 Root cause: Model loading is synchronous. Consider async loading with caching.",
        },
        {
          name: "Complex SPARQL queries causing timeouts",
          age: 48.0,
          severity: "critical",
          team: "Knowledge Hooks",
          aiAnalysis:
            "🚨 Critical issue: SPARQL queries need optimization. Consider query planning and indexing.",
        },
      ],
    };
  }

  async simulateSprint() {
    console.log("🏃‍♂️ Starting Sprint Simulation with Ollama AI...");
    console.log("=".repeat(70));

    for (let day = 1; day <= this.totalDays; day++) {
      this.currentDay = day;
      await this.simulateDay(day);

      // Add some delay for readability
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    console.log("🎉 Sprint Simulation Complete!");
    await this.generateSprintReport();
  }

  async simulateDay(day) {
    const week = Math.ceil(day / 5);
    const dayOfWeek = ((day - 1) % 5) + 1;

    console.log(`\n📅 Day ${day} (Week ${week}, Day ${dayOfWeek})`);
    console.log("-".repeat(50));

    // Simulate daily activities with AI assistance
    await this.simulateDailyActivities(day);

    // AI-powered code reviews
    if (day % 2 === 0) {
      await this.simulateAICodeReview();
    }

    // AI-powered sprint planning
    if (dayOfWeek === 1) {
      // Monday
      await this.simulateAISprintPlanning();
    }

    // Check for Scrum of Scrums meetings
    if (dayOfWeek === 3) {
      // Wednesday
      await this.simulateScrumOfScrums();
    }

    // Check for impediment escalation with AI analysis
    await this.checkImpedimentEscalation();

    // Simulate Knowledge Hook evaluation
    await this.simulateKnowledgeHookEvaluation(day);
  }

  async simulateDailyActivities(day) {
    const activities = [
      "Implementing Knowledge Hook predicates with AI assistance",
      "Code review using Ollama-powered analysis",
      "Testing Ollama integration with Knowledge Hooks",
      "Performance optimization with AI recommendations",
      "Bug fixes guided by AI code analysis",
      "Documentation updates with AI-generated content",
      "Cross-team collaboration on AI-powered workflows",
      "Sprint backlog refinement with AI insights",
    ];

    const randomActivity =
      activities[Math.floor(Math.random() * activities.length)];
    console.log(`   🔧 Team Activity: ${randomActivity}`);

    // Simulate progress on backlog items
    if (day % 3 === 0) {
      console.log(`   📈 Progress Update: Completed 2 story points`);
    }
  }

  async simulateAICodeReview() {
    console.log(`   🤖 AI Code Review Session`);

    try {
      const reviewPrompt = `Review this Knowledge Hook implementation for code quality, performance, and best practices:
      
      // Knowledge Hook Registry implementation
      class KnowledgeHookRegistry {
        constructor(options = {}) {
          this.hooksDir = options.hooksDir || "./hooks";
          this.hooks = new Map();
        }
        
        async discoverAndParseHooks() {
          const hookFiles = await globby(\`\${this.hooksDir}/**/*.ttl\`);
          // ... implementation
        }
      }`;

      const aiResponse = await this.ollama.doGenerate({
        prompt: reviewPrompt,
      });

      console.log(`   📝 AI Review: ${aiResponse.text}`);
      console.log(`   🎯 Model: ${this.aiModels.codeReview}`);
    } catch (error) {
      console.log(`   ⚠️ AI Code Review: ${error.message}`);
    }
  }

  async simulateAISprintPlanning() {
    console.log(`   📊 AI Sprint Planning Session`);

    try {
      const planningPrompt = `Analyze our current sprint progress and provide recommendations for the remaining work:
      
      Completed: Knowledge Hook Registry, SPARQL Predicate Engine, Turtle Hook Parser, Ollama AI Provider
      In Progress: Workflow Execution Engine, Ollama Model Management, Knowledge Hook REST API
      Remaining: Ollama + Knowledge Hook Integration, Knowledge Hook Management UI, Hook Visualization Dashboard, Hook Performance Optimization
      
      Current impediments: Ollama performance issues (72.5h), SPARQL query timeouts (48h)
      
      Provide sprint planning recommendations.`;

      const aiResponse = await this.ollama.doGenerate({
        prompt: planningPrompt,
      });

      console.log(`   🎯 AI Planning: ${aiResponse.text}`);
      console.log(`   📈 Model: ${this.aiModels.sprintPlanning}`);
    } catch (error) {
      console.log(`   ⚠️ AI Sprint Planning: ${error.message}`);
    }
  }

  async simulateScrumOfScrums() {
    console.log(`   🤝 Scrum of Scrums Meeting`);

    // Simulate Knowledge Hook evaluation for SoS
    try {
      const evaluationResult = await this.orchestrator.evaluate({
        gitSignal: "sos-meeting",
        gitContext: {
          signalType: "sos-meeting",
          timestamp: Date.now(),
          meetingType: "scrum-of-scrums",
        },
        verbose: false,
      });

      console.log(
        `   🧠 Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`
      );
      console.log(
        `   ⚡ Knowledge Hooks triggered: ${evaluationResult.hooksTriggered}`
      );

      if (evaluationResult.hooksTriggered > 0) {
        console.log(`   📊 Generated SoS reports and dependency analysis`);
      }

      // AI-powered SoS insights
      try {
        const sosPrompt = `Provide insights for our Scrum of Scrums meeting based on current sprint status:
        
        Teams: Knowledge Hooks, AI Integration, Frontend, Backend
        Key blockers: Ollama performance, SPARQL timeouts
        Cross-team dependencies: Frontend waiting on Backend API, AI Integration waiting on Knowledge Hooks
        
        Provide actionable insights for the SoS meeting.`;

        const aiResponse = await this.ollama.doGenerate({
          prompt: sosPrompt,
        });

        console.log(`   🤖 AI SoS Insights: ${aiResponse.text}`);
      } catch (error) {
        console.log(`   ⚠️ AI SoS Analysis: ${error.message}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Knowledge Hook evaluation: ${error.message}`);
    }
  }

  async checkImpedimentEscalation() {
    const criticalImpediment = this.sprintData.impediments.find(
      (imp) => imp.severity === "critical"
    );

    if (criticalImpediment && criticalImpediment.age > 24) {
      console.log(`   🚨 CRITICAL IMPEDIMENT: ${criticalImpediment.name}`);
      console.log(
        `   ⏰ Age: ${criticalImpediment.age} hours - Escalated to SoS`
      );
      console.log(`   🤖 AI Analysis: ${criticalImpediment.aiAnalysis}`);

      // Simulate Knowledge Hook escalation
      try {
        const escalationResult = await this.orchestrator.evaluate({
          gitSignal: "impediment-escalation",
          gitContext: {
            signalType: "impediment-escalation",
            impedimentAge: criticalImpediment.age,
            severity: criticalImpediment.severity,
          },
          verbose: false,
        });

        if (escalationResult.hooksTriggered > 0) {
          console.log(`   📧 Escalation notifications sent to management`);
        }
      } catch (error) {
        console.log(`   ⚠️ Escalation automation: ${error.message}`);
      }
    }
  }

  async simulateKnowledgeHookEvaluation(day) {
    // Simulate different types of Knowledge Hook evaluations
    const evaluationTypes = [
      "code-quality-check",
      "dependency-analysis",
      "performance-monitoring",
      "security-scan",
      "test-coverage-check",
    ];

    const evaluationType =
      evaluationTypes[Math.floor(Math.random() * evaluationTypes.length)];

    try {
      const evaluationResult = await this.orchestrator.evaluate({
        gitSignal: evaluationType,
        gitContext: {
          signalType: evaluationType,
          day: day,
          timestamp: Date.now(),
        },
        verbose: false,
      });

      console.log(`   🧠 Knowledge Hook Evaluation: ${evaluationType}`);
      console.log(
        `   📊 Hooks evaluated: ${evaluationResult.hooksEvaluated}, triggered: ${evaluationResult.hooksTriggered}`
      );

      if (evaluationResult.hooksTriggered > 0) {
        console.log(`   ✅ Automated workflows executed successfully`);
      }
    } catch (error) {
      console.log(`   ⚠️ Knowledge Hook evaluation: ${error.message}`);
    }
  }

  async generateSprintReport() {
    console.log("\n📊 Sprint Report Generation with AI Analysis");
    console.log("=".repeat(70));

    // Generate comprehensive sprint report using Knowledge Hooks
    try {
      const reportResult = await this.orchestrator.evaluate({
        gitSignal: "sprint-report",
        gitContext: {
          signalType: "sprint-report",
          sprintData: this.sprintData,
          totalDays: this.totalDays,
        },
        verbose: true,
      });

      console.log("📈 Sprint Metrics:");
      console.log(
        `   Total Story Points: ${this.sprintData.backlogItems.reduce(
          (sum, item) => sum + item.points,
          0
        )}`
      );
      console.log(
        `   Completed Points: ${this.sprintData.backlogItems
          .filter((item) => item.status === "done")
          .reduce((sum, item) => sum + item.points, 0)}`
      );
      console.log(
        `   In Progress Points: ${this.sprintData.backlogItems
          .filter((item) => item.status === "in-progress")
          .reduce((sum, item) => sum + item.points, 0)}`
      );
      console.log(
        `   Remaining Points: ${this.sprintData.backlogItems
          .filter((item) => item.status === "todo")
          .reduce((sum, item) => sum + item.points, 0)}`
      );

      console.log("\n🚨 Impediments with AI Analysis:");
      this.sprintData.impediments.forEach((imp) => {
        console.log(`   - ${imp.name} (${imp.age}h, ${imp.severity})`);
        console.log(`     🤖 AI Analysis: ${imp.aiAnalysis}`);
      });

      console.log("\n🧠 Knowledge Hook System Performance:");
      console.log(`   Total Hooks: ${this.registry.getAllHooks().length}`);
      console.log(`   Categories: ${this.registry.getCategories().length}`);
      console.log(`   Domains: ${this.registry.getDomains().length}`);

      const stats = this.registry.getStats();
      console.log(
        `   Predicate Types: ${Object.keys(stats.predicateTypes).join(", ")}`
      );

      // AI-powered sprint retrospective
      try {
        const retrospectivePrompt = `Provide a comprehensive sprint retrospective analysis:
        
        Sprint Goal: Complete Knowledge Hook system with Ollama AI integration
        Duration: 4 weeks (20 working days)
        Team Size: 8 developers across 4 teams
        Completed: 31 story points
        Remaining: 31 story points
        Key Achievements: Knowledge Hook Registry, SPARQL Predicate Engine, Ollama AI Provider
        Major Blockers: Ollama performance issues, SPARQL query timeouts
        
        Provide insights on what went well, what could be improved, and recommendations for next sprint.`;

        const aiResponse = await this.ollama.doGenerate({
          prompt: retrospectivePrompt,
        });

        console.log("\n🤖 AI Sprint Retrospective:");
        console.log(`   ${aiResponse.text}`);
        console.log(`   📊 Analysis Model: ${this.aiModels.sprintPlanning}`);
      } catch (error) {
        console.log(`\n❌ AI retrospective analysis failed: ${error.message}`);
      }
    } catch (error) {
      console.log(`❌ Sprint report generation failed: ${error.message}`);
    }
  }
}

// Run the simulation
async function runOllamaSprintSimulation() {
  const simulator = new OllamaSprintSimulator();

  try {
    await simulator.initialize();
    await simulator.simulateSprint();
  } catch (error) {
    console.error("❌ Sprint simulation failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOllamaSprintSimulation();
}

export { OllamaSprintSimulator };
