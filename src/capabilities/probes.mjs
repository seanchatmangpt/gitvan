import { withGitVan } from "../core/context.mjs";

function assertMethods(value, methods) {
  const missing = methods.filter(method => typeof value?.[method] !== "function");
  return Object.freeze({ ok: missing.length === 0, methods: Object.freeze(methods), missing: Object.freeze(missing) });
}

async function composableProbe({ modulePath, exportName, methods, behavior }, context) {
  const module = await import(modulePath);
  const factory = module[exportName];
  if (typeof factory !== "function") {
    return { standing: "BUILD_BROKEN", evidence: { modulePath, exportName, error: "export missing" } };
  }
  return await withGitVan(context, async () => {
    const api = await factory();
    const surface = assertMethods(api, methods);
    if (!surface.ok) return { standing: "BUILD_BROKEN", evidence: { modulePath, exportName, surface } };
    if (!behavior) return { standing: "PARTIAL_ALIVE", evidence: { modulePath, exportName, surface } };
    const result = await behavior(api, context);
    return {
      standing: result?.standing || "ALIVE",
      evidence: { modulePath, exportName, surface, behavior: result?.evidence ?? result ?? null },
    };
  });
}

const PROBES = Object.freeze({
  "gitvan.receipt": async context => composableProbe({
    modulePath: "../composables/receipt.mjs",
    exportName: "useReceipt",
    methods: ["create", "list", "get", "exists", "verify", "verifyAll", "generateFingerprint"],
    behavior(api) {
      const subject = { id: "capability-probe", status: "success", timestamp: "2026-08-02T00:00:00.000Z" };
      const first = api.generateFingerprint(subject);
      const second = api.generateFingerprint(subject);
      return {
        standing: first === second && typeof first === "string" ? "PARTIAL_ALIVE" : "BUILD_BROKEN",
        evidence: { deterministic: first === second, fingerprint: first },
      };
    },
  }, context),

  "gitvan.lock": async context => composableProbe({
    modulePath: "../composables/lock.mjs",
    exportName: "useLock",
    methods: ["acquire", "release", "isLocked", "status", "list", "getLockRef", "getWorktreeId"],
    behavior(api) {
      const worktree = context.cwd;
      const first = api.getLockRef("capability-probe", { worktree });
      const second = api.getLockRef("capability-probe", { worktree });
      return {
        standing: first === second && first.startsWith("refs/gitvan/locks/") ? "PARTIAL_ALIVE" : "BUILD_BROKEN",
        evidence: { deterministic: first === second, ref: first },
      };
    },
  }, context),

  "gitvan.job.discovery": async context => composableProbe({
    modulePath: "../composables/job.mjs",
    exportName: "useJob",
    methods: ["list", "get", "exists", "search", "getByTag", "getCronJobs"],
    async behavior(api) {
      const jobs = await api.list();
      return { standing: Array.isArray(jobs) ? "ALIVE" : "BUILD_BROKEN", evidence: { count: jobs.length } };
    },
  }, context),

  "gitvan.job.execution": async context => composableProbe({
    modulePath: "../composables/job.mjs",
    exportName: "useJob",
    methods: ["run", "runWithLock", "status", "isRunning", "history"],
  }, context),

  "gitvan.scheduler": async context => composableProbe({
    modulePath: "../composables/job.mjs",
    exportName: "useJob",
    methods: ["schedule", "unschedule", "startScheduler", "stopScheduler", "getSchedulerStatus", "listScheduledJobs"],
    async behavior(api) {
      const status = await api.getSchedulerStatus();
      return { standing: "PARTIAL_ALIVE", evidence: { status } };
    },
  }, context),

  "gitvan.workflow.dag": async context => {
    const { DAGPlanner } = await import("../workflow/dag-planner.mjs");
    const logger = { info() {}, warn() {}, error() {} };
    const planner = new DAGPlanner({ logger });
    const steps = [
      { id: "observe", type: "probe", dependsOn: [] },
      { id: "admit", type: "probe", dependsOn: ["observe"] },
      { id: "receipt", type: "probe", dependsOn: ["admit"] },
    ];
    const plan = await planner.createPlan(steps, null);
    let cycleRefused = false;
    try {
      await planner.createPlan([
        { id: "a", dependsOn: ["b"] },
        { id: "b", dependsOn: ["a"] },
      ], null);
    } catch {
      cycleRefused = true;
    }
    return {
      standing: plan.map(step => step.id).join(",") === "observe,admit,receipt" && cycleRefused ? "ALIVE" : "BUILD_BROKEN",
      evidence: { order: plan.map(step => step.id), cycleRefused },
    };
  },

  "gitvan.pack": async context => composableProbe({
    modulePath: "../composables/pack.mjs",
    exportName: "usePack",
    methods: ["listAvailable", "search", "getPackInfo", "install", "listInstalled"],
  }, context),

  "gitvan.template": async context => composableProbe({
    modulePath: "../composables/template.mjs",
    exportName: "useTemplate",
    methods: ["render", "renderString", "renderToFile"],
    behavior(api) {
      const first = api.renderString("{{ value | upper }}", { value: "gitvan" });
      const second = api.renderString("{{ value | upper }}", { value: "gitvan" });
      return {
        standing: first === "GITVAN" && second === first ? "ALIVE" : "BUILD_BROKEN",
        evidence: { output: first, deterministic: first === second },
      };
    },
  }, context),

  "gitvan.registry": async context => composableProbe({
    modulePath: "../composables/registry.mjs",
    exportName: "useRegistry",
    methods: ["refresh", "getStats", "getJobs", "getJob", "getEvents", "getSchedules", "getPacks"],
    async behavior(api) {
      const jobs = await api.getJobs();
      return { standing: Array.isArray(jobs) ? "PARTIAL_ALIVE" : "BUILD_BROKEN", evidence: { jobs: jobs.length } };
    },
  }, context),
});

export function listCapabilityProbes() {
  return Object.keys(PROBES).sort();
}

export function createProbeExecutor(options = {}) {
  const mode = options.mode || "behavior";
  const context = Object.freeze({
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, TZ: "UTC", LANG: "C", LC_ALL: "C", ...(options.env || {}) },
    now: options.now || (() => options.nowISO || "2026-08-02T00:00:00.000Z"),
  });

  return async function execute(capability) {
    const probe = PROBES[capability.id];
    if (!probe) {
      return {
        ok: false,
        standing: "UNSUPPORTED",
        output: JSON.stringify({ capability: capability.id, error: "No runtime probe registered" }),
      };
    }
    try {
      const result = mode === "surface"
        ? await surfaceOnlyProbe(capability, context)
        : await probe(context);
      return {
        ok: !["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"].includes(result.standing),
        standing: result.standing,
        output: JSON.stringify({ capability: capability.id, mode, ...result }),
        report: result,
      };
    } catch (error) {
      return {
        ok: false,
        standing: "BUILD_BROKEN",
        output: JSON.stringify({ capability: capability.id, mode, error: error.message, stack: error.stack }),
        error: error.message,
      };
    }
  };
}

async function surfaceOnlyProbe(capability, context) {
  const probe = PROBES[capability.id];
  const result = await probe({ ...context, surfaceOnly: true });
  return result.standing === "ALIVE" ? { ...result, standing: "PARTIAL_ALIVE" } : result;
}
