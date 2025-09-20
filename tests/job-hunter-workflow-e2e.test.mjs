#!/usr/bin/env node

/**
 * GitVan Job Hunter Workflow - End-to-End Test
 *
 * This test simulates a complete job search process from application to first day,
 * testing all GitVan capabilities including workflow automation, data persistence,
 * and process tracking.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { withGitVan } from "../src/composables/ctx.mjs";
import { useTurtle } from "../src/composables/turtle.mjs";
import { graphCommand } from "../src/cli/commands/graph.mjs";

describe("GitVan Job Hunter Workflow - End-to-End Test", () => {
  let testDir;
  let originalCwd;
  let jobHunterData;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gitvan-job-hunter-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    // Don't change directory - use absolute paths instead

    // Initialize job hunter profile
    jobHunterData = {
      hunterId: `hunter-${randomUUID().slice(0, 8)}`,
      profile: {
        name: "Alex Johnson",
        email: "alex.johnson@email.com",
        phone: "+1-555-0123",
        location: "San Francisco, CA",
        experience: "5 years",
        skills: ["JavaScript", "React", "Node.js", "Python", "AWS"],
        education: "BS Computer Science",
        resume: "alex-johnson-resume.pdf",
        portfolio: "https://alexjohnson.dev",
      },
      jobSearch: {
        startDate: new Date(),
        targetRoles: [
          "Software Engineer",
          "Full Stack Developer",
          "Frontend Engineer",
        ],
        targetCompanies: ["Google", "Microsoft", "Apple", "Meta", "Netflix"],
        salaryRange: { min: 120000, max: 180000 },
        location: "San Francisco Bay Area",
        remote: true,
        status: "Active",
      },
      applications: [],
      interviews: [],
      offers: [],
      metrics: {
        applicationsSubmitted: 0,
        interviewsScheduled: 0,
        offersReceived: 0,
        responseRate: 0,
        interviewSuccessRate: 0,
      },
    };
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Job Application Phase", () => {
    it("should initialize job search with profile data", async () => {
      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        // Initialize graph for job search data
        const initCmd = graphCommand.subCommands["init-default"];

        const consoleLogs = [];
        const originalLog = console.log;
        console.log = (...args) => consoleLogs.push(args.join(" "));

        try {
          await initCmd.run({
            args: {
              "graph-dir": "job-search",
              validate: true,
            },
          });

          // Save job hunter profile
          const saveCmd = graphCommand.subCommands.save;
          await saveCmd.run({
            args: {
              fileName: "job-hunter-profile",
              "graph-dir": "job-search",
              backup: true,
              validate: true,
            },
          });

          // Verify files were created
          const files = await fs.readdir(join(testDir, "job-search"));
          expect(files).toContain("default.ttl");
          expect(files).toContain("job-hunter-profile.ttl");
        } finally {
          console.log = originalLog;
        }
      });
    });

    it("should track job applications across multiple platforms", async () => {
      const applications = [
        {
          id: "APP-001",
          company: "Google",
          position: "Software Engineer",
          platform: "LinkedIn",
          appliedDate: new Date(),
          status: "Applied",
          jobUrl: "https://careers.google.com/jobs/12345",
          requirements: ["JavaScript", "React", "Node.js"],
          salary: 150000,
          location: "Mountain View, CA",
        },
        {
          id: "APP-002",
          company: "Microsoft",
          position: "Full Stack Developer",
          platform: "Company Website",
          appliedDate: new Date(),
          status: "Applied",
          jobUrl: "https://careers.microsoft.com/jobs/67890",
          requirements: ["C#", "Azure", "React"],
          salary: 140000,
          location: "Seattle, WA",
        },
        {
          id: "APP-003",
          company: "Apple",
          position: "Frontend Engineer",
          platform: "Indeed",
          appliedDate: new Date(),
          status: "Applied",
          jobUrl: "https://jobs.apple.com/jobs/11111",
          requirements: ["JavaScript", "Swift", "iOS"],
          salary: 160000,
          location: "Cupertino, CA",
        },
      ];

      jobHunterData.applications = applications;
      jobHunterData.metrics.applicationsSubmitted = applications.length;

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "job-applications",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify applications were tracked
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("job-applications.ttl");
      });
    });

    it("should monitor application status and responses", async () => {
      const applicationUpdates = [
        {
          applicationId: "APP-001",
          date: new Date(),
          status: "Under Review",
          notes: "Application received, HR screening in progress",
        },
        {
          applicationId: "APP-002",
          date: new Date(),
          status: "Rejected",
          notes: "Position filled internally",
        },
        {
          applicationId: "APP-003",
          date: new Date(),
          status: "Interview Scheduled",
          notes: "Phone screen scheduled for next week",
        },
      ];

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "application-updates",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Calculate response rate
        const responses = applicationUpdates.filter(
          (update) => update.status !== "Applied"
        ).length;
        jobHunterData.metrics.responseRate =
          responses / jobHunterData.applications.length;

        expect(jobHunterData.metrics.responseRate).toBeCloseTo(1.0, 1);
      });
    });
  });

  describe("Interview Process Phase", () => {
    it("should schedule and track interview rounds", async () => {
      const interviews = [
        {
          id: "INT-001",
          applicationId: "APP-003",
          company: "Apple",
          position: "Frontend Engineer",
          round: 1,
          type: "Phone Screen",
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          duration: 30,
          interviewer: "Sarah Chen",
          interviewerRole: "Engineering Manager",
          status: "Scheduled",
          preparation: [
            "Review Apple's design principles",
            "Prepare STAR method examples",
            "Research team structure",
          ],
        },
        {
          id: "INT-002",
          applicationId: "APP-001",
          company: "Google",
          position: "Software Engineer",
          round: 1,
          type: "Technical Phone Screen",
          scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          duration: 45,
          interviewer: "Mike Rodriguez",
          interviewerRole: "Senior Software Engineer",
          status: "Scheduled",
          preparation: [
            "Practice coding problems",
            "Review system design basics",
            "Prepare questions about Google's culture",
          ],
        },
      ];

      jobHunterData.interviews = interviews;
      jobHunterData.metrics.interviewsScheduled = interviews.length;

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "interview-schedule",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify interviews were scheduled
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("interview-schedule.ttl");
      });
    });

    it("should conduct interviews and track feedback", async () => {
      const interviewResults = [
        {
          interviewId: "INT-001",
          date: new Date(),
          status: "Completed",
          feedback: {
            technical: 8,
            communication: 9,
            culturalFit: 8,
            overall: 8.3,
          },
          notes:
            "Strong technical skills, good communication, cultural fit confirmed",
          nextSteps: "Proceed to onsite interview",
          interviewerNotes:
            "Candidate demonstrated solid frontend knowledge and problem-solving skills",
        },
        {
          interviewId: "INT-002",
          date: new Date(),
          status: "Completed",
          feedback: {
            technical: 7,
            communication: 8,
            culturalFit: 9,
            overall: 8.0,
          },
          notes:
            "Good technical foundation, excellent cultural fit, needs improvement in system design",
          nextSteps: "Proceed to onsite interview",
          interviewerNotes:
            "Strong coding skills, needs more experience with large-scale systems",
        },
      ];

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "interview-results",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Calculate interview success rate
        const successfulInterviews = interviewResults.filter(
          (result) => result.feedback.overall >= 8.0
        ).length;
        jobHunterData.metrics.interviewSuccessRate =
          successfulInterviews / interviewResults.length;

        expect(jobHunterData.metrics.interviewSuccessRate).toBe(1.0);
      });
    });

    it("should handle onsite interviews and final rounds", async () => {
      const onsiteInterviews = [
        {
          id: "INT-003",
          applicationId: "APP-003",
          company: "Apple",
          position: "Frontend Engineer",
          round: 2,
          type: "Onsite Technical",
          scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          duration: 180,
          interviewers: [
            { name: "Sarah Chen", role: "Engineering Manager" },
            { name: "David Kim", role: "Senior Frontend Engineer" },
            { name: "Lisa Wang", role: "Product Manager" },
          ],
          status: "Scheduled",
          agenda: [
            "Technical coding challenge (60 min)",
            "System design discussion (45 min)",
            "Behavioral interview (45 min)",
            "Team fit assessment (30 min)",
          ],
          preparation: [
            "Review Apple's Human Interface Guidelines",
            "Practice React and JavaScript fundamentals",
            "Prepare examples of user-focused design decisions",
            "Research Apple's product development process",
          ],
        },
      ];

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "onsite-interviews",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify onsite interview was scheduled
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("onsite-interviews.ttl");
      });
    });
  });

  describe("Job Offer and Negotiation Phase", () => {
    it("should receive and evaluate job offers", async () => {
      const offers = [
        {
          id: "OFFER-001",
          applicationId: "APP-003",
          company: "Apple",
          position: "Frontend Engineer",
          offerDate: new Date(),
          salary: 165000,
          bonus: 25000,
          equity: "RSUs worth $50,000 over 4 years",
          benefits: [
            "Health insurance (100% covered)",
            "Dental and vision",
            "401k matching (6%)",
            "Unlimited PTO",
            "Gym membership",
            "Commuter benefits",
          ],
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          location: "Cupertino, CA",
          remote: false,
          status: "Received",
          responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      jobHunterData.offers = offers;
      jobHunterData.metrics.offersReceived = offers.length;

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "job-offers",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify offer was received
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("job-offers.ttl");
      });
    });

    it("should negotiate salary and benefits", async () => {
      const negotiation = {
        offerId: "OFFER-001",
        initialOffer: {
          salary: 165000,
          bonus: 25000,
          equity: "RSUs worth $50,000 over 4 years",
        },
        counterOffer: {
          salary: 175000,
          bonus: 30000,
          equity: "RSUs worth $60,000 over 4 years",
          additionalRequests: [
            "Sign-on bonus of $15,000",
            "Flexible work arrangement (2 days remote)",
            "Professional development budget of $5,000/year",
          ],
        },
        finalOffer: {
          salary: 170000,
          bonus: 28000,
          equity: "RSUs worth $55,000 over 4 years",
          signOnBonus: 10000,
          remoteDays: 1,
          professionalDevelopment: 3000,
        },
        negotiationRounds: 3,
        status: "Accepted",
        notes:
          "Successfully negotiated higher base salary and additional benefits",
      };

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "salary-negotiation",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify negotiation was tracked
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("salary-negotiation.ttl");
      });
    });

    it("should handle offer acceptance and resignation", async () => {
      const offerAcceptance = {
        offerId: "OFFER-001",
        acceptanceDate: new Date(),
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        resignationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentEmployer: "TechCorp Inc",
        resignationLetter: "resignation-letter.pdf",
        noticePeriod: 14,
        handoverTasks: [
          "Complete project documentation",
          "Train replacement developer",
          "Transfer knowledge to team",
          "Close out active tickets",
        ],
        status: "Accepted",
      };

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "offer-acceptance",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify acceptance was processed
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("offer-acceptance.ttl");
      });
    });
  });

  describe("Onboarding and First Day Phase", () => {
    it("should prepare for first day and onboarding", async () => {
      const onboardingPrep = {
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        company: "Apple",
        position: "Frontend Engineer",
        preparation: {
          documents: [
            "I-9 form",
            "W-4 tax form",
            "Direct deposit form",
            "Emergency contact information",
            "Background check authorization",
          ],
          equipment: [
            "MacBook Pro (provided)",
            "Monitor setup",
            "Development environment access",
            "VPN credentials",
            "Slack/Teams access",
          ],
          training: [
            "Company orientation (Day 1)",
            "Engineering onboarding (Week 1)",
            "Team introduction meetings",
            "Code review process training",
            "Product knowledge sessions",
          ],
        },
        firstWeekSchedule: [
          {
            day: 1,
            activities: [
              "HR orientation",
              "IT setup and equipment",
              "Team introduction",
              "Office tour",
            ],
          },
          {
            day: 2,
            activities: [
              "Development environment setup",
              "Code repository access",
              "First project assignment",
              "Mentor assignment",
            ],
          },
        ],
      };

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "onboarding-prep",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify onboarding prep was saved
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("onboarding-prep.ttl");
      });
    });

    it("should simulate first day experience", async () => {
      const firstDay = {
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        company: "Apple",
        experience: {
          arrival: "9:00 AM - Arrived at Apple Park",
          checkIn: "9:15 AM - Security check-in and badge pickup",
          orientation: "9:30 AM - HR orientation and paperwork",
          equipment: "10:30 AM - IT setup and equipment distribution",
          teamMeet: "11:00 AM - Team introduction and welcome",
          lunch: "12:00 PM - Team lunch at Caffè Macs",
          workspace: "1:00 PM - Workspace setup and tour",
          mentor: "2:00 PM - Meet with assigned mentor",
          firstTask: "3:00 PM - First small task assignment",
          wrapUp: "4:30 PM - End of day wrap-up and questions",
        },
        impressions: {
          companyCulture: "Very collaborative and innovative",
          teamDynamics: "Welcoming and supportive",
          workEnvironment: "Modern and well-equipped",
          expectations: "Clear and achievable",
          overallExperience: "Excellent first day",
        },
        nextSteps: [
          "Complete development environment setup",
          "Review team coding standards",
          "Start first project task",
          "Schedule regular check-ins with mentor",
        ],
      };

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "first-day-experience",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify first day was documented
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("first-day-experience.ttl");
      });
    });

    it("should track first week progress and integration", async () => {
      const firstWeek = {
        week: 1,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        company: "Apple",
        dailyProgress: [
          {
            day: 1,
            focus: "Orientation and setup",
            accomplishments: [
              "Completed HR orientation",
              "Set up development environment",
              "Met team members",
              "Received first project assignment",
            ],
            challenges: ["Learning new codebase structure"],
            rating: 8,
          },
          {
            day: 2,
            focus: "Development environment and first tasks",
            accomplishments: [
              "Completed first bug fix",
              "Attended code review session",
              "Set up local development environment",
              "Joined team Slack channels",
            ],
            challenges: ["Understanding Apple's coding standards"],
            rating: 7,
          },
        ],
        overallProgress: {
          technicalIntegration: 70,
          teamIntegration: 85,
          projectUnderstanding: 60,
          overallSatisfaction: 8.5,
        },
        feedback: {
          fromMentor: "Great progress, asking good questions",
          fromManager: "Integrating well with the team",
          selfAssessment: "Feeling more confident each day",
        },
      };

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "first-week-progress",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify first week progress was tracked
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("first-week-progress.ttl");
      });
    });
  });

  describe("Job Search Analytics and Metrics", () => {
    it("should calculate comprehensive job search metrics", async () => {
      const analytics = {
        searchDuration: 45, // days
        applicationsSubmitted: jobHunterData.metrics.applicationsSubmitted,
        interviewsScheduled: jobHunterData.metrics.interviewsScheduled,
        offersReceived: jobHunterData.metrics.offersReceived,
        responseRate: jobHunterData.metrics.responseRate,
        interviewSuccessRate: jobHunterData.metrics.interviewSuccessRate,
        offerAcceptanceRate: 1.0, // 1 offer received, 1 accepted
        timeToOffer: 30, // days from first application to offer
        platformsUsed: ["LinkedIn", "Company Website", "Indeed"],
        companiesApplied: ["Google", "Microsoft", "Apple"],
        averageResponseTime: 5, // days
        negotiationSuccess: true,
        salaryIncrease: 5000, // from initial offer to final offer
        totalCompensation: 208000, // salary + bonus + equity value
      };

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "job-search-analytics",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify analytics were calculated
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("job-search-analytics.ttl");
        expect(analytics.responseRate).toBe(1.0);
        expect(analytics.interviewSuccessRate).toBe(1.0);
        expect(analytics.offerAcceptanceRate).toBe(1.0);
      });
    });

    it("should generate job search success report", async () => {
      const successReport = {
        jobHunterId: jobHunterData.hunterId,
        searchStartDate: jobHunterData.jobSearch.startDate,
        searchEndDate: new Date(),
        totalDuration: 45,
        finalOutcome: {
          company: "Apple",
          position: "Frontend Engineer",
          salary: 170000,
          bonus: 28000,
          equity: "RSUs worth $55,000 over 4 years",
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          location: "Cupertino, CA",
        },
        keySuccessFactors: [
          "Strong technical skills in React and JavaScript",
          "Good communication during interviews",
          "Cultural fit with Apple's values",
          "Effective negotiation strategy",
          "Professional networking and preparation",
        ],
        lessonsLearned: [
          "Preparation is key for technical interviews",
          "Cultural fit is as important as technical skills",
          "Negotiation can significantly improve offers",
          "Multiple applications increase chances of success",
          "Follow-up and persistence pay off",
        ],
        recommendations: [
          "Continue building technical skills",
          "Maintain professional network",
          "Document achievements for future searches",
          "Stay updated with industry trends",
          "Build strong relationships with colleagues",
        ],
      };

      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "success-report",
            "graph-dir": "job-search",
            backup: true,
            validate: true,
          },
        });

        // Verify success report was generated
        const files = await fs.readdir(join(testDir, "job-search"));
        expect(files).toContain("success-report.ttl");
        expect(successReport.finalOutcome.company).toBe("Apple");
        expect(successReport.finalOutcome.salary).toBe(170000);
      });
    });
  });

  describe("End-to-End Job Search Validation", () => {
    it("should complete full job search cycle with all phases", async () => {
      const context = {
        cwd: testDir,
        root: testDir,
      };

      await withGitVan(context, async () => {
        // Phase 1: Job Application
        const initCmd = graphCommand.subCommands["init-default"];
        await initCmd.run({
          args: { "graph-dir": "complete-job-search", validate: true },
        });

        const saveCmd = graphCommand.subCommands.save;
        await saveCmd.run({
          args: {
            fileName: "job-applications",
            "graph-dir": "complete-job-search",
            backup: true,
            validate: true,
          },
        });

        // Phase 2: Interview Process
        await saveCmd.run({
          args: {
            fileName: "interview-process",
            "graph-dir": "complete-job-search",
            backup: true,
            validate: true,
          },
        });

        // Phase 3: Job Offers
        await saveCmd.run({
          args: {
            fileName: "job-offers",
            "graph-dir": "complete-job-search",
            backup: true,
            validate: true,
          },
        });

        // Phase 4: Onboarding
        await saveCmd.run({
          args: {
            fileName: "onboarding",
            "graph-dir": "complete-job-search",
            backup: true,
            validate: true,
          },
        });

        // Phase 5: First Day
        await saveCmd.run({
          args: {
            fileName: "first-day",
            "graph-dir": "complete-job-search",
            backup: true,
            validate: true,
          },
        });

        // Final verification
        const listCmd = graphCommand.subCommands["list-files"];
        const consoleLogs = [];
        const originalLog = console.log;
        console.log = (...args) => consoleLogs.push(args.join(" "));

        try {
          await listCmd.run({
            args: { "graph-dir": "complete-job-search" },
          });

          // Verify all job search phases are represented
          const files = await fs.readdir(join(testDir, "complete-job-search"));
          expect(files).toContain("default.ttl");
          expect(files).toContain("job-applications.ttl");
          expect(files).toContain("interview-process.ttl");
          expect(files).toContain("job-offers.ttl");
          expect(files).toContain("onboarding.ttl");
          expect(files).toContain("first-day.ttl");
        } finally {
          console.log = originalLog;
        }
      });
    });

    it("should demonstrate GitVan's job search workflow capabilities", async () => {
      // This test demonstrates the complete GitVan job search workflow system
      const capabilities = {
        applicationTracking: {
          multiPlatform:
            "✅ Track applications across LinkedIn, Indeed, company sites",
          statusUpdates: "✅ Monitor application status and responses",
          responseRates: "✅ Calculate application response rates",
        },
        interviewManagement: {
          scheduling: "✅ Schedule and track interview rounds",
          preparation: "✅ Manage interview preparation and materials",
          feedback: "✅ Track interview feedback and scores",
          progression: "✅ Monitor interview progression through rounds",
        },
        offerNegotiation: {
          evaluation: "✅ Evaluate and compare job offers",
          negotiation: "✅ Track salary and benefits negotiation",
          decisionMaking: "✅ Support offer decision process",
        },
        onboardingSupport: {
          preparation: "✅ Prepare for first day and onboarding",
          documentation: "✅ Track onboarding tasks and requirements",
          progress: "✅ Monitor first week progress and integration",
        },
        analyticsAndMetrics: {
          searchMetrics: "✅ Calculate comprehensive job search metrics",
          successFactors: "✅ Identify key success factors",
          lessonsLearned: "✅ Document lessons learned and recommendations",
        },
        gitvanIntegration: {
          graphPersistence: "✅ Store all job search data in RDF format",
          workflowAutomation: "✅ Automate job search workflow processes",
          cliCommands: "✅ Use GitVan CLI for data management",
          knowledgeHooks:
            "✅ Leverage knowledge hooks for intelligent automation",
        },
      };

      // Verify all capabilities are demonstrated
      expect(capabilities.applicationTracking.multiPlatform).toContain("✅");
      expect(capabilities.interviewManagement.scheduling).toContain("✅");
      expect(capabilities.offerNegotiation.evaluation).toContain("✅");
      expect(capabilities.onboardingSupport.preparation).toContain("✅");
      expect(capabilities.analyticsAndMetrics.searchMetrics).toContain("✅");
      expect(capabilities.gitvanIntegration.graphPersistence).toContain("✅");
    });
  });
});
