import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create a backup job", 
    tags: ["backup", "automation"]
  },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    try {
      // Create backup directory
      const backupDir = `.backups/${new Date().toISOString().split('T')[0]}`
      await git.exec(`mkdir -p ${backupDir}`)
      
      // Get current branch
      const currentBranch = await git.exec('git rev-parse --abbrev-ref HEAD')
      
      // Create backup of current state
      const backupName = `backup-${currentBranch.trim()}-${new Date().toISOString().replace(/[:.]/g, '-')}`
      await git.exec(`tar -czf ${backupDir}/${backupName}.tar.gz .`)
      
      // Add backup to git
      await git.exec(`git add ${backupDir}`)
      await git.exec(`git commit -m "Backup: ${backupName}"`)
      
      // Push backup to remote
      await git.exec('git push origin main')
      
      return { 
        ok: true, 
        artifacts: [
          {
            name: backupName,
            path: `${backupDir}/${backupName}.tar.gz`
          }
        ] 
      }
    } catch (error) {
      console.error('Backup failed:', error)
      throw error
    }
  }
})