/**
 * GitVan Job: release:publish
 * Publishes a release
 */
export default {
  name: "release:publish",
  meta: {
    description: "Publish release",
    category: "release"
  },
  async run(ctx) {
    const { useGit, useTemplate, useReceipt } = ctx;
    const git = useGit();
    const template = useTemplate();
    const receipt = useReceipt();
    
    const timestamp = new Date().toISOString();
    const headSha = await git.head();
    
    // Generate version (simplified)
    const version = "1.0.0";
    const tagName = `v${version}`;
    
    // Create tag
    await git.tag(tagName);
    
    // Write release marker
    await template.writeFile("RELEASED", `${tagName}\n${timestamp}\n${headSha}\n`);
    
    // Write note
    await git.noteAdd(`published ${tagName}`);
    
    // Create receipt
    await receipt.create({
      operation: "release:publish",
      status: "completed",
      timestamp,
      metadata: { 
        headSha,
        version,
        tagName
      }
    });
    
    console.log(`✓ Published ${tagName}`);
  }
};
