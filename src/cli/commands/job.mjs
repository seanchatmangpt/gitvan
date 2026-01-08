#!/usr/bin/env node

/**
 * GitVan Job Command - Citty Implementation
 *
 * Provides comprehensive job management through CLI
 * This is the main job command that imports all subcommands
 */

import { defineCommand } from "citty";
import { listSubcommand } from "./job-list.mjs";
import { runSubcommand } from "./job-run.mjs";
import { validateSubcommand } from "./job-validate.mjs";
import { statusSubcommand, historySubcommand } from "./job-status.mjs";
import {
  scheduleSubcommand,
  unscheduleSubcommand,
  startSchedulerSubcommand,
  stopSchedulerSubcommand,
  schedulerStatusSubcommand,
  autoScheduleSubcommand,
} from "./job-schedule.mjs";
import { searchSubcommand, chainSubcommand } from "./job-search.mjs";

/**
 * Main job command with all subcommands
 */
export const jobCommand = defineCommand({
  meta: {
    name: "job",
    description: "Manage GitVan Jobs",
    usage: "gitvan job <subcommand> [options]",
    examples: [
      "gitvan job list",
      "gitvan job run my-job",
      "gitvan job validate my-job",
      "gitvan job status my-job",
      "gitvan job history my-job",
      "gitvan job chain job1 job2 job3",
      "gitvan job search test",
    ],
  },
  subCommands: {
    list: listSubcommand,
    run: runSubcommand,
    validate: validateSubcommand,
    status: statusSubcommand,
    history: historySubcommand,
    chain: chainSubcommand,
    search: searchSubcommand,
    schedule: scheduleSubcommand,
    unschedule: unscheduleSubcommand,
    "start-scheduler": startSchedulerSubcommand,
    "stop-scheduler": stopSchedulerSubcommand,
    "scheduler-status": schedulerStatusSubcommand,
    "auto-schedule": autoScheduleSubcommand,
  },
});

export default jobCommand;
