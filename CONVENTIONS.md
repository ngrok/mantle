# Conventions

Single source of truth for code style, patterns, and conventions in the Mantle design system monorepo. All rules below are mandatory — call out and fix violations.

## Files & Modules

- File naming: kebab-case (except framework-required filenames like `entry.server.tsx`, `react-router.config.ts`)
- ESM only: `import`/`export`, `const`, `async/await`, arrow functions
- Prefer named exports; use `import type` for type-only imports
- Imports: relative paths in `/packages`, `~/path/to/thing` aliases in `/apps`

## Formatting & Linting

- Formatter: oxfmt (tabs, tabWidth 2, double quotes) — see `.oxcfmtrc.json`. By default, oxfmt reads `.gitignore` and `.prettierignore` from the current working directory only. `.prettierignore` is kept deliberately as repo-level oxfmt ignore config; `ignorePatterns` supports gitignore-style globs and hard-excludes matching files, but paths are resolved relative to the config file and directory skipping is conservative so nested configs are not hidden.
- Linter: oxlint — see `.oxlintrc.json`
- Never biome, prettier, or eslint

## Code Quality

### Readability & Maintainability

- Optimize for readability and changeability over terseness or cleverness. Code is read far more often than it is written.
- Always brace control flow — no single-line `if`/`for` bodies.
- Descriptive names — `error` not `e`, `event` not `evt`, `element` not `el`. Widely-known initialisms (`URL`, `CSS`, `SSR`) are fine.
- Comments explain _why_, not _what_. Do not restate the code.
- Prefer inline single-use event handlers when they improve locality and readability. Hoist handlers only when reused, memoized, or meaningfully simplifying the render body.
- Avoid nested ternaries. Prefer early returns or component-based branching. A single ternary is fine; nesting harms readability.
- Never use `React.FC` / `FC` — use inline function types.
- Prefer named options objects over positional params: any boolean param, 3+ params, or 2 params when call sites would not be self-evident (`fn({ enabled: true })`, not `fn(true)`).
- Optimize APIs for readability at the call site. Shared abstractions should make common usage simpler and more obvious, not merely reduce implementation duplication.
- Do not use deprecated APIs or features — pick the current replacement. Only reach for a deprecated path when it is genuinely unavoidable (no working substitute, or a framework/runtime constraint forces it) and leave a short `// Why:` comment naming the constraint.

### Error Handling

- Errors are control flow — `console.error` is not handling. Every error path must recover, propagate, or terminate intentionally.
- Prefer explicit failure handling over silent fallbacks or partial state updates.
- Fail fast when invariants are violated rather than letting invalid state propagate deeper into the system.

### State & Business Logic

- Prefer composing small pure functions for transformations, parsing/formatting, validation, state derivation, and other business logic.
- Keep I/O, framework state, and rendering at the edges so the core logic stays reusable, deterministic, and easy to unit test.
- Prefer derived state over synchronized state. Avoid storing values that can be computed from existing state, props, loaders, or URL state.
- Keep data flow directional and explicit. Avoid hidden coupling between components, hooks, modules, or mutable shared state.

### Abstractions & Duplication

- DRY follows YAGNI: do not introduce abstractions solely because two pieces of code look similar.
- Prefer duplication over the wrong abstraction. A small amount of repeated code is cheaper than shared code that accumulates flags, conditionals, mode parameters, or caller-specific behavior. See Sandi Metz, [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction).
- Do not extract shared code until there are at least 3 uses with the same behavior, shape, and reason to change.
- Prefer composition over generalization: small pure functions, focused components, hooks, slots/children, and explicit options objects.
- Avoid inheritance, base components, broad wrappers, and “one helper to rule them all” APIs.
- If an abstraction starts accumulating special cases for callers, inline it back into the call sites and let the real abstraction emerge naturally.
- Prefer deleting unused abstractions, indirection, and dead code over preserving speculative flexibility.
- Every layer of indirection must continuously justify its existence.

### JSDoc

- Add JSDoc to all exported functions, methods, hooks, components, and prop types.
- Add JSDoc to complex file-local logic whose intent or contract would not be immediately obvious from the implementation and types alone.
- Prefer concise contract-oriented documentation over implementation commentary.
- JSDoc for functions, hooks, and components SHOULD include at least one concise `@example`.
- Each `@example` should demonstrate the intended call or render shape with realistic inputs/props and the key expected behavior or result. Keep setup minimal.
- Generated code, code-gen output, and config files are exempt.

### TypeScript

- Strict mode enabled. Shared configs from `@cfg/tsconfig`.
- No `any` — use `unknown` and narrow it intentionally.
- Prefer `type` over `interface`. `type` handles unions, primitives, tuples, and mapped types consistently, avoids declaration merging, and expands more clearly in IntelliSense.
- No non-null assertions. The postfix `!` operator (`value!`) is forbidden. Use proper null checks, early returns, assertions, or restructure the code to narrow the type safely.
- Prefer `value == null` / `value != null` for nullish checks. They intentionally cover both `null` and `undefined`, which is safer for runtime absence checks. Use `=== null` / `=== undefined` only when those states have distinct meanings.
- No type assertions in application code. Do not use `value as Type`. The only allowed exceptions are:
  - `as const` for literal type narrowing
  - assertions inside dedicated type guard implementations
  - framework/runtime boundaries where external typing is impossible to model correctly
- Type assertions must never be used to silence TypeScript errors or bypass proper type modeling.
- Prefer discriminated unions, narrowing, and explicit state modeling over optional-property-heavy “bag of props” types.

## className Composition

```tsx
import { cx } from "@ngrok/mantle/cx";

// ✅
<div className={cx("foo", condition && "bar", { baz: isActive })} />

// ❌ no string interpolation, +, or ternaries inside className
<div className={`foo ${condition ? "bar" : ""}`} />
```

## Compound Components

Mantle compound components use a single-level POJO namespace (see [`decisions/2025-07-16-compound-component-named-exports.md`](./decisions/2025-07-16-compound-component-named-exports.md)). Sub-components are members of one namespace object — never nested namespaces.

```tsx
// ✅ flat, single-level namespace
const Command = {
	Root,
	DialogRoot,
	DialogTrigger,
	DialogContent,
	Input,
	List,
	// ...
} as const;

// ❌ nested namespace — do not do this
const Command = {
	Root,
	Dialog: {
		// ← nested compound inside a compound
		Root,
		Trigger,
		Content,
	},
	// ...
};
```

**Why:**

- Every other mantle compound (`Dialog`, `Field`, `Alert`, `Sheet`, `DropdownMenu`, `Table`, …) is single-level. Nested namespaces break this consistency and force consumers to learn a special case.
- Nested inferred-literal-of-`as const`-of-third-party-re-exports defeats TypeScript's portable type naming during `.d.ts` emit. This surfaces as `TS2883: The inferred type of 'X' cannot be named without a reference to …` on `@types/react` upgrades.
- Re-exporting another mantle namespace under a sub-key (e.g. `Command.Dialog.Root = Dialog.Root`) does not shorten call sites and creates two import paths for the same primitive.

**Rules:**

1. A compound's namespace object has exactly one level of properties.
2. If a sub-feature relates to a different existing primitive (e.g. Command's dialog-wrapped variant), flatten the relationship into member names (`DialogRoot`, `DialogTrigger`, `DialogContent`) rather than nesting.
3. Do not re-export another component's namespace under your namespace. If consumers need that primitive, they can import it directly.
4. Each member of a compound namespace must be a directly-defined component or `forwardRef` result whose type has an explicit name (`forwardRef<…, …>(…)`, `ComponentType<…>`, etc.) — not an inferred literal whose shape depends on chasing types through external packages.
5. When wrapping a third-party namespace primitive (e.g. Radix), explicitly annotate the enclosing namespace object's type so `.d.ts` emit doesn't have to synthesize it: `const Foo: { Root: typeof Root; … } = { … }`.
6. Every compound's outermost part is named `Root` — even when the compound has no separate state owner and `Root` is the whole component. Consumers should never have to learn which part is outermost per component.

## Component API Design

Distilled from the list-family design review (see [`decisions/2026-07-04-list-family-api-design.md`](./decisions/2026-07-04-list-family-api-design.md)). Answer these questions **before scaffolding** a component, not at review time.

- **Ship the smallest public surface.** A primitive that exists to back other components stays module-internal (`dialog/primitive`, `list/primitive`): imported by relative path, absent from `package.json` exports, undocumented. Publishing later is additive and non-breaking; un-shipping after release is breaking. Corollary: if a component's docs would mostly redirect readers to siblings, it should not be public.
- **One component per user intent.** Name the intent in a sentence ("click an item to act/navigate" vs "check items to select"). If two proposed components answer the same intent, merge them; a variant is a prop or a sibling part, not a new public component.
- **Name parts after the component's own noun and the web-standards term** for what they render: a List has `Item`s (`<li>`, `role="listitem"`), a Table has `Row`s (`<tr>`, `role="row"`). Follow the standards vocabulary, not other libraries' conventions. Rename all the way through (props, types, slots, internals) — a half-renamed API is worse than either name.
- **Props should read as the ARIA/DOM they emit** where practical (`current` → `aria-current`), and must not collide semantically with sibling props (`textValue` next to `value` was rejected for `labelText`).
- **Composition vs data-driven**: compose children when every behavior derives from the authored children (Table, List). Take a data prop when collection-level behavior — filtering, select-all, virtualization — must operate over items that may not be mounted or even created (DataTable, SelectableList); keep _rendering_ composable via a render-prop. Never read collection facts off children via prop-sniffing or `cloneElement` injection — pass data or index-based callbacks; element sniffing only sees the outermost composed child and fails silently when a consumer wraps it.
- **ARIA for list-shaped UI**: `role="list"` for action/navigation items — interactive content and multiple tab stops per item are fine (the no-interactive-content restriction belongs to `listbox`, not `list`). Reach for the APG grid only when rows carry selection state with real controls (`aria-selected` is invalid on `listitem`) or need single-tab-stop navigation over a large virtualized collection. Do not default to grid: screen readers treat grids as tables (coordinate announcements, table navigation), and short lists of links belong in the page's tab order.
- **Make invalid states unrepresentable** with union types instead of runtime checks — e.g. a rich `label: ReactNode` requires `labelText: string` at the type level, so misuse is a compile error rather than a filter that silently stops matching.

## Testing

- Runner: Vitest. Two modes — happy-dom (default, no per-file Playwright startup) and real-browser Chromium via Playwright.
- Libraries: `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`
- File naming, colocated with source:
  - happy-dom: `*.test.{ts,tsx}`
  - browser: `*.browser.test.{ts,tsx}`
- No `*.test.*` under `app/routes/` — React Router treats that as route modules. Put route-behavior tests under the owning `app/features/*` area.
- No snapshot tests of rendered HTML. Use declarative assertions (`getByRole`, `getByText`, `toBeInTheDocument`). `toMatchInlineSnapshot` is OK for serialized data shapes only.
- Business logic MUST be thoroughly tested, including edge cases (transformations, validation, conditional rendering, state machines, parsing/formatting).
- Every bug fix adds a regression test that fails before the fix and passes after — unless genuinely infeasible (document why in the PR).

### When to reach for browser mode

Default to happy-dom. Reach for browser mode only when the test depends on a real-browser API happy-dom doesn't (correctly) implement:

- Web Animations API (`getAnimations`, `Animation.finished`)
- IntersectionObserver / ResizeObserver
- Inline `<script>` execution (3rd-party SDK bootstrappers like GTM/Ketch)
- `<noscript>` parsing — happy-dom drops noscript children
- Real layout, scroll, `:focus-visible`, real `getBoundingClientRect` / `getComputedStyle`
- Clipboard API, Drag-and-drop / `DataTransfer`, `FileReader`
- Pointer/touch events, real hover, focus-within
- Selection / Range / `contenteditable` caret behavior
- HTML5 form constraint validation end-to-end
- `matchMedia` + `prefers-*` reactivity
- Native `<dialog>.showModal()` / Popover API
- IndexedDB, BroadcastChannel, cross-tab `storage` events, MessageChannel
- Canvas 2D / WebGL / OffscreenCanvas
- Real `requestAnimationFrame` timing

If the test only touches DOM structure, ARIA, event handlers, or pure state — stay in happy-dom.

## Package Management

- All external deps use exact pinned versions (no `^` / `~`). Single-use: `pnpm add -E <package>`.
- Shared deps go through the `catalog:` in `pnpm-workspace.yaml`, then referenced as `catalog:`. Add to catalog first if the dep will be used across packages.
- For `@pkg/*` workspace packages, use `catalog:` in `devDependencies` and `peerDependencies` (not `dependencies`) so apps install the dep themselves and avoid duplicates.
