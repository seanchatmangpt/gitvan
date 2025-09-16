import { useGitVan } from './ctx.mjs'
import { execSync } from 'node:child_process'

export function useGit() {
  const gv = useGitVan()
  const run = (args, opt = {}) =>
    execSync(`git -C "${gv.worktreeRoot || gv.root}" ${args}`, { env: { ...process.env, ...gv.env }, ...opt }).toString().trim()
  const repoRun = (args, opt = {}) =>
    execSync(`git -C "${gv.repoRoot || gv.root}" ${args}`, { env: { ...process.env, ...gv.env }, ...opt }).toString().trim()

  // stable worktree id (slug of absolute path)
  const worktreeId = () => (gv.worktreeRoot || gv.root).replace(/[:/\\]/g, '-')

  const listWorktrees = () => {
    try {
      const output = repoRun('worktree list --porcelain')
      const worktrees = []
      let current = {}
      for (const line of output.split('\n')) {
        if (line.startsWith('worktree ')) {
          current.path = line.slice(9)
        } else if (line.startsWith('HEAD ')) {
          current.head = line.slice(5)
        } else if (line.startsWith('branch ')) {
          current.branch = line.slice(7)
        } else if (line === '') {
          if (current.path) {
            worktrees.push({ ...current, isMain: !current.branch })
            current = {}
          }
        }
      }
      if (current.path) {
        worktrees.push({ ...current, isMain: !current.branch })
      }
      return worktrees
    } catch {
      return [{ path: gv.worktreeRoot || gv.root, branch: run('rev-parse --abbrev-ref HEAD'), isMain: true }]
    }
  }

  return {
    root: gv.root,
    repoRoot: gv.repoRoot || gv.root,
    worktreeRoot: gv.worktreeRoot || gv.root,
    head: () => run('rev-parse HEAD'),
    branch: () => run('rev-parse --abbrev-ref HEAD'),
    nowISO: () => (gv.now ? gv.now() : new Date().toISOString()),
    run, repoRun, listWorktrees, worktreeId,

    // Legacy methods for backward compatibility
    note: (ref, msg, sha = 'HEAD') => repoRun(`notes --ref=${ref} add -m ${q(msg)} ${sha}`),
    appendNote: (ref, msg, sha = 'HEAD') => repoRun(`notes --ref=${ref} append -m ${q(msg)} ${sha}`),
    setRef: (ref, sha) => repoRun(`update-ref ${ref} ${sha}`),
    delRef: (ref) => repoRun(`update-ref -d ${ref}`),
    listRefs: (prefix) => repoRun(`for-each-ref --format="%(refname)" "${prefix}"`).split('\n').filter(Boolean),

    // New comprehensive methods
    noteAdd: (ref, msg, sha = 'HEAD') => repoRun(`notes --ref=${ref} add -m ${q(msg)} ${sha}`),
    noteAppend: (ref, msg, sha = 'HEAD') => repoRun(`notes --ref=${ref} append -m ${q(msg)} ${sha}`),
    updateRefStdin: (input) => execSync(`git -C "${(gv.repoRoot || gv.root)}" update-ref --stdin`, { input }),
    verifyCommit: (sha = 'HEAD') => { try { repoRun(`verify-commit ${sha}`); return true } catch { return false } },

    // Core operations
    status: () => run('status -sb'),
    remoteAdd: (name, url) => repoRun(`remote add ${name} ${url}`),
    fetch: (r = 'origin', spec = '') => repoRun(`fetch ${r} ${spec}`.trim()),
    pull: (r = 'origin', b = 'main') => repoRun(`pull ${r} ${b}`),
    push: (r = 'origin', ref = 'HEAD') => repoRun(`push ${r} ${ref}`),

    // Index/workspace operations
    add: (paths = ['.']) => run(`add ${[].concat(paths).join(' ')}`),
    rm: (paths) => run(`rm -r ${[].concat(paths).join(' ')}`),
    mv: (src, dst) => run(`mv ${src} ${dst}`),
    checkout: (ref) => run(`checkout ${ref}`),
    switch: (ref) => run(`switch ${ref}`),

    // Commits/tags
    commit: (msg, { sign = true } = {}) =>
      run(`commit ${sign ? '-S ' : ''}-m ${q(msg)}`),
    tag: (name, msg = '', { sign = true } = {}) =>
      repoRun(`tag ${sign ? '-s ' : '-a '} ${name} -m ${q(msg)}`),
    describe: () => run('describe --tags --always'),
    show: (rev = 'HEAD') => run(`show --stat ${rev}`),

    // Branches
    branchCreate: (name, { start = 'HEAD' } = {}) => run(`branch ${name} ${start}`),
    branchDelete: (name) => run(`branch -D ${name}`),
    currentBranch: () => run('rev-parse --abbrev-ref HEAD'),

    // Integration
    merge: (ref, { noff = true, msg = '' } = {}) => run(`merge ${noff ? '--no-ff ' : ''}${msg ? '-m ' + q(msg) : ''} ${ref}`.trim()),
    rebase: (onto = 'origin/main') => run(`rebase ${onto}`),
    cherryPick: (rev) => run(`cherry-pick ${rev}`),
    revert: (rev) => run(`revert ${rev}`),
    resetHard: (ref = 'HEAD') => run(`reset --hard ${ref}`),
    stashSave: (msg = '') => run(`stash push ${msg ? '-m ' + q(msg) : ''}`.trim()),
    stashApply: (idx = 0) => run(`stash apply stash@{${idx}}`),

    // History/search
    log: (fmt = '%h%x09%s', range = '') => run(`log --pretty=format:${q(fmt)} ${range}`.trim()),
    grep: (pat, { pathspec = '' } = {}) => run(`grep -n ${q(pat)} ${pathspec}`.trim()),

    // Notes operations
    noteShow: (ref = 'refs/notes/gitvan', sha = 'HEAD') => repoRun(`notes --ref=${ref} show ${sha}`),
    noteCopy: (src, dst, sha = 'HEAD') => repoRun(`notes copy --force --ref ${src} --dst ${dst} ${sha}`),

    // Worktrees
    worktreeAdd: (path, { branch } = {}) =>
      repoRun(`worktree add ${branch ? `-b ${branch} ` : ''}${q(path)}`.trim()),
    worktreeRemove: (path) => repoRun(`worktree remove ${q(path)}`),
    worktreePrune: () => repoRun('worktree prune'),

    // Submodules
    submoduleAdd: (url, path) => run(`submodule add ${url} ${q(path)}`),
    submoduleUpdate: ({ init = true, recursive = true } = {}) =>
      run(`submodule update ${init ? '--init ' : ''}${recursive ? '--recursive' : ''}`.trim()),
  }
}

const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`