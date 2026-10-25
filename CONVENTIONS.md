# Conventions

The code and prose rules for every file in the monorepo. Read this file in full before you change code. All rules below are mandatory; call out and fix violations.

Task-scoped rules live in their own files, and [AGENTS.md](./AGENTS.md) says which task reads which: [COMPONENT_SPEC.md](./COMPONENT_SPEC.md) for components, [docs/testing.md](./docs/testing.md) for tests, [docs/browser-translation.md](./docs/browser-translation.md), and [docs/framework-boundary.md](./docs/framework-boundary.md).

A rule tagged `(lint: name)` has an oxlint check, and the lint message says why and how to fix it. Custom rules are `mantle/<name>` in [scripts/oxlint-plugin-mantle.js](./scripts/oxlint-plugin-mantle.js). An untagged rule has no check, so you and the reviewer enforce it.

## Files & Modules

- kebab-case file names, except names a framework requires, such as `entry.server.tsx`. (lint: `unicorn/filename-case`)
- ESM only: `import`/`export`, `const`, `async`/`await`, arrow functions.
- Prefer named exports. Use `import type` for type-only imports.
- Relative imports in `/packages`, `~/` aliases in `/apps`.
- Import one phosphor icon per module: `@phosphor-icons/react/Check`, never the barrel or the `ssr` variants. (lint: `mantle/no-barrel-imports`)

## Formatting & Linting

- Formatter: oxfmt (tabs, tabWidth 2, double quotes). Run `pnpm -w run fmt`; never hand-format.
- oxfmt reads its indentation from `.editorconfig` and its ignore list from `.gitignore` and `.prettierignore`.
- oxfmt does not read `.oxcfmtrc.json`, because it looks for `.oxfmtrc.json`. Its settings are not in force, and a rename reformats about 720 files, so that rename is its own change.
- A `//,` line comment as the first entry of an import, export, or array list keeps oxfmt from joining the list onto one line, so each add or remove is a one-line diff. Write a multi-specifier named export multi-line with a `//,` first. Never delete one. (lint: `mantle/multiline-exports`)
- oxlint lints (`.oxlintrc.json`). Never biome, prettier, or eslint.
- Suppress a lint rule on the line only, with a `-- <reason>` clause that names the constraint. (lint: `mantle/require-suppression-reason`)

## Code Quality

### Readability & Maintainability

- Optimize for readability and changeability, not terseness or cleverness.
- Brace all control flow: no single-line `if` or `for` bodies. (lint: `curly`)
- Name bindings in full: `error`, not `e`; `event`, not `evt`; `element`, not `el`. Widely known initialisms (`URL`, `CSS`, `SSR`) are fine. (lint: `mantle/descriptive-names`)
- Comments explain _why_, not _what_. Do not restate the code. Describe the code as it is now. Never refer to a previous state or a dropped design that exists only in your context window. A comment stops at two sentences and uses plain words. [Writing](#writing) governs how the sentence itself reads.
- Write a single-use event handler inline. Hoist it only when it is reused, memoized, or simplifies the render body.
- No nested ternaries; use early returns or component branching. One ternary is fine. (lint: `no-nested-ternary`)
- Prefer `const` to `let`. When a value depends on a condition, use a ternary or an early return, not a `let` that each branch assigns. (lint: `prefer-const`, for the never-reassigned case)
- Render conditional JSX with `{condition && <Thing />}`, not `{condition ? <Thing /> : null}`. Guard a non-boolean first (`items.length > 0 && …`) so `0` or `""` never renders. A ternary is for two rendered branches. (lint: `mantle/no-jsx-null-ternary`)
- Never use `React.FC` or `FC`; type the function inline. Never use `forwardRef`: in React 19, `ref` is a regular prop. Base props on `ComponentProps<…>`, which includes `ref`. (lint: `no-restricted-imports` in `packages/mantle/src`)
- Use a named options object, not positional params, for any boolean param, for 3 or more params, and for 2 params when the call site is not self-evident: `fn({ enabled: true })`, not `fn(true)`. (lint: `max-params` flags 4 or more params, `mantle/no-boolean-positional-param` flags a boolean next to other params)
- Design an API for the call site: a shared abstraction makes common use simpler and clearer, not only shorter.
- Never use a deprecated API; use its replacement. When a deprecated path is unavoidable, suppress the line with a `-- Why:` clause that names the constraint. (lint: `typescript/no-deprecated`)

### Error Handling

- Errors are control flow; `console.error` is not handling. Every error path recovers, propagates, or terminates on purpose.
- Fail explicitly, not with silent fallbacks or partial state updates.
- Fail fast on a violated invariant; do not let invalid state travel deeper.
- Await, return, or `void` every promise. A floating promise drops its rejection. (lint: `typescript/no-floating-promises`)

### State & Business Logic

- [Pure core, effects at the edges](./docs/principles/pure-core-effects-at-the-edges.md) and [derive, don't sync](./docs/principles/derive-dont-sync.md) are the rules.
- Keep data flow directional and explicit. No hidden coupling between components, hooks, modules, or mutable shared state.

### React Compiler

- The React Compiler runs in strict mode by default. The tsdown build, the vitest suite, and the docs site share `packages/mantle/react-compiler.config.ts`. It sets `panicThreshold: "all_errors"` and turns on every compiler validation, so a function that the compiler cannot compile or validate fails the build.
- Write code that the compiler can compile. When the build fails, rewrite the function to the [Rules of React](https://react.dev/reference/rules). Do not opt it out.
- `"use no memo"` is a last resort, for a library that the compiler cannot model (`list/virtual.tsx` and `@tanstack/react-virtual`). Add a `Why` comment that names the library.
- oxlint turns on every rule that ports a compiler diagnostic, so the editor shows what the build rejects. Never disable a React hooks or React Compiler rule; restructure the code. (lint: `mantle/no-react-hooks-suppression`)
- The usual fixes:
  - State that follows a prop: set it during render behind a condition, not in an effect.
  - A value that lives outside React, such as DOM text: read it with `useSyncExternalStore`.
  - An effect that runs when a value changes: read the value in the effect. To skip the mount, compare it with a ref of the last value.

### Abstractions & Duplication

- Write the least code that does the task ([write less code](./docs/principles/write-less-code.md)). Leave out helpers, options, and follow-ups the task does not need.
- Delete unused abstractions, indirection, and dead code; do not keep speculative flexibility. Every layer of indirection must justify its existence.
- DRY follows YAGNI: do not add an abstraction because two pieces of code look similar.
- Prefer duplication over the wrong abstraction ([The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)). Extract shared code only when 3 or more uses share the same behavior, shape, and reason to change.
- Compose small pure functions, focused components, hooks, slots, and options objects. No inheritance, base components, broad wrappers, or "one helper to rule them all" APIs. When an abstraction gathers caller-specific special cases, inline it back into the call sites.

### JSDoc

- Add JSDoc to all exported functions, methods, hooks, components, and prop types.
- Add JSDoc to complex file-local logic whose intent or contract would not be immediately obvious from the implementation and types alone.
- JSDoc prose follows [Writing](#writing): lead with one summary sentence stating the contract, not the implementation or the history. Delete a `@param` or `@returns` that only restates the name or the type.
- JSDoc for functions, hooks, and components SHOULD include at least one concise `@example`.
- Each `@example` should demonstrate the intended call or render shape with realistic inputs/props and the key expected behavior or result. Keep setup minimal.
- Generated code, code-gen output, and config files are exempt.

### TypeScript

- Strict mode enabled. Shared configs from `@cfg/tsconfig`.
- No `any`; use `unknown` and narrow it. (lint: `no-explicit-any`)
- Use `type`, not `interface`, outside `declare global` and `declare module`. A `type` cannot merge by accident. (lint: `mantle/prefer-type-alias`)
- No non-null assertions (`value!`). Narrow with null checks, early returns, assertion functions, or a restructure. (lint: `typescript/no-non-null-assertion`)
- Use `value == null` and `value != null` to cover `null` and `undefined`. Use `=== undefined` only when `undefined` and `null` mean different things. (lint: `eqeqeq` rejects `=== null`)
- No type assertions (`value as Type`) in application code. Exceptions: `as const`, assertions inside a dedicated type guard, and framework or runtime boundaries that cannot be typed. Never assert to silence an error. (lint: `typescript/no-unsafe-type-assertion`, for unsafe ones)
- A `switch` on a union covers every member or has a `default`. (lint: `typescript/switch-exhaustiveness-check`)
- Model state with discriminated unions and narrowing, not optional-property bags.

## Writing

These rules are [ASD-STE100](https://www.asd-ste100.org/) Simplified Technical English, Issue 9, adapted to this repo. Claude Code surfaces the same rules as the `simplified-technical-english` skill; this section is the normative copy.

- **In scope:** code comments, JSDoc, `.changeset/*.md` release notes, `decisions/*.md`, docs-page copy under `apps/www/app/docs/`, commit subjects and bodies, PR descriptions, and these agent docs.
- **Out of scope:** chat replies, product copy, marketing text, vendored code (`packages/mantle/src/utils/cx/vendor/**`), and the generated code and config files [JSDoc](#jsdoc) already exempts.
- **Identifier naming** stays with [Readability & Maintainability](#readability--maintainability).

**Scope and status** — the stance is [COMPONENT_SPEC.md § Scope and status](./COMPONENT_SPEC.md#scope-and-status). This is the bar for prose you write or edit. Prose you touch comes up to the bar; the rest waits until someone opts into the work. An audit reports a prose gap; it does not open a migration inside an unrelated PR. Never reflow a verbatim quote, an ASCII composition tree, or an `@example`.

### Words

- **One word, one meaning, within one file.** Reuse one term per concept verbatim. `cache`, `store`, and `buffer` in one file read as three things.
- **Match the code.** Write the identifier's exact name and casing, in backticks — `ThemeProvider`, `data-slot`, `performance.now()`. Never paraphrase an identifier. The backticks are load-bearing: no word rule below reaches inside a backtick span. That is what keeps `justify-center`, `enabled`, and `oxlint-enable` off the ban list.
- **Prefer the short common word** — `use`, `get`, `set`, `add`, `remove`, `keep`, `read`, `write`, `start`, `stop`, `fix`. Write the rest in plain words. The reader knows the identifiers and the house terms, and no other jargon.
- **Never write** `utilize`, `facilitate`, `orchestrate`, `basically`, `essentially`, `comprehensive`, `robust`, or `ensure`. None of them states a fact. For `ensure`, write `make sure` ([docs/testing.md](./docs/testing.md) already uses it), or name the mechanism that guarantees the outcome.
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
- **Rewrite the em-dash aside as a parenthetical, a colon, a comma, or its own sentence. The prose semicolon is house style and stays.** When the aside names an exception, a fallback, a consequence, or the mechanism, keep the content and move it behind a colon or into parentheses (`the consumer's own id when they pass one, else the label's generated id`). When it restates the first half, cut it. An aside is not a second idea.
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

- **State the constraint, the trade-off, or the surprise, in one sentence, two at most.** The code already states what it does — see [Readability & Maintainability](#readability--maintainability). Never restate the identifier.
- **Prefer the `Why <topic>:` label for a constraint** — `// Why: navigator.platform is deprecated…`, `// Why no asChild:`, `// Why event delegation:`. Do not expand a label into a sentence.
- **Never narrate the investigation.** What you checked, tried, or read belongs in the PR description.
- **Describe the code as it is now.** Never refer to a previous state or a dropped design that exists only in your context window. The reader has the code and the git history, not your session.
- **Put the warning above the code it guards.**
- **Lead with one summary sentence, then state the contract** — inputs, outputs, errors, units, ranges, defaults, side effects, invariants, and nothing more. Delete a `@param` or `@returns` that only restates the name or the type. Keep one that names a unit, a range, a default, or a side effect. [JSDoc](#jsdoc) says which exports need one. [COMPONENT_SPEC.md §4](./COMPONENT_SPEC.md#4-jsdoc) owns _what_ a component's JSDoc must contain; this section owns _how_ those sentences read.
- **Restructure instead of explaining.** If a comment excuses confusing code, rename or split the code.
- **`@example` prose follows these rules; the code in the fence does not.** Never paraphrase example code. Never de-duplicate the repeated full-tree examples [COMPONENT_SPEC.md §4.2](./COMPONENT_SPEC.md#42-compound-components-the-full-tree-rule) requires.
- **Editing a JSDoc summary is a multi-file change.** The same summary often repeats on a part declaration, its namespace property, and an `.mdx` page — fix every copy. Editing a summary or an `@example` also changes `apps/www/app/utilities/__snapshots__/components-surface.json` — regenerate it with `pnpm -F @app/www test -u` or CI fails.
- **Two spans are not yours to edit.** Never rewrite quoted upstream text that carries a `@see` citation — MDN's `autocomplete` values in `packages/mantle/src/components/input/types.ts` — because an edit forks it from its source. oxlint parses the `oxlint-disable` and `oxlint-enable` directive text, so only the `-- reason` clause after it is prose. A fragment there is fine.

```tsx
// ❌ restates the identifier, and the second sentence adds nothing
/** The input component for the Command. It provides the input for the command palette. */
// ✅ names what this part does that a sibling does not
/** The palette's query field. */

// ❌ names a design the reader never saw
/** Measures the list. No longer uses ResizeObserver; that design was dropped. */
// ✅ states the contract as it stands
/** Reports whether the list overflows its scrollport. */
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
- an em-dash aside that a parenthetical, a colon, a comma, or a split sentence should replace
- a sentence with two independent ideas, or a condition at the end
- a noun stack over three words, or an unexpanded abbreviation that is not exempt
- a comment or summary that restates the identifier, the code, or itself
- a reference to a previous state or a dropped design that the reader cannot see
- a code comment over two sentences
- a `@param` or `@returns` that only restates the name or the type
- a changed JSDoc summary whose other copies and `components-surface.json` snapshot are still stale

Fix what you find. Report it in the `Conventions pass:` note [AGENTS.md](./AGENTS.md) requires.

## Browser code

- Gate browser-only code with `canUseDOM()` from `@ngrok/mantle/browser-only`, never `typeof window`, `typeof document`, or `typeof navigator`. Node has a `navigator` global. (lint: `mantle/prefer-can-use-dom`)
- Set `width` and `height` on every `<img>`, so the layout does not shift when it loads. (lint: `mantle/img-dimensions`)

## className Composition

Compose `className` with `cx` from `@ngrok/mantle/cx`, never `clsx` or `classnames`. (lint: `mantle/no-classname-construction`, `mantle/no-clsx-classnames`)

Write each Tailwind class in its canonical form, such as `p-4!`, not `!p-4`. A hook and lint-staged rewrite it on edit and on commit; `pnpm -w run tailwind:check` reports it. A spacing step is a multiple of 0.25. (lint: `mantle/tailwind-quarter-step-spacing`)

```tsx
import { cx } from "@ngrok/mantle/cx";

// ✅
<div className={cx("foo", condition && "bar", { baz: isActive })} />

// ❌ no string interpolation, +, or ternaries inside className
<div className={`foo ${condition ? "bar" : ""}`} />
```

## Package Management

- All external deps use exact pinned versions (no `^` / `~`). Single-use: `pnpm add -E <package>`.
- Shared deps go through the `catalog:` in `pnpm-workspace.yaml`; each package then references `catalog:`. When more than one package uses a dep, add it to the catalog first.
