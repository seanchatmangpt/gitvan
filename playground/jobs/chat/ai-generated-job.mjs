import { defineJob } from 'gitvan/core';
import { 
  useGit, 
  useNotes, 
  useReceipt,
  useLock
} from 'gitvan/composables';

export default defineJob({
  meta: {
    name: "destructured-methods-job",
    description: "A job demonstrating destructuring of composable methods",
    version: "1.0.0"
  },
  
  on: {
    cron: "0 0 * * *"
  },

  async run({ ctx, payload, meta }) {
    // Destructure composables
    const git = useGit();
    const notes = useNotes();
    const receipt = useReceipt();
    const lock = useLock();
    
    // Destructure methods from composables
    const { 
      writeFile, 
      add, 
      commit,
      readFile,
      listFiles
    } = git;
    
    const { 
      write: writeNote,
      append: appendNote 
    } = notes;
    
    const { 
      write: writeReceipt 
    } = receipt;
    
    const { 
      acquire: acquireLock,
      release: releaseLock,
      isLocked: checkLocked 
    } = lock;
    
    const startTime = Date.now();
    
    try {
      // Check if job is already running
      if (await checkLocked("destructured-methods-job")) {
        return { 
          ok: false, 
          error: "Job already running", 
          artifacts: [] 
        };
      }
      
      // Acquire lock
      await acquireLock("destructured-methods-job");
      
      // Write initial note
      await writeNote(`Job started at ${new Date().toISOString()}`);
      
      // Create a test file using destructured method
      await writeFile("test-file.txt", "This is a test file created with destructured methods.");
      
      // Add the file to git
      await add(["test-file.txt"]);
      
      // List files to demonstrate listFiles method
      const files = await listFiles();
      await appendNote(`Files in repository: ${files.join(', ')}`);
      
      // Read the file back
      const content = await readFile("test-file.txt");
      await appendNote(`File content length: ${content.length} characters`);
      
      // Commit the changes
      await commit("Add test file with destructured methods");
      
      // Write receipt
      await writeReceipt({
        status: "success",
        artifacts: ["test-file.txt"],
        duration: Date.now() - startTime,
        metadata: {
          fileCount: files.length,
          contentLength: content.length
        }
      });
      
      return { 
        ok: true, 
        artifacts: ["test-file.txt"], 
        summary: "Successfully created and committed test file using destructured methods",
        metadata: {
          duration: Date.now() - startTime,
          fileCount: files.length
        }
      };
      
    } catch (error) {
      console.error('Job failed:', error.message);
      
      // Write error receipt
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: Date.now() - startTime
      });
      
      return { 
        ok: false, 
        error: error.message, 
        artifacts: [],
        summary: "Job failed due to error"
      };
    } finally {
      // Always release the lock
      await releaseLock("destructured-methods-job");
    }
  }
});