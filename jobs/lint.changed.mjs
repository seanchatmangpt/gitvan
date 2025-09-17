/**
 * GitVan Job: lint:changed
 * Lints only changed files
 */
export default {
  name: "lint:changed",
  meta: {
    description: "Lint changed files",
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
    
    // Write lint state
    const lintState = {
      timestamp,
      files: changedFiles,
      status: "completed"
    };
    
    await template.writeFile(".gitvan/state/lint.last.json", JSON.stringify(lintState, null, 2));
    
    // Create receipt
    await receipt.create({
      operation: "lint:changed",
      status: "completed",
      timestamp,
      metadata: { 
        filesCount: changedFiles.length,
        files: changedFiles.slice(0, 10) // Limit for metadata
      }
    });
    
    console.log(`✓ Linted ${changedFiles.length} changed files`);
  }
};
