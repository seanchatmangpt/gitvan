defineJob({
  name: "e2e-test-job",
  description: "End-to-end test execution job for validating application functionality",
  on: {
    push: "refs/heads/main",
    cron: "0 4 * * *"
  },
  async run({ ctx, payload, meta }) {
    const git = useGit();
    const receipt = useReceipt();
    const notes = useNotes();
    const pack = usePack();
    
    // Destructure methods
    const { writeFile, add, commit } = git;
    const { write: writeReceipt } = receipt;
    const { write: writeNote } = notes;
    const { apply: applyPack } = pack;
    
    const startTime = Date.now();
    
    try {
      // Write test start note
      await writeNote(`E2E Test job started at ${new Date().toISOString()}`);
      
      // Apply the e2e testing automation pack
      const testResult = await applyPack("e2e-test-runner");
      
      // Generate test summary file
      const summaryContent = JSON.stringify({
        status: "success",
        testsRun: testResult.testsRun,
        passed: testResult.passed,
        failed: testResult.failed,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }, null, 2);
      
      await writeFile("test-summary.json", summaryContent);
      
      // Commit test results
      await add(["test-summary.json"]);
      await commit("Add E2E test results");
      
      // Write receipt for tracking
      await writeReceipt({
        status: "success",
        artifacts: ["test-summary.json"],
        duration: Date.now() - startTime,
        testsRun: testResult.testsRun,
        passed: testResult.passed,
        failed: testResult.failed
      });
      
      await writeNote(`E2E Test job completed successfully at ${new Date().toISOString()}`);
      
      return {
        ok: true,
        artifacts: ["test-summary.json"],
        summary: `E2E tests completed. Run: ${testResult.testsRun}, Passed: ${testResult.passed}, Failed: ${testResult.failed}`,
        metadata: {
          duration: Date.now() - startTime
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Write error receipt
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: duration
      });
      
      await writeNote(`E2E Test job failed at ${new Date().toISOString()}: ${error.message}`);
      
      console.error('E2E Test job failed:', error.message);
      
      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: "E2E test job failed",
        metadata: {
          duration: duration
        }
      };
    }
  }
});