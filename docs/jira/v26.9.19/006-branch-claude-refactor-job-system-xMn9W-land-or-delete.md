# gitvan: land or delete remote branch `claude/refactor-job-system-xMn9W`

- Standing: OPEN
- Created: 2026-09-19 (v26.9.19 gh survey wave)
- Source: remote branch `claude/refactor-job-system-xMn9W` — not merged into `main`, no open PR
- Evidence: `git branch -r --no-merged origin/main` lists it; absent from `gh pr list` heads

## Work to complete
- Decide: open a PR (`gh pr create -R seanchatmangpt/gitvan --head claude/refactor-job-system-xMn9W`) or delete (`git push origin --delete claude/refactor-job-system-xMn9W`).
- If superseded, delete; otherwise land through review.

## Acceptance
- After `git fetch --prune`, `git branch -r --no-merged origin/main` no longer lists `claude/refactor-job-system-xMn9W`.

## History
- 2026-09-19 | OPEN | survey found PR-less unmerged branch | claude/refactor-job-system-xMn9W | decision pending
