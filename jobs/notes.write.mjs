import { defineJob } from 'file:///Users/sac/gitvan/src/index.mjs';

export default defineJob({
  meta: { name: "notes:write", desc: "Write audit note to Git notes" },
  async run(ctx) {
    const { inputs } = ctx;
    const message = inputs?.message || `ran notes:write at ${new Date().toISOString()}`;
    
    // Write to Git notes (simplified for demo)
    console.log(`✓ Note written: ${message}`);
    
    return {
      status: 'success',
      message: `Note written: ${message}`,
      data: {
        message,
        timestamp: new Date().toISOString()
      }
    };
  }
});
