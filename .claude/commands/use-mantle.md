---
description: "Load a mantle primer into context: conventions, import patterns, the components manifest, and the For-AI-Agents docs page."
---

# Use mantle

Load a primer into the current context so subsequent code generation correctly uses `@ngrok/mantle`. Run this once at the start of a session that will write or modify mantle code.

## 1. Read the project primer

Read these files in order. Skip any that don't exist (the user may not be in the mantle monorepo).

1. `AGENTS.md` — top-level agent guide (project structure, commands, dependencies).
2. `CONVENTIONS.md` — code style, file naming, JSDoc requirements, the `cx` rule, the no-`as` rule, and exact-version pinning.
3. `apps/www/app/docs/for-ai-agents.mdx` — agent-specific entry point with the suggested system-prompt snippet and composition patterns.

If the user is not in the mantle repo, fetch instead:

- `https://mantle.ngrok.com/llms.txt` — curated docs index.
- `https://mantle.ngrok.com/for-ai-agents.md` — the same agent guide as plain markdown.

## 2. Read the components manifest

If working in the repo, derive the manifest from `apps/www/app/components/navigation-data.ts` plus `packages/mantle/package.json` exports. Otherwise fetch `https://mantle.ngrok.com/api/components.json`. Keep the parsed list in mind so suggestions stay grounded in real exports.

## 3. Confirm the basics with the user

After reading, briefly confirm:

- The mantle version in use (from `package.json` dependencies, if applicable).
- Whether the app already mounts `ThemeProvider`, `TooltipProvider`, and `Toaster` at the root.
- Whether to favor stable components only or include preview ones.

Ask only if any of those are ambiguous — don't make the user repeat answers that are obvious from the code you read.

## 4. Working rules going forward

While the session continues:

- Always import from `@ngrok/mantle/<name>` subpaths, never from a non-existent `@ngrok/mantle` root.
- Compose class names with `cx`. No string interpolation in `className`.
- Prefer `asChild` for polymorphism over wrapper divs.
- Add JSDoc to new components, hooks, props, and types per `CONVENTIONS.md`.
- Pin new dependencies exactly. Use the workspace catalog if the dep will be shared.
- For interactive elements, render the right semantic HTML. Pair every form control with a `Label`.
- If you're unsure which component fits, run `/find-mantle-component <query>` rather than guessing.
