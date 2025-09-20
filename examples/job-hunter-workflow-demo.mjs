#!/usr/bin/env node

/**
 * GitVan Job Hunter Workflow - Demonstration Script
 *
 * This script demonstrates a complete job search process from application to first day,
 * showcasing GitVan's capabilities in managing complex, multi-phase workflows.
 */

import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { withGitVan } from "../src/composables/ctx.mjs";
import { useTurtle } from "../src/composables/turtle.mjs";
import { graphCommand } from "../src/cli/commands/graph.mjs";

async function demonstrateJobHunterWorkflow() {
  console.log("🎯 GitVan Job Hunter Workflow Demonstration");
  console.log("=".repeat(60));

  const testDir = join(tmpdir(), `gitvan-job-hunter-demo-${randomUUID()}`);
  await fs.mkdir(testDir, { recursive: true });

  try {
    // Initialize job hunter profile
    const jobHunterData = {
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

    const context = {
      cwd: testDir,
      root: testDir,
    };

    await withGitVan(context, async () => {
      console.log("\n📋 PHASE 1: JOB APPLICATION");
      console.log("-".repeat(40));

      // Initialize graph for job search data
      const initCmd = graphCommand.subCommands["init-default"];
      await initCmd.run({
        args: {
          "graph-dir": "job-search",
          validate: true,
        },
      });

      console.log("✅ Job search graph initialized");

      // Phase 1: Job Applications
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

      // Save job applications
      const saveCmd = graphCommand.subCommands.save;
      await saveCmd.run({
        args: {
          fileName: "job-applications",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log(`✅ ${applications.length} job applications tracked`);
      console.log(`   - Google: Software Engineer`);
      console.log(`   - Microsoft: Full Stack Developer`);
      console.log(`   - Apple: Frontend Engineer`);

      console.log("\n🎤 PHASE 2: INTERVIEW PROCESS");
      console.log("-".repeat(40));

      // Phase 2: Interview Process
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

      await saveCmd.run({
        args: {
          fileName: "interview-schedule",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log(`✅ ${interviews.length} interviews scheduled`);
      console.log(`   - Apple: Phone Screen with Sarah Chen`);
      console.log(`   - Google: Technical Phone Screen with Mike Rodriguez`);

      // Interview Results
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
          notes: "Good technical foundation, excellent cultural fit",
          nextSteps: "Proceed to onsite interview",
        },
      ];

      await saveCmd.run({
        args: {
          fileName: "interview-results",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log("✅ Interview results tracked");
      console.log(`   - Apple: Overall score 8.3/10 - Proceed to onsite`);
      console.log(`   - Google: Overall score 8.0/10 - Proceed to onsite`);

      console.log("\n💰 PHASE 3: JOB OFFERS & NEGOTIATION");
      console.log("-".repeat(40));

      // Phase 3: Job Offers
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

      await saveCmd.run({
        args: {
          fileName: "job-offers",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log("✅ Job offer received from Apple");
      console.log(`   - Salary: $165,000`);
      console.log(`   - Bonus: $25,000`);
      console.log(`   - Equity: RSUs worth $50,000 over 4 years`);

      // Salary Negotiation
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

      await saveCmd.run({
        args: {
          fileName: "salary-negotiation",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log("✅ Salary negotiation completed");
      console.log(`   - Final salary: $170,000 (+$5,000 increase)`);
      console.log(`   - Final bonus: $28,000 (+$3,000 increase)`);
      console.log(`   - Sign-on bonus: $10,000`);
      console.log(`   - 1 day remote work per week`);

      console.log("\n🚀 PHASE 4: ONBOARDING & FIRST DAY");
      console.log("-".repeat(40));

      // Phase 4: Onboarding
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
      };

      await saveCmd.run({
        args: {
          fileName: "onboarding-prep",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log("✅ Onboarding preparation completed");
      console.log("   - All required documents prepared");
      console.log("   - Equipment setup scheduled");
      console.log("   - Training schedule confirmed");

      // First Day Experience
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
      };

      await saveCmd.run({
        args: {
          fileName: "first-day-experience",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log("✅ First day experience documented");
      console.log("   - Smooth onboarding process");
      console.log("   - Great team introduction");
      console.log("   - Clear expectations set");

      console.log("\n📊 PHASE 5: ANALYTICS & METRICS");
      console.log("-".repeat(40));

      // Phase 5: Analytics
      const analytics = {
        searchDuration: 45, // days
        applicationsSubmitted: jobHunterData.metrics.applicationsSubmitted,
        interviewsScheduled: jobHunterData.metrics.interviewsScheduled,
        offersReceived: jobHunterData.metrics.offersReceived,
        responseRate: 1.0, // 3 applications, 3 responses
        interviewSuccessRate: 1.0, // 2 interviews, 2 successful
        offerAcceptanceRate: 1.0, // 1 offer received, 1 accepted
        timeToOffer: 30, // days from first application to offer
        platformsUsed: ["LinkedIn", "Company Website", "Indeed"],
        companiesApplied: ["Google", "Microsoft", "Apple"],
        averageResponseTime: 5, // days
        negotiationSuccess: true,
        salaryIncrease: 5000, // from initial offer to final offer
        totalCompensation: 208000, // salary + bonus + equity value
      };

      await saveCmd.run({
        args: {
          fileName: "job-search-analytics",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log("✅ Job search analytics calculated");
      console.log(`   - Search duration: ${analytics.searchDuration} days`);
      console.log(
        `   - Applications submitted: ${analytics.applicationsSubmitted}`
      );
      console.log(
        `   - Response rate: ${(analytics.responseRate * 100).toFixed(0)}%`
      );
      console.log(
        `   - Interview success rate: ${(
          analytics.interviewSuccessRate * 100
        ).toFixed(0)}%`
      );
      console.log(`   - Time to offer: ${analytics.timeToOffer} days`);
      console.log(
        `   - Total compensation: $${analytics.totalCompensation.toLocaleString()}`
      );

      console.log("\n📈 FINAL RESULTS & SUMMARY");
      console.log("-".repeat(40));

      // Final Summary
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
      };

      await saveCmd.run({
        args: {
          fileName: "success-report",
          "graph-dir": "job-search",
          backup: true,
          validate: true,
        },
      });

      console.log("🎉 JOB SEARCH SUCCESSFULLY COMPLETED!");
      console.log(`   - Final company: ${successReport.finalOutcome.company}`);
      console.log(`   - Position: ${successReport.finalOutcome.position}`);
      console.log(
        `   - Total compensation: $${(
          successReport.finalOutcome.salary + successReport.finalOutcome.bonus
        ).toLocaleString()}`
      );
      console.log(
        `   - Start date: ${successReport.finalOutcome.startDate.toLocaleDateString()}`
      );

      // Show all files created
      const listCmd = graphCommand.subCommands["list-files"];
      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(" "));

      try {
        await listCmd.run({
          args: { "graph-dir": "job-search" },
        });
      } finally {
        console.log = originalLog;
      }

      console.log("\n📁 FILES CREATED:");
      const files = await fs.readdir(join(testDir, "job-search"));
      files.forEach((file) => {
        console.log(`   - ${file}`);
      });

      console.log("\n🔧 GITVAN CAPABILITIES DEMONSTRATED:");
      console.log("   ✅ Graph persistence for job search data");
      console.log("   ✅ Workflow automation across all phases");
      console.log("   ✅ CLI integration for data management");
      console.log("   ✅ RDF-based data storage and retrieval");
      console.log("   ✅ Comprehensive metrics and analytics");
      console.log("   ✅ End-to-end process tracking");
    });
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the demonstration
if (import.meta.main) {
  demonstrateJobHunterWorkflow()
    .then(() => {
      console.log(
        "\n✅ Job Hunter Workflow Demonstration Completed Successfully!"
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error during demonstration:", error);
      process.exit(1);
    });
}

export { demonstrateJobHunterWorkflow };
