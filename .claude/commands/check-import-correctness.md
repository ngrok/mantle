---
description: "Scan code for invalid @ngrok/mantle imports and suggest the correct subpath. Accepts a file path, directory, or 'staged' to check git-staged changes."
argument-hint: "<path> | staged"
---

# Check @ngrok/mantle import correctness

Scan `$ARGUMENTS` for invalid `@ngrok/mantle` imports. The two common mistakes:

1. Importing from `@ngrok/mantle` root instead of a subpath (`import { Button } from "@ngrok/mantle"`).
2. Importing from a non-existent subpath (e.g. `@ngrok/mantle/icon-button`, which doesn't exist — `IconButton` is exported from `@ngrok/mantle/button`).

## 1. Resolve the target

- If `$ARGUMENTS` is empty or `"staged"`: enumerate changed files via `git diff --name-only --cached` and `git diff --name-only`. Filter to `.ts`, `.tsx`, `.mdx`.
- If `$ARGUMENTS` is a file path: scan that file.
- If `$ARGUMENTS` is a directory: scan recursively (filter to `.ts`, `.tsx`, `.mdx`).

## 2. Build the source-of-truth list of valid subpaths

Read `packages/mantle/package.json`. The `exports` field's keys (those starting with `./`) are the valid import subpaths. Concatenate `@ngrok/mantle` + each subpath to form valid full import specifiers. The bare `@ngrok/mantle` root is NEVER a valid import (no root export is defined).

## 3. Find imports

Grep the target files for the pattern `from\s+["']@ngrok/mantle(?:/[\w-]+)?["']`. Capture the file, line number, and the matched specifier.

## 4. Validate each match

For every match:

- **Root import** (`from "@ngrok/mantle"`) → INVALID. Suggest splitting into specific subpaths.
- **Unknown subpath** (`from "@ngrok/mantle/<x>"` where `<x>` is not a key in `exports`) → INVALID.

For unknown subpaths, suggest the correct one when possible. Known wrong-subpath cases:

| Wrong specifier                | Correct specifier        |
| ------------------------------ | ------------------------ |
| `@ngrok/mantle/icon-button`    | `@ngrok/mantle/button`   |
| `@ngrok/mantle/password-input` | `@ngrok/mantle/input`    |
| `@ngrok/mantle/progress-bar`   | `@ngrok/mantle/progress` |
| `@ngrok/mantle/progress-donut` | `@ngrok/mantle/progress` |

For any other unknown subpath, recommend checking the structured manifest at <https://mantle.ngrok.com/api/components.json> (its `importPath` is authoritative), or running `/find-mantle-component <name>` to look the name up.

## 5. Report

Print one line per issue:

```
<file>:<line> — <specifier> is invalid. Suggested: <correct-specifier>
```

End with a summary: `N file(s) scanned, M issue(s) found`.

Exit non-zero if any issues were found.
