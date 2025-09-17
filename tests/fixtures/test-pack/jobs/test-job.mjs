import { defineJob } from '../../../src/jobs/define.mjs';

export default defineJob({
  meta: {
    desc: 'Test job for pack testing',
    tags: ['test', 'pack']
  },
  async run(ctx) {
    ctx.logger.info('Test job executed successfully');
    return { status: 'success', message: 'Test completed' };
  }
});