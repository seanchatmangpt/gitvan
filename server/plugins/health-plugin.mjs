// server/plugins/health-plugin.mjs
// Health check endpoint for daemon monitoring

export default defineNitroPlugin((nitroApp) => {
  nitroApp.router.get('/api/health', async (event) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '5.0.0',
      uptime: process.uptime(),
    };
  });
});
