```javascript
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Simple hello world job", 
    tags: ["hello", "world"]
  },
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    console.log("Hello World!")
    
    return { ok: true, artifacts: [] }
  }
})
```