/**
 * GitVan Job: changelog:generate
 * Generates changelog entries for commits
 */
export default {
  name: "changelog:generate",
  meta: {
    description: "Generate changelog entries",
    category: "docs"
  },
  async run(ctx) {
    const { useGit, useTemplate, useReceipt } = ctx;
    const git = useGit();
    const template = useTemplate();
    const receipt = useReceipt();
    
    const headSha = await git.head();
    const timestamp = new Date().toISOString();
    
    // Generate changelog content
    const changelogContent = `## HEAD ${headSha.substring(0, 8)} - ${timestamp}

- Automated changelog generation
- Commit: ${headSha}

`;
    
    // Write changelog (append to top)
    try {
      const existingContent = await template.readFile("CHANGELOG.md").catch(() => "");
      const newContent = changelogContent + existingContent;
      await template.writeFile("CHANGELOG.md", newContent);
    } catch (error) {
      // If file doesn't exist, create it
      await template.writeFile("CHANGELOG.md", changelogContent);
    }
    
    // Write note
    await git.noteAdd(`changelog updated for ${headSha}`);
    
    // Create receipt
    await receipt.create({
      operation: "changelog:generate",
      status: "completed",
      timestamp,
      metadata: { headSha, changelogGenerated: true }
    });
    
    console.log(`✓ Changelog generated for ${headSha.substring(0, 8)}`);
  }
};
