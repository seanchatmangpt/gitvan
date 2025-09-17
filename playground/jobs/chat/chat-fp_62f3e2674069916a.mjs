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
    try {
      await git.exec("clean", "-fdx", "-e", "*.log")
      ctx.logger.info("Cleanup completed successfully")
    } catch (error) {
      ctx.logger.error("Cleanup failed:", error)
      throw error
    }
    
    return { ok: true, artifacts: [] }
  }
})
```