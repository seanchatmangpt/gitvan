# gitvan: land or delete remote branch `agent/manufacture-capability-system`

- Standing: OPEN
- Created: 2026-09-19 (v26.9.19 gh survey wave)
- Source: remote branch `agent/manufacture-capability-system` — not merged into `main`, no open PR
- Evidence: `git branch -r --no-merged origin/main` lists it; absent from `gh pr list` heads

## Work to complete
- Decide: open a PR (`gh pr create -R seanchatmangpt/gitvan --head agent/manufacture-capability-system`) or delete (`git push origin --delete agent/manufacture-capability-system`).
- If superseded, delete; otherwise land through review.

## Acceptance
- After `git fetch --prune`, `git branch -r --no-merged origin/main` no longer lists `agent/manufacture-capability-system`.

## History
- 2026-09-19 | OPEN | survey found PR-less unmerged branch | agent/manufacture-capability-system | decision pending
