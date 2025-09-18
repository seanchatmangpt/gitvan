import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create a simple test job", 
    tags: ["test", "example"]
  },
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    console.log("Running simple test job")
    const testResult = "Test completed successfully"
    console.log(testResult)
    
    return { ok: true, artifacts: [] }
  }
})