// Example: Start of Day Detection & Daily Report Generation
// This shows how the Knowledge Hook system detects your start of day
// and generates a personalized daily report

import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan } from "../src/core/context.mjs";

// Example: How Start of Day Detection Works
async function demonstrateStartOfDayDetection() {
  console.log("🎯 Start of Day Detection & Daily Report Generation");
  console.log("=" .repeat(60));

  // Initialize Knowledge Hook Orchestrator
  const gitvanContext = useGitVan();
  const orchestrator = new HookOrchestrator({
    graphDir: "./hooks/developer-workflow",
    context: gitvanContext,
    logger: console,
  });

  // Scenario 1: Time-based Detection (9:00 AM)
  console.log("\n📅 Scenario 1: Time-based Detection (9:00 AM)");
  const timeBasedContext = {
    timestamp: "2025-09-18T09:00:00Z",
    trigger: "time-based",
    developer: {
      id: "dev-001",
      name: "Alice",
      workStatus: "starting",
      currentSprint: "sprint-001",
      workStyle: "morning-person",
      preferences: ["detailed-reports", "priority-focus"],
      focusAreas: ["backend", "security"]
    },
    sprint: {
      id: "sprint-001",
      name: "User Authentication System",
      status: "active",
      goal: "Complete user authentication system",
      progress: 60,
      daysRemaining: 5
    }
  };

  const timeBasedResult = await orchestrator.evaluate({
    developerContext: timeBasedContext,
    developerSignal: "start-of-day",
    verbose: true
  });

  console.log(`   ✅ Time-based detection: ${timeBasedResult.hooksTriggered > 0 ? 'TRIGGERED' : 'NOT_TRIGGERED'}`);

  // Scenario 2: IDE Startup Detection
  console.log("\n💻 Scenario 2: IDE Startup Detection");
  const ideStartupContext = {
    timestamp: "2025-09-18T09:15:00Z",
    trigger: "ide-startup",
    developer: {
      id: "dev-001",
      name: "Alice",
      ideStartup: true,
      lastActivity: "2025-09-17T17:30:00Z", // Yesterday
      currentSprint: "sprint-001"
    },
    ide: {
      name: "VS Code",
      project: "user-auth-system",
      extensions: ["gitvan-daily-report", "scrum-integration"]
    }
  };

  const ideResult = await orchestrator.evaluate({
    developerContext: ideStartupContext,
    developerSignal: "start-of-day",
    verbose: true
  });

  console.log(`   ✅ IDE startup detection: ${ideResult.hooksTriggered > 0 ? 'TRIGGERED' : 'NOT_TRIGGERED'}`);

  // Scenario 3: Calendar Integration
  console.log("\n📅 Scenario 3: Calendar Integration");
  const calendarContext = {
    timestamp: "2025-09-18T09:00:00Z",
    trigger: "calendar-event",
    developer: {
      id: "dev-001",
      name: "Alice",
      calendarEvent: {
        title: "Start Work",
        type: "start-work",
        time: "2025-09-18T09:00:00Z",
        duration: "8 hours",
        location: "Home Office"
      },
      currentSprint: "sprint-001"
    }
  };

  const calendarResult = await orchestrator.evaluate({
    developerContext: calendarContext,
    developerSignal: "start-of-day",
    verbose: true
  });

  console.log(`   ✅ Calendar detection: ${calendarResult.hooksTriggered > 0 ? 'TRIGGERED' : 'NOT_TRIGGERED'}`);

  // Scenario 4: Manual Trigger
  console.log("\n👆 Scenario 4: Manual Trigger");
  const manualContext = {
    timestamp: "2025-09-18T08:45:00Z",
    trigger: "manual",
    developer: {
      id: "dev-001",
      name: "Alice",
      manualStartTrigger: true,
      currentSprint: "sprint-001"
    },
    action: "start-work-button-clicked"
  };

  const manualResult = await orchestrator.evaluate({
    developerContext: manualContext,
    developerSignal: "start-of-day",
    verbose: true
  });

  console.log(`   ✅ Manual detection: ${manualResult.hooksTriggered > 0 ? 'TRIGGERED' : 'NOT_TRIGGERED'}`);

  return {
    timeBased: timeBasedResult,
    ideStartup: ideResult,
    calendar: calendarResult,
    manual: manualResult
  };
}

// Example: Daily Report Generation
async function demonstrateDailyReportGeneration() {
  console.log("\n📊 Daily Report Generation Example");
  console.log("=" .repeat(60));

  // Simulate the daily report that would be generated
  const dailyReport = {
    timestamp: "2025-09-18T09:00:00Z",
    developer: "Alice",
    sprint: "Sprint 1 - User Authentication System",
    reportType: "start-of-day",
    dailyPlan: {
      sprintGoal: "Complete user authentication system",
      sprintProgress: "60% complete",
      daysRemaining: 5,
      assignedItems: [
        {
          id: "AUTH-001",
          title: "Implement JWT token validation",
          priority: "high",
          estimatedHours: 4,
          dependencies: ["AUTH-000"],
          status: "in-progress",
          description: "Add JWT token validation middleware to API endpoints"
        },
        {
          id: "AUTH-002",
          title: "Add password reset functionality",
          priority: "medium",
          estimatedHours: 6,
          dependencies: [],
          status: "todo",
          description: "Implement password reset flow with email verification"
        },
        {
          id: "AUTH-003",
          title: "Integration with external auth provider",
          priority: "low",
          estimatedHours: 8,
          dependencies: ["AUTH-001"],
          status: "blocked",
          description: "Integrate with Google OAuth provider",
          blocker: "Waiting for API credentials from DevOps team",
          blockedSince: "2025-09-16",
          escalationNeeded: true
        }
      ],
      blockedItems: [
        {
          id: "AUTH-003",
          title: "Integration with external auth provider",
          blocker: "Waiting for API credentials from DevOps team",
          blockedSince: "2025-09-16",
          escalationNeeded: true,
          suggestedAction: "Contact DevOps team for API credentials"
        }
      ],
      dailyScrumPrep: {
        yesterdayAccomplished: [
          "Completed JWT token generation",
          "Fixed authentication middleware bug",
          "Updated API documentation"
        ],
        todayPlanned: [
          "Implement JWT token validation",
          "Start password reset functionality",
          "Review code with team member"
        ],
        impediments: [
          "Waiting for API credentials for external auth",
          "Need clarification on password reset requirements"
        ]
      }
    },
    recommendations: [
      "Focus on AUTH-001 first - it's blocking other items",
      "Escalate AUTH-003 blocker to DevOps team",
      "Consider pairing with team member on AUTH-002",
      "Schedule 2-hour focused work session for AUTH-001",
      "Prepare questions for daily scrum about password reset requirements"
    ],
    timeManagement: {
      estimatedWorkload: "8 hours",
      availableTime: "7.5 hours",
      bufferTime: "0.5 hours",
      suggestedSchedule: [
        "9:00-11:00 AM: AUTH-001 (JWT validation)",
        "11:00-11:15 AM: Daily Scrum",
        "11:15-1:00 PM: AUTH-001 continued",
        "1:00-2:00 PM: Lunch break",
        "2:00-4:00 PM: AUTH-002 (Password reset)",
        "4:00-5:00 PM: Code review and testing"
      ]
    },
    teamContext: {
      dailyScrumTime: "11:00 AM",
      teamMembers: ["Alice", "Bob", "Charlie"],
      sprintReview: "2025-09-25",
      retrospective: "2025-09-26",
      teamFocus: "Complete authentication system by sprint end"
    },
    personalization: {
      workStyle: "morning-person",
      preferences: ["detailed-reports", "priority-focus"],
      focusAreas: ["backend", "security"],
      optimalWorkTimes: ["9:00-11:00 AM", "2:00-4:00 PM"]
    }
  };

  console.log("\n📋 Generated Daily Report:");
  console.log(JSON.stringify(dailyReport, null, 2));

  return dailyReport;
}

// Example: Report Delivery Channels
function demonstrateReportDelivery() {
  console.log("\n📤 Report Delivery Channels");
  console.log("=" .repeat(60));

  const deliveryChannels = [
    {
      type: "email",
      address: "alice@company.com",
      subject: "Daily Sprint Report - User Authentication System",
      body: "Your personalized daily report is ready. Click here to view: https://gitvan.dev/dashboard/daily-report/12345"
    },
    {
      type: "dashboard",
      url: "https://gitvan.dev/dashboard/daily-report/12345",
      description: "Interactive dashboard with sprint progress, assigned items, and recommendations"
    },
    {
      type: "slack",
      channel: "#daily-reports",
      message: "📊 Daily report ready for Alice! Check your dashboard or email for details."
    },
    {
      type: "ide",
      extension: "gitvan-daily-report",
      popup: true,
      description: "VS Code extension popup with daily report summary"
    },
    {
      type: "mobile",
      app: "GitVan Mobile",
      notification: "Your daily sprint report is ready!",
      description: "Mobile app notification with report summary"
    }
  ];

  console.log("\n📱 Available Delivery Channels:");
  deliveryChannels.forEach((channel, index) => {
    console.log(`\n${index + 1}. ${channel.type.toUpperCase()}`);
    console.log(`   ${channel.description || channel.message || channel.subject}`);
    if (channel.url) console.log(`   URL: ${channel.url}`);
    if (channel.address) console.log(`   Address: ${channel.address}`);
    if (channel.channel) console.log(`   Channel: ${channel.channel}`);
  });

  return deliveryChannels;
}

// Run the demonstration
async function runStartOfDayDemonstration() {
  try {
    console.log("🚀 Starting Start of Day Detection & Daily Report Generation Demo");
    console.log("=" .repeat(80));

    // Demonstrate detection mechanisms
    const detectionResults = await demonstrateStartOfDayDetection();
    
    // Demonstrate report generation
    const dailyReport = await demonstrateDailyReportGeneration();
    
    // Demonstrate delivery channels
    const deliveryChannels = demonstrateReportDelivery();

    console.log("\n✅ Demo Complete!");
    console.log("=" .repeat(80));
    console.log("The Knowledge Hook system successfully:");
    console.log("  🎯 Detected start of day through multiple triggers");
    console.log("  📊 Generated personalized daily report");
    console.log("  📤 Delivered report through multiple channels");
    console.log("  🧠 Provided intelligent recommendations");
    console.log("  ⏰ Suggested optimal time management");

    return {
      detectionResults,
      dailyReport,
      deliveryChannels
    };

  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    throw error;
  }
}

// Export for use in other modules
export {
  demonstrateStartOfDayDetection,
  demonstrateDailyReportGeneration,
  demonstrateReportDelivery,
  runStartOfDayDemonstration
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStartOfDayDemonstration()
    .then(() => console.log("\n🎉 Start of Day Demo completed successfully!"))
    .catch((error) => console.error("\n💥 Demo failed:", error));
}

