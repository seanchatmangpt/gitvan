```javascript
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create a cleanup job", 
    tags: ["cleanup", "maintenance"]
  },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    // Clean up temporary files
    const tempFiles = await git.findFiles('temp/**/*')
    for (const file of tempFiles) {
      await git.rm(file)
    }
    
    // Clean up old build artifacts
    const buildArtifacts = await git.findFiles('dist/**/*')
    for (const artifact of buildArtifacts) {
      await git.rm(artifact)
    }
    
    // Clean up node_modules directories (except root)
    const nodeModulesDirs = await git.findDirectories('**/node_modules')
    for (const dir of nodeModulesDirs) {
      if (!dir.startsWith('node_modules')) {
        await git.rmDir(dir)
      }
    }
    
    return { ok: true, artifacts: [] }
  }
})
```