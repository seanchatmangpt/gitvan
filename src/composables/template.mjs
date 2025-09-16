import nunjucks from 'nunjucks'
import { join, dirname } from 'pathe'
import fs from 'node:fs'
import { useGitVan } from './ctx.mjs'

let _env

function ensureEnv(root, { autoescape = false, paths = [] } = {}) {
  if (_env) return _env
  const loader = new nunjucks.FileSystemLoader([root, ...paths], { noCache: true })
  const env = new nunjucks.Environment(loader, { autoescape, throwOnUndefined: true })
  env.addFilter('json', (v) => JSON.stringify(v, null, 2))
  env.addFilter('slug', (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''))
  env.addGlobal('upper', (s) => String(s).toUpperCase())
  _env = env
  return _env
}

export function useTemplate(opts = {}) {
  const gv = useGitVan()
  const env = ensureEnv(gv.root, opts)
  const nowISO = gv.now ? gv.now() : new Date().toISOString()

  function render(template, data = {}) {
    return env.render(template, { nowISO, git: gv, ...data })
  }

  function renderToFile(template, out, data = {}) {
    const abs = out.startsWith('/') ? out : join(gv.root, out)
    fs.mkdirSync(dirname(abs), { recursive: true })
    const s = render(template, data)
    fs.writeFileSync(abs, s)
    return { path: abs, bytes: Buffer.byteLength(s) }
  }

  return { render, renderToFile, env }
}