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
- Never use `forwardRef` — mantle targets React 19+, where `ref` is a regular prop. Base props on `ComponentProps<…>` (which includes `ref`) and destructure `ref` from props when the implementation needs it.
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

Mantle compound components use a **single-level POJO namespace** — sub-components are members of one namespace object, never nested namespaces, and the outermost part is always `Root`:

```tsx
// ✅ flat, single-level namespace
const Command = { Root, DialogRoot, DialogTrigger, DialogContent, Input, List } as const;

// ❌ nested namespace — do not do this
const Command = { Root, Dialog: { Root, Trigger, Content } };
```

The full rule — member typing, the explicit namespace annotation that keeps `.d.ts` emit portable, and where providers live — is [COMPONENT_SPEC.md § Compound namespace](./COMPONENT_SPEC.md#34-compound-namespace). The rationale, including the tree-shaking cost it accepts, is [`decisions/2025-07-16-compound-component-named-exports.md`](./decisions/2025-07-16-compound-component-named-exports.md).

## Component API Design

**[COMPONENT_SPEC.md](./COMPONENT_SPEC.md) is the standard for authoring a `@ngrok/mantle` component** and owns these rules in full: the artifacts a component ships, its API shape, JSDoc, CSS-variable and data-attribute documentation, docs page, tests, wiring, and a review checklist. Read it before adding or changing anything under `packages/mantle/src/components/`. It is the single place these rules are maintained — do not restate them here.

The questions it makes you answer **before scaffolding**, each linked to the section that decides it:

- [Ship the smallest public surface](./COMPONENT_SPEC.md#12-ship-the-smallest-public-surface) — publishing later is additive; un-shipping is breaking.
- [One component per user intent](./COMPONENT_SPEC.md#11-one-component-per-user-intent) — a variant is a prop or a sibling part, never a second component.
- [Name parts for the DOM and ARIA they emit](./COMPONENT_SPEC.md#13-name-parts-for-the-dom-and-aria-they-emit) — standards vocabulary, not another library's; `Root` is always outermost; props read as the attribute they set.
- [ARIA pattern words are earned, not borrowed](./COMPONENT_SPEC.md#14-aria-pattern-words-are-earned-not-borrowed) — `Menu`, `Listbox`, `Tab`, `Tree`, `Grid`, `Combobox`, `Toolbar`, `Dialog` require that role _and_ its keyboard contract. Rename the part; never add the role to justify the name.
- [Composition vs data-driven](./COMPONENT_SPEC.md#15-composition-vs-data-driven) — data props only when behavior must reach unmounted items; never prop-sniff children.
- [Make invalid states unrepresentable](./COMPONENT_SPEC.md#16-make-invalid-states-unrepresentable) — union types over runtime checks.
- [Forbidden API shapes](./COMPONENT_SPEC.md#17-forbidden-api-shapes) — nested namespaces, prop bags (`contentProps`), `displayName`, `forwardRef`, `React.FC`.
- [CSS variables](./COMPONENT_SPEC.md#5-css-variables-are-api) and [data attributes](./COMPONENT_SPEC.md#6-data-attributes-are-api) are public API and are documented in both the JSDoc and the docs-page API reference.

Distilled from [`decisions/2026-07-04-list-family-api-design.md`](./decisions/2026-07-04-list-family-api-design.md) and [`decisions/2026-07-15-theme-switcher-compound-api.md`](./decisions/2026-07-15-theme-switcher-compound-api.md).

## Testing

- Runner: Vitest. Two modes — happy-dom (default, no per-file Playwright startup) and real-browser Chromium via Playwright.
- Libraries: `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`
- File naming, colocated with source:
  - happy-dom: `*.test.{ts,tsx}`
  - browser: `*.browser.test.{ts,tsx}`
- No `*.test.*` under `app/routes/` — React Router treats that as route modules. Put route-behavior tests under the owning `app/features/*` area.
- Business logic MUST be thoroughly tested, including edge cases (transformations, validation, conditional rendering, state machines, parsing/formatting).
- Every bug fix adds a regression test that fails before the fix and passes after — unless genuinely infeasible (document why in the PR).
- Test count is not a quality signal. One test that pins a real contract is worth more than five that render and check attributes.

### The bar: a test must be able to fail

Before a test is done, answer: **what single-line change to the implementation would turn this red?** If there is no answer, the test is decoration — delete it or make it assert something.

- These are never a test's _only_ assertion: `toBeDefined()`, `toBeTruthy()`, `not.toThrow()`, `toBeInstanceOf(HTMLElement)`. Assert the actual value, DOM state, or ARIA state.
- Never assert an element you constructed but never rendered.
- Never compare the implementation's arithmetic against constants re-declared in the test body — call the real function and assert its output, or the test only proves the test agrees with itself.
- Make sure your query can actually match. A selector that can never match makes the assertion unfailable.
- `@ts-expect-error` is owned by `pnpm typecheck`. Do not pair it with a placeholder runtime `expect` — that reads as coverage the vitest run does not have.
- Spies assert count and arguments: `toHaveBeenCalledTimes(n)` plus `toHaveBeenLastCalledWith(…)`, not a bare `toHaveBeenCalled()`. A call-count-blind spy cannot see a debounce that stopped debouncing.
- `oxlint`'s `vitest(expect-expect)` rule catches the assertion-free case only. Everything above is on you.

### Drive the interaction

If a component owns an event handler, a controlled prop, or a documented keyboard contract, at least one test must **drive it end to end** — `await user.click(…)` / `await user.keyboard("{ArrowDown}")` — and assert both the callback arguments and the resulting DOM/ARIA state.

Rendering a component with `defaultValue`/`open` hardcoded and checking attributes does not test an interactive component; it tests its initial markup. `readOnly` and `disabled` guards, controlled-vs-uncontrolled paths, dismissal, and sort/expand/select cycles all need a real event.

Test mantle's own logic — its wiring, guards, prop plumbing, and ARIA setup. Do not re-test Radix or Ariakit internals.

### Assert behavior, not styling internals

**Do not assert Tailwind utility strings.** Neither project loads Tailwind, so `expect(el.className).toContain("shadow-inner")` compares a string to the source literal — it observes nothing about rendering, and it false-fails on behavior-preserving token renames. Reach instead, in order, for:

1. the documented public API the class implements — a `data-slot`, a documented data attribute, or a documented CSS custom property (all three are public API per [COMPONENT_SPEC.md](./COMPONENT_SPEC.md));
2. a behavioral assertion (role, accessible name, text, ARIA state, callback);
3. in browser mode only, `getComputedStyle` with the load-bearing CSS injected inline in the test file (`label.browser.test.tsx` is the reference);
4. deleting the assertion, if none of the above applies.

Three uses are legitimate and should stay, each of which needs a comment saying which one it is: **tailwind-merge override contracts** (proving a consumer's `className` beats a default — assert the merge outcome, not a list of internal defaults), **explicitly commented cross-file spelling pins** that tie a class to a selector in another file, and **the class as the only observable implementation of an enumerated prop** — when a variant emits no data attribute and no other DOM difference, the class is the only thing that can catch a permuted lookup table (`toast.test.tsx`'s intent tables are the reference; prefer exposing a data attribute when you own the component).

Also: `toHaveClass` ignores extra classes, so it cannot back a test name that promises exclusivity. And no snapshot tests of rendered HTML — use declarative assertions (`getByRole`, `getByText`, `toBeInTheDocument`). `toMatchInlineSnapshot` is for serialized data shapes only.

### Pin the contracts that cross files

`data-slot` and documented data attributes are public API, so a rename is a breaking change for consumer CSS. Give each component one table-driven test asserting every part's slot lands on the expected element (`centered-layout.test.tsx` models this).

When a selector in one file depends on an attribute or class emitted in another (`has-data-*`, `group-data-*`, `group-has-[…]`, `[&>.…]`), assert _both sides in one test_ that renders them together. Asserting only the consumer's selector leaves the pair one rename away from a silent layout break with every test green.

### Cover the server render

Anything whose purpose is server output needs `renderToString` from `react-dom/server` — pre-hydration branches, SSR-only props, and FOUC prevention. Asserting only post-mount state cannot see the render path, because the mount effect overwrites it before the assertion runs.

For logic that is stringified into an inline `<script>`, evaluate the produced string in the test (`new Function(scriptContent())()`) and assert its side effects. Nothing else makes a closure-scoping regression in it visible — lint, typecheck, and build all pass on a script that throws at runtime.

### Determinism

- **No arbitrary sleeps.** `await new Promise((resolve) => setTimeout(resolve, 100))` is a race, not a wait. Use `waitFor`, `findBy*`, or `expect.poll` on the state you actually need — for observer-driven measurement, poll the measured value itself.
- Never mutate state inside a `waitFor` callback; it can run many times.
- Install spies **after** `userEvent.setup()`. `setup()` swaps `navigator.clipboard` for its own stub, so a patch applied before it is silently discarded.
- Every test-bearing package sets `restoreMocks`, `unstubEnvs`, and `unstubGlobals` in its Vitest config (both mantle projects, `apps/www`, `mantle-vite-plugins`, `mantle-server-syntax-highlighter`), so `vi.spyOn` spies and `vi.stubGlobal`/`vi.stubEnv` stubs are torn down between tests automatically. A trailing `spy.mockRestore()` in a test body is dead code — and relying on one is a leak, since a test that throws never reaches it. `restoreMocks` does **not** clear a `vi.fn()`'s implementation or call history, so a `vi.fn()` shared across tests still needs `mockReset()` — put it in `beforeEach`, or just create the mock there. A spy that must survive across tests in a file goes in `beforeEach`, not `beforeAll`.
- No test may depend on another test having run. Verify with `pnpm vitest run --project unit --sequence.shuffle.tests --sequence.shuffle.files --sequence.seed=<n>` across a few seeds.
- Locale- and timezone-sensitive assertions rely on `TZ`/`LC_ALL` being pinned in the Vitest config, not in a package script — a pin in a script is lost the moment anyone runs a single file directly. The happy-dom project pins them via `test.env`; the browser project pins Chromium's own `locale`/`timezoneId` through the Playwright `contextOptions`, which `process.env` cannot reach.
- Never assert a wall-clock duration or a throughput threshold. Benchmarks belong in `bench()`, not `test()`.

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

If the test only touches DOM structure, ARIA, event handlers, or pure state — stay in happy-dom. A file belongs in the browser project only if it exercises a named API from that list; otherwise it pays Chromium startup and browser-launch flake for assertions that are deterministic in happy-dom. This is a rule in both directions — misplaced files should be renamed back to `*.test.tsx`.

Browser tests load **no Tailwind** and the browser project injects no stylesheet, so a browser test that asserts geometry, visibility, or computed style **must inject the load-bearing CSS inline** (`label.browser.test.tsx` is the reference) — otherwise the layout is degenerate and the assertion passes for the wrong reason. When injecting CSS is impractical, assert the mechanism (`element.style.height === "auto"`) rather than the geometry it produces, and say so in a comment.

Beware the inverse trap in happy-dom: `offsetWidth`/`offsetHeight`/`getBoundingClientRect` return zeros, so an assertion like `expect(node.offsetHeight).toBe(0)` passes no matter what the implementation does.

## Package Management

- All external deps use exact pinned versions (no `^` / `~`). Single-use: `pnpm add -E <package>`.
- Shared deps go through the `catalog:` in `pnpm-workspace.yaml`, then referenced as `catalog:`. Add to catalog first if the dep will be used across packages.
- For `@pkg/*` workspace packages, use `catalog:` in `devDependencies` and `peerDependencies` (not `dependencies`) so apps install the dep themselves and avoid duplicates.
