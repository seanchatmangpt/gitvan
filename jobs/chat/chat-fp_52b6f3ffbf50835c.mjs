import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  meta: { 
    desc: "Simple hello world job", 
    tags: ["hello", "world"]
  },
  async run({ ctx, payload }) {
    const { useGit } = await import("../../src/composables/git.mjs");
    const { useTemplate } = await import("../../src/composables/template.mjs");
    const git = useGit();
    const tpl = await useTemplate();
    
    console.log("Hello World!");
    
    return { ok: true, artifacts: [] };
  }
});