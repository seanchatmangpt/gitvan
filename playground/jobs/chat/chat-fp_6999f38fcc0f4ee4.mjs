import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Create an invalid job", 
    tags: ["invalid", "test"]
  },
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    // This job intentionally creates an invalid state
    // It will fail during execution due to invalid operations
    throw new Error("This is an intentionally invalid job")
    
    return { ok: true, artifacts: [] }
  }
})