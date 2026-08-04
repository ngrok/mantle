# Conventions

Single source of truth for code style, prose style, patterns, and conventions in the Mantle design system monorepo. All rules below are mandatory — call out and fix violations.

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
- Comments explain _why_, not _what_. Do not restate the code. [Writing](#writing) governs how the sentence itself reads.
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
- JSDoc prose follows [Writing](#writing): lead with one summary sentence stating the contract, not implementation commentary.
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

## Writing

These rules are [ASD-STE100](https://www.asd-ste100.org/) Simplified Technical English, Issue 9, adapted to this repo. Claude Code surfaces the same rules as the `simplified-technical-english` skill; this section is the normative copy.

- **In scope:** code comments, JSDoc, `.changeset/*.md` release notes, `decisions/*.md`, docs-page copy under `apps/www/app/docs/`, commit subjects and bodies, PR descriptions, and these agent docs.
- **Out of scope:** chat replies, product copy, marketing text, vendored code (`packages/mantle/src/utils/cx/vendor/**`), and the generated code and config files [JSDoc](#jsdoc) already exempts.
- **Identifier naming** stays with [Readability & Maintainability](#readability--maintainability).

**Scope and status** — the stance is [COMPONENT_SPEC.md § Scope and status](./COMPONENT_SPEC.md#scope-and-status). This is the bar for prose you write or edit. Prose you touch comes up to the bar; the rest waits until someone opts into the work. An audit reports a prose gap; it does not open a migration inside an unrelated PR. Never reflow a verbatim quote, an ASCII composition tree, or an `@example`.

### Words

- **One word, one meaning, within one file.** Reuse one term per concept verbatim. `cache`, `store`, and `buffer` in one file read as three things.
- **Match the code.** Write the identifier's exact name and casing, in backticks — `ThemeProvider`, `data-slot`, `performance.now()`. Never paraphrase an identifier. The backticks are load-bearing: no word rule below reaches inside a backtick span. That is what keeps `justify-center`, `enabled`, and `oxlint-enable` off the ban list.
- **Prefer the short common verb** — `use`, `get`, `set`, `add`, `remove`, `keep`, `read`, `write`, `start`, `stop`, `fix`.
- **Never write** `utilize`, `facilitate`, `orchestrate`, `basically`, `essentially`, `comprehensive`, `robust`, or `ensure`. None of them states a fact. For `ensure`, write `make sure` — [Testing](#testing) already uses it — or name the mechanism that guarantees the outcome.
- **Never write `simply`.** The ban is word-exact: `simplify`, `simpler`, and `simplified` are fine.
- **Cut the hedges.** Delete `it seems`, `arguably`, `might possibly`, `should probably`, and `this could be removed`. Keep `must`, `can`, `may`, `never`, and `always` — each states a constraint or a real option.
- **These six carry a second, earned sense in mantle's prose. Ban the first sense only:**
  - `provide` — cut the verb; write `pass`, `set`, or `carry`. Write `when set` for `when provided`, and `when omitted` for `if not provided`. The `Provider` and `*Provider` identifiers stay, and so does React context vocabulary (`the context Root provides`).
  - `leverage` — cut the verb; write `use`. The noun `high-leverage` stays.
  - `perform` — cut the vague verb, so `performs an action` becomes `runs an action`. The noun `performance` and the API `performance.now()` stay.
  - `enable` — use the verb for a real flag only (`Whether to enable filtering of command items.`). The adjective `enabled` is the antonym of `disabled`, not the verb. It always stays, and so does `oxlint-enable`.
  - `just` — where deleting it changes no meaning, cut it. Contrastive `not just`, comparative `just as` and `just like`, temporal `just` (`the index just past the closing quote`), and `justify-*` all stay.
  - `seamless` — cut the quality adjective. It stays for a tile that repeats with no visible seam (`packages/mantle/src/components/chart/texture.ts`).
- **Cap a noun stack at three words.** A backticked identifier counts as one word. `retry backoff config` passes. `user account credential rotation policy handler` fails — add a preposition: `handler for rotating user account credentials`.
- **Spell out a new abbreviation on first use in the file.** Never invent one. Two lists decide it:
  - **Bare is fine** — `HTTP`, `API`, `SQL`, `TLS`, `URL`, `DOM`, `CSS`, `HTML`, `JSON`, `SVG`, `JSX`, `UI`, `ID`, `SSR`, `ARIA`, `a11y`, `WAI`, `APG`, `FOUC`, `CDN`, `POJO`, and the initialisms [Readability & Maintainability](#readability--maintainability) allows in identifiers.
  - **Spell it out** — anything narrower, such as `MQL`, `OTP`, or `TZ`.

### Sentences

- **Use the active voice.** Write `The processor drops the event.`, not `The event is dropped by the processor.` When the actor is unknown or irrelevant, the passive voice is correct.
- **Use simple tenses only** — present, past, future, imperative, infinitive. Write `renders`, not `will be rendered`. Never use an `-ing` form as the main verb.
- **Put one idea in each sentence.** When both halves stand alone, split the sentence on `and` or `but`.
- **The em-dash aside and the prose semicolon are house style. They stay.** When the aside names an exception, a fallback, a consequence, or the mechanism, keep it — `the consumer's own id when they pass one, else the label's generated id`. When it restates the first half, cut it. An aside is not a second idea.
- **Put the condition first.** Write `If the lease expires, the worker exits.`, not `The worker exits if the lease expires.`
- **Do not drop words to shorten.** Keep the articles, subjects, and verbs inside a sentence. Concision removes ideas, not grammar: rewrite `// resets cursor on flush` as `// The flush resets the cursor.`
- **A fragment is correct in three places, and the rule above does not reach them:**
  - a list item, including a label-colon bullet
  - a JSDoc summary or prop doc that names a thing — `The click event handler.`
  - a `Why <topic>:` comment label
- **Never add a verb to turn one of those three into a sentence.** Most bullets in this file, and most mantle JSDoc summaries, are verbless by design.
- **Three or more parallel items make a list**, not a longer sentence.
- **Length is a smell, not a gate.** Keep procedural text — a commit subject, a step, a `TODO` — to 20 words, and descriptive text to 25. The limits do not reach `.changeset/*.md` or `decisions/*.md`. When a descriptive sentence runs past 25 words, ask which one it is:
  - a clause, a colon, and an enumeration — write a list.
  - several facts in one sentence — split it.
  - one contract that needs every word — keep it. Most JSDoc summaries here land near 10 words. A 40-word summary that pins a whole contract beats four vague ones.

### Comments and JSDoc

- **State the constraint, the trade-off, or the surprise.** The code already states what it does — see [Readability & Maintainability](#readability--maintainability). Never restate the identifier.
- **Prefer the `Why <topic>:` label for a constraint** — `// Why: navigator.platform is deprecated…`, `// Why no asChild:`, `// Why event delegation:`. Do not expand a label into a sentence.
- **Never narrate the investigation.** What you checked, tried, or read belongs in the PR description.
- **Put the warning above the code it guards.**
- **Lead with one summary sentence, then state the contract** — inputs, outputs, errors, units, invariants. [JSDoc](#jsdoc) says which exports need one. [COMPONENT_SPEC.md §4](./COMPONENT_SPEC.md#4-jsdoc) owns _what_ a component's JSDoc must contain; this section owns _how_ those sentences read.
- **Restructure instead of explaining.** If a comment excuses confusing code, rename or split the code.
- **`@example` prose follows these rules; the code in the fence does not.** Never paraphrase example code. Never de-duplicate the repeated full-tree examples [COMPONENT_SPEC.md §4.2](./COMPONENT_SPEC.md#42-compound-components-the-full-tree-rule) requires.
- **Editing a JSDoc summary is a multi-file change.** The same summary often repeats on a part declaration, its namespace property, and an `.mdx` page — fix every copy. Editing a summary or an `@example` also changes `apps/www/app/utilities/__snapshots__/components-surface.json` — regenerate it with `pnpm -F @app/www test -u` or CI fails.
- **Two spans are not yours to edit.** Never rewrite quoted upstream text that carries a `@see` citation — MDN's `autocomplete` values in `packages/mantle/src/components/input/types.ts` — because an edit forks it from its source. oxlint parses the `oxlint-disable` and `oxlint-enable` directive text, so only the `-- reason` clause after it is prose. A fragment there is fine.

```tsx
// ❌ restates the identifier, and the second sentence adds nothing
/** The input component for the Command. It provides the input for the command palette. */
// ✅ names what this part does that a sibling does not
/** The palette's query field. */
```

Worked before/after pairs live in the `simplified-technical-english` skill, out of always-on context.

### Changesets, decision docs, and docs pages

- **A changeset is release notes, not a commit message.** `.changeset/*.md` ships verbatim into the public `CHANGELOG.md`, for a consumer who will never read the diff. The word bans hold; the length limits and the commit rules do not. [COMPONENT_SPEC.md §2.5](./COMPONENT_SPEC.md#25-changesets) owns what the body must cover, and [VERSIONING.md](./VERSIONING.md) owns which bump it takes.
- **A decision doc follows these rules, new or shipped.** Its record is the decision, not the wording, so tightening the prose does not rewrite history. Never change what a shipped one decided, and never restate its dated evidence as a present-tense claim.
- **Docs-page copy follows these rules.** [COMPONENT_SPEC.md §7.4](./COMPONENT_SPEC.md#74-prose-rules) owns what that copy must cover.

### Commit messages and PR descriptions

- **Write the subject in the imperative, after the conventional-commit prefix this repo uses** — `fix(breadcrumb): mute current page text`. Keep it to ten words or fewer after the prefix, with no trailing period. The `(#1234)` suffix GitHub appends on squash-merge does not count.
- **The one-idea rule governs prose sentences, not the subject line.** A multi-part change gets one subject, and the parts go in the body — `feat(command): add SearchTrigger, a stateful DialogRoot, and ⌘K`.
- **When the subject is not enough, add a body.** State the reason for the change. Then state how the behavior changes. Files are not behavior.
- **Never list the changed files.** The diff is the changelog.
- **This repo ships no PR template, so this is the section order:**
  - **Why** — the problem, the trigger, and the intended outcome.
  - **How** — the approach in one or two sentences. Do not tour the diff.
  - **Validation** — one line per check. Include only what a reviewer cannot read off CI.
  - Investigation detail, rejected alternatives, and links belong here, not in the source.
- **Cut the boilerplate.** No generated footer, no empty section, no restated file list.

### Self-check

Before you return text or report a diff complete, read what you wrote for:

- a banned word that no carve-out covers
- the passive voice, a compound tense, or an `-ing` form as the main verb
- a sentence with two independent ideas, or a condition at the end
- a noun stack over three words, or an unexpanded abbreviation that is not exempt
- a comment or summary that restates the identifier, the code, or itself
- a changed JSDoc summary whose other copies and `components-surface.json` snapshot are still stale

Fix what you find. Report it in the `Conventions pass:` note [AGENTS.md](./AGENTS.md) requires.

## className Composition

```tsx
import { cx } from "@ngrok/mantle/cx";

// ✅
<div className={cx("foo", condition && "bar", { baz: isActive })} />

// ❌ no string interpolation, +, or ternaries inside className
<div className={`foo ${condition ? "bar" : ""}`} />
```

## Browser Translation

A browser translation engine rewrites the DOM under React. Google Translate wraps each text node in a `<font>`
and reparents the original node, so React's reference points at a node its parent no longer owns. Two rules
follow, and both bind `packages/` and `apps/` alike. The mechanism, the update-by-update table of what breaks,
and the rejected alternatives are in
[`decisions/2026-08-04-translation-safe-label-wrappers.md`](./decisions/2026-08-04-translation-safe-label-wrappers.md).

### Never render a conditional element immediately before bare text children

```tsx
// ❌ when `icon` appears, React inserts it before a reparented text node, and the DOM raises `NotFoundError`
<button>
	{icon && <Icon svg={icon} />}
	{children}
</button>

// ✅ the icon inserts before an element sibling
<button>
	{icon && <Icon svg={icon} />}
	<span data-slot="button-label">{children}</span>
</button>
```

React re-throws the raw `DOMException`, so the root tears down and the page goes blank. `Button` hit this on
the first click of every submit button, because `isLoading` synthesizes the icon.

Three fixes work, and the conditional element decides which one:

- **Wrap the text in an element.** The wrapper carries its own `data-slot` — `button-label`, `badge-label`,
  `anchor-label` — so a consumer can find the label. Give it `display: contents` inside a flex container,
  because a wrapper that lays out a box takes every child out of the parent's `gap`.
- **Move the element after the text.** The mount becomes an `appendChild`, which is safe. Prefer this for a
  decorative element that sits out of flow, because it adds no DOM (`DataTable.ActionHeader`).
- **Mount the element unconditionally and write text into it.** A `textContent` write is safe and self-healing, because
  it wipes the `<font>`. Prefer this for an `sr-only` announcer, which costs no layout
  (`DataTable.HeaderSortButton`).

A lone expression child is already safe: React writes it through `setTextContent`, which repairs the subtree.
The failure needs a sibling.

### Mark untranslatable content `translate="no"`

A reader copies or retypes some strings: code, a CLI flag, an env var, a YAML key, a shortcut key, a filename,
an ID, a one-time passcode. A translated one is wrong, and the reader uses it anyway. Set
[`translate="no"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate) on
the element that holds the string. Descendants inherit the attribute, so it also keeps the engine out of the
subtree — which makes it the second fix for the crash above.

When the element can never hold prose, lock the attribute. Omit `translate` from the props type, and stamp it
**after** the props spread, so a wider props object cannot carry a value past the type either:

```tsx
function Kbd({ children, ...props }: Omit<ComponentProps<"kbd">, "translate">) {
	return (
		<kbd
			{...props}
			// Why after the spread: a wider props object can still carry `translate`
			// past the type, and a translated shortcut key names the wrong key.
			translate="no"
		>
			{children}
		</kbd>
	);
}
```

`Kbd`, `CodeBlock.Code`, and `OtpInput.Slot` lock it. Keep the prop when the element can hold prose, so
`translate="no"` reads as a default: `Code` also styles terms that are not code, and a `CodeBlock.Title` is
not always a filename.

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
- Every test-bearing package sets `restoreMocks`, `unstubEnvs`, and `unstubGlobals` in its Vitest config (both mantle projects, `apps/www`, `mantle-vite-plugins`, `mantle-server-syntax-highlighter`), so `vi.spyOn` spies and `vi.stubGlobal`/`vi.stubEnv` stubs are torn down between tests automatically. A trailing `spy.mockRestore()` in a test body is dead code — and relying on one is a leak, since a test that throws never reaches it. `restoreMocks` does **not** clear a `vi.fn()`'s implementation or call history, so a `vi.fn()` shared across tests still needs `mockReset()` — put it in `beforeEach`, or create the mock there. A spy that must survive across tests in a file goes in `beforeEach`, not `beforeAll`.
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
- Shared deps go through the `catalog:` in `pnpm-workspace.yaml`; each package then references `catalog:`. When more than one package uses a dep, add it to the catalog first.
- For `@pkg/*` workspace packages, use `catalog:` in `devDependencies` and `peerDependencies` (not `dependencies`) so apps install the dep themselves and avoid duplicates.
