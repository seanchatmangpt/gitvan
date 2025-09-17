import { defineJob } from 'file:///Users/sac/gitvan/src/index.mjs';

export default defineJob({
  meta: { name: "lint:changed", desc: "Lint changed files" },
  async run(ctx) {
    const { inputs } = ctx;
    const timestamp = new Date().toISOString();
    
    // Simulate linting (simplified for demo)
    console.log(`✓ Linted files at ${timestamp}`);
    
    return {
      status: 'success',
      message: `Linting completed`,
      data: {
        timestamp,
        filesCount: 5, // Simulated
        status: "completed"
      }
    };
  }
});
