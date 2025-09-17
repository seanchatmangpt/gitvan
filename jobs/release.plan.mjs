/**
 * GitVan Job: release:plan
 * Plans a release
 */
export default {
  name: "release:plan",
  meta: {
    description: "Plan release",
    category: "release"
  },
  async run(ctx) {
    const { useGit, useTemplate, useReceipt } = ctx;
    const git = useGit();
    const template = useTemplate();
    const receipt = useReceipt();
    
    const timestamp = new Date().toISOString();
    const headSha = await git.head();
    const currentBranch = await git.getCurrentBranch();
    
    // Generate release plan
    const releasePlan = {
      timestamp,
      headSha,
      branch: currentBranch,
      version: "1.0.0", // Simplified for demo
      status: "planned",
      artifacts: ["CHANGELOG.md", "package.json"]
    };
    
    await template.writeFile("release.plan.json", JSON.stringify(releasePlan, null, 2));
    
    // Write note
    await git.noteAdd(`planned release for ${headSha}`);
    
    // Create receipt
    await receipt.create({
      operation: "release:plan",
      status: "completed",
      timestamp,
      metadata: { 
        headSha,
        branch: currentBranch,
        version: releasePlan.version
      }
    });
    
    console.log(`✓ Release planned for ${currentBranch}`);
  }
};
