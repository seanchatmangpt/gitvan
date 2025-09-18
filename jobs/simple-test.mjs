import { defineJob } from "file:///Users/sac/gitvan/src/index.mjs";

export default defineJob({
  meta: {
    name: "simple-test",
    desc: "Simple test job",
    tags: ["test"],
    version: "1.0.0",
  },
  hooks: [], // No hooks defined
  async run(ctx) {
    console.log("✓ Simple test job executed");
    return {
      status: "success",
      message: "Simple test completed",
      data: { timestamp: new Date().toISOString() },
    };
  },
});
