export default {
  name: "simple-test",
  description: "Simple test job",
  async run(ctx) {
    console.log("✓ Simple test job executed");
    return {
      status: 'success',
      message: 'Simple test completed',
      data: { timestamp: new Date().toISOString() }
    };
  }
};
