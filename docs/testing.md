# Testing

Read this file before you add or change a test anywhere in the monorepo. [COMPONENT_SPEC.md §8](../COMPONENT_SPEC.md#8-tests) adds the minimums for a component.

- Runner: Vitest. Two modes — happy-dom (default, no per-file Playwright startup) and real-browser Chromium via Playwright.
- Libraries: `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`
- File naming, colocated with source:
  - happy-dom: `*.test.{ts,tsx}`
  - browser: `*.browser.test.{ts,tsx}`
- No `*.test.*` under `app/routes/` — React Router treats that as route modules. Put route-behavior tests under the owning `app/features/*` area.
- Business logic MUST be thoroughly tested, including edge cases (transformations, validation, conditional rendering, state machines, parsing/formatting).
- Every bug fix adds a regression test that fails before the fix and passes after — unless genuinely infeasible (document why in the PR).
- Test count is not a quality signal. One test that pins a real contract is worth more than five that render and check attributes. A case that reaches a branch a sibling already reaches is run time, not coverage; see [One test per branch](#one-test-per-branch). A constant asserted against a copy of itself and a class string frozen by a regression test are the next two; see [No tautological tests, no change-detector tests](#no-tautological-tests-no-change-detector-tests).

## The bar: a test must be able to fail

Before a test is done, answer: **what single-line change to the implementation would turn this red?** If there is no answer, the test is decoration — delete it or make it assert something.

- These are never a test's _only_ assertion: `toBeDefined()`, `toBeTruthy()`, `not.toThrow()`, `toBeInstanceOf(HTMLElement)`. Assert the actual value, DOM state, or ARIA state. (lint: `mantle/no-only-to-be-defined`, for `toBeDefined()`)
- Never wrap a `getBy*` query in `toBeDefined()`, `toBeTruthy()`, or `not.toBeNull()`. `getBy*` already throws when it finds nothing, so the matcher adds no coverage. A named `getByRole` or an exact `getByText` plus `toBeInTheDocument()` is a real assertion: the query pins the ARIA name or the copy. `apps/www` loads no jest-dom, so its presence check is `queryBy*` plus `not.toBeNull()`, where the matcher does the work. (lint: `mantle/no-presence-matcher-on-get-by`)
- A bare-role query such as `getByRole("table")` pins only the role. In `packages/mantle` the role is the part's contract. In `apps/www` a mantle part renders the element, so the query pins mantle's markup and not the demo's.
- Never assert an element you constructed but never rendered.
- Never compare the implementation's arithmetic against constants re-declared in the test body — call the real function and assert its output, or the test only proves the test agrees with itself.
- Never assert one fixture value against another (the sum of the expected rows equals the expected total). State the relation in a comment and assert the implementation's output.
- Make sure your query can match. A selector that can never match makes the assertion unfailable. Before a `queryBy*` absence assertion, render the branch where the element exists and confirm the same query finds it. A `data-testid` that only the test's own fixture carries can never appear.
- A validator or a parser that returns a message is asserted on the message. `toBeDefined()` alone passes a wrong or swapped message.
- `@ts-expect-error` is owned by `pnpm typecheck`. Do not pair it with a placeholder runtime `expect` — that reads as coverage the vitest run does not have.
- Spies assert count and arguments: `toHaveBeenCalledTimes(n)` plus `toHaveBeenLastCalledWith(…)`, not a bare `toHaveBeenCalled()`. A call-count-blind spy cannot see a debounce that stopped debouncing. (lint: `mantle/no-bare-to-have-been-called`)
- A rule tagged `(lint: name)` has an oxlint check. `vitest/expect-expect` also fails a test with no assertion, and the `mantle/*` rules live in `scripts/oxlint-plugin-mantle.js`. An untagged rule is on you.

## No tautological tests, no change-detector tests

Both shapes have an answer to "what turns this red", and it is the wrong answer. An edit to the value the test copies turns them red; a wrong behavior does not. Name the wrong behavior the test catches. If the only answer is "the code changed", delete the test or rewrite it.

**A tautological test asserts a constant against a copy of itself.** The shapes:

- `expect(intentIcons).toEqual({ … })` or `expect(DEFAULT_DELAY).toBe(700)`.
- `expect(SNIPPET).toContain("ngrok http 80")` on a fixed string.
- A `test.each` over the keys of the table it reads them from.
- `toBeTruthy()` on every entry of a `Record<Union, string>`.

Nothing runs between the value and the assertion, so the test proves that the file parses. When the constant changes, the fix is to paste the new value into the test.

- A constant, a config object, a lookup table, a preset, or an enum has no test of its own. Test the branch that reads it: the part that renders the icon, the guard that reads the flag, the formatter that embeds the unit.
- A `cva` variant map or an intent table is a lookup mantle owns, so [One test per branch](#one-test-per-branch) gives it a test per key. That test renders the part and asserts what the key selects. It never compares the table to a literal copy.
- A function that returns the same string for every input is a constant. Do not assert its substrings. Assert the branches of a function whose output changes with its input, and assert what changed.
- A static string a part renders unconditionally falls under [One test per branch](#one-test-per-branch): no branch, no test. A `data-slot` and a role are API, not static copy, and stay.
- A literal that another system depends on is a contract, not a tautology. Examples: a CSS variable a consumer's stylesheet reads, a `data-*` attribute a selector in another file matches, a storage key the FOUC script reads. Pin it once, on the value the code emits, with a comment that names the other side. [Pin the contracts that cross files](#pin-the-contracts-that-cross-files) has the in-repo version.

**A change-detector test mirrors the implementation.** It turns red on any edit to the code it covers, not on a wrong behavior. The signals:

- An exact class string or a design token, or a `not.toHaveClass`.
- A `toEqual` on an internal shape, or a `toHaveBeenCalledWith` that repeats the whole object the code builds.
- A `tagName`, a child count, or a count of internal calls.
- The exact set of keys the source lists.

Each refactor then costs a test update, and the team learns to make the test match instead of reading the failure. Regression tests are the usual source, because the reflex after a bug is to freeze the current output.

- Assert through the surface a user or a caller sees: text, role, accessible name, ARIA state, a documented data attribute, a return value, a callback's arguments. A rename, a re-order, a token swap, or an extracted helper that keeps that surface leaves every test green.
- A regression test asserts the symptom the bug produced: the wrong string, the missing element, the stolen focus. It never asserts the internal state the fix touched.
- A literal output is not a change detector when the literal is the contract. Examples: the formatted number, the rendered copy, the emitted `data-slot`, the generated `<script>` string. [Assert behavior, not styling internals](#assert-behavior-not-styling-internals) owns the class-string case and its three exceptions, and names where `tagName` and document order are mantle's contract.
- `toEqual` reads both ways. Compare a returned object against the literal a caller depends on. Never compare it against the same object imported from the module under test.

## One test per branch

Before you add a case, name the branch, boundary, or lookup entry that only this case reaches. If a sibling already reaches it, do not add the case. A second input that runs the same code on the same data adds run time and no signal.

A test must pay for its upkeep. Before you add one, answer three questions: which contract does it protect, which credible regression turns it red, and why does no existing test catch that regression? If one answer is missing, do not add the test.

- One guard, one test. `null` and `undefined` take the same `== null` branch. A second enum value, a second row, or a second platform that runs the same code on the same data is a duplicate.
- A boundary is its own case. The input on a comparison (`0`, the limit, the limit plus one) catches an operator flip that a far value cannot.
- An entry in a lookup that mantle owns is its own case. Each key of a `Record<Union, string>` or a `cva` variant map selects its own output, so only a test per key catches a permuted table (`toast.test.tsx`'s intent tables are the reference).
- Test shared logic where it lives, once. A wrapper, a variant, or a consumer asserts only what it adds. `useIsBelowBreakpoint` owns the media-query read, so `sidebar.test.tsx` mocks it and pins only the mobile swap. An `apps/www` demo test pins the demo's own copy and wiring; the part's ARIA, keyboard contract, and slots are tested once, in `packages/mantle`.
- A `test.each` table holds only the rows no dedicated test covers.
- Pin a third-party library once per option you set. Do not enumerate its output table: every Radix `data-state` value, every `Intl` format output, every TanStack Table sort order.
- Do not test a type-level fact at runtime. `typeof x === "function"`, `Array.isArray` on a declared array, and a `Record<Union, string>` completeness loop are the typechecker's job.
- Do not assert static copy that no branch or lookup produces. In `apps/www`, a heading test needs a condition that can change the heading. A part's `data-slot` and role are API, so a render that pins them is a contract and not static copy.
- Delete debug probes and tombstones. A test named for the session that found a bug pins nothing a kept test does not. Nor does a test whose only assertion is that a removed control is absent.
- When you delete or move coverage, name the test that still proves the contract.
- One behavior per test. Split a test that asserts four behaviors over 60 lines; a failure must name what broke.
- The name states the behavior the test asserts. A name that says `once` or `never` asserts `toHaveBeenCalledTimes`. A name that contradicts its assertion (`returns empty string` over `toBeUndefined()`) is a review failure.

## Drive the interaction

If a component owns an event handler, a controlled prop, or a documented keyboard contract, at least one test must **drive it end to end** — `await user.click(…)` / `await user.keyboard("{ArrowDown}")` — and assert both the callback arguments and the resulting DOM/ARIA state.

Rendering a component with `defaultValue`/`open` hardcoded and checking attributes does not test an interactive component; it tests its initial markup. `readOnly` and `disabled` guards, controlled-vs-uncontrolled paths, dismissal, and sort/expand/select cycles all need a real event.

Test mantle's own logic — its wiring, guards, prop plumbing, and ARIA setup. Do not re-test Radix or Ariakit internals.

## Mock the environment, not the tree

Mock what happy-dom cannot supply: `matchMedia` (`test-utils/mock-match-media.ts`), `ResizeObserver`, the clipboard, and a viewport it cannot lay out. In `apps/www`, render the route under a memory router. Render every mantle part for real. A file that mocks twelve children with test-invented labels tests its own scaffold.

- Never mock a mantle part to replace it. Wrap a module with `vi.mock(…, { spy: true })` or a pass-through wrapper only when its call count or an option's identity is the one observable trace. Say so in a `// Why:` comment. `primitive.test.tsx` counts `datumValue` reads this way, and `virtual.test.tsx` records the `getItemKey` option and calls the real hook.
- Never assert that a mock received the value the test passed in. `render(<Sidebar.Root mobileBreakpoint="lg" />)` followed by `expect(useIsBelowBreakpoint).toHaveBeenCalledWith("lg")` is an echo. Assert what the part does with the mock's return value.
- Never read a mocked child's props through a captured object. Render the real child and assert what it shows, or assert a `data-*` attribute it emits.
- Assert a mocked hook's arguments only for an option that changes behavior. Match an options object with `expect.objectContaining`, and a primitive argument with `toHaveBeenCalledWith`. Never pin an empty argument list or an options object by identity.
- Spy on a DOM method only when happy-dom leaves the call as the sole observable (`scrollIntoView`), and say so in a comment. Otherwise assert the effect where a consumer sees it: the DOM, ARIA state, or a callback's arguments.
- A hook that only forwards one mocked hook's result into another has nothing to test. Test the guard it protects or the consumer that renders the result.
- When several parts share one hook or helper, test it once where it lives. A part's test then pins only its own wiring.
- Never add a production seam for a test: a test-only export, a flag, a global, or a parameter that only tests pass to shorten a delay or a timeout. Skip a delay with fake timers ([Determinism](#determinism)) and drive the real entry point. A pure function that takes the current time as an argument is not a seam ([pure core, effects at the edges](./principles/pure-core-effects-at-the-edges.md)).

## Keep the file lean

- Put a shared render or hook setup in one file-local helper. A test body holds only the inputs and the assertions that differ. Thirty copies of a twelve-line provider render is scaffold, not coverage.
- One scaffold per file. Split a file that needs a second `vi.mock` set or a second render helper, and colocate each part with the export it tests.
- A test file covers the module it is named for. A test for a fixture, a `test-utils` helper, or a sibling part moves to that module's own test file.
- Type a mocked import with `vi.mocked(useX)`, never `(useX as Mock)`. The no-assertion rule in [TypeScript](../CONVENTIONS.md#typescript) applies to tests; narrow a fixture with `satisfies` or a typed factory.
- Delete teardown that the Vitest config already runs: it restores mocks and unstubs envs and globals ([Determinism](#determinism)), and each setup file runs `cleanup()` after each test. (lint: `mantle/no-config-teardown`) A `describe` that wraps one test is noise.

## Assert behavior, not styling internals

**Do not assert Tailwind utility strings.** Neither project loads Tailwind, so `expect(el.className).toContain("shadow-inner")` compares a string to the source literal — it observes nothing about rendering, and it false-fails on behavior-preserving token renames. Reach instead, in order, for:

1. the documented public API the class implements — a `data-slot`, a documented data attribute, or a documented CSS custom property (all three are public API per [COMPONENT_SPEC.md](../COMPONENT_SPEC.md));
2. a behavioral assertion (role, accessible name, text, ARIA state, callback);
3. in browser mode only, `getComputedStyle` with the load-bearing CSS injected inline in the test file (`label.browser.test.tsx` is the reference);
4. deleting the assertion, if none of the above applies.

Three uses are legitimate and should stay, each of which needs a comment saying which one it is: **tailwind-merge override contracts** (proving a consumer's `className` beats a default — assert the merge outcome, not a list of internal defaults), **explicitly commented cross-file spelling pins** that tie a class to a selector in another file, and **the class as the only observable implementation of an enumerated prop** — when a variant emits no data attribute and no other DOM difference, the class is the only thing that can catch a permuted lookup table (`toast.test.tsx`'s intent tables are the reference; prefer exposing a data attribute when you own the component).

Also: `toHaveClass` ignores extra classes, so it cannot back a test name that promises exclusivity. And no snapshot tests of rendered HTML — use declarative assertions (`getByRole`, `getByText`, `toBeInTheDocument`). `toMatchInlineSnapshot` is for serialized data shapes only.

Never assert that a class is absent. `not.toHaveClass("overflow-hidden")` passes when the regression comes back as `overflow-clip` or an inline style, so assert the data attribute or the behavior the class implements. (lint: `mantle/no-absent-class-assertion`) `tagName`, child counts, and `compareDocumentPosition` pin the markup. Use them only where the markup is mantle's contract: an `asChild` swap, a documented part order, a layer tier (`layer-container.test.tsx`). In `apps/www` that markup is mantle's, so assert roles, names, and text.

`toBeVisible()` reads the computed style, and no utility rule is ever loaded, so a `hidden` class leaves `display: block` in happy-dom. There, `not.toBeVisible()` observes only an inline `style` or the `hidden` attribute, never a Tailwind class. The positive form is a presence check that costs a style read. In happy-dom, use `toBeInTheDocument()` for presence, never the positive `toBeVisible()`. `not.toBeVisible()` stays legal for an inline style or the `hidden` attribute. (lint: `mantle/no-happy-dom-to-be-visible`, off in `*.browser.test.*` files)

## Pin the contracts that cross files

`data-slot` and documented data attributes are public API, so a rename is a breaking change for consumer CSS. Give each component one table-driven test asserting every part's slot lands on the expected element (`centered-layout.test.tsx` models this).

When a selector in one file depends on an attribute or class emitted in another (`has-data-*`, `group-data-*`, `group-has-[…]`, `[&>.…]`), assert _both sides in one test_ that renders them together. Asserting only the consumer's selector leaves the pair one rename away from a silent layout break with every test green.

## Cover the server render

Anything whose purpose is server output needs `renderToString` from `react-dom/server` — pre-hydration branches, SSR-only props, and FOUC prevention. Asserting only post-mount state cannot see the render path, because the mount effect overwrites it before the assertion runs.

For logic that is stringified into an inline `<script>`, evaluate the produced string in the test (`new Function(scriptContent())()`) and assert its side effects. Nothing else makes a closure-scoping regression in it visible — lint, typecheck, and build all pass on a script that throws at runtime.

## Determinism

- **No arbitrary sleeps.** `await new Promise((resolve) => setTimeout(resolve, 100))` is a race, not a wait. Use `waitFor`, `findBy*`, or `expect.poll` on the state you actually need — for observer-driven measurement, poll the measured value itself. (lint: `mantle/no-sleep-in-tests`)
- Never mutate state inside a `waitFor` callback; it can run many times.
- **Skip a real delay with fake timers that still advance.** `vi.useFakeTimers()` freezes the timers that `findBy*` and `waitFor` poll with, so they never retry. Use `vi.useFakeTimers({ shouldAdvanceTime: true })`, skip the delay with `await vi.advanceTimersByTimeAsync(ms)`, and call `vi.useRealTimers()` in `afterEach`. The Vitest config does not restore timers.
- **Put the target state in the `findBy*` query.** When the element is already mounted and the test waits for it to change, `findByRole("heading", { level: 1 })` resolves at once on the stale heading. The `toHaveTextContent` that follows gets no retry window. Write `findByRole("heading", { level: 1, name: "Domains" })` or `findByText` instead.
- Install spies **after** `userEvent.setup()`. `setup()` swaps `navigator.clipboard` for its own stub, so a patch applied before it is silently discarded.
- Every test-bearing package sets `restoreMocks`, `unstubEnvs`, and `unstubGlobals` in its Vitest config (mantle's root config, which both of its projects inherit, `apps/www`, `mantle-vite-plugins`, `mantle-server-syntax-highlighter`), so `vi.spyOn` spies and `vi.stubGlobal`/`vi.stubEnv` stubs are torn down between tests automatically. A trailing `spy.mockRestore()` in a test body is dead code — and relying on one is a leak, since a test that throws never reaches it. Vitest also clears every mock's call history before each test, because `clearMocks` defaults to `true`, but neither setting resets a `vi.fn()`'s implementation, so a shared `vi.fn()` that a test gives a per-test implementation still needs `mockReset()` — put it in `beforeEach`, or create the mock there. A spy that must survive across tests in a file goes in `beforeEach`, not `beforeAll`.
- No test may depend on another test having run. Verify with `pnpm vitest run --project unit --sequence.shuffle.tests --sequence.shuffle.files --sequence.seed=<n>` across a few seeds.
- Locale- and timezone-sensitive assertions rely on `TZ`/`LC_ALL` being pinned in the Vitest config, not in a package script — a pin in a script is lost the moment anyone runs a single file directly. Mantle's root config pins them via `test.env`; the browser project also pins Chromium's own `locale`/`timezoneId` through the Playwright `contextOptions`, which `process.env` cannot reach.
- Never assert a wall-clock duration or a throughput threshold. Benchmarks use the `bench` fixture from the test context (`test("name", ({ bench }) => …)`), not an `expect`.

## When to reach for browser mode

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

Browser tests load **no Tailwind** and the browser project injects no stylesheet, so a browser test that asserts geometry, visibility, or computed style **must inject the load-bearing CSS inline** (`label.browser.test.tsx` is the reference) — otherwise the layout is degenerate and the assertion passes for the wrong reason. For a component whose layout depends on arbitrary values, inject `await commands.tailwindCss("./<component>.tsx")` instead (`truncated-text.browser.test.tsx` is the reference). It compiles the classes Tailwind really emits, so a rule Tailwind drops fails the test. When injecting CSS is impractical, assert the mechanism (`element.style.height === "auto"`) rather than the geometry it produces, and say so in a comment.

If a browser test fails with `Vite unexpectedly reloaded a test` and a broken `vi.mock` after you add a bare import, the browser-mode dependency cache in `node_modules/.vite/vitest/` is stale. Delete it in that package and run again before you debug the test.

Beware the inverse trap in happy-dom: `offsetWidth`/`offsetHeight`/`getBoundingClientRect` return zeros, so an assertion like `expect(node.offsetHeight).toBe(0)` passes no matter what the implementation does.
