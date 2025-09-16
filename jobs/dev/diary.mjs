import { defineJob } from "../../src/jobs/define.mjs";
import { useTemplate } from "../../src/composables/template.mjs";

export default defineJob({
  kind: "atomic",
  meta: { desc: "Create daily dev diary entry" },
  async run() {
    const t = useTemplate();
    const out = `dist/diary/${Date.now()}.md`;
    t.renderToFile("templates/dev-diary.njk", out, {
      title: "Daily Dev Diary",
    });
    return { ok: true, artifact: out };
  },
});
