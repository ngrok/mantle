# Component Spec

The single normative standard for authoring a component in `@ngrok/mantle`. It answers five questions:
**why the library is shaped the way it is**, **what a component must ship**, **what its code must look like**,
**what its docs must contain**, and **how to audit an existing component against all of it**.

This file is self-contained on purpose. Everything a component author or auditor needs — the principles from
the [Philosophy page](./apps/www/app/docs/philosophy.mdx), the component rules that used to live only in
[CONVENTIONS.md](./CONVENTIONS.md), and the full validation procedure the `/scaffold-component` and
`/audit-component` workflows run — is stated here so there is one place to read and one place to change.

## Scope and status

**This is the bar for new components, and for the parts of a component you are changing.** Much of the
library predates parts of this spec: 20 of the 67 component directories ship no test file, 20 stamp no
`asChild`, 4 stamp no `data-slot`, exactly one docs page carries a data-attribute table, and most docs pages
predate §7.2's structure. That is expected and it is not a crisis.

The migration rule is deliberate and narrow:

- **New component** → meets every rule here before it merges.
- **Changing an existing component** → the parts you touch meet every rule here; bring the rest of the file up
  when it is cheap and obviously right.
- **Everything else** → left alone until someone opts into the work. An audit **reports** the gap; it does not
  open a library-wide migration inside an unrelated PR, and it never rewrites a shipped API to satisfy a rule
  without the author's decision.

The spec is expected to change. When a rule turns out to be wrong, or the library adopts a better pattern,
edit this file in the same PR that proves it and note the change in the PR description. A rule nobody follows
is a bug in the rule.

## Precedence

- **This file governs component questions** — artifacts, API shape, JSDoc, CSS variables, data attributes,
  docs page, tests, wiring.
- [CONVENTIONS.md](./CONVENTIONS.md) governs general code style for the whole monorepo (formatting, imports,
  package management, TypeScript rules that are not component-specific). Where a component requirement depends
  on a style rule, this file restates it so the checklist is complete; CONVENTIONS.md remains authoritative for
  the rule itself.
- [AGENTS.md](./AGENTS.md) governs how you work (verification cadence, diff auditing).
- The [Philosophy page](./apps/www/app/docs/philosophy.mdx) explains the _why_ at length. §0 below is its
  actionable distillation.
- `/scaffold-component`, `/audit-component`, and `/promote-preview-component` are _workflows that implement
  this spec_. If a workflow disagrees with this file, this file wins — report the mismatch rather than editing
  the workflow mid-task.

**Definition of "component"** — anything documented on its own docs page and reachable from a
`packages/mantle/package.json` export. A module-internal primitive imported only by relative path
(`dialog/primitive.tsx`, `list/primitive.tsx`) or an internal engine directory with no export (`chart/`) is
**not** a component: no docs page, no nav entry, no export map entry. See [§1.2](#12-ship-the-smallest-public-surface).
Hooks (`./hooks`), utilities (`./utils`, `./cx`, `./color`, …), and types (`./types`) are outside this spec —
they follow CONVENTIONS.md and their own docs routes.

---

## 0. Principles

These decide the questions the rest of the spec only mechanizes. Each is a rule with a consequence, not a
slogan.

1. **Semantic HTML, then everything else.** The right element is the starting point — `Button` renders a
   `<button>`, `Checkbox` a real `<input type="checkbox">`, `Kbd` a real `<kbd>`. Enhancement is layered on
   top and every enhancement names its fallback (`Accordion`'s `hidden="until-found"` and `interpolate-size`
   both degrade cleanly). If a component needs JavaScript to do what an element already does, start over.
2. **The right foundation per problem.** Mantle is not "built on Radix." Hand-roll where the platform is
   enough (`Accordion`, `Field`); wrap the best engine where the behavior is genuinely hard (Radix for
   `Dialog`, Ariakit for `Combobox`, Headless UI for `RadioGroup`, cmdk for `Command`, TanStack Table for
   `DataTable`, sonner for `Toast`). A consumer must not be able to tell which is which: every foundation is
   normalized behind the same house API — flat namespace, `asChild`, `data-slot`, consumer `className` merged
   last.
3. **One component per user intent.** Name the intent in a sentence. A variant is a prop or a sibling part,
   never a second public component ([§1.1](#11-one-component-per-user-intent)).
4. **Composition over configuration.** Configuration props handle the common case; `asChild` and children
   handle everything else. Never a prop bag ([§1.7](#17-forbidden-api-shapes)). Take a data prop only when
   behavior must reach items that are not mounted ([§1.5](#15-composition-vs-data-driven)).
5. **Make invalid states unrepresentable.** Push contracts into the type system — discriminated unions,
   `satisfies Record<…>` exhaustiveness, a rich `label` that requires `labelText`. What the compiler cannot
   catch fails loudly at runtime ([§3.5](#35-errors-and-invariants)).
6. **Pure cores, thin bindings.** Filtering, selection math, parsing, formatting and validation are exported
   or module-local pure functions, tested apart from rendering. Framework state and DOM stay at the edges.
7. **Accessibility is engineered, then given away.** The promise is not that semantic markup makes
   accessibility free — it is that mantle does the engineering so the consumer gets it free: `Field` threads
   ids through context, `IconButton` makes its screen-reader label required, virtualized rows announce
   `aria-posinset`/`aria-setsize`. Motion defaults are conservative ([§3.6](#36-accessibility-and-motion)).
8. **The first paint is part of the API.** Mantle assumes a server. If a component renders wrong for one
   frame, that is a bug ([§3.7](#37-ssr-and-first-paint)).
9. **Tailwind is the design language.** No theme object, no CSS-in-JS. One authored class must be correct in
   all four resolved themes ([§5.4](#54-design-tokens)). Consumer `className` always wins, via `cx`.
10. **Performance happens before the browser.** Prefer work that never reaches the client (`CodeBlock`
    highlights at build time). Prefer platform mechanisms over listeners (CSS scroll-driven animations over
    scroll handlers). Avoid unremovable module side effects ([§1.7](#17-forbidden-api-shapes)).
11. **Safe, ecosystem-normal defaults.** A default is the library exercising judgment for the consumer:
    `Button` defaults `type="button"`; `AlertDialog.Action` deliberately does not dismiss; wrapped handlers run
    the consumer's callback first and bail on `preventDefault()`.
12. **Docs are executable contracts.** JSDoc and docs examples feed the published types, `llms.txt`, and the
    component manifest that agents read. They are reproduced verbatim — one recorded migration copied a docs
    pattern into ~57 call sites before the docs were fixed. Maintain examples with the same care as API.
13. **Decisions get recorded.** A contested trade-off lands in `decisions/` with alternatives and honest
    negative consequences ([§1.8](#18-write-a-decision-doc-when-the-answer-was-contested)).

---

## 1. Before you scaffold

Answer all of these _before_ writing code. Every one is expensive to change after release.

### 1.1. One component per user intent

Name the intent in a sentence: "click an item to act or navigate" (`List`) vs "check items to select"
(`SelectableList`); "pick one of a few known options" (`Select`) vs "type to filter many" (`Combobox`) vs
"pick several" (`MultiSelect`). If an existing component already answers that intent, extend it — a variant is
a prop or a sibling part, never a new public component. State the sibling boundary in the JSDoc so it ships
with the component. If the proposed docs page would mostly redirect readers to siblings, the component should
not be public.

The same discipline applies to props: when `DataTable` needed empty states and pagination, the answer was
documented recipes built from existing parts, not new built-in API. Ask whether the gap is documentation
before adding surface.

### 1.2. Ship the smallest public surface

Publishing later is additive and non-breaking; un-shipping after release is breaking forever. Default to
module-internal and promote on demand.

| Kind                                        | `package.json` export | Docs page | Nav entry              |
| ------------------------------------------- | --------------------- | --------- | ---------------------- |
| Public component                            | required              | required  | `componentsByCategory` |
| Preview component (unstable API)            | required              | required  | `previewComponents`    |
| Internal primitive backing other components | forbidden             | forbidden | forbidden              |
| Layout (page/viewport structure)            | required              | required  | `layoutPages` (§2.4)   |

Two shapes of internal primitive, with different build consequences:

- **A file inside a component directory** (`dialog/primitive.tsx`, `list/primitive.tsx`) — imported by
  relative path, never re-exported from `index.ts`. Nothing else to do.
- **A whole directory** (`chart/`) — tsdown auto-discovers component directories, so it must also be added to
  `doNotPublish` in `packages/mantle/tsdown.config.ts` or the build publishes a subpath for it
  ([§2.3](#23-export-map-and-build-configuration)).

### 1.3. Name parts for the DOM and ARIA they emit

- The outermost part is **always** `Root` — even when the compound has no separate state owner and `Root` _is_
  the whole component. Consumers must never learn which part is outermost per component.
- Parts take the web platform's vocabulary for what they render: a `List` has `Item`s (`<li>`,
  `role="listitem"`), a `Table` has `Row`s (`<tr>`, `role="row"`), a `DescriptionList` has `Term`s and
  `Details` (`<dt>`, `<dd>`). Follow the standards vocabulary, not another library's convention.
- Props read as the ARIA/DOM they set: `current` → `aria-current`, not `isActive`. Props must not collide
  semantically with sibling props (`textValue` beside `value` was rejected in favor of `labelText`).
- Where WAI-ARIA offers competing patterns, the component makes the choice: `role="list"` for action and
  navigation items — interactive content and multiple tab stops per item are fine, since the
  no-interactive-content restriction belongs to `listbox`, not `list`. Reach for the APG grid only when rows
  carry selection state with real controls (`aria-selected` is invalid on `listitem`) or need a single tab stop
  over a large virtualized collection. Do not default to grid: screen readers announce grids as tables, and
  short lists of links belong in the page's tab order.
- Renames must go all the way through — props, types, `data-slot` values, tests, docs, internals. A
  half-renamed API is worse than either name.

### 1.4. ARIA pattern words are earned, not borrowed

`Menu`/`MenuItem`, `Listbox`/`Option`, `Tab`/`TabPanel`, `Tree`/`TreeItem`, `Grid`/`Row`/`Cell`, `Dialog`,
`Toolbar`, and `Combobox` are reserved. Split a candidate name into PascalCase segments and match **whole
segments, not substrings** — `MenuItem` and `SidebarMenuButton` both hit `Menu`, while `Table` does not hit
`Tab` and `Optional` does not hit `Option`.

A hit is a question, not yet a violation. Before using one — alone (`.Menu`), as a qualifier (`.MenuItem`), or
inside a composite (`.SidebarMenuButton`) — both must be true:

1. **The role is emitted** — natively (`<tr>`, `<dialog>`, `<table>`), explicitly, or by a wrapped third-party
   primitive that emits it (Radix `DropdownMenu`/`Tabs`/`Dialog`, Ariakit equivalents).
2. **The pattern's keyboard contract is implemented** — roving focus / single tab stop, arrow keys, typeahead,
   `Escape` to dismiss, as the APG pattern requires. A wrapped Radix/Ariakit primitive satisfies this; a
   hand-rolled `<ul>` with `role="menu"` and no key handling does not.

Outcomes:

- **Both hold** → the pattern's vocabulary _is_ the right name. `DropdownMenu.Item` really is a
  `role="menuitem"` inside a `role="menu"`. Do not invent a euphemism to dodge the reserved word.
- **Neither holds** → **rename the part.** A `<ul>` of navigation links is a `List` of `Item`s, even when the
  library whose mechanics you ported calls that markup a menu. A longer name is not an escape hatch:
  `SidebarMenuButton` promises a menu as loudly as `Menu` does.
- **Role emitted, keyboard contract missing** → a bug. Either implement the contract or drop both the role and
  the name. Report it; do not pick for the author.

A word may also name a pattern the part only _participates_ in: `Command.DialogTrigger` earns `Dialog` because
it is Radix's dialog trigger, opening a real `role="dialog"` with focus trap and `Escape` handling. Ask the two
questions of the pattern being referenced.

**Never resolve a mismatch by adding the role.** Adding `role="menu"` to make a name honest destroys the
list's natural tab order and promises roving focus and typeahead that are not there. Mechanics are worth
porting from the ecosystem; vocabulary is re-derived from what the component emits.

### 1.5. Composition vs data-driven

Compose children when every behavior derives from the authored children (`Table`, `List`). Take a data prop
when collection-level behavior — filtering, select-all, virtualization — must operate over items that may not
be mounted or even created (`DataTable`'s `data`, `SelectableList`'s `options`). Even then, keep _rendering_
composable via a render prop, and keep the data a thin description (a value, its text, a disabled flag).

**Never** read collection facts off children via prop-sniffing or `cloneElement` injection — pass data or
index-based callbacks. Element sniffing only sees the outermost composed child and fails silently the moment a
consumer wraps it.

### 1.6. Make invalid states unrepresentable

Prefer a union type over a runtime check. `Accordion`'s `type` discriminates `value`/`onValueChange` between
`string` and `string[]`. `SelectableList` requires `labelText: string` the moment `label` becomes a rich
`ReactNode`, so a filter that would silently stop matching is a compile error. `Badge`'s palette tables are
exhaustiveness-checked with `satisfies Record<Color, string>`, so a new color cannot ship half-styled.

Avoid optional-property-heavy "bag of props" types where states are mutually exclusive.

### 1.7. Forbidden API shapes

| Never                                                              | Instead                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Nested namespace (`Command.Dialog.Root`)                           | Flatten into member names (`Command.DialogRoot`)                       |
| Prop-bag passthrough (`contentProps`, `triggerProps`, `slotProps`) | Expose the internal element as a compound part                         |
| Re-exporting another mantle namespace under yours                  | Let consumers import that primitive directly                           |
| `Component.displayName = "…"`                                      | Nothing — React DevTools infers the name from the function             |
| `forwardRef`                                                       | `ref` is a regular prop (React 19+)                                    |
| `React.FC` / `FC`                                                  | Inline function types                                                  |
| Boolean-bag prop types where states are mutually exclusive         | Discriminated unions that make invalid states unrepresentable          |
| Reading collection facts off children (`cloneElement`, prop-sniff) | A data prop or index-based callbacks                                   |
| A deprecated API from a dependency                                 | The current replacement (or a `// Why:` comment naming the constraint) |

Two of these are non-obvious enough to justify:

- **`displayName`.** A top-level `Root.displayName = "Foo.Root"` is a module side effect bundlers (verified
  with Vite 8 / Rolldown) cannot eliminate, so unused components and their transitive dependencies stay pinned
  in consumer bundles — a dialog-only consumer bundle measured **11% smaller** without them (#1346). It is the
  reflexive habit when porting the Radix compounds [§3.4](#34-compound-namespace) tells you to write. Nothing
  reads it at runtime.
- **Prop bags.** A `*Props` object prop hides the element it configures, defeats autocomplete-driven
  discovery, and grows without bound. Needing to reach an internal element means the component is a compound
  and that element is a part — even when the part is a thin forwarding wrapper (see
  `decisions/2026-07-15-theme-switcher-compound-api.md`, where `contentProps` became `ThemeSwitcher.Content`).

### 1.8. Write a decision doc when the answer was contested

If the API shape was argued over, or a reviewer will ask "why not the obvious thing?", add
`decisions/<YYYY-MM-DD>-<slug>.md` with the alternatives considered and the honest negative consequences, and
link it from the JSDoc or docs page. Existing examples:
`decisions/2025-07-16-compound-component-named-exports.md` (POJO namespaces, and the tree-shaking cost it
accepts), `decisions/2026-07-04-list-family-api-design.md` (naming and composition),
`decisions/2026-07-08-docs-information-architecture.md` (docs categories),
`decisions/2026-07-15-theme-switcher-compound-api.md` (parts over prop bags).

---

## 2. What a component must ship

### 2.1. Artifacts

The nine every component ships:

| #   | Artifact           | Path                                                                                                     |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| 1   | Implementation     | `packages/mantle/src/components/<component-name>/<component-name>.tsx`                                   |
| 2   | Re-exports         | `packages/mantle/src/components/<component-name>/index.ts`                                               |
| 3   | Tests              | `<component-name>.test.tsx`, or `.browser.test.tsx` ([§8](#8-tests))                                     |
| 4   | Export map entry   | `packages/mantle/package.json` → `"exports"` → `"./<component-name>"`                                    |
| 5   | Docs page          | `apps/www/app/docs/components/<category>/<component-name>.mdx`                                           |
| 6   | Docs examples      | Page module scope, `~/features/<component-name>-demos.tsx`, or `apps/www/app/examples/<component-name>/` |
| 7   | Route registration | `apps/www/app/routes.ts`                                                                                 |
| 8   | Nav registration   | `apps/www/app/components/navigation-data.ts`                                                             |
| 9   | Changeset          | `.changeset/<slug>.md`                                                                                   |

Plus the ones that are conditional or generated. These are the ones most often missed, and two of them fail
_after_ all of [§9](#9-verification) passes:

| Artifact                                                                          | When                                                                                                      | If omitted                                                                                                                  |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `apps/www/app/utilities/__snapshots__/components-surface.json`                    | always — any new component, or any edit to a docs `description`, JSDoc summary, or `@example`             | CI's Vibe Check fails. Regenerate with `pnpm -F @app/www test -u` and commit it                                             |
| `packages/mantle-vite-plugins/src/mantle-component-name.ts`                       | every new component (auto-generated)                                                                      | the name is filtered out of the Tailwind `@source` block. Regenerated by that package's build/typecheck — commit the result |
| `INTERNAL_CHUNKS_BY_COMPONENT` in `packages/mantle-vite-plugins/src/internals.ts` | the component's classes live in a shared internal chunk, or it renders another component whose classes do | **consumers get a completely unstyled component with lint, typecheck, test and build all green**                            |
| `doNotPublish` in `packages/mantle/tsdown.config.ts`                              | adding an internal engine _directory_ (`chart/`)                                                          | tsdown publishes a subpath for a directory that must have none                                                              |
| `componentImportPathOverrides` in `navigation-data.ts`                            | the docs slug is not also the export key ([§2.2](#22-naming))                                             | the agent manifest advertises an import path that does not resolve                                                          |
| `previewExamples` in `apps/www/app/features/preview-registry.ts`                  | the docs page uses `CodeExample.PreviewFrame`                                                             | the `example` prop fails typecheck                                                                                          |

### 2.2. Naming

Naming is mechanical, from one input:

| Form               | Casing     | Used for                                                   |
| ------------------ | ---------- | ---------------------------------------------------------- |
| `<component-name>` | kebab-case | Directories, files, export keys, route slugs, import paths |
| `<ComponentName>`  | PascalCase | The exported component / namespace identifier, types       |
| `<Display Name>`   | Title Case | Docs `title:` frontmatter, nav label, route lookups        |

**Family directories are the exception.** A component may ship inside an existing directory when it shares
that family's build entry — `IconButton` and `ButtonGroup` in `button/`, `PasswordInput` in `input/`,
`ProgressBar` and `ProgressDonut` in `progress/`. Then artifacts 1–4 belong to the family: the export key
stays the family's (`./button`), the implementation is `components/<family>/<component-name>.tsx`, tests are
`components/<family>/<component-name>.test.tsx`, and the docs slug stays `<component-name>`. A directory that
exports several documented components may name its files after those parts (`progress/progress-bar.tsx`,
`progress/progress-donut.tsx`) as long as `index.ts` is the single entry point. **A family-directory component
must register in `componentImportPathOverrides`** ([§2.4](#24-nav-and-route-registration)).

### 2.3. Export map and build configuration

Alphabetical among siblings, exactly this shape:

```json
"./<component-name>": {
	"@ngrok/src-live-types": "./src/components/<component-name>/index.ts",
	"types": "./dist/<component-name>.d.ts",
	"import": "./dist/<component-name>.js"
}
```

tsdown auto-discovers component directories, so there is no entry list to edit — but two build-config files
are hand-maintained:

- **`packages/mantle/tsdown.config.ts` → `doNotPublish`.** An internal engine directory must be listed here
  (see `chart`) or tsdown builds and publishes a subpath for it.
- **`packages/mantle-vite-plugins/src/internals.ts` → `INTERNAL_CHUNKS_BY_COMPONENT`.** `mantleTwSourcePlugin`
  tells Tailwind which dist files to scan via per-component `@source "<name>-*.js"` globs. If the component's
  classes end up in a shared internal chunk, or it renders another component whose classes are hoisted into
  that component's chunk, map it here — the charts map to `["chart", "button"]`, `selectable-list` maps to
  `["list"]`. Miss it and consumers using the documented plugin get an unstyled component with every §9
  command green. That edit needs its own `@ngrok/mantle-vite-plugins` changeset.

### 2.4. Nav and route registration

A component missing from `navigation-data.ts` is invisible to the sidebar, the command palette, the search
index, `/api/components.json`, `llms.txt`, and the agent manifest — it effectively does not exist.

Categories are `Actions`, `Charts`, `Data Display`, `Feedback`, `Forms`, `Navigation`, `Overlays`,
`Primitives`, and `Structure` — pick what the component _is_ in the UI. Membership tests live in
`decisions/2026-07-08-docs-information-architecture.md`. Use the category's slug from `componentCategorySlugs`
as the `<category>` URL segment. Page/viewport structure primitives are Layouts, not Structure.

**Stable component:**

- `apps/www/app/routes.ts`: `...docRoute("components/<category>/<component-name>"),` in alphabetical order.
- `navigation-data.ts`: add `<Display Name>` to its category array in `componentsByCategory`, and the route to
  `prodReadyComponentRouteLookup` (both alphabetical). `prodReadyComponents` is derived — never edit it.
- If the docs slug leaf is not also the `@ngrok/mantle/*` import subpath (a family-directory component), add
  `"/components/<category>/<component-name>": "@ngrok/mantle/<export-key>"` to `componentImportPathOverrides`.
  Without it the manifest advertises a subpath absent from `package.json#exports`, and the JSDoc extractor
  looks in a directory that does not exist.

**Preview component:** `previewComponents`, `previewComponentsRouteLookup`, and
`previewComponentCategoryLookup`; docs at `docs/components/preview/<component-name>.mdx`; route
`components/preview/<component-name>`; and the page's header carries `isPreview` ([§7.2](#72-required-structure-in-order)).

**Layout:** docs at `apps/www/app/docs/layouts/<layout-name>.mdx`, route `...docRoute("layouts/<layout-name>")`,
and entries in `layoutPages`, `layoutRoutes`, and `layoutDescriptions`. Layouts are not in
`componentsByCategory`.

### 2.5. Changesets

| Change                                           | Bump                                                            |
| ------------------------------------------------ | --------------------------------------------------------------- |
| New component                                    | `minor`                                                         |
| New export, part, or prop on a shipped component | `minor`                                                         |
| Bug fix, behavior fix, JSDoc-only change         | `patch`                                                         |
| Breaking rename or removal                       | `major` (and a migration note in the changeset)                 |
| Preview → stable promotion                       | `minor`                                                         |
| Docs-site-only change (`apps/www/**`)            | none — `@app/*` is ignored in `.changeset/config.json`          |
| Change to a component not yet released           | none — fold the description into that component's own changeset |

An edit to `packages/mantle-vite-plugins` needs its own changeset for that package.

The changeset body is release-note prose for consumers: what the component is, what its parts do, what its
public CSS variables and data attributes are, and the docs URL. Write it for someone reading the changelog,
not for the reviewer of this PR.

---

## 3. Implementation rules

CONVENTIONS.md covers general style ([TypeScript](./CONVENTIONS.md#typescript),
[className](./CONVENTIONS.md#classname-composition),
[readability](./CONVENTIONS.md#readability--maintainability)). Component-specific requirements:

### 3.1. Required

- `"use client";` on the first line when the file uses hooks, DOM event handlers, browser APIs, or context.
  When in doubt, add it — the cost is negligible.
- Named exports only, no default exports. Relative imports ending in `.js` (`../../utils/cx/cx.js`).
- `type`, not `interface`. Props based on `ComponentProps<…>` — which already includes `ref`. Never
  `HTMLAttributes<…>` alone, which does not.
- No `any`, no type assertions (`as Type`) outside `as const` / type guards / true framework boundaries, no
  non-null assertions (`value!`). `== null` / `!= null` for nullish checks.
- `className` composed with `cx` from `../../utils/cx/cx.js`, with the consumer's `className` **last** so
  their classes win. No string interpolation, `+`, or ternaries inside `className`.
- Business logic — transformations, parsing, formatting, validation, state derivation — lives in small pure
  functions, testable without rendering.

### 3.2. `data-slot` on every part

Every rendered root element carries a `data-slot`: `<component-name>` for a simple component or a compound
`Root`, `<component-name>-<part>` for every other part. It is a stable styling hook that survives `className`
overrides and `asChild` swaps, so consumers and sibling components may target it.

When a part wraps another mantle part that already stamps one, **join instead of clobbering**:

```tsx
import { joinDataSlot } from "../../utils/data-slot.js";

data-slot={joinDataSlot(dataSlot, "theme-switcher-trigger")}
```

Accept the incoming chain via the `WithDataSlot` type from the same module. `joinDataSlot` orders values
ancestors-first so the rendered attribute reads in DOM order.

### 3.3. `asChild` on every part that renders DOM

Every component has an ideal default element, and consumers must be able to swap it. Use `WithAsChild` from
`../../types/as-child.js` and `Slot` from `../slot/index.js`:

```tsx
type FooProps = ComponentProps<"div"> & WithAsChild;

const Comp = asChild ? Slot : "div";
return <Comp data-slot="foo" className={cx("…", className)} {...props} />;
```

**A part with no children of its own still takes `asChild`** — type it `SelfClosingWithAsChild` (same module),
a union that requires `children` exactly when `asChild` is `true` and forbids it otherwise, so
`<Part asChild />` with nothing to clone is a compile error. See `skeleton.tsx`, `code-block.tsx`,
`chart/primitive.tsx`.

Legitimate exceptions — document the reason in a short comment at the declaration so the next maintainer sees
intent, not oversight:

- **The part takes an element via a prop and clones it** (`Empty.Icon`'s `svg` prop, cloned through
  `SvgOnly`) — polymorphism already goes through the prop.
- **The part wraps a third-party primitive that already exposes `asChild` / `render`** — forward to that
  escape hatch instead of re-implementing with `Slot`. When the props type is `ComponentProps<typeof Radix.X>`
  this is automatic and needs no comment.

A part that renders no DOM at all (`BrowserOnly`, `Slot`) was never in scope — that is not an exception.

### 3.4. Compound namespace

```tsx
// Exactly one level of properties. Every member is a directly-defined component.
const MyComponent = {
	Root,
	Header,
	Title,
	Body,
} as const;
```

- One level deep, always. No nested namespaces, no re-exported foreign namespaces
  ([§1.7](#17-forbidden-api-shapes)).
- Each member is a directly-defined component whose type has an explicit name — not an inferred literal whose
  shape depends on chasing types through external packages.
- If any member's type comes from a third-party namespace, **annotate the namespace object explicitly**
  (`const MyComponent: { Root: typeof Root; … } = { … }`) so `.d.ts` emit does not synthesize a non-portable
  type. Without it an `@types/react` bump surfaces `TS2883` at build time — which is why
  [§9](#9-verification) runs the build.
- Providers and standalone utilities stay as their own named exports beside the namespace, never folded in
  (the Toast/Toaster pattern).
- Leaf components (`Button`, `Icon`) stay standalone exports so they tree-shake cleanly.

### 3.5. Errors and invariants

Errors are control flow. `console.error` is not error handling.

- A compound part rendered outside its `Root` throws a descriptive `invariant` (`tiny-invariant`) naming the
  required ancestor — never renders an inert shell.
- `asChild` with the wrong children throws with the reason, as `Anchor` and `Badge` do.
- Prefer explicit failure over a silent fallback or a partial state update. Fail fast when an invariant is
  violated rather than letting invalid state propagate.

### 3.6. Accessibility and motion

- Own the keyboard and ARIA contract the component's name promises ([§1.4](#14-aria-pattern-words-are-earned-not-borrowed)),
  and wire ids through context rather than asking consumers to thread them (`Field`).
- An icon-only control makes its screen-reader label a **required** prop.
- A virtualized collection announces `aria-posinset` / `aria-setsize` so it still reads as the whole set.
- Any animation or transition honors reduced motion — `usePrefersReducedMotion` (which returns `true` on the
  server and first paint, so nothing animates before the real preference is known) or a `motion-reduce:`
  variant. The library publishes this promise on the Accessibility page; it is untested unless you test it
  ([§8](#8-tests)).
- Interactive state is styled through the custom Tailwind variants that match the DOM the headless layer
  actually emits (`data-state-*`, `aria-*`), not through JS-toggled classes.

### 3.7. SSR and first paint

- If the component renders wrong for one frame, that is a bug. Persist preferences where the server can read
  them (cookie, not just `localStorage`) when the first paint depends on them.
- Client-only work goes through `BrowserOnly` (children as a render function, so it cannot evaluate during
  SSR) or a browser-API hook that declares its server answer. `useIsHydrated` is the sanctioned escape hatch.
- Never branch on `typeof window` inside render.

---

## 4. JSDoc

JSDoc is the API surface for IntelliSense, `llms.txt`, `/api/components.json`, and every agent that reads this
library. It is not optional and it is not a summary of the implementation. It is also snapshot-guarded: the
summary and every `@example` feed `components-surface.json` ([§2.1](#21-artifacts)).

### 4.1. Every exported symbol

Components, hooks, functions, and prop types each need:

1. A description of the **contract** — what it is for, what it guarantees, and which sibling component answers
   the adjacent intent ([§1.1](#11-one-component-per-user-intent)) — not implementation commentary.
2. A `@see` link:
   - Component or compound namespace: `https://mantle.ngrok.com/components/<category>/<component-name>`.
   - A compound part: append that part's API-reference anchor —
     `…/components/feedback/alert#alertroot` for `### Alert.Root`, as `alert.tsx` does.
   - Layout: `https://mantle.ngrok.com/layouts/<layout-name>`.
3. At least one `@example` with realistic props and the key expected behavior.
4. A CSS-variable table when the symbol reads or sets a public variable ([§5](#5-css-variables-are-api)).
5. A data-attribute table for any documented `data-*` it stamps ([§6](#6-data-attributes-are-api)).

Every prop in a props type gets its own doc comment, including its `@default` where one exists, and a note
when the prop is required-with-no-default on purpose.

### 4.2. Compound components: the full-tree rule

- The JSDoc on the **namespace declaration** carries two `@example` blocks, in order: a `Composition:` ASCII
  tree in a plain fence, then a full-tree JSX usage example.
- **Every namespace property _and_ every underlying part declaration repeats the full-tree JSX example** — all
  commonly-used parts, not an abbreviated snippet. This is deliberate duplication: each is an entry point a
  reader or agent may hover first, and each must show the whole shape. Never "de-duplicate" these examples. A
  variant part may use a distinct full tree that demonstrates that variant.
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

### 5.1. Naming and reading

- Name public variables `--{component}-{property}` (`--icon-button-border-radius`).
- **Always read with an explicit fallback**: `var(--icon-button-border-radius, 0.375rem)`.
- **Private** variables a component only uses internally are not API: prefix them `--_`
  (`--_scroll-fade-left`) and leave them out of the API reference.

### 5.2. Documenting

Every public variable appears in **both** places — a missing entry in either is a violation:

1. The owning part's JSDoc, as a markdown table (see `alert.tsx`).
2. The docs page's API reference, beside that part's props table.

Both use these columns:

| CSS Variable                  | Default    | Description                                                                    |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------ |
| `--icon-button-border-radius` | `0.375rem` | The border radius. `ButtonGroup`'s panel appearance tightens it to `0.125rem`. |

The **documented default is the value a consumer actually observes**: the fallback when nothing sets the
variable, or the value the owning part sets on itself. `Alert.Root` sets `--alert-control-*` from its `intent`,
so the documented defaults are `var(--color-<intent>-700)` and friends — the `currentColor` fallbacks in the
class strings are only render-safety.

### 5.3. Ownership and direction

- **Document it under the part that reads it.** When one component owns a variable and a sibling reads it
  (`ButtonGroup`'s panel appearance tightening `IconButton`'s radius), both document it, and the reader's entry
  says "read, not owned".
- **Direction constraint:** custom properties inherit parent → child only, so a variable can never carry a
  value from a composed child up to its parent's paint. When a child must influence a parent, use an enumerated
  prop that renders a data attribute and gate the parent's styles with `has-data-[…]`. Say so in the docs when
  the natural instinct would be to set the variable on the wrong element.

### 5.4. Design tokens

A token the component _paints_ with (not a consumer-settable knob) is not a CSS-variable API entry — it is a
design token, and it needs a value in **all four** theme entry points or it resolves to nothing outside light
mode: `packages/mantle/src/mantle.css`, `mantle-dark.css`, `mantle-light-high-contrast.css`,
`mantle-dark-high-contrast.css`. No §9 command catches a missing one. Pin the mapping with a `?raw` test, as
`components/chart/tokens.test.ts` does.

---

## 6. Data attributes are API

- `data-slot` is on every part ([§3.2](#32-data-slot-on-every-part)) and is always targetable.
- Any other `data-*` a component stamps for styling or coordination (`data-state`, `data-orientation`,
  `data-validation`, a per-item id) is documented in the part's JSDoc **and** its API-reference section —
  including the attributes a wrapped third-party primitive emits, since consumers style against those too.
  Both use these columns:

| Data Attribute | Value                  | Description                                          |
| -------------- | ---------------------- | ---------------------------------------------------- |
| `data-state`   | `"open"` \| `"closed"` | Reflects the disclosure state; drives the animation. |
| `data-loading` | present when loading   | Presence-only. Style with `data-loading:`.           |

- Prefer **presence semantics** for boolean states: stamp `data-selected=""` when true and **omit the
  attribute** when false. Never `data-selected="false"` — mantle's custom variants are defined as
  `&[data-selected]`, which matches attribute presence, so `"false"` still matches and the variant fires when
  it should not. Beware `data-x={someBoolean}`: React renders that as `data-x="false"`.

No shipped docs page has a data-attribute table yet. New components ship one; add one to an existing component
when you are already touching it, starting with the highest-traffic hooks (`data-validation`, Button and
IconButton's `data-appearance`/`data-intent`/`data-size`). This is not an audit auto-fix.

---

## 7. The docs page

One page per component. The page is the component's public contract for humans and LLMs alike, and it has a
plain-markdown twin (`/api/…`, `llms-full.txt`) generated from it.

### 7.1. Page kinds

- **Component page** — `apps/www/app/docs/components/<category>/<component-name>.mdx`. Follows §7.2 exactly.
- **Preview component page** — `docs/components/preview/<component-name>.mdx`, header carries `isPreview`.
- **Layout page** — `apps/www/app/docs/layouts/<layout-name>.mdx`, wired through `layoutPages` /
  `layoutRoutes` / `layoutDescriptions`.
- **Supplementary sub-page** — a routed deep-dive under a component's own folder
  (`data-display/code-block/folding-by-language.mdx`). It gets a route but no nav entry, and §7.2 items 5–8 do
  not apply.

### 7.2. Required structure, in order

1. **Frontmatter** — `title: <Display Name>` (Title Case, matching the nav label — this feeds `<title>`,
   `og:title`, JSON-LD, and every `llms.txt` entry) and a one-line `description`.
2. **Imports** — `Example` and/or `CodeExample`, plus any demos imported from
   `~/features/<component-name>-demos` or `~/examples/<component-name>`.
3. **Page title** — `# <Display Name>`, the house default. Use
   `<PageHeader id="<component-name>">Display Name</PageHeader>` when the page needs a copyable hash anchor or
   a lifecycle badge (`isPreview` for preview pages, `isUnreleased` for an unpublished component). Note the
   trade-off: `PageHeader` is currently invisible to `render-mdx-to-markdown.server.ts` and
   `rehype-mdx-toc.ts`, so a page using it loses its H1 in the markdown twin and its level-1 TOC entry until
   those two files learn to handle it. Follow the title with prose stating what the component is for and which
   decisions it encodes.
4. **A primary live example** with its code block.
5. **`## Composition`** — compound components only: the ASCII tree in a ` ```text showLineNumbers=false `
   fence, identical to the namespace JSDoc's tree. Simple components omit it — there is no tree to draw.
6. **`## Polymorphism`** — required when any part accepts `asChild`. List every part that supports it and when
   a consumer would reach for it. Never title this section "Composition"; that name is reserved for the
   structural tree.
7. **Optional sections** — variants, sizing, accessibility notes, recipes. They come after Composition and
   Polymorphism, before the API reference, and none of them may be named "Composition".
8. **`## API Reference`** — one `### <ComponentName>.<Part>` subsection per exported part (`### Alert.Root`,
   `### Card.Header`), each with its props table and, where applicable, its CSS-variable
   ([§5.2](#52-documenting)) and data-attribute ([§6](#6-data-attributes-are-api)) tables. Props tables use
   `Prop | Type | Default | Description`.

### 7.3. Examples must be live and complete

Both, for **every** example on the page — primary and secondary (variants, virtualization,
controlled/uncontrolled, polymorphism):

- **Live.** Each `tsx`/`jsx` usage block is immediately preceded by something that renders that exact usage.
  Three sanctioned forms: an `<Example>` wrapper (the default); a bare demo component imported from
  `~/features/<component-name>-demos` (what `code-block` does, for demos that need build-time transforms); or
  `CodeExample.Root` → `CodeExample.PreviewFrame example="<key>"` for shell-scale demos that own a whole
  document — that key must be registered in `apps/www/app/features/preview-registry.ts`, and the fence lives
  inside `CodeExample.Code`. Never ship a usage block with nothing rendering it.
- **Complete and self-contained.** Full component or render — never a fragment, never `…` placeholders, never
  a "only this line changes" diff, never a reference to an identifier that appears nowhere on the page. Data,
  handlers, and state are defined inline or in the page's module scope (a page-level `const fruits = […]` is
  fine). An undefined `switchTo` counts as incomplete — define it or use `() => {}`.

Define the demo as an `export function <Name>Example()` in the page's module scope — the default — and move it
to `~/features/<component-name>-demos.tsx` (plural, the canonical suffix for new files) when it is large,
shared across pages, or worth unit-testing, or to `apps/www/app/examples/<component-name>/` when it is a
multi-file example app. Keep the live example and its code block in sync; the live one may use a larger
generated dataset. Icons come from `@phosphor-icons/react`.

### 7.4. Prose rules

- Explain the _why_ behind non-obvious API, especially anything a reader would otherwise "fix" — a fake router
  in a demo, a deliberate absence of a part, an intentional ARIA choice.
- Link to sibling components and layouts by their docs URL rather than repeating their rules.
- Do not document internals a consumer cannot reach.

---

## 8. Tests

Colocated with the source. Default to happy-dom (`<component-name>.test.tsx`); use browser mode
(`<component-name>.browser.test.tsx`) only when the test depends on a real-browser API happy-dom does not
implement — see [CONVENTIONS.md → When to reach for browser mode](./CONVENTIONS.md#when-to-reach-for-browser-mode).

Minimums:

- Renders with the documented minimal usage.
- `className`, `ref`, and arbitrary `data-*` reach the rendered root; `data-slot` is present, and joined where
  a part wraps another.
- For every `asChild` part: the swap renders the child **and** merges classes, data attributes, and the ref.
  (`breadcrumb`, `button`, `icon-button`, `list`, and `slot` do this today; most other `asChild` tests assert
  only classes and `data-slot`.)
- The ARIA and keyboard contract the API promises — roles, `aria-current` / `aria-expanded` / `aria-controls`
  wiring, focus movement, keyboard shortcuts.
- Reduced motion, if the component animates.
- Business logic and its edge cases: state machines, parsing/formatting, validation, conditional rendering.
- Every bug fix adds a regression test that fails before the fix and passes after.
- **Every event handler, controlled prop, and documented keyboard contract is driven by a real event.**
  `await user.click(…)` / `await user.keyboard("{ArrowDown}")`, then assert the callback arguments **and** the
  resulting DOM/ARIA state. A component whose value is interaction is not covered by a render that hardcodes
  `open` or `defaultValue` and checks attributes — that tests its initial markup. This includes `disabled` and
  `readOnly` guards, controlled _and_ uncontrolled paths, dismissal, and any select/sort/expand cycle.
- Every documented data attribute and CSS variable is asserted, since [§5](#5-css-variables-are-api) and
  [§6](#6-data-attributes-are-api) make them public API. Where a selector in another file consumes one
  (`has-data-*`, `group-data-*`, `group-has-[…]`, `[&>.…]`), one test renders both sides together and asserts
  the producer emits what the consumer selects.
- SSR-only branches and first-paint behavior ([§3.7](#37-ssr-and-first-paint)) are asserted with
  `renderToString`; post-mount state cannot observe the render path.

Every test must be able to fail: name the one-line implementation change it would catch. See
[CONVENTIONS.md → Testing](./CONVENTIONS.md#testing) for the full rules on that, on why Tailwind
utility-string assertions are not coverage, and on determinism.

Never: rendered-HTML snapshots (`toMatchInlineSnapshot` is fine for serialized data shapes), `*.test.*` files
under `apps/www/app/routes/`, browser mode for something happy-dom can already do, Tailwind utility-string
assertions standing in for behavior, arbitrary `setTimeout` waits, or `toBeDefined()` / `not.toThrow()` as a
test's only assertion.

---

## 9. Verification

From the workspace root, once a coherent chunk of work is done and again before reporting completion:

1. `pnpm -w run lint` — 0 errors
2. `pnpm -w run fmt:check` — clean (`pnpm -w run fmt` to fix)
3. `pnpm -w run typecheck` — 0 errors
4. `pnpm -w run test` — all pass. Run it **unscoped**: the `@app/www` suite is the only automated enforcement
   of §4 and §7 (`agent-surface-drift.test.ts` snapshots the component manifest;
   `agent-manifests.server.test.ts` asserts each export's JSDoc survives extraction), and `-F @ngrok/mantle`
   cannot reach it.
5. `pnpm -w run build -F @ngrok/mantle` — succeeds (the only thing that exercises `.d.ts` emit, and so the only
   thing that catches `TS2883` from [§3.4](#34-compound-namespace))

Then commit the generated files these produce: `apps/www/app/utilities/__snapshots__/components-surface.json`
(regenerate with `pnpm -F @app/www test -u`) and
`packages/mantle-vite-plugins/src/mantle-component-name.ts`.

Nothing in this list catches a missing Tailwind chunk mapping or a token missing from the non-light themes —
check [§2.3](#23-export-map-and-build-configuration) and [§5.4](#54-design-tokens) by hand.

---

## 10. Auditing an existing component

This is what `/audit-component` runs, and it is the same list a human uses to review a diff. It reports; it
does not sweep ([Scope and status](#scope-and-status)).

### 10.1. Classify

Read every non-test `.tsx` in `packages/mantle/src/components/<component-name>/` — or, for a
family-directory component, `components/<family>/<component-name>.tsx`
([§2.2](#22-naming)). Fall back to any `.tsx` in the directory when the filename differs
(`icons/`, `pagination/`, `progress/`, `theme/` have no `<dir>/<dir>.tsx`).

- Contains `const <ComponentName> = { … } as const` → **compound**; otherwise **simple**.
- Detect `asChild` support (imports `Slot`, or accepts `asChild` on any part) — it decides whether the docs
  page needs `## Polymorphism`.
- Audit every directory with a `packages/mantle/package.json` export. Skip export-less directories (today only
  `chart`) and `*/primitive.tsx` files — they are internal by design ([§1.2](#12-ship-the-smallest-public-surface)).

### 10.2. Check

Walk the spec in order and record every violation with a file:line:

| Area           | Sections                                                                          |
| -------------- | --------------------------------------------------------------------------------- |
| Surface & API  | [§1.1](#11-one-component-per-user-intent)–[§1.7](#17-forbidden-api-shapes)        |
| Implementation | [§3](#3-implementation-rules)                                                     |
| JSDoc          | [§4](#4-jsdoc), plus [§5.2](#52-documenting) and [§6](#6-data-attributes-are-api) |
| Docs page      | [§7](#7-the-docs-page)                                                            |
| Wiring         | [§2](#2-what-a-component-must-ship)                                               |
| Tests          | [§8](#8-tests)                                                                    |

### 10.3. Fix

**Auto-fixable — apply directly.** These are mechanical and reversible:

- Missing or incorrect `@see` URL, or a part-level `@see` missing its anchor.
- Missing `Composition` `@example` tree on the namespace JSDoc → derive it from the namespace members and the
  existing JSX example, insert as the first `@example`.
- Missing `## Composition` on the docs page → derive from the namespace, insert before `## Polymorphism` /
  `## API Reference`.
- A section titled `Composition` that actually describes `asChild` → rename to `## Polymorphism`. Describing
  something else → rename to a content-accurate title (ask if unclear).
- An abbreviated `@example` on a namespace property or part declaration → replace with the full-tree example
  already present elsewhere in the same file.
- A usage code block with nothing live above it, or written as a fragment → add a live example and rewrite the
  block to be complete, modeled on the page's existing complete examples.
- Missing route in `routes.ts`, missing nav entry in `navigation-data.ts`, or a missing
  `componentImportPathOverrides` entry → insert in alphabetical order.
- A stale generated file → regenerate ([§9](#9-verification)).

**Needs author judgment — report and wait.** Anything that changes public API, runtime behavior, or
accessibility semantics:

- Adding a `package.json` export. Publishing is irreversible ([§1.2](#12-ship-the-smallest-public-surface)) —
  an export-less directory is usually internal on purpose, not an oversight.
- A missing JSDoc description or `@example` where the content is non-obvious.
- Refactoring a non-namespace exported object into the POJO namespace pattern.
- Adding `asChild` to a part that lacks it, or adding a missing test file.
- A component or part borrowing an unearned ARIA pattern word → propose the standards-vocabulary rename with
  the markup and keyboard evidence behind it. Renames are breaking and must go all the way through.
- A prop whose name does not read as the DOM/ARIA it emits (`isActive` → `current`).
- A part that emits an ARIA role without implementing that pattern's keyboard contract → the author chooses
  between implementing the contract and dropping both the role and the name.

**Never auto-fix a naming violation by changing the markup.** Adding an ARIA role, a keyboard handler, or
`tabIndex` to make an unearned pattern word honest is not a fix — it changes runtime behavior and
accessibility semantics to preserve a name that should change instead.

### 10.4. Report

Group violations by area, mark each auto-fixable or author-judgment, apply the auto-fixable ones, run
[§9](#9-verification), and add a changeset: `patch` for JSDoc/comment-only changes, none if only
`apps/www/app/docs/**`, `navigation-data.ts`, or `routes.ts` changed ([§2.5](#25-changesets)).

---

## 11. Review checklist

Run this against the diff before calling a component done. Each line is a defect if it fails, scoped per
[Scope and status](#scope-and-status).

**Surface**

- [ ] Answers one user intent no existing component already answers; JSDoc names the sibling boundary.
- [ ] Nothing is public that could have stayed module-internal.
- [ ] Outermost part is `Root`; every part name is the web-standards term for what it renders.
- [ ] No unearned ARIA pattern word anywhere in the component or part names.
- [ ] Props read as the ARIA/DOM they emit; no prop-bag passthrough props.
- [ ] Namespace is one level deep, annotated if any member's type is third-party.
- [ ] No `forwardRef`, no `React.FC`, no `displayName` assignment.
- [ ] Mutually exclusive states are a discriminated union, not a boolean bag.

**Code**

- [ ] `"use client"` where required; named exports; `.js`-suffixed relative imports; `ComponentProps<…>`-based
      props.
- [ ] `data-slot` on every part, joined where wrapping.
- [ ] `asChild` on every DOM-rendering part (`SelfClosingWithAsChild` where there are no children), or a
      commented exception.
- [ ] `className` composed with `cx`, consumer's last; no `any`, type assertions, or non-null assertions;
      `== null` for nullish checks.
- [ ] Invariants throw descriptively; no `console.error` as handling.
- [ ] Animation honors reduced motion; SSR renders the final paint.

**Docs**

- [ ] JSDoc on every export: contract description, `@see` (with part anchor), `@example`; per-prop docs with
      defaults.
- [ ] Compound: composition tree first, then full-tree JSX — repeated on every namespace member and part.
- [ ] Every public CSS variable documented in **both** the JSDoc and the docs-page API reference, with the
      default a consumer actually observes. Private variables use `--_` and stay undocumented.
- [ ] Every `data-*` the component stamps for styling or coordination appears in the JSDoc and the API
      reference; boolean states use presence semantics.
- [ ] Docs page has the required sections in order; `title:` is the Title Case display name; every example is
      live and self-contained.
- [ ] Trees in the JSDoc and the docs page match.

**Wiring**

- [ ] `index.ts`, `package.json` export (alphabetical), route, and nav entries all present and consistent.
- [ ] `componentImportPathOverrides` if the slug is not the export key; `doNotPublish` /
      `INTERNAL_CHUNKS_BY_COMPONENT` if applicable.
- [ ] New tokens have values in all four theme stylesheets.
- [ ] Changeset with the right bump and consumer-facing prose.

**Proof**

- [ ] Tests cover render, forwarding, the `asChild` merge triple, ARIA/keyboard, and business-logic edge cases.
- [ ] All five verification commands pass, and both generated files are regenerated **and committed**.

---

## Reference

- [CONVENTIONS.md](./CONVENTIONS.md) — general code style, TypeScript, testing tooling, package management.
- [AGENTS.md](./AGENTS.md) — the agent contract that requires this spec.
- [Philosophy](./apps/www/app/docs/philosophy.mdx) — the long-form rationale §0 distills.
- `decisions/` — the argued-over decisions, including
  `2025-07-16-compound-component-named-exports.md` (POJO namespaces),
  `2026-07-04-list-family-api-design.md` (naming and composition),
  `2026-07-08-docs-information-architecture.md` (categories),
  `2026-07-15-theme-switcher-compound-api.md` (parts over prop bags).
- Workflows implementing this spec: `.claude/commands/scaffold-component.md`,
  `.claude/commands/audit-component.md`, `.claude/commands/promote-preview-component.md`.
- **Shapes worth copying, with their known gaps.** Copy compound-namespace JSDoc from `alert` or `card`. Copy
  docs-page structure from `list` or `selectable-list` — the pages that already match §7.2. Copy the
  CSS-variable tables from `alert` and `icon-button`. Do **not** copy: `card` and `dialog` ship no test file;
  `code-block` emits `data-highlighted="false"` against [§6](#6-data-attributes-are-api) and uses `…`
  placeholders in its code blocks against [§7.3](#73-examples-must-be-live-and-complete); `dialog`, `empty`,
  and `code-block` predate §7.2's section order.
