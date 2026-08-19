---
description: "Promote a preview component to stable: move nav entry, route, docs file, and add a minor changeset. Accepts PascalCase, Title Case, lowercase, or kebab-case."
argument-hint: "<component-name>"
---

# Promote a preview component to stable

Move `$ARGUMENTS` from preview to stable status. This is the inverse of the original "add as preview" decision; the component's API has stabilized and is ready for production use.

**[COMPONENT_SPEC.md](../../COMPONENT_SPEC.md) is the normative standard** — a component going stable must meet it, not just move nav entries. Before promoting, run the [review checklist](../../COMPONENT_SPEC.md#11-review-checklist) against the component and report anything it does not satisfy; a preview component is exactly where pre-spec gaps hide. Where this workflow and the spec disagree, the spec governs.

## 0. Normalize the component name

Accept any of these formats and derive the canonical forms (same logic as `scaffold-component.md`):

- `ComponentName` (PascalCase)
- `Component Name` (Title Case with spaces)
- `component name` (lowercase with spaces)
- `component-name` (kebab-case)

Derive:

- **`<component-name>`** — lower-kebab-case (file/route/import slug)
- **`<ComponentName>`** — PascalCase (export identifier)
- **`<Display Name>`** — Title Case with spaces (nav label)

If the input cannot be matched to an existing preview component, stop and tell the user.

## 1. Verify the component is currently in preview

Read `apps/www/app/components/navigation-data.ts`. The display name MUST appear in `previewComponents` and `previewComponentsRouteLookup`. Its current route should be `/components/preview/<component-name>`.

If it's not in preview (already stable, or doesn't exist), stop and report.

## 2. Move the nav entries

In `apps/www/app/components/navigation-data.ts`:

1. Remove `<Display Name>` from `previewComponents`, `previewComponentsRouteLookup`, and `previewComponentCategoryLookup` (note its category — that is where it lands).
2. Add `<Display Name>` to that category's array in `componentsByCategory` in alphabetical order (`prodReadyComponents` is derived — do not edit it directly).
3. Add `"<Display Name>": "/components/<category>/<component-name>"` (note: no `/preview/` segment) to `prodReadyComponentRouteLookup` in alphabetical order.

## 3. Move the docs file

```bash
git mv apps/www/app/docs/components/preview/<component-name>.mdx \
       apps/www/app/docs/components/<category>/<component-name>.mdx
```

(Use `git mv` so the move is tracked properly in history.)

## 4. Update the route registration

In `apps/www/app/routes.ts`:

1. In the `docsPages` array, find the `"components/preview/<component-name>"` entry and remove it.
2. Add `"components/<category>/<component-name>"` to `docsPages`, alphabetical within its category block.

## 4.a. Drop the preview badge

The docs page's header carries the preview badge. If it uses `<PageHeader id="<component-name>" isPreview>`, remove the `isPreview` prop — otherwise the promoted component still renders a Preview badge. See [COMPONENT_SPEC.md §7.2](../../COMPONENT_SPEC.md#72-required-structure-in-order) item 3.

## 5. Update intra-doc cross-links (if any)

Grep the docs site for any links pointing at `/components/preview/<component-name>` and rewrite them to `/components/<category>/<component-name>`:

```bash
grep -rn "components/preview/<component-name>" apps/www/app/docs/
```

## 6. Add a changeset

```bash
pnpm -w run changeset
```

- Bump type: `minor` for `@ngrok/mantle` (promotion is a stability/feature signal, even though no source code changes). See [VERSIONING.md](../../VERSIONING.md).
- Description: `Promote <ComponentName> from preview to stable`.

## 7. Verify

Run from the workspace root. All five must pass:

1. `pnpm -w run lint` — 0 errors.
2. `pnpm -w run fmt:check` — clean.
3. `pnpm -w run typecheck` — 0 errors.
4. `pnpm -w run build -F @ngrok/mantle` — succeeds.
5. `pnpm -w run test` — all tests pass. Run it **unscoped**: `-F @ngrok/mantle` cannot reach the `@app/www` suite, which is what pins the component manifest a promotion changes.

## 8. Report

- Files modified
- The new docs URL (`/components/<category>/<component-name>`)
- The changeset filename
- Validation results
