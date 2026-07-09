---
description: "Audit a mantle component's docs, JSDoc, and scaffold wiring against the project conventions and fix any discrepancies. Accepts PascalCase, Title Case, lowercase, or kebab-case names."
argument-hint: "<component-name> | all"
---

# Audit a mantle component

Audit the component named `$ARGUMENTS` against the documentation and scaffold conventions used by `@ngrok/mantle`, and fix any discrepancies found. This skill is the mirror of `/scaffold-component` — same rules, but applied to an existing component.

If `$ARGUMENTS` is empty or `all`, iterate over every directory under `packages/mantle/src/components/` and apply steps 1–6 to each. Skip utility-only directories that intentionally have no doc page (e.g. `browser-only`, `portal`, `slot`, `icons`, `icon` if it is only a utility) — but confirm with the user before skipping anything.

## 0. Normalize the component name

Accept any of these formats for the input and normalize before auditing:

- `ComponentName` (PascalCase)
- `Component Name` (Title Case with spaces)
- `component name` (lowercase with spaces)
- `component-name` (kebab-case)

Derive the canonical forms used throughout the rest of the checks:

- **`<component-name>`** — lower-kebab-case. Used for file names, directory names, route paths, URL slugs, and import specifiers.
- **`<ComponentName>`** — PascalCase. Used for the exported React component / namespace identifier.
- **`<Display Name>`** — Title Case with spaces. Used for the navigation label.

If the input does not match an existing component directory, stop and tell the user no such component was found.

## 1. Classify the component

Read `packages/mantle/src/components/<component-name>/<component-name>.tsx` (fall back to any `.tsx` in the directory if the filename differs).

- If the file contains a `const <ComponentName> = { ... } as const;` POJO namespace → **compound component**.
- Otherwise → **simple component**.

Also detect whether the component uses the `asChild` pattern (imports `Slot` from `../slot/index.js` and/or accepts an `asChild` prop on any exported piece). Record this — it affects the doc-page `## Polymorphism` check.

## 2. Check the component implementation

Verify `packages/mantle/src/components/<component-name>/<component-name>.tsx` (and any sibling `.tsx` files in the directory) against these rules. Record every violation.

### 2.1. Shared rules (all components)

- **Named exports** only (no `export default`).
- **Imports** use relative paths ending in `.js` (e.g. `../../utils/cx/cx.js`), not bare-specifier or missing-extension imports.
- **Prop types** use `type`, not `interface`. No `any`.
- **`className` composition** uses `cx` from `../../utils/cx/cx.js` — no string interpolation, `+`, or ternaries to build class names.
- **JSDoc on every exported component and exported type.** Each JSDoc block must include:
  - A brief description line.
  - A `@see https://mantle.ngrok.com/components/<component-name>` link.
  - At least one `@example` block showing realistic JSX usage.

### 2.2. Compound-component rules

For compound components only:

- Each sub-component `const Foo = forwardRef(...)` / `const Foo = (props) => ...` has a `displayName` set to the **original flat name** (e.g. `Root.displayName = "MyComponent"`, `Content.displayName = "MyComponentContent"`).
- The JSDoc **immediately above the top-level namespace declaration** (`const <ComponentName> = {`) contains two `@example` blocks, in this order:
  1. A `Composition` ASCII-tree block — `@example` on one line, `Composition:` on the next, then a plain (no-language) fenced code block containing the tree. Use real Unicode box-drawing chars (`├` U+251C, `─` U+2500, `└` U+2514, `│` U+2502) with 4-char per-level indentation.
  2. A full-tree JSX usage example showing all commonly-used parts.
- Every property inside the namespace object has **inline JSDoc** with its own full-tree `@example` (JSX, the same tree shape the top-level block shows). Variant entry points (e.g. tab-enabled variants of the same component) may use a distinct full-tree example for that variant.
- The JSDoc on the underlying `const Root = forwardRef(...)` / `const Title = ...` declarations mirrors the namespace-property JSDoc: full-tree `@example`, not an abbreviated snippet.
- Provider components and standalone utility functions (e.g. the Toast/Toaster pattern) live **alongside** the namespace object as their own named exports — they are not folded into the namespace.

### 2.3. `asChild` rules

Sub-components that render a semantic HTML element where consumers may need element-level flexibility should support `asChild`:

- Import `WithAsChild` from `../../types/as-child.js` and `Slot` from `../slot/index.js`.
- Props type extends `WithAsChild`: e.g. `HTMLAttributes<HTMLElement> & WithAsChild`.
- The rendered element is swapped via `const Comp = asChild ? Slot : "h3";` (or similar).

If the component exposes `asChild` on any part, the component's doc page must have a `## Polymorphism` section (see step 4.2).

## 3. Check the `index.ts` and package wiring

- `packages/mantle/src/components/<component-name>/index.ts` exists and re-exports everything from `./<component-name>.js` (note the `.js` extension).
- `packages/mantle/package.json` has an `"./<component-name>"` entry under `"exports"` with the canonical shape:
  ```json
  "./<component-name>": {
  	"@ngrok/src-live-types": "./src/components/<component-name>/index.ts",
  	"types": "./dist/<component-name>.d.ts",
  	"import": "./dist/<component-name>.js"
  }
  ```
- The entry is in alphabetical order among sibling exports.

## 4. Check the docs page

The docs page lives at `apps/www/app/docs/components/<component-name>.mdx`. Verify:

### 4.1. Frontmatter and scaffolding

- Has a frontmatter block with `title: <ComponentName>` and a non-empty `description`.
- Imports the component with `import { <ComponentName> } from "@ngrok/mantle/<component-name>";`.
- Imports `Example` from `~/components/example`.
- Has a top-level `# <ComponentName>` heading followed by the description.
- Has at least one `<Example>` block with a matching `tsx` code block beside it.

### 4.2. Required sections, in this order

1. **(Compound only)** `## Composition` — an ASCII-tree diagram inside a ` ```text showLineNumbers=false ` fence. Uses real Unicode chars (`├` `─` `└` `│`) with 4-char per-level indentation. The tree must match the one in the namespace JSDoc.
2. **(`asChild` only)** `## Polymorphism` — explains the `asChild` prop with an example. This section **must not** be titled `Composition` — that name is reserved for the structural tree above.
3. `## API Reference` — documents the component and (for compound) each sub-part, with props tables.

Optional sections (Examples, Variants, etc.) may appear before `## API Reference` but must not be named `Composition` unless they are the structural tree section.

### 4.3. Route and navigation

- `apps/www/app/routes.ts` contains `...docRoute("components/<component-name>"),` in alphabetical order among component docs.
- `apps/www/app/components/layout.tsx`:
  - The `<Display Name>` appears in the `prodReadyComponents` array (alphabetical order).
  - `prodReadyComponentRouteLookup` has `"<Display Name>": "/components/<component-name>",` (alphabetical order).

## 5. Report and fix

Produce a report listing each violation, grouped by area (implementation, JSDoc, docs page, wiring). For every violation, decide whether it is **auto-fixable** or **needs author judgment**:

### Auto-fixable (apply directly)

- Missing or incorrect `@see` URL in JSDoc → add/correct it.
- Missing `Composition` `@example` tree on the namespace JSDoc → derive the tree from the namespace property names and the existing JSX `@example`, insert as the first `@example`.
- Missing `## Composition` section on the docs page → derive tree from the namespace and insert before `## API Reference`.
- Section titled `Composition` but describing `asChild` polymorphism → rename to `## Polymorphism`.
- Section titled `Composition` but describing unrelated variations → rename to a content-accurate title (ask the user for the new name if unclear).
- Missing `displayName` on a sub-component → add it using the flat-name pattern.
- Missing route in `apps/www/app/routes.ts` → insert in alphabetical order.
- Missing nav entry in `layout.tsx` → insert in both `prodReadyComponents` and `prodReadyComponentRouteLookup` in alphabetical order.
- Missing `package.json` `exports` entry → insert in alphabetical order.
- JSDoc `@example` on a namespace property or underlying const that uses an abbreviated snippet → replace with the full-tree example already present elsewhere for the same component.

### Needs author judgment (ask before changing)

- Missing JSDoc description or `@example` on an exported component (the description content is non-obvious).
- Refactoring a non-compound exported object into the POJO namespace pattern.
- Adding `asChild` support to a sub-component that doesn't currently have it.
- Any change that alters the component's public API shape.

For the auto-fixable items, apply fixes; for the judgment items, surface them clearly and wait for the user.

## 6. Verify

After applying fixes, run:

1. `pnpm -w run lint` — 0 errors.
2. `pnpm -w run fmt:check` — 0 errors (run `pnpm -w run fmt` to auto-fix).
3. `pnpm -w run typecheck` — 0 errors.
4. `pnpm -w run test -F @ngrok/mantle` — all tests pass.

## 7. Create a changeset (only if you changed source files)

If the audit modified files under `packages/mantle/`, add a changeset:

- `patch` bump for `@ngrok/mantle` when the changes are doc/JSDoc/`displayName`/comment-only.
- `minor` bump if you added a new export or behavior (rare for audits — usually indicates the audit uncovered a missing sub-part that needs author judgment).
- No changeset needed if the audit only modified `apps/www/app/docs/**`, `apps/www/app/components/layout.tsx`, or `apps/www/app/routes.ts` and no published package's source changed. When in doubt, prefer a patch changeset.

## Reference

- `.claude/commands/scaffold-component.md` — Rules for creating new components (this skill validates the same rules on existing components).
- `decisions/2025-07-16-compound-component-named-exports.md` — Full rationale behind the POJO namespace pattern.
- `CONVENTIONS.md` — Code style and TypeScript conventions the audit relies on.
- Canonical well-documented components: `alert`, `card`, `dialog`, `empty`, `code-block`. Use them as the reference shape when auto-generating missing JSDoc or docs-page content.
