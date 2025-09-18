export default {
  root: process.cwd(),
  jobs: { dir: "jobs" },
  templates: { engine: "nunjucks", dirs: ["templates"] },
  receipts: { ref: "refs/notes/gitvan/results" },
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    temperature: 0.7,
    baseURL: "http://localhost:11434",
  },
  hooks: {
    "job:before"({ id, payload }) {
      console.log(`[playground] 🚀 Starting job: ${id}`);
      if (payload && Object.keys(payload).length > 0) {
        console.log(`[playground]   Payload:`, payload);
      }
    },
    "job:after"({ id, result }) {
      console.log(`[playground] ✅ Job done: ${id}`, result?.ok ? "OK" : "ERR");
      if (result?.artifacts?.length > 0) {
        console.log(`[playground]   Artifacts: ${result.artifacts.length}`);
      }
    },
    "job:error"({ id, error }) {
      console.log(`[playground] ❌ Job failed: ${id}`, error.message);
    },
    "lock:acquire"({ id }) {
      console.log(`[playground] 🔒 Lock acquired: ${id}`);
    },
    "lock:release"({ id }) {
      console.log(`[playground] 🔓 Lock released: ${id}`);
    },
    "receipt:write"({ id }) {
      console.log(`[playground] 📝 Receipt written: ${id}`);
    },
  },
};
