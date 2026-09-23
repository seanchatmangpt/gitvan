# gitvan: land or delete remote branch `claude/complete-project-DHPYa`

- Standing: OPEN
- Created: 2026-09-19 (v26.9.19 gh survey wave)
- Source: remote branch `claude/complete-project-DHPYa` — not merged into `main`, no open PR
- Evidence: `git branch -r --no-merged origin/main` lists it; absent from `gh pr list` heads

## Work to complete
- Decide: open a PR (`gh pr create -R seanchatmangpt/gitvan --head claude/complete-project-DHPYa`) or delete (`git push origin --delete claude/complete-project-DHPYa`).
- If superseded, delete; otherwise land through review.

## Acceptance
- After `git fetch --prune`, `git branch -r --no-merged origin/main` no longer lists `claude/complete-project-DHPYa`.

## History
- 2026-09-19 | OPEN | survey found PR-less unmerged branch | claude/complete-project-DHPYa | decision pending
