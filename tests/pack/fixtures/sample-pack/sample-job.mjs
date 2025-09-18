// Sample GitVan job file
export default {
  name: 'test-job',
  description: 'A sample job for testing',

  async run(context) {
    console.log('Running test job with context:', context);
    return { status: 'success', message: 'Job completed' };
  },

  schedule: '*/5 * * * *', // Every 5 minutes
  enabled: true
};