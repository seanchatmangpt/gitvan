/**
 * GitVan Job: notes:write
 * Writes a note to Git notes for audit trail
 */
export default {
  name: "notes:write",
  meta: {
    description: "Write audit note to Git notes",
    category: "audit"
  },
  async run(ctx) {
    const { useGit, useReceipt } = ctx;
    const git = useGit();
    const receipt = useReceipt();
    
    const headSha = await git.head();
    const timestamp = new Date().toISOString();
    const message = `ran notes:write on ${headSha} at ${timestamp}`;
    
    // Write to Git notes
    await git.noteAdd(message);
    
    // Create receipt
    await receipt.create({
      operation: "notes:write",
      status: "completed",
      timestamp,
      metadata: { headSha, message }
    });
    
    console.log(`✓ Note written: ${message}`);
  }
};
