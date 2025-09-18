import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: {
    desc: "Backup important files using GitVan composables",
    tags: ["backup","automation","file-operation"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  config: {
  "cron": "0 2 * * *"
},
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const template = useTemplate();
      const notes = useNotes();
      
      console.log("Executing job: Backup important files using GitVan composables");
      
      // Execute operations
      // Create backup directory using git.writeFile()
    const { writeFile } = await import('node:fs/promises')
    await writeFile('output.txt', 'Generated content')
    // Log backup completion using notes.write()
    await notes.write('Job executed')
    // Copy files to backup using git.readFile() and git.writeFile()
    const { readFile, writeFile } = await import('node:fs/promises')
    const sourceContent = await readFile('source.txt')
    await writeFile('backup.txt', sourceContent)
      
      return {
        ok: true,
        artifacts: ["backup/"],
        summary: "Backup completed successfully with GitVan composables"
      };
    } catch (error) {
      console.error('Job failed:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
})