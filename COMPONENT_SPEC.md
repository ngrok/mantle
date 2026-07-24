# Component Spec

The normative spec for authoring a component in `@ngrok/mantle`. It answers four questions: **what a
component must ship**, **what its code must look like**, **what its docs must contain**, and **what is
never acceptable**. Every rule here is enforceable — a component that violates one is not done.

**Scope and precedence.**

- **This file** governs component _artifacts and shape_: the files a component ships, its API surface, its
  JSDoc, its docs page, its tests, its wiring.
- [CONVENTIONS.md](./CONVENTIONS.md) governs _code style_ for the whole monorepo (TypeScript, formatting,
  imports, error handling, testing tooling). This spec never restates a style rule; it links to it.
- The [Philosophy page](./apps/www/app/docs/philosophy.mdx) explains the _why_. It is context, not a
  rulebook.
- Where this spec and CONVENTIONS.md appear to conflict on a component question, **this spec governs** —
  then fix the conflict in a follow-up so there is one answer.
- `/scaffold-component`, `/audit-component`, and `/promote-preview-component` are _workflows that implement
  this spec_. If a workflow disagrees with this file, this file wins and the workflow is the bug.

**Definition of "component"** — anything exported from a `packages/mantle/src/components/<name>/` directory
with a `package.json` export. A module-internal primitive imported only by relative path (`dialog/primitive`,
`list/primitive`) is **not** a component: it ships no docs page, no nav entry, and no export map entry. See
[§1.2](#12-ship-the-smallest-public-surface).

---

## 1. Before you scaffold

Answer these _before_ writing code. Every one of them is expensive to change after release.

### 1.1. One component per user intent

Name the intent in a sentence: "click an item to act or navigate" vs "check items to select". If an existing
component already answers that intent, extend it — a variant is a prop or a sibling part, never a new public
component. If the proposed docs page would mostly redirect readers to siblings, the component should not be
public.

### 1.2. Ship the smallest public surface

Publishing later is additive and non-breaking; un-shipping after release is breaking. Default to
module-internal and promote on demand:

| Kind                                        | `package.json` export | Docs page | Nav entry |
| ------------------------------------------- | --------------------- | --------- | --------- |
| Public component                            | required              | required  | required  |
| Internal primitive backing other components | forbidden             | forbidden | forbidden |
| Preview component (unstable API)            | required              | required  | preview   |

### 1.3. Name parts for the DOM and ARIA they emit

- The outermost part is **always** `Root` — even when the compound has no separate state owner and `Root`
  _is_ the whole component. Consumers must never learn which part is outermost per component.
- Parts take the web-standards term for what they render: a `List` has `Item`s (`<li>`, `role="listitem"`),
  a `Table` has `Row`s (`<tr>`, `role="row"`).
- Props read as the ARIA/DOM they set: `current` → `aria-current`, not `isActive`. Props must not collide
  semantically with sibling props.
- Renames must go all the way through — props, types, `data-slot` values, tests, docs, internals. A
  half-renamed API is worse than either name.

### 1.4. ARIA pattern words are earned, not borrowed

`Menu`/`MenuItem`, `Listbox`/`Option`, `Tab`/`TabPanel`, `Tree`/`TreeItem`, `Grid`/`Row`/`Cell`, `Dialog`,
`Toolbar`, and `Combobox` are reserved. Before using one — alone (`.Menu`), as a qualifier (`.MenuItem`), or
inside a composite (`.SidebarMenuButton`) — both must be true:

1. The rendered element carries that role, natively (`<tr>`, `<dialog>`), explicitly, or via a wrapped
   third-party primitive that emits it (Radix, Ariakit).
2. It implements the pattern's keyboard contract — roving focus / single tab stop, arrow keys, typeahead,
   `Escape` to dismiss, as the APG pattern requires.

If either is false, **rename the part**. A `<ul>` of navigation links is a `List` of `Item`s, even when the
library whose mechanics you ported calls that markup a menu. **Never resolve the mismatch by adding the
role** — that destroys the natural tab order and promises behavior that is not there. The inverse also
holds: when the pattern is genuinely implemented, its vocabulary _is_ the right name; do not invent a
euphemism to dodge the reserved word.

### 1.5. Composition vs data-driven

Compose children when every behavior derives from the authored children (`Table`, `List`). Take a data prop
when collection-level behavior — filtering, select-all, virtualization — must operate over items that may
not be mounted (`DataTable`, `SelectableList`); keep rendering composable via a render prop. **Never** read
collection facts off children via prop-sniffing or `cloneElement` injection.

### 1.6. Forbidden API shapes

| Never                                                              | Instead                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Nested namespace (`Command.Dialog.Root`)                           | Flatten into member names (`Command.DialogRoot`)              |
| Prop-bag passthrough (`contentProps`, `triggerProps`, `slotProps`) | Expose the internal element as a compound part                |
| Re-exporting another mantle namespace under yours                  | Let consumers import that primitive directly                  |
| `forwardRef`                                                       | `ref` is a regular prop (React 19+)                           |
| `React.FC` / `FC`                                                  | Inline function types                                         |
| Boolean-bag prop types where states are mutually exclusive         | Discriminated unions that make invalid states unrepresentable |
| A deprecated API from a dependency                                 | The current replacement (or a `// Why:` comment if forced)    |

### 1.7. Write a decision doc when the answer was contested

If the API shape was argued over, or a reviewer will ask "why not the obvious thing?", add
`decisions/<YYYY-MM-DD>-<slug>.md` and link it from the JSDoc or docs page. Existing examples:
`decisions/2025-07-16-compound-component-named-exports.md`,
`decisions/2026-07-04-list-family-api-design.md`, `decisions/2026-07-15-theme-switcher-compound-api.md`.

---

## 2. What a component must ship

All nine, or the component is incomplete:

| #   | Artifact           | Path                                                                        |
| --- | ------------------ | --------------------------------------------------------------------------- |
| 1   | Implementation     | `packages/mantle/src/components/<component-name>/<component-name>.tsx`      |
| 2   | Re-exports         | `packages/mantle/src/components/<component-name>/index.ts`                  |
| 3   | Tests              | `packages/mantle/src/components/<component-name>/<component-name>.test.tsx` |
| 4   | Export map entry   | `packages/mantle/package.json` → `"exports"` → `"./<component-name>"`       |
| 5   | Docs page          | `apps/www/app/docs/components/<category>/<component-name>.mdx`              |
| 6   | Docs examples      | Inline in the `.mdx`, or `apps/www/app/features/<component-name>-demos.tsx` |
| 7   | Route registration | `apps/www/app/routes.ts`                                                    |
| 8   | Nav registration   | `apps/www/app/components/navigation-data.ts`                                |
| 9   | Changeset          | `.changeset/<slug>.md`                                                      |

Naming is mechanical, from one input:

| Form               | Casing     | Used for                                                   |
| ------------------ | ---------- | ---------------------------------------------------------- |
| `<component-name>` | kebab-case | Directories, files, export keys, route slugs, import paths |
| `<ComponentName>`  | PascalCase | The exported component / namespace identifier, types       |
| `<Display Name>`   | Title Case | Docs `title:` frontmatter, nav label, route lookups        |

### 2.1. Export map entry

Alphabetical among siblings, exactly this shape (tsdown auto-discovers component directories — no build
config to touch):

```json
"./<component-name>": {
	"@ngrok/src-live-types": "./src/components/<component-name>/index.ts",
	"types": "./dist/<component-name>.d.ts",
	"import": "./dist/<component-name>.js"
}
```

### 2.2. Nav and route registration

Categories are `Actions`, `Charts`, `Data Display`, `Feedback`, `Forms`, `Navigation`, `Overlays`,
`Primitives`, `Structure` — pick what the component _is_ in the UI; page/viewport structure primitives
graduate to the top-level Layouts section instead. Membership tests live in
`decisions/2026-07-08-docs-information-architecture.md`. Use the category's slug from
`componentCategorySlugs` as the `<category>` URL segment.

- `apps/www/app/routes.ts`: `...docRoute("components/<category>/<component-name>"),` in alphabetical order.
- `navigation-data.ts`: add `<Display Name>` to its category array in `componentsByCategory` and the route
  to `prodReadyComponentRouteLookup` (both alphabetical). `prodReadyComponents` is derived — never edit it.
- Preview components instead go in `previewComponents`, `previewComponentsRouteLookup`, and
  `previewComponentCategoryLookup`, with docs at `docs/components/preview/<component-name>.mdx` and the
  route `components/preview/<component-name>`.

A component missing from `navigation-data.ts` is invisible to the sidebar, the command palette, the search
index, and the agent manifest — it effectively does not exist.

### 2.3. Changesets

| Change                                           | Bump                                                            |
| ------------------------------------------------ | --------------------------------------------------------------- |
| New component                                    | `minor`                                                         |
| New export, part, or prop on a shipped component | `minor`                                                         |
| Bug fix, behavior fix, JSDoc-only change         | `patch`                                                         |
| Breaking rename or removal                       | `major` (and a migration note in the changeset)                 |
| Preview → stable promotion                       | `minor`                                                         |
| Docs-site-only change (`apps/www/**`)            | none                                                            |
| Change to a component not yet released           | none — fold the description into that component's own changeset |

The changeset body is release-note prose for consumers: what the component is, what its parts do, what its
public tokens and data attributes are, and the docs URL. Write it for someone reading the changelog, not for
the reviewer of this PR.

---

## 3. Implementation rules

CONVENTIONS.md covers general style ([TypeScript](./CONVENTIONS.md#typescript),
[className](./CONVENTIONS.md#classname-composition),
[readability](./CONVENTIONS.md#readability--maintainability)). Component-specific requirements:

### 3.1. Required

- `"use client";` on the first line when the file uses hooks, DOM event handlers, browser APIs, or context.
  When in doubt, add it.
- Named exports only; relative imports ending in `.js` (`../../utils/cx/cx.js`).
- `type`, not `interface`. Props based on `ComponentProps<…>` — which already includes `ref`.
- `className` composed with `cx`; no interpolation, `+`, or ternaries inside `className`.
- A **`data-slot`** attribute on every rendered root element: `<component-name>` for a simple component or a
  compound `Root`, `<component-name>-<part>` for every other part. When wrapping another mantle part that
  already stamps one, join instead of clobbering (`joinDataSlot` from `../../utils/data-slot.js`).
- **`asChild`** on every part that renders a DOM element, via `WithAsChild` (`../../types/as-child.js`) and
  `Slot` (`../slot/index.js`): `const Comp = asChild ? Slot : "div";`.
- Every invariant violation fails loudly (`invariant`, an early `throw`) rather than rendering broken state.
  `console.error` is not error handling.

### 3.2. Legitimate `asChild` exceptions

Document the reason in a short comment at the declaration so the next maintainer sees intent, not oversight:

- The part takes an element via a prop and clones it (`Empty.Icon`'s `svg` prop) — polymorphism already
  goes through the prop.
- The part renders no DOM (`BrowserOnly`, `Slot`, `SandboxedOnClick`).
- The part is a prop-driven leaf with no children to slot-swap (an avatar or badge computed entirely from
  props).
- It wraps a third-party primitive that already exposes `asChild` / `render` — forward to that instead.

### 3.3. Compound namespace

```tsx
// Exactly one level of properties. Every member is a directly-defined component.
const MyComponent = {
	Root,
	Header,
	Title,
	Body,
} as const;
```

- One level deep, always. No nested namespaces, no re-exported foreign namespaces.
- If any member's type comes from a third-party namespace, **annotate the namespace object explicitly**
  (`const MyComponent: { Root: typeof Root; … } = { … }`) so `.d.ts` emit does not synthesize a
  non-portable type — otherwise an `@types/react` bump surfaces `TS2883` at build time.
- Providers and standalone utilities stay as their own named exports beside the namespace, never folded in.

---

## 4. JSDoc

JSDoc is the API surface for IntelliSense, `llms.txt`, and every agent that reads this library. It is not
optional and it is not a summary of the implementation.

### 4.1. Every exported symbol

Components, hooks, functions, and prop types each need:

1. A description of the **contract** — what it is for, what it guarantees — not implementation commentary.
2. `@see https://mantle.ngrok.com/components/<category>/<component-name>`.
3. At least one `@example` with realistic props and the key expected behavior.
4. A `**CSS variables (public API):**` block when the symbol reads or sets a public variable ([§5](#5-css-variables-are-api)).
5. A note on any documented `data-*` styling hook it stamps ([§6](#6-data-attributes-are-api)).

Every prop in a props type gets its own doc comment, including its `@default` where one exists.

### 4.2. Compound components: the full-tree rule

- The JSDoc on the **namespace declaration** carries two `@example` blocks, in order: a `Composition:`
  ASCII tree in a plain fence, then a full-tree JSX usage example.
- **Every namespace property _and_ every underlying part declaration repeats the full-tree JSX example** —
  all commonly-used parts, not an abbreviated snippet. This is deliberate duplication: each of these is an
  entry point a reader or agent may hover first, and each must show the whole shape. Never "de-duplicate"
  these examples. A variant part may use a distinct full tree that demonstrates that variant.
- The tree uses real box-drawing characters (`├` U+251C, `─` U+2500, `└` U+2514, `│` U+2502) with 4-char
  per-level indentation, and must match the docs page's `## Composition` tree exactly.

````tsx
/**
 * A brief description of the component.
 *
 * @see https://mantle.ngrok.com/components/<category>/my-component
 *
 * @example
 * Composition:
 * ```
 * MyComponent.Root
 * ├── MyComponent.Header
 * │   └── MyComponent.Title
 * └── MyComponent.Body
 * ```
 *
 * @example
 * ```tsx
 * <MyComponent.Root>
 *   <MyComponent.Header>
 *     <MyComponent.Title>Title</MyComponent.Title>
 *   </MyComponent.Header>
 *   <MyComponent.Body>Body content</MyComponent.Body>
 * </MyComponent.Root>
 * ```
 */
````

Update every copy of the tree when a part is added, removed, or renamed.

---

## 5. CSS variables are API

A CSS variable a consumer or a sibling component is meant to set is **public API** and carries the same
documentation burden as a prop.

- **Name** public variables `--{component}-{property}` (`--icon-button-border-radius`).
- **Always read with an explicit fallback**: `var(--icon-button-border-radius, 0.375rem)`. The fallback _is_
  the documented default.
- **Document every one in both places** — a missing entry in either is a violation:
  1. The owning part's JSDoc, in a `**CSS variables (public API):**` block: name, default, purpose, and
     where to set it.
  2. The docs page's API reference, as a `CSS Variable | Default | Description` table beside that part's
     props table.
- **Document it under the part that reads it.** When one component owns a variable and a sibling reads it
  (`ButtonGroup`'s panel appearance tightening `IconButton`'s radius), both document it, and the reader's
  entry says "read, not owned".
- **Private variables** a component only uses internally are not API: prefix them `--_` (`--_scroll-fade-left`)
  and leave them out of the API reference.
- **Direction constraint:** custom properties inherit parent → child only, so a variable can never carry a
  value from a composed child up to its parent's paint. When a child must influence a parent, use an
  enumerated prop that renders a data attribute and gate the parent's styles with `has-data-[…]`. Say so in
  the docs when the natural instinct would be to set the variable on the wrong element.

---

## 6. Data attributes are API

- `data-slot` is a stable styling hook on every part ([§3.1](#31-required)) — it survives `className`
  overrides and `asChild` swaps, so consumers and sibling components may target it.
- Any other `data-*` a component stamps for styling or coordination (`data-state`, `data-orientation`, a
  per-item id) must be documented in the part's JSDoc and its API-reference section — including the
  attributes a wrapped third-party primitive emits, since consumers style against those too.
- Prefer **presence semantics** for boolean states: stamp `data-selected=""` when true and omit the
  attribute when false — never `data-selected="false"`, which a `data-selected:` variant would still match.

---

## 7. The docs page

One page per component, at `apps/www/app/docs/components/<category>/<component-name>.mdx`. The page is the
component's public contract for humans and LLMs alike.

### 7.1. Required structure, in order

1. **Frontmatter** — `title: <Display Name>` and a one-line `description`.
2. **Imports** — `PageHeader`, `Example` and/or `CodeExample`, plus any demos imported from
   `~/features/<component-name>-demos`.
3. **`<PageHeader id="<component-name>">`** followed by prose that states what the component is for and
   which decisions it encodes.
4. **A primary live example** with its code block.
5. **`## Composition`** — compound components only: the ASCII tree in a
   ` ```text showLineNumbers=false ` fence, identical to the namespace JSDoc's tree.
6. **`## Polymorphism`** — required when any part accepts `asChild`. Never title this section
   "Composition"; that name is reserved for the structural tree.
7. **Optional sections** — variants, sizing, accessibility notes, recipes.
8. **`## API Reference`** — one `### <ComponentName>.<Part>` subsection per exported part, each with its
   props table and, where applicable, its CSS-variable and data-attribute tables.

### 7.2. Examples must be live and complete

Both, for **every** example on the page — primary and secondary:

- **Live.** Each `tsx`/`jsx` usage block is immediately preceded by an `<Example>` (or
  `CodeExample.PreviewFrame` for shell-scale demos that own a whole document) that renders that exact usage.
  Define the demo as an `export function <Name>Example()` in the page's module scope — the default — and
  move it to `apps/www/app/features/<component-name>-demos.tsx` when it is large, shared across pages, or
  worth unit-testing. Never ship a usage block with no live example above it.
- **Complete and self-contained.** Full component or render — never a fragment, never a "only this line
  changes" diff, never a reference to an identifier that appears nowhere on the page. Data, handlers, and
  state are defined inline or in the page's module scope.

Keep the live example and its code block in sync. Icons in examples come from `@phosphor-icons/react`.

### 7.3. Prose rules

- Explain the _why_ behind non-obvious API, especially anything a reader would otherwise "fix" — a fake
  router in a demo, a deliberate absence of a part, an intentional ARIA choice.
- Link to sibling components and layouts by their docs URL rather than repeating their rules.
- Do not document internals a consumer cannot reach.

---

## 8. Tests

Colocated with the source. See [CONVENTIONS.md → Testing](./CONVENTIONS.md#testing) for runner details and
the browser-mode list; component-specific minimums:

- Renders with the documented minimal usage.
- `className`, `ref`, and arbitrary `data-*` reach the rendered root; `data-slot` is present (and joined,
  where a part wraps another).
- For every `asChild` part: the swap renders the child and merges classes, data attributes, and the ref.
- ARIA and keyboard contract the API promises — roles, `aria-current`/`aria-expanded`/`aria-controls` wiring,
  focus movement, keyboard shortcuts.
- Business logic and its edge cases: state machines, parsing/formatting, validation, conditional rendering.
- Every bug fix adds a regression test that fails before the fix.

Never: rendered-HTML snapshots (`toMatchInlineSnapshot` is fine for serialized data shapes), `*.test.*`
files under `apps/www/app/routes/`, or a browser-mode test for something happy-dom can already do.

---

## 9. Verification

From the workspace root, once a coherent chunk of work is done and again before reporting completion:

1. `pnpm -w run lint` — 0 errors
2. `pnpm -w run fmt:check` — clean (`pnpm -w run fmt` to fix)
3. `pnpm -w run typecheck` — 0 errors
4. `pnpm -w run test -F @ngrok/mantle` — all pass
5. `pnpm -w run build -F @ngrok/mantle` — succeeds (catches `.d.ts` emit failures like `TS2883`)

---

## 10. Review checklist

Run this list against the diff before calling a component done. Each line is a defect if it fails.

**Surface**

- [ ] The component answers one user intent no existing component already answers.
- [ ] Nothing is public that could have stayed module-internal.
- [ ] Outermost part is `Root`; every part name is the web-standards term for what it renders.
- [ ] No unearned ARIA pattern word anywhere in the component or part names.
- [ ] Props read as the ARIA/DOM they emit; no prop-bag passthrough props.
- [ ] Namespace is one level deep, annotated if any member's type is third-party.
- [ ] No `forwardRef`, no `React.FC`.

**Code**

- [ ] `"use client"` where required; named exports; `.js`-suffixed relative imports.
- [ ] `data-slot` on every part (joined where wrapping); `asChild` on every DOM-rendering part, or a
      commented exception.
- [ ] `className` composed with `cx`; no `any`, type assertions, or non-null assertions; `== null` for
      nullish checks.

**Docs**

- [ ] JSDoc on every export: contract description, `@see`, `@example`; per-prop docs with defaults.
- [ ] Compound: composition tree first, then full-tree JSX — repeated on every namespace member and part.
- [ ] Every public CSS variable documented in **both** the JSDoc and the docs-page API reference, with its
      default and where to set it. Private variables use `--_` and stay undocumented.
- [ ] Every documented `data-*` hook appears in the JSDoc and the API reference.
- [ ] Docs page has the required sections in order; every example is live and self-contained.
- [ ] Trees in the JSDoc and the docs page match.

**Wiring**

- [ ] `index.ts`, `package.json` export (alphabetical), route, and nav entries all present and consistent.
- [ ] Changeset with the right bump and consumer-facing prose.

**Proof**

- [ ] Tests cover render, forwarding, `asChild`, ARIA/keyboard, and business-logic edge cases.
- [ ] All five verification commands pass.

---

## Reference

- [CONVENTIONS.md](./CONVENTIONS.md) — code style, TypeScript, testing tooling, package management.
- [AGENTS.md](./AGENTS.md) — the agent contract that requires this spec.
- [Philosophy](./apps/www/app/docs/philosophy.mdx) — the rationale these rules distill.
- `decisions/` — the argued-over decisions, including
  `2025-07-16-compound-component-named-exports.md` (POJO namespaces),
  `2026-07-04-list-family-api-design.md` (naming and composition),
  `2026-07-08-docs-information-architecture.md` (categories),
  `2026-07-15-theme-switcher-compound-api.md` (parts over prop bags).
- Workflows implementing this spec: `.claude/commands/scaffold-component.md`,
  `.claude/commands/audit-component.md`, `.claude/commands/promote-preview-component.md`.
- Canonical components to copy shape from: `alert`, `card`, `dialog`, `empty`, `code-block`.
