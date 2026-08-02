import { describe, expect, it, vi } from "vitest";
import { createJobScheduler } from "../../src/composables/job-scheduler.mjs";

function fixture() {
  const job = {
    id: "build/compile",
    name: "Compile",
    file: "/tmp/jobs/build/compile.mjs",
    definition: { meta: { name: "Compile" }, cron: "*/5 * * * *", run: async () => ({ ok: true }) },
  };
  const bridge = {
    scheduleJob: vi.fn(async () => undefined),
    unscheduleJob: vi.fn(async () => undefined),
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    shutdown: vi.fn(async () => undefined),
    executeJobWithLock: vi.fn(async () => ({ status: "success" })),
    getStatus: vi.fn(() => ({ running: true, jobs: [{ name: "build/compile" }] })),
  };
  const discovery = {
    get: vi.fn(async id => {
      if (id === job.id) return job;
      throw new Error(`missing:${id}`);
    }),
    getCronJobs: vi.fn(async () => [{ id: job.id, cron: job.definition.cron }]),
  };
  return { scheduler: createJobScheduler({ jobBridge: bridge, discovery }), bridge, discovery, job };
}

describe("scheduler lifecycle capability", () => {
  it("schedules a complete job definition with file identity", async () => {
    const { scheduler, bridge, job } = fixture();
    await expect(scheduler.schedule(job.id)).resolves.toEqual({ jobId: job.id, scheduled: true });
    expect(bridge.scheduleJob).toHaveBeenCalledWith(expect.objectContaining({
      id: job.id,
      name: job.name,
      file: job.file,
      run: job.definition.run,
    }), {});
  });

  it("starts stops unschedules and shuts down deterministically", async () => {
    const { scheduler, bridge, job } = fixture();
    await expect(scheduler.startScheduler()).resolves.toEqual({ started: true });
    await expect(scheduler.stopScheduler()).resolves.toEqual({ stopped: true });
    await expect(scheduler.unschedule(job.id)).resolves.toEqual({ jobId: job.id, unscheduled: true });
    await expect(scheduler.shutdownScheduler()).resolves.toEqual({ shutdown: true });
    expect(bridge.start).toHaveBeenCalledOnce();
    expect(bridge.stop).toHaveBeenCalledOnce();
    expect(bridge.unscheduleJob).toHaveBeenCalledWith(job.id);
    expect(bridge.shutdown).toHaveBeenCalledOnce();
  });

  it("reports status runs under lock and auto-schedules cron jobs", async () => {
    const { scheduler, bridge, job } = fixture();
    expect(scheduler.getSchedulerStatus()).toEqual({ running: true, jobs: [{ name: "build/compile" }] });
    expect(scheduler.listScheduledJobs()).toEqual([{ name: "build/compile" }]);
    await expect(scheduler.runWithBree(job.id)).resolves.toEqual({ status: "success" });
    await expect(scheduler.autoScheduleCronJobs()).resolves.toEqual([{ jobId: job.id, scheduled: true }]);
    expect(bridge.executeJobWithLock).toHaveBeenCalledOnce();
  });

  it("preserves failure context", async () => {
    const { scheduler } = fixture();
    await expect(scheduler.schedule("missing")).rejects.toThrow(/Failed to schedule job missing: missing:missing/);
  });
});
