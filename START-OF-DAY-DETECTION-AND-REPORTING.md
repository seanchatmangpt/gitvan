# Start of Day Detection & Daily Report Generation
## How Developer-Centric Knowledge Hooks Work

**Date:** September 18, 2025  
**Status:** 🔍 **DETAILED EXPLANATION**  
**Focus:** Start of day detection and personalized daily report generation

## 🎯 **How Start of Day Detection Works**

### **1. Detection Mechanism**

The Knowledge Hook system detects your start of day through **multiple intelligent sensors**:

#### **SPARQL Predicate Detection**
```sparql
# From hooks/developer-workflow/start-of-day.ttl
ASK WHERE {
  ?developer rdf:type dev:Developer ;
             dev:workStatus "starting" .
  ?developer dev:currentSprint ?sprint .
  ?sprint scrum:status "active" .
}
```

#### **Detection Triggers**
The system can detect start of day through:

1. **Time-based triggers** - 9:00 AM daily
2. **Activity-based triggers** - First file open, IDE startup
3. **Calendar integration** - Calendar event "Start Work"
4. **Manual triggers** - Developer explicitly signals start
5. **Team coordination** - Team daily scrum time

### **2. Context Extraction**

When start of day is detected, the system extracts comprehensive context:

```javascript
// From jobs/developer-workflow-knowledge-hooks.mjs
async extractDeveloperContext(context) {
  return {
    timestamp: new Date().toISOString(),
    developer: {
      id: "dev-001",
      name: "Developer",
      email: "developer@example.com",
      workStatus: "starting",
      currentSprint: "sprint-001",
    },
    sprint: {
      id: "sprint-001",
      name: "Sprint 1",
      status: "active",
      startDate: "2025-09-18",
      endDate: "2025-10-02",
    },
    team: {
      id: "team-001",
      name: "Development Team",
      members: ["dev-001", "dev-002", "dev-003"],
    },
    workStatus: "starting",
    signal: context.hookName,
  };
}
```

## 📊 **Daily Report Generation Workflow**

### **Start of Day Pipeline Execution**

When start of day is detected, the Knowledge Hook triggers a **3-step pipeline**:

#### **Step 1: Load Sprint Context**
```turtle
# Load Sprint Context
dev:load-sprint-context rdf:type gv:ShellStep ;
    gv:command "echo 'Loading sprint context...'" ;
    gv:description "Load current sprint and team context" .
```

**What it does:**
- Fetches current sprint information
- Loads team context and assignments
- Retrieves sprint goals and objectives
- Gets sprint timeline and deadlines

#### **Step 2: Review Sprint Backlog**
```turtle
# Review Sprint Backlog
dev:review-backlog rdf:type gv:HttpStep ;
    gv:httpUrl "https://api.scrum.com/sprint-backlog" ;
    gv:httpMethod "GET" ;
    gv:headers '{"Content-Type": "application/json"}' ;
    gv:body """
        {
            "action": "review-backlog",
            "developer": "{{ developer.id }}",
            "sprint": "{{ sprint.id }}"
        }
    """ ;
    gv:description "Review assigned sprint backlog items" ;
    gv:dependsOn dev:load-sprint-context .
```

**What it does:**
- Fetches your assigned sprint backlog items
- Analyzes item priorities and dependencies
- Identifies blocked or at-risk items
- Calculates estimated work remaining

#### **Step 3: Prepare Daily Scrum**
```turtle
# Prepare Daily Scrum
dev:prepare-daily-scrum rdf:type gv:ShellStep ;
    gv:command "echo 'Preparing daily scrum notes...'" ;
    gv:description "Prepare notes for daily scrum meeting" ;
    gv:dependsOn dev:review-backlog .
```

**What it does:**
- Generates daily scrum talking points
- Prepares "What I did yesterday" summary
- Lists "What I plan to do today"
- Identifies impediments and blockers

## 📋 **Generated Daily Report Example**

### **Personalized Daily Report**
```json
{
  "timestamp": "2025-09-18T09:00:00Z",
  "developer": "Developer",
  "sprint": "Sprint 1 - User Authentication",
  "reportType": "start-of-day",
  "dailyPlan": {
    "sprintGoal": "Complete user authentication system",
    "sprintProgress": "60% complete",
    "daysRemaining": 5,
    "assignedItems": [
      {
        "id": "AUTH-001",
        "title": "Implement JWT token validation",
        "priority": "high",
        "estimatedHours": 4,
        "dependencies": ["AUTH-000"],
        "status": "in-progress"
      },
      {
        "id": "AUTH-002", 
        "title": "Add password reset functionality",
        "priority": "medium",
        "estimatedHours": 6,
        "dependencies": [],
        "status": "todo"
      }
    ],
    "blockedItems": [
      {
        "id": "AUTH-003",
        "title": "Integration with external auth provider",
        "blocker": "Waiting for API credentials from DevOps team",
        "blockedSince": "2025-09-16",
        "escalationNeeded": true
      }
    ],
    "dailyScrumPrep": {
      "yesterdayAccomplished": [
        "Completed JWT token generation",
        "Fixed authentication middleware bug"
      ],
      "todayPlanned": [
        "Implement JWT token validation",
        "Start password reset functionality"
      ],
      "impediments": [
        "Waiting for API credentials for external auth"
      ]
    }
  },
  "recommendations": [
    "Focus on AUTH-001 first - it's blocking other items",
    "Escalate AUTH-003 blocker to DevOps team",
    "Consider pairing with team member on AUTH-002"
  ],
  "teamContext": {
    "dailyScrumTime": "10:00 AM",
    "teamMembers": ["Alice", "Bob", "Charlie"],
    "sprintReview": "2025-09-25",
    "retrospective": "2025-09-26"
  }
}
```

## 🔄 **Real-Time Detection Examples**

### **Scenario 1: IDE Startup Detection**
```javascript
// When you open your IDE/editor
const startOfDayDetected = {
  trigger: "ide-startup",
  timestamp: "2025-09-18T09:15:00Z",
  context: {
    ide: "VS Code",
    project: "user-auth-system",
    lastActivity: "2025-09-17T17:30:00Z", // Yesterday
    workSession: "new"
  }
};

// Knowledge Hook evaluates:
// ASK WHERE { ?developer dev:workStatus "starting" }
// Returns: true (detected start of day)
```

### **Scenario 2: Calendar Integration**
```javascript
// When your calendar shows "Start Work" event
const calendarTrigger = {
  trigger: "calendar-event",
  timestamp: "2025-09-18T09:00:00Z",
  event: {
    title: "Start Work",
    duration: "8 hours",
    location: "Home Office"
  }
};

// Knowledge Hook evaluates:
// ASK WHERE { ?developer dev:workStatus "starting" }
// Returns: true (detected start of day)
```

### **Scenario 3: Manual Trigger**
```javascript
// When you explicitly signal start of day
const manualTrigger = {
  trigger: "manual",
  timestamp: "2025-09-18T08:45:00Z",
  developerAction: "start-work-button-clicked"
};

// Knowledge Hook evaluates:
// ASK WHERE { ?developer dev:workStatus "starting" }
// Returns: true (detected start of day)
```

## 🎯 **Intelligent Report Customization**

### **Context-Aware Personalization**

The system generates **personalized reports** based on:

#### **Developer Profile**
```sparql
SELECT ?preferences ?workStyle ?focusAreas WHERE {
  ?developer rdf:type dev:Developer ;
             dev:preferences ?preferences ;
             dev:workStyle ?workStyle ;
             dev:focusAreas ?focusAreas .
}
```

#### **Sprint Context**
```sparql
SELECT ?sprintGoal ?progress ?risks WHERE {
  ?sprint rdf:type scrum:Sprint ;
          scrum:goal ?sprintGoal ;
          scrum:progress ?progress ;
          scrum:risks ?risks .
}
```

#### **Team Dynamics**
```sparql
SELECT ?teamMembers ?collaboration ?dependencies WHERE {
  ?team rdf:type scrum:Team ;
        scrum:members ?teamMembers ;
        scrum:collaboration ?collaboration ;
        scrum:dependencies ?dependencies .
}
```

### **Adaptive Recommendations**

The system provides **intelligent recommendations**:

#### **Priority-Based Suggestions**
```javascript
const recommendations = [
  "Focus on AUTH-001 first - it's blocking other items",
  "Escalate AUTH-003 blocker to DevOps team", 
  "Consider pairing with team member on AUTH-002",
  "Schedule 2-hour focused work session for AUTH-001"
];
```

#### **Time Management**
```javascript
const timeManagement = {
  "estimatedWorkload": "8 hours",
  "availableTime": "7.5 hours",
  "bufferTime": "0.5 hours",
  "suggestedSchedule": [
    "9:00-11:00 AM: AUTH-001 (JWT validation)",
    "11:00-11:15 AM: Daily Scrum",
    "11:15-1:00 PM: AUTH-001 continued",
    "1:00-2:00 PM: Lunch break",
    "2:00-4:00 PM: AUTH-002 (Password reset)",
    "4:00-5:00 PM: Code review and testing"
  ]
};
```

## 🚀 **Implementation in Action**

### **Step-by-Step Process**

1. **Detection** - System detects start of day through multiple triggers
2. **Context Extraction** - Gathers sprint, team, and personal context
3. **SPARQL Evaluation** - Knowledge Hook evaluates start-of-day predicate
4. **Pipeline Execution** - Runs 3-step workflow pipeline
5. **Report Generation** - Creates personalized daily report
6. **Delivery** - Delivers report via preferred channel (email, dashboard, etc.)

### **Report Delivery Channels**

```javascript
const deliveryChannels = {
  "email": "daily-report@company.com",
  "dashboard": "https://gitvan.dev/dashboard/daily-report",
  "slack": "#daily-reports",
  "mobile": "GitVan mobile app notification",
  "ide": "VS Code extension popup"
};
```

## 🎯 **Key Benefits**

### **For Developers**
- **Personalized daily planning** - Tailored to your sprint and preferences
- **Context awareness** - Understands your current sprint and team dynamics
- **Intelligent recommendations** - Suggests optimal work prioritization
- **Seamless integration** - Works with your existing tools and workflows

### **For Teams**
- **Synchronized planning** - All team members get coordinated daily reports
- **Impediment visibility** - Early identification of blockers and risks
- **Progress tracking** - Real-time sprint progress and burndown updates
- **Collaboration enhancement** - Facilitates better team coordination

This developer-centric Knowledge Hook system transforms the traditional "Git hook" approach into an **intelligent, context-aware daily planning assistant** that understands your work, your team, and your sprint goals!

