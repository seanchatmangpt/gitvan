defineJob({
  meta: {
    name: "test-job",
    description: "A test job to verify GitVan functionality",
    version: "1.0.0"
  },
  
  on: {
    cron: "0 */5 * * *"
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
      // Write a test file
      await writeFile("test-output.txt", `Test run at ${new Date().toISOString()}\n`);
      
      // Add and commit the file
      await add(["test-output.txt"]);
      await commit("Add test output file");
      
      // Apply a test pack
      const packResult = await applyPack("changelog-generator");
      
      // Write receipt
      await writeReceipt({
        status: "success",
        artifacts: ["test-output.txt"],
        duration: Date.now() - startTime,
        packResult: packResult
      });
      
      // Write audit note
      await writeNote(`Test job completed successfully at ${new Date().toISOString()}`);
      
      return { 
        ok: true, 
        artifacts: ["test-output.txt"], 
        summary: "Test job completed successfully",
        metadata: {
          duration: Date.now() - startTime,
          packApplied: "changelog-generator"
        }
      };
    } catch (error) {
      // Write error receipt
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime
      });
      
      // Write audit note
      await writeNote(`Test job failed at ${new Date().toISOString()}: ${error.message}`);
      
      console.error('Test job failed:', error.message);
      
      return { 
        ok: false, 
        error: error.message, 
        artifacts: [],
        summary: "Test job failed",
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }
});