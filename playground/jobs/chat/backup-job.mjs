import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create a backup job", 
    tags: ["backup", "maintenance"]
  },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    // Create backup directory
    const backupDir = `.backups/${new Date().toISOString().split('T')[0]}`
    await git.run(`mkdir -p ${backupDir}`)
    
    // Get current branch
    const currentBranch = await git.run('git rev-parse --abbrev-ref HEAD')
    
    // Create backup of current working directory
    const backupName = `backup_${currentBranch}_${new Date().toISOString().split('T')[0]}`
    await git.run(`tar -czf ${backupDir}/${backupName}.tar.gz .`)
    
    // Add backup to git
    await git.run(`git add ${backupDir}`)
    await git.run(`git commit -m "Backup: ${backupName}"`)
    
    // Push backup to remote
    await git.run('git push origin main')
    
    return { ok: true, artifacts: [backupDir] }
  }
})