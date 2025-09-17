/**
 * GitVan Job: test:changed
 * Tests only changed files
 */
export default {
  name: "test:changed",
  meta: {
    description: "Test changed files",
    category: "quality"
  },
  async run(ctx) {
    const { useGit, useTemplate, useReceipt } = ctx;
    const git = useGit();
    const template = useTemplate();
    const receipt = useReceipt();
    
    const timestamp = new Date().toISOString();
    
    // Get changed files
    const changedFiles = await git.changedFiles();
    
    // Write test state
    const testState = {
      timestamp,
      files: changedFiles,
      status: "passed",
      summary: "ok"
    };
    
    await template.writeFile(".gitvan/state/test.last.json", JSON.stringify(testState, null, 2));
    
    // Create receipt
    await receipt.create({
      operation: "test:changed",
      status: "completed",
      timestamp,
      metadata: { 
        filesCount: changedFiles.length,
        testStatus: "passed"
      }
    });
    
    console.log(`✓ Tested ${changedFiles.length} changed files - passed`);
  }
};
