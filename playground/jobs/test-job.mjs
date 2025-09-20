import { defineJob } from 'gitvan/core';
import { useGit, useReceipt, useNotes, useLock } from 'gitvan/composables';

export default defineJob({
  meta: {
    name: "test-job",
    description: "A simple test job to verify GitVan functionality",
    version: "1.0.0"
  },
  
  on: {
    cron: "0 */5 * * *" // Run every 5 minutes
  },

  async run({ ctx, payload, meta }) {
    const git = useGit();
    const receipt = useReceipt();
    const notes = useNotes();
    const lock = useLock();
    
    const { writeFile, add, commit } = git;
    const { write: writeReceipt } = receipt;
    const { write: writeNote } = notes;
    const { acquire: acquireLock, release: releaseLock } = lock;
    
    const startTime = Date.now();
    
    // Prevent concurrent execution
    if (await lock.checkLocked("test-job")) {
      return { 
        ok: false, 
        error: "Test job already running", 
        artifacts: [] 
      };
    }
    
    await acquireLock("test-job");
    
    try {
      // Write test files
      const testFile = `test-${Date.now()}.txt`;
      const configFile = 'config.json';
      
      await writeFile(testFile, `Test content generated at ${new Date().toISOString()}`);
      await writeFile(configFile, JSON.stringify({
        job: "test-job",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      }, null, 2));
      
      // Add files to git
      await add([testFile, configFile]);
      
      // Commit changes
      await commit(`Test commit: ${new Date().toISOString()}`);
      
      // Write audit note
      await writeNote(`Test job executed successfully at ${new Date().toISOString()}`);
      
      // Track job result
      await writeReceipt({
        status: "success",
        artifacts: [testFile, configFile],
        duration: Date.now() - startTime,
        metadata: {
          testId: Math.random().toString(36).substring(7)
        }
      });
      
      return { 
        ok: true, 
        artifacts: [testFile, configFile], 
        summary: "Test job completed successfully" 
      };
      
    } catch (error) {
      // Track failure
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime
      });
      
      return { 
        ok: false, 
        error: error.message, 
        artifacts: [] 
      };
    } finally {
      await releaseLock("test-job");
    }
  }
});