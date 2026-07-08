# Docs Information Architecture: Categories, Layouts, and Recipes

## Status

- [x] Proposed
- [x] Accepted
- [x] Implemented 2026-07-08
- [ ] Superseded

## Decision Drivers

- The docs sidebar had grown to a single, flat, ~60-item alphabetical "Components" list — hard to scan for humans, and giving agents no signal about what a component _is_.
- Layout primitives (app shells, centered flows — see the layout-primitives audit) are approaching graduation into mantle. They are different in kind from components: per-app singletons documented by adoption contracts (slot anatomy, landmark rules, z-index conventions), not just prop tables.
- "Blocks" undersold what that section actually holds: compositional how-tos that wire multiple primitives together with state, data, or routing — behavior that transcends any single component _or_ layout.
- The agent surface (`llms.txt`, `/api/components.json`, `.md` twins) should canonicalize the same taxonomy humans see, so both audiences navigate the library the same way.

## Decision

The docs site has four content surfaces, each with a one-sentence membership rule:

| Surface                         | Membership rule                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `/components/<category>/<name>` | Published API that owns an interaction or widget.                                           |
| `/layouts/<name>`               | Published API that owns page/viewport structure and regions.                                |
| `/recipes/<name>`               | Not published API: documented compositions of primitives involving state, data, or routing. |
| `/migrations/<name>`            | Step-by-step guides for adopting new APIs/behaviors.                                        |

Component reference pages are grouped into eight categories, which appear as sidebar subheadings **and** as a URL segment. The sidebar lists categories alphabetically (components within each, too); the table below is in **precedence order** — for an ambiguous component, apply the tests top to bottom and take the first that answers yes. If a new component passes none of them cleanly, refine a test or discuss; do not create a new category for fewer than ~4 members.

| Category         | Membership test                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **Actions**      | Exists to be clicked to trigger an action (button family).                                  |
| **Forms**        | Collects or labels user input; has a value the user edits.                                  |
| **Navigation**   | Takes the user somewhere or switches what they're looking at.                               |
| **Overlays**     | Renders in a floating layer above the page.                                                 |
| **Structure**    | Contains, divides, or arranges _arbitrary_ content — doesn't care what's inside.            |
| **Data Display** | Presents _specific_ content or data (badge, code, table, list).                             |
| **Feedback**     | Communicates system status: progress, loading, success/error, emptiness.                    |
| **Primitives**   | Renders nothing visible of its own or provides context/behavior (Slot, Theme, BrowserOnly). |

Structure is deliberately distinct from both Data Display and the top-level Layouts surface (which owns _page/viewport_ structure; Structure components are in-flow). A component that genuinely straddles categories gets **one primary category** (which owns its URL) — secondary discoverability is solved with cross-links, search keywords, and (if ever needed) extra sidebar listings, never with a second URL. `componentsByCategory` in `apps/www/app/components/navigation-data.ts` is the source of truth; the flat `prodReadyComponents` list is derived from it. Preview components keep the `/components/preview/<name>` namespace — lifecycle, not category — and carry their eventual category in `previewComponentCategoryLookup`.

`/layouts` shipped as scaffolding only (routes, nav, index page, manifest support). The first residents (`CenteredLayout`, later `AppShell`, `Sidebar`, …) land as they graduate from app-side incubation. `Main` and `SkipToMainLink` stay under Components → Primitives for now, cross-linked from the layouts index; they migrate only once the section has enough mass that the move reads as consolidation.

`/blocks` was renamed to `/recipes` ("Sheet + Async Data" is the charter member).

### Imports stay flat

Docs URLs categorize; import paths do not. Every module remains `@ngrok/mantle/<name>`. Categories are opinions that will change; import paths are semver contracts. The manifest's `importPath` field remains the source of truth for the mapping (including the existing overrides like Icon Button → `@ngrok/mantle/button`).

### Agent surface

- `/api/components.json` entries gained `kind: "component" | "layout"` and `category` (additive; `SCHEMA_VERSION` unchanged).
- `/llms.txt` sections mirror the categories (`## Components: Forms`, …) plus `## Layouts` and `## Recipes`.
- `/api/search-index.json` entries pass `kind` and `category` through, and category tokens join the keyword bag.

### Redirects

Every pre-reorg URL 301s to its new home, forever:

- `/components/<name>` → `/components/<category>/<name>`, including `.md` (preserved) and `.mdx` (dropped, matching the sitewide `.mdx` → canonical redirect) suffixes and query strings.
- `/blocks` → `/recipes`, `/blocks/sheet-async` → `/recipes/sheet-async`.

The redirect table (`apps/www/app/utilities/legacy-redirects.ts`) is _derived_ from `prodReadyComponentRouteLookup`, so a component later moving categories automatically keeps its legacy redirect correct — but a category move still breaks the _previous_ categorized URL, so moves should add an explicit entry for the outgoing path. Published JSDoc `@see` links and in-repo cross-links were rewritten to the categorized URLs anyway; the redirects exist for bookmarks, search indexes, and agent caches.

## Considered Alternatives

- **`/layouts` as a docs-sidebar section only** (no top-level surface): rejected because layout demos need viewport-scale rendering (iframe previews, fullscreen routes — the shadcn-blocks mechanism) and the section's index page needs room for family-wide contracts.
- **Categorized sidebar without categorized URLs**: zero-churn, but leaves the URL space flat forever and makes category membership invisible to agents fetching `.md` pages. Rejected in favor of one-time churn + permanent redirects.
- **Namespaced imports (`@ngrok/mantle/layouts/<name>`)**: rejected — two import grammars for consumers, breaks the `subpath === src dir === dist file` convention that build tooling and import-checking agents rely on, and couples the permanent thing (imports) to the changeable thing (taxonomy).
- **Keeping the "Blocks" name**: rejected — the content is compositional how-tos, and "Recipes" names the quality that distinguishes them from both components and layouts.

## Consequences

- Category assignments are semi-permanent: moving a component between categories is a URL change requiring a redirect entry. Assign deliberately at scaffold time (`/scaffold-component` prompts for it).
- `Kbd` had a docs page, package export, and JSDoc but was missing from the nav and manifest; the reorg surfaced it (now under Data Display).
- The agent-surface drift snapshot (`components-surface.json`) now guards `kind` and `category` alongside slugs, so taxonomy changes are visible in review.
