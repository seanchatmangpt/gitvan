import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Generates a formatted changelog from Git commits with support for versioning and release notes",
    tags: ["changelog", "git", "automation", "release"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  
  async run({ ctx, payload, meta }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const { usePack } = await import("gitvan/composables/pack")
    
    const git = useGit()
    const template = await useTemplate()
    const pack = await usePack()
    
    try {
      // Get current HEAD commit
      const headCommit = await git.head()
      console.log('Processing commits from:', headCommit)
      
      // Get recent commits (default 20, but configurable via payload)
      const maxCount = payload?.maxCount || 20
      const commits = await git.log({ maxCount })
      
      if (!commits || commits.length === 0) {
        console.warn('No commits found to generate changelog')
        return { 
          ok: true, 
          artifacts: [],
          summary: "No commits found to generate changelog"
        }
      }
      
      // Process commits into changelog entries
      const changelogEntries = []
      let currentVersion = null
      
      for (const commit of commits) {
        // Skip merge commits by default
        if (commit.parents.length > 1 && payload?.skipMerges !== false) {
          continue
        }
        
        // Extract version from commit message if present
        const versionMatch = commit.message.match(/(?:v|version)\s*(\d+\.\d+\.\d+)/i)
        if (versionMatch) {
          currentVersion = versionMatch[1]
        }
        
        // Format commit for changelog entry
        const entry = {
          hash: commit.hash.substring(0, 7),
          message: commit.message.split('\n')[0], // First line only
          author: commit.author.name,
          date: new Date(commit.author.date).toISOString(),
          version: currentVersion
        }
        
        changelogEntries.push(entry)
      }
      
      console.log(`Generated ${changelogEntries.length} changelog entries`)
      
      // Generate changelog file using template
      const changelogContent = await template.render('templates/changelog.njk', {
        entries: changelogEntries,
        generatedAt: new Date().toISOString(),
        project: payload?.projectName || 'Project'
      })
      
      // Create changelog file in repository
      const changelogPath = payload?.outputPath || 'CHANGELOG.md'
      console.log(`Writing changelog to ${changelogPath}`)
      
      // Use template system to create the file with proper front-matter
      const plan = await template.plan('templates/changelog.njk', {
        entries: changelogEntries,
        generatedAt: new Date().toISOString(),
        project: payload?.projectName || 'Project'
      })
      
      // Apply the plan to write the file
      const result = await template.apply(plan, { path: changelogPath })
      
      // Write receipt to Git notes for audit trail
      const receipt = {
        job: meta.name,
        timestamp: new Date().toISOString(),
        commitsProcessed: changelogEntries.length,
        outputFile: changelogPath
      }
      
      await git.noteAppend('refs/notes/gitvan/changelog', JSON.stringify(receipt))
      
      console.log(`Changelog generated successfully at ${changelogPath}`)
      
      return { 
        ok: true, 
        artifacts: [
          {
            path: changelogPath,
            content: changelogContent
          }
        ],
        summary: `Successfully generated changelog with ${changelogEntries.length} entries`
      }
    } catch (error) {
      console.error('Changelog generation job failed:', error.message)
      return { 
        ok: false, 
        error: error.message,
        artifacts: []
      }
    }
  }
})