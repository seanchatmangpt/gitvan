```javascript
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create a file cleanup job", 
    tags: ["cleanup", "files", "maintenance"]
  },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    try {
      // Get current working directory
      const cwd = process.cwd()
      
      // Define cleanup patterns
      const cleanupPatterns = [
        '**/*.tmp',
        '**/*.log',
        '**/.DS_Store',
        '**/node_modules/**',
        '**/__pycache__/**',
        '**/*.pyc'
      ]
      
      // Find files matching cleanup patterns
      const filesToDelete = []
      
      for (const pattern of cleanupPatterns) {
        const matchedFiles = await tpl.glob(pattern, { cwd })
        filesToDelete.push(...matchedFiles)
      }
      
      // Remove duplicate files
      const uniqueFiles = [...new Set(filesToDelete)]
      
      // Delete files
      for (const file of uniqueFiles) {
        try {
          await tpl.rm(file, { force: true })
          console.log(`Deleted: ${file}`)
        } catch (error) {
          console.warn(`Failed to delete ${file}:`, error.message)
        }
      }
      
      return { 
        ok: true, 
        artifacts: [
          {
            name: "cleanup-report",
            content: `Cleaned up ${uniqueFiles.length} files`
          }
        ] 
      }
    } catch (error) {
      console.error("File cleanup failed:", error)
      throw error
    }
  }
})
```