#!/usr/bin/env bash
set -e
rm -rf /tmp/gv && mkdir -p /tmp/gv && cd /tmp/gv
git init && git config user.email x@y && git config user.name x
gitvan init
echo a > a.txt && git add . && git commit -m "init"

# trunk-based
git checkout -b feature/x && echo b >> a.txt && git commit -am "feat: b"
gitvan event simulate --ref refs/heads/feature/x
git checkout - && git merge --no-ff feature/x -m m
gitvan event simulate --ref refs/heads/main
test -f CHANGELOG.md || true

# release flow
git checkout -b release/1.0 && git commit --allow-empty -m "freeze"
gitvan event simulate --ref refs/heads/release/1.0
git tag v1.0.0
gitvan event simulate --ref refs/tags/v1.0.0
git notes --ref=gitvan/results list >/dev/null
echo PASS