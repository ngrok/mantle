---
description: "Search the @ngrok/mantle component manifest for a component matching a query, and report its name, status, import path, and docs links."
argument-hint: "<search query>"
---

# Find a mantle component

Search the `@ngrok/mantle` component manifest for components matching `$ARGUMENTS` and report the best matches with import paths and docs links.

If no argument is provided, ask the user what they're looking for.

## 1. Source the manifest

The manifest lives in two places. Prefer the local one when working in this repo, fall back to the public one otherwise.

- **Local (this repo):** Generate it on demand by reading `apps/www/app/components/navigation-data.ts` (the `componentsByCategory` map and `previewComponents` array plus their route lookups).
- **Public:** `https://mantle.ngrok.com/api/components.json` — fetch with `WebFetch` if a network is available.

Each manifest entry has:

```jsonc
{
  "name": "Data Table",
  "slug": "components/data-display/data-table",
  "kind": "component" | "layout",
  "category": "Data Display",
  "status": "stable" | "preview",
  "importPath": "@ngrok/mantle/data-table",
  "docsUrl": "https://mantle.ngrok.com/components/data-display/data-table",
  "markdownUrl": "https://mantle.ngrok.com/components/data-display/data-table.md",
  "summary": "..."
}
```

## 2. Match against the query

Run a case-insensitive substring match against `name`, `slug`, and `summary`. Return up to 5 matches, ranked by:

1. Exact name match (e.g. query "button" matches "Button" first).
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

End with a one-line suggestion if a related component is likely a better fit (e.g. for "modal" → suggest both `Dialog` and `Sheet`).

## 4. Do not fabricate

If you can't access the manifest (no network and no local file), say so explicitly. Do not invent component names or import paths. Mantle's exports are listed in `packages/mantle/package.json` — that is the ground truth.
