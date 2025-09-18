import {
  defineJob,
  useGit,
  useNotes,
} from "file:///Users/sac/gitvan/src/index.mjs";

export default defineJob({
  meta: { name: "touch", desc: "Touch file on tag creation" },
  on: { tagCreate: "v*" },
  async run() {
    const git = useGit();
    const notes = useNotes();

    await git.writeFile("TOUCHED", "ok");
    await notes.write(`touch for ${await git.headSha()}`);
    return { ok: true, artifacts: ["TOUCHED"] };
  },
});
