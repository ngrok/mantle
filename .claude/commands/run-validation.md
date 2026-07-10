---
description: "Run the project's full verification suite (lint, fmt:check, typecheck, test) and report pass/fail per command."
---

# Run validation

Run the standard verification commands from `AGENTS.md` in order, report pass/fail per command, and exit non-zero on the first failure.

## 1. Decide whether to run mantle tests

Inspect changed files via `git status --short` and `git diff main...HEAD --name-only`. If any path matches `packages/mantle/src/**`, mantle tests must run.

## 2. Run, in order

For each command, run from the workspace root and capture exit status + the last ~50 lines of output on failure.

1. `pnpm -w run lint`
2. `pnpm -w run fmt:check` — if this fails, hint that `pnpm -w run fmt` will auto-fix.
3. `pnpm -w run typecheck`
4. `pnpm -w run test -F @ngrok/mantle` — only if step 1 indicated mantle tests are needed.

Stop on the first failure to keep output focused. (If the user wants to see all failures, they can re-run after fixing.)

## 3. Report

Print one line per command run:

```
✓ pnpm -w run lint        (0.4s)
✓ pnpm -w run fmt:check   (0.2s)
✗ pnpm -w run typecheck   (5.1s)
  <failing output excerpt>
```

End with a one-line summary. Exit 0 only if every command passed.

## Notes

- Do NOT run `pnpm -w run fmt` automatically — that mutates files. Suggest it on failure.
- Turbo caching makes repeat runs fast; the first run after a clean build can be slow.
- If you suspect a stale build is causing typecheck failures, `pnpm -w run clean` then re-run.
