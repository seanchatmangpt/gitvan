import { withGitVan } from '../composables/ctx.mjs'

export async function runJobWithContext(ctx, jobMod, payload = {}) {
  return withGitVan(ctx, async () => {
    const job = jobMod.default || jobMod
    if (typeof job.run === 'function') {
      return await job.run({ payload, ctx })
    }
    return { ok: true, warning: 'No run method found' }
  })
}