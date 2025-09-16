import { defineJob } from '../../src/runtime/define.mjs'
import { useGit } from '../../src/composables/git.mjs'
import { useTemplate } from '../../src/composables/template.mjs'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Generate CHANGELOG.md', schedule: '0 3 * * *' },
  async run() {
    const git = useGit()
    const t = useTemplate()
    const commits = git.run('log --pretty=%h%x09%s -n 50').split('\n')
    t.renderToFile('templates/changelog.njk', 'dist/CHANGELOG.md', { commits })
    return { ok: true, artifact: 'dist/CHANGELOG.md' }
  }
})