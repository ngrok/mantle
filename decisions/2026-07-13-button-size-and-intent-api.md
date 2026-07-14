# Button family: unified `size` scale and the `priority` → `intent` + required-props redesign

## Status

Accepted — 2026-07-13.

- **Phase 1 (`size`)**: implemented alongside this record; ships in the next `@ngrok/mantle` minor
  (decoupled from the intent redesign so consumers can adopt `size` and `CenteredLayout` first).
- **Phase 2 (`intent` redesign)**: accepted, not yet implemented; ships in a later minor with its
  own changeset and migration prompt.

Supersedes the API direction explored in [PR #1105](https://github.com/ngrok/mantle/pull/1105)
(Micah's button POC). The design decisions from that PR are kept; the diff itself is not salvaged —
it predates the docs IA reorganization, the optional-`type` default
([2026-06-17](./2026-06-17-default-button-type-button.md)), `data-slot`, and the button test suites.

## Context

Mantle's action buttons need denser and larger variants (the product frontend hand-rolls 33
`className` height overrides today), a `subtle` appearance, and a coherent tone vocabulary.
Four components currently expose a `priority` prop with four disjoint value unions (Button
`danger | default | neutral`, Alert `danger | important | info | success | warning`, Toast
`danger | info | success | warning`, AlertDialog `info | danger`), and Button's implicit defaults
(`appearance="outlined"`, `priority="default"`) hide the accent styling decision at every
un-annotated call site.

A multi-dimensional review of PR #1105 (2026-07-13) verified the blast radius: ~1,035 `priority=`
occurrences across 336 files in ngrok's frontend, ~176 un-annotated `<Button>`s that would silently
restyle under a default flip, and 24 `priority="default"` sites with no same-name target. It also
confirmed two implementation defects to avoid repeating: the POC's `size` variant leaked
`text-sm font-medium` onto `appearance="link"`, and its `subtle` appearance fails WCAG AA contrast
in the light theme.

## Decision

### 1. One size scale for the button family (Phase 1 — shipped with this record)

`Button` and `IconButton` share a single `ButtonSize` scale — same names, same box heights:

| size | Button          | IconButton         |
| ---- | --------------- | ------------------ |
| `xs` | `h-6` `px-2`    | `size-6`           |
| `sm` | `h-7` `px-2.5`  | `size-7`           |
| `md` | `h-9` `px-3`    | `size-9` (default) |
| `lg` | `h-10` `px-3.5` | `size-10`          |
| `xl` | `h-12` `px-4`   | `size-12`          |

- The default is `md` on both, which preserves today's rendering exactly.
- When an `icon` is present, Button's icon-side padding is the size's padding minus `0.125rem`
  (the existing `md` behavior, generalized).
- **Typography does not scale with `size` (for now).** All sizes keep `text-sm font-medium`. This
  matches the POC and real usage — the frontend's hand-rolled `h-12` CTAs run 14px text today.
  Revisit with design input; scaling later is additive.
- **Icon glyphs do not scale either (for now).** `Icon` renders 20px at every size, so an `xl`
  IconButton visibly underfills its 48px box (42% fill vs 83% at `xs`). Same follow-up as
  typography: revisit with design input; scaling later is additive.
- **`size` has no effect on `appearance="link"`.** Link buttons deliberately inherit surrounding
  typography and have no box to size. `data-size` is not emitted for link buttons so the DOM never
  claims a size that isn't applied. We deliberately do **not** encode this exclusion at the type
  level: a discriminated union on `appearance` would reject legitimate dynamic call sites
  (`appearance={condition ? "link" : "filled"}`) that only discriminate at runtime.
- `SplitButton.Root` owns `size` and drives both halves through context; `PrimaryAction` and
  `MenuTrigger` do not accept `size`, so mixed-height composites are unrepresentable.
- `ButtonGroup` does not constrain child sizes (children size themselves); it needs no change.
- `size` joins `data-size` on both components (IconButton already emitted it; Button now does too,
  except for link).

### 2. `priority` → `intent`, and `appearance` + `intent` become required (Phase 2 — accepted)

- The tone prop is renamed **`intent`** across Button, Alert, AlertDialog, and Toast. Button's
  value union becomes `accent | danger | neutral` (`accent` replaces `default`, matching the token
  layer: `bg-filled-accent`, `text-accent-600`). Alert/Toast/AlertDialog value unions are
  unchanged. The unions remain per-component — this is a shared prop _name_, not a shared value
  vocabulary, and JSDoc/docs must stop describing the prop as "importance or impact level"
  (that describes _priority_) and instead describe the tone/purpose the value communicates.
- **`appearance` and `intent` are required on Button (no defaults).** This deviates from the POC,
  which flipped the _default_ from accent to neutral — a silent visual change at every
  un-annotated call site. Requiring both props turns every migration into a loud compile error
  with a deterministic fix, and keeps call sites self-describing as the design language evolves.
  `IconButton` gains the `intent` axis (it has none today; its `subtle`/`danger` needs are real —
  e.g. destructive icon buttons) and requires `appearance` + `intent` the same way. `size` stays
  optional (default `md`) — it is geometry, not meaning.
- **`subtle` appearance** joins `ghost | filled | outlined | link` on Button and IconButton. It
  must meet **≥ 4.5:1 text contrast in both themes before shipping**. Measured from today's
  tokens, the POC's light-theme styling fails: `text-accent-600` on `accent-500/10` ≈ 3.6–4.1:1
  and `text-danger-600` on `danger-500/10` ≈ 3.7–3.9:1 (composited over base/card backgrounds);
  neutral (`text-strong`) passes at ~16:1, and dark theme passes. Fix by using the `-700` text
  shades in light theme or deepening the tint. For reference, `text-muted` itself passes both
  themes (4.83–4.90:1 light, 5.26–5.32:1 dark).
- Toast's exported `Priority` type is renamed **`ToastIntent`** (not bare `Intent`).
  `ButtonIntent` and `ButtonAppearance` become exported from the `./button` subpath.
  `data-priority` → `data-intent`.
- **Badge keeps `color`.** Badge's axis is genuinely color (18 named colors + 7 functional
  colors), not tone. It is explicitly out of scope for `intent`, even though that leaves the
  broader API unification incomplete for now.

### 3. Migration: hard cutover with a codemod prompt, no deprecation aliases

We will not ship long-lived deprecated aliases. The Phase 2 release removes `priority` outright;
migration is performed by a codemod-like prompt (run by the mantle maintainers against consuming
repos). The prompt's contract is this mapping — old implicit defaults are resolved to explicit
props, so no call site changes appearance:

| Old (as written)                                         | New (explicit)                                 |
| -------------------------------------------------------- | ---------------------------------------------- |
| `<Button>` (no `priority`, no `appearance`)              | `intent="accent" appearance="outlined"`        |
| `priority="default"`                                     | `intent="accent"`                              |
| `priority="neutral"`                                     | `intent="neutral"`                             |
| `priority="danger"`                                      | `intent="danger"`                              |
| `appearance` omitted (Button)                            | `appearance="outlined"`                        |
| `appearance` omitted (IconButton)                        | `appearance="outlined"` (+ `intent="neutral"`) |
| `appearance="filled" \| "ghost" \| "outlined" \| "link"` | unchanged                                      |
| Alert/Toast/AlertDialog `priority={x}`                   | `intent={x}` (values unchanged)                |
| `import type { Priority } from "@ngrok/mantle/toast"`    | `ToastIntent`                                  |
| `[data-priority]` selectors                              | `[data-intent]`                                |
| `ComponentProps<typeof Button>["priority"]`              | `ComponentProps<typeof Button>["intent"]`      |

Intentional restyles (e.g. choosing neutral where accent was implied) happen as deliberate
follow-up edits after the mechanical migration, never bundled into it.

### 4. Release sequencing

1. **Next minor**: Phase 1 `size` (this record's implementation) — purely additive.
2. **Later minor**: Phase 2 redesign (`intent`, required props, `subtle` with fixed contrast,
   `ToastIntent`, `data-intent`) with a `**Breaking:**` changeset, a migration doc under
   `apps/www/app/docs/migrations/`, and the codemod prompt. Because mantle is 0.x, caret ranges
   pin the minor, so consumers opt in explicitly.

## Consequences

- Consumers can delete hand-rolled height overrides (`h-7`/`h-12` + padding) in favor of `size`.
- Phase 2 is a hard compile break at ~1,035 call sites in the product frontend; the mapping table
  above makes it deterministic, and required props mean zero silent visual changes.
- The agent surface snapshot (`components-surface.json`), `for-ai-agents.mdx`, and component docs
  must be regenerated/updated in the same PRs that change the props they describe.
- Alert/AlertDialog/Toast still have no test files; the Phase 2 rename must add them rather than
  ship a rename through untested components.
