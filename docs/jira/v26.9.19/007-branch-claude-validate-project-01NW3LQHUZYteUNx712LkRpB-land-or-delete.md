# gitvan: land or delete remote branch `claude/validate-project-01NW3LQHUZYteUNx712LkRpB`

- Standing: OPEN
- Created: 2026-09-19 (v26.9.19 gh survey wave)
- Source: remote branch `claude/validate-project-01NW3LQHUZYteUNx712LkRpB` — not merged into `main`, no open PR
- Evidence: `git branch -r --no-merged origin/main` lists it; absent from `gh pr list` heads

## Work to complete
- Decide: open a PR (`gh pr create -R seanchatmangpt/gitvan --head claude/validate-project-01NW3LQHUZYteUNx712LkRpB`) or delete (`git push origin --delete claude/validate-project-01NW3LQHUZYteUNx712LkRpB`).
- If superseded, delete; otherwise land through review.

## Acceptance
- After `git fetch --prune`, `git branch -r --no-merged origin/main` no longer lists `claude/validate-project-01NW3LQHUZYteUNx712LkRpB`.

## History
- 2026-09-19 | OPEN | survey found PR-less unmerged branch | claude/validate-project-01NW3LQHUZYteUNx712LkRpB | decision pending
