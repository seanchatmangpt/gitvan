```javascript
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Cleanup job", 
    tags: ["cleanup", "maintenance"]
  },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    // Clean up temporary files
    const tempFiles = await git.findFiles('**/*.tmp')
    for (const file of tempFiles) {
      await git.removeFile(file)
    }
    
    // Clean up node_modules directories (except root)
    const nodeModulesDirs = await git.findDirectories('**/node_modules')
    for (const dir of nodeModulesDirs) {
      if (!dir.startsWith('node_modules')) {
        await git.removeDirectory(dir)
      }
    }
    
    // Clean up .cache directories
    const cacheDirs = await git.findDirectories('**/.cache')
    for (const dir of cacheDirs) {
      await git.removeDirectory(dir)
    }
    
    return { ok: true, artifacts: [] }
  }
})
```