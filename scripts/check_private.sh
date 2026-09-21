#!/usr/bin/env bash
# Pre-commit guard for this public repo: fail if staged changes contain local
# paths, e-mail addresses, tokens, or files from tmp/.
#   usage: bash scripts/check_private.sh        (checks the index; run after `git add`)
set -u
fail=0
if git diff --cached --name-only | grep -qE '^tmp/|(^|/)\.env'; then
  echo "STOP: tmp/ or .env files are staged"; git diff --cached --name-only | grep -E '^tmp/|(^|/)\.env'; fail=1
fi
pat='/Users/[A-Za-z]|/home/[A-Za-z]|/private/var|[A-Za-z0-9._%+-]+@(gmail|outlook|yahoo|hotmail|icloud)\.com|ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|xox[bp]-'
hits=$(git diff --cached -U0 -- . ':!scripts/check_private.sh' | grep -E '^\+' | grep -vE '^\+\+\+' | grep -nE "$pat" || true)
if [ -n "$hits" ]; then
  echo "STOP: possible private data in staged changes:"; echo "$hits" | head -20; fail=1
fi
if [ "$fail" = 0 ]; then echo "clean: no local paths / e-mails / tokens in staged changes"; fi
exit $fail
