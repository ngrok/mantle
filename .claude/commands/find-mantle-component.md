---
description: "Search the @ngrok/mantle component manifest for a component matching a query, and report its name, status, import path, and docs links."
argument-hint: "<search query>"
---

# Find a mantle component

Search the `@ngrok/mantle` component manifest for components matching `$ARGUMENTS` and report the best matches with import paths and docs links.

If the user passes no argument, ask what they are looking for.

## 1. Source the manifest

The manifest lives in two places. Prefer the local one when working in this repo, fall back to the public one otherwise.

- **Local (this repo):** Read the committed snapshot `apps/www/app/utilities/__snapshots__/components-surface.json`, or run `pnpm -F @ngrok/mantle run agent-artifacts` and read `packages/mantle/dist/agent.json` (components, hooks, and utilities in one file).
- **Public:** `https://mantle.ngrok.com/api/components.json` — fetch with `WebFetch` if a network is available.

Each manifest entry has:

````jsonc
{
  "name": "Data Table",
  "slug": "components/data-display/data-table",
  "kind": "component" | "layout",
  "category": "Data Display",
  "status": "stable" | "preview",
  "importPath": "@ngrok/mantle/data-table",
  "docsUrl": "https://mantle.ngrok.com/components/data-display/data-table",
  "markdownUrl": "https://mantle.ngrok.com/components/data-display/data-table.md",
  "summary": "...",
  "jsdoc": "...",
  "examples": ["```tsx\n…\n```"],
  "aliases": ["grid"],
  "useWhen": "...",
  "siblings": [{ "name": "Table", "boundary": "..." }]
}
````

## 2. Match against the query

Run a case-insensitive substring match against `name`, `slug`, `aliases`, and `summary`. Return up to 5 matches, ranked by:

1. Exact name or alias match (e.g. query "button" matches "Button" first, and "modal" matches "Dialog").
2. Word-prefix name match (e.g. "data" matches "Data Table").
3. Substring in `summary`.

If nothing matches, suggest the closest 3 by simple Levenshtein distance against the name and tell the user to try a broader query or fetch `https://mantle.ngrok.com/llms.txt` for the full index.

## 3. Report

For each match, output a concise block:

```
<Name> — <status>
  import { ... } from "<importPath>";
  Docs: <docsUrl>
  Markdown: <markdownUrl>
  <summary>
```

End with the match's `useWhen` line and its `siblings`, so the user sees the boundary (e.g. `Dialog` lists `Sheet` and `AlertDialog`).

## 4. Do not fabricate

If you can't access the manifest (no network and no local file), say so explicitly. Do not invent component names or import paths. Mantle's exports are listed in `packages/mantle/package.json` — that is the ground truth.
