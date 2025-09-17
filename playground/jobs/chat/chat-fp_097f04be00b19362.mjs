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
        '*.tmp',
        '*.log',
        '.DS_Store',
        'node_modules/.cache/*',
        '.git/objects/pack/*.idx'
      ]
      
      // Find and remove temporary files
      const { exec } = await import('child_process')
      
      for (const pattern of cleanupPatterns) {
        try {
          const result = await new Promise((resolve, reject) => {
            exec(`find ${cwd} -name "${pattern}" -type f`, (error, stdout, stderr) => {
              if (error) reject(error)
              else resolve(stdout.trim())
            })
          })
          
          if (result) {
            const files = result.split('\n').filter(f => f)
            for (const file of files) {
              try {
                await new Promise((resolve, reject) => {
                  exec(`rm -f "${file}"`, (error, stdout, stderr) => {
                    if (error) reject(error)
                    else resolve()
                  })
                })
                console.log(`Removed: ${file}`)
              } catch (err) {
                console.warn(`Failed to remove ${file}:`, err.message)
              }
            }
          }
        } catch (err) {
          // Continue with other patterns even if one fails
          console.warn(`Pattern ${pattern} failed:`, err.message)
        }
      }
      
      // Clean up git index
      await git.clean({ force: true, untracked: true })
      
      return { 
        ok: true, 
        artifacts: [
          {
            name: "cleanup-report",
            content: `Cleanup completed at ${new Date().toISOString()}`
          }
        ] 
      }
    } catch (error) {
      console.error('File cleanup failed:', error)
      throw error
    }
  }
})