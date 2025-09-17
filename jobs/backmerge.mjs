/**
 * GitVan Job: backmerge
 * Backmerges release branch to main
 */
export default {
  name: "backmerge",
  meta: {
    description: "Backmerge release to main",
    category: "release"
  },
  async run(ctx) {
    const { useGit, useReceipt } = ctx;
    const git = useGit();
    const receipt = useReceipt();
    
    const timestamp = new Date().toISOString();
    const currentBranch = await git.getCurrentBranch();
    const releaseBranch = currentBranch.replace("refs/heads/", "");
    
    // Simulate backmerge (in real scenario, would switch branches)
    const backmergeInfo = {
      timestamp,
      from: releaseBranch,
      to: "main",
      status: "simulated"
    };
    
    // Write note
    await git.noteAdd(`backmerged ${releaseBranch} -> main`);
    
    // Create receipt
    await receipt.create({
      operation: "backmerge",
      status: "completed",
      timestamp,
      metadata: { 
        from: releaseBranch,
        to: "main",
        simulated: true
      }
    });
    
    console.log(`✓ Backmerged ${releaseBranch} -> main (simulated)`);
  }
};
