```javascript
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create a file cleanup job", 
    tags: ["cleanup", "files"]
  },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    // Get the current working directory
    const cwd = process.cwd()
    
    // Define cleanup patterns
    const cleanupPatterns = [
      '**/*.tmp',
      '**/*.log',
      '**/node_modules/**',
      '**/.git/**',
      '**/__pycache__/**',
      '**/*.pyc'
    ]
    
    // Find and remove files matching cleanup patterns
    try {
      const filesToDelete = []
      
      for (const pattern of cleanupPatterns) {
        if (pattern.includes('node_modules') || pattern.includes('.git')) {
          // Skip these directories entirely
          continue
        }
        
        const matchedFiles = await tpl.glob(pattern, { cwd })
        filesToDelete.push(...matchedFiles)
      }
      
      // Remove the identified files
      for (const file of filesToDelete) {
        try {
          await tpl.rm(file, { force: true })
          console.log(`Deleted: ${file}`)
        } catch (error) {
          console.warn(`Failed to delete ${file}:`, error.message)
        }
      }
      
      // Remove empty directories
      const emptyDirs = await tpl.glob('**/*', { cwd, onlyDirectories: true })
      for (const dir of emptyDirs) {
        try {
          const files = await tpl.readdir(dir)
          if (files.length === 0) {
            await tpl.rm(dir, { recursive: true })
            console.log(`Removed empty directory: ${dir}`)
          }
        } catch (error) {
          // Skip directories that can't be read
        }
      }
      
      return { 
        ok: true, 
        artifacts: [
          { name: 'cleanup-report', content: `Cleaned up ${filesToDelete.length} files` }
        ] 
      }
    } catch (error) {
      console.error('Cleanup job failed:', error)
      return { 
        ok: false, 
        error: error.message,
        artifacts: [] 
      }
    }
  }
})
```