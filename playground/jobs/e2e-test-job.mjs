defineJob({
  name: "e2e-test-job",
  description: "Run end-to-end tests for the application",
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
      // Write start note
      await writeNote(`E2E test job started at ${new Date().toISOString()}`);
      
      // Apply the testing automation pack
      const testResult = await applyPack("e2e-test-runner");
      
      // Generate test report
      const reportContent = `
        E2E Test Report
        ===============
        
        Status: ${testResult.status}
        Duration: ${testResult.duration}ms
        Artifacts: ${JSON.stringify(testResult.artifacts)}
        Tests Run: ${testResult.testsRun || 0}
        Failures: ${testResult.failures || 0}
        
        Generated at: ${new Date().toISOString()}
      `;
      
      // Write test report file
      await writeFile("test-report.txt", reportContent);
      
      // Add and commit the report
      await add(["test-report.txt"]);
      await commit("Add E2E test report");
      
      // Write receipt
      await writeReceipt({
        status: "success",
        artifacts: ["test-report.txt"],
        duration: Date.now() - startTime,
        testsRun: testResult.testsRun || 0,
        failures: testResult.failures || 0
      });
      
      await writeNote(`E2E test job completed successfully at ${new Date().toISOString()}`);
      
      return {
        ok: true,
        artifacts: ["test-report.txt"],
        summary: "End-to-end tests completed successfully",
        metadata: {
          duration: Date.now() - startTime,
          testsRun: testResult.testsRun || 0,
          failures: testResult.failures || 0
        }
      };
      
    } catch (error) {
      // Write error receipt
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime
      });
      
      await writeNote(`E2E test job failed at ${new Date().toISOString()}: ${error.message}`);
      
      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: "End-to-end tests failed",
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }
});