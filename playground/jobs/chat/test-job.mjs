import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create a test job", 
    tags: ["test", "example"]
  },
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    // Create a test file
    const testFileContent = `# Test Job
    
This is a generated test file created by the test job.

Timestamp: ${new Date().toISOString()}
Repository: ${ctx.repo}
Branch: ${ctx.branch}
`
    
    await git.writeFile('test-job-output.md', testFileContent)
    
    // Log the job execution
    console.log('Test job executed successfully')
    
    return { ok: true, artifacts: ['test-job-output.md'] }
  }
})