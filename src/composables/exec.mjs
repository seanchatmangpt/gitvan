import { spawnSync } from 'node:child_process'
import { useGitVan } from './ctx.mjs'
import { useTemplate } from './template.mjs'
import { join as joinPath } from 'pathe'

export function useExec() {
  const gv = useGitVan()

  function cli(cmd, args = [], env = {}) {
    const res = spawnSync(cmd, args, {
      cwd: gv.root, stdio: 'pipe',
      env: { ...process.env, ...gv.env, ...env }
    })
    return { ok: res.status === 0, code: res.status, stdout: s(res.stdout), stderr: s(res.stderr) }
  }

  async function js(modulePath, exportName = 'default', input = {}) {
    const mod = await import(modulePath.startsWith('file:') ? modulePath : 'file://' + joinPath(gv.root, modulePath))
    const fn = exportName === 'default' ? mod.default : mod[exportName]
    const out = await fn(input)
    return { ok: true, stdout: toStr(out), meta: { out } }
  }

  function tmpl({ template, out, data, autoescape, paths }) {
    const t = useTemplate({ autoescape, paths })
    if (out) {
      const r = t.renderToFile(template, out, v(data, gv))
      return { ok: true, artifact: r.path, meta: { bytes: r.bytes } }
    }
    const text = t.render(template, v(data, gv))
    return { ok: true, stdout: text }
  }

  return { cli, js, tmpl }
}

/* helpers */
const s = (b) => (b ? b.toString() : '')
const toStr = (x) => typeof x === 'string' ? x : JSON.stringify(x)
const v = (d, gv) => typeof d === 'function' ? d({ git: gv }) : (d || {})