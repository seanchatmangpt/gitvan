import { defineJob } from 'file:///Users/sac/gitvan/src/index.mjs';

export default defineJob({
  meta: { name: 'hello', desc: 'Say hello from GitVan pack' },
  async run(ctx) {
    const { inputs } = ctx;
    const projectName = inputs?.projectName || 'Unknown Project';
    const author = inputs?.author || 'Anonymous';

    console.log(`Hello from ${projectName}!`);
    console.log(`Created by: ${author}`);
    console.log('This job was installed via GitVan pack system.');

    return {
      status: 'success',
      message: `Hello job completed for ${projectName}`,
      data: {
        projectName,
        author,
        timestamp: new Date().toISOString()
      }
    };
  }
});