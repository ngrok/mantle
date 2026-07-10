# Default `Button` and `IconButton` to `type="button"`

## Status

Accepted — 2026-06-17. Implemented. Shipped as a `patch` (see [Changeset](#implementation-plan) note);
the `asChild` discriminated union was collapsed to a single flat shape since `type` was the only
prop it gated.

## Context

Today `Button` (`packages/mantle/src/components/button/button.tsx`) and `IconButton`
(`.../icon-button.tsx`) make `type` a **required** prop. The props are modeled as a
discriminated union on `asChild`:

- `asChild: true` → `type?: …` (optional, and intentionally **not** forwarded to the
  cloned child — see the `Slot` branch, which spreads `buttonProps` _without_ `type`).
- `asChild?: false | undefined` → `type: Exclude<ComponentProps<"button">["type"], undefined>`
  (**required**, no default).

The native render path is `<button {...buttonProps} type={type}>`. There is already an
`oxlint-disable react/button-has-type` comment claiming `type` is _"defaulted to 'button'"_
— which is **not true today** (it is required, and the destructure has no default). That
comment is stale/aspirational.

Why this is worth changing:

- **It diverges from the whole ecosystem.** Radix, shadcn, MUI, Chakra, Ant, and most
  hand-rolled buttons default to `type="button"`. mantle requiring it is surprising and is
  a hard TypeScript error on the overwhelmingly common case (`<Button onClick={…}>Save</Button>`).
- **Agent-facing friction.** The source JSDoc `@example` blocks feed the `.d.ts`, `llms.txt`,
  and the `/api/components.json` agent manifest (see
  [#1239](https://github.com/ngrok/mantle/pull/1239), and the
  [2026-06-16 DataTable recipes decision](./2026-06-16-data-table-empty-and-pagination-recipes.md)),
  so examples are normative — agents reproduce them. A required `type` means every generated
  button must spell out `type="button"` or fail to compile; agents trained on the ecosystem
  norm will routinely omit it and round-trip on the diagnostic.
- **The native default (`submit`) is the real footgun.** Native `<button>` inside a `<form>`
  submits on click. Defaulting to `"button"` neutralizes the accidental-submit footgun for
  the common case while still allowing `type="submit"` opt-in.

This relaxes a **required** prop to **optional** with a safe default — backward compatible.
All ~311 existing `<Button>`/`<IconButton>` call sites already pass `type` explicitly (they
had to), so nothing breaks; the change is purely additive.

## Decision

Default `type` to `"button"` on both `Button` and `IconButton`, making the prop optional in
the non-`asChild` arm. `asChild` behavior is unchanged (`type` still has no effect and is not
forwarded to the child, so a wrapped anchor never inherits a `button` `type`).

### The one real tradeoff (reverse footgun)

The current required-prop design is the _only_ option that is un-footgunnable in **both**
directions: you cannot accidentally submit, and you cannot accidentally fail to submit,
because you are forced to choose. Defaulting to `"button"` trades the loud, obvious
accidental-submit footgun for a quiet one: a form whose submit button is written
`<Button>Submit</Button>` and relies on **native** form submission will silently not submit —
with no compile error, just wrong runtime behavior.

This is low-risk in practice because most form code uses an explicit `onClick`/`onSubmit`
handler rather than native submission, but it is the reason this is a real decision and not a
pure win. Mitigation is documentation (see below): make `type="submit"` prominent wherever
forms are shown.

## Implementation plan

1. **`button.tsx` — relax the type and apply the default.**
   - In the `asChild?: false | undefined` arm, change
     `type: Exclude<ComponentProps<"button">["type"], undefined>` →
     `type?: ComponentProps<"button">["type"]`.
   - Apply the default at the point of use on the native branch only, to preserve the
     `asChild` "not forwarded" semantics:
     `<button {...buttonProps} type={type ?? "button"}>`.
     (Do **not** default in the destructure — that would risk leaking `type` toward the
     `asChild`/`Slot` path. Keeping the default at the `<button>` also makes the existing
     `react/button-has-type` lint-disable comment finally accurate.)
   - Re-evaluate whether the `asChild` discriminated union is still needed for `type`. If the
     two arms now differ only by the `asChild` literal and JSDoc, simplify toward a single
     shape with `asChild?: boolean` + optional `type` — **only if** nothing else depends on
     the discriminant. Verify by typechecking; do not force a simplification that changes
     other props.

2. **`icon-button.tsx` — same change.** Identical union shape (lines ~102/120) and render
   path; apply the same relaxation + `?? "button"` default.

3. **JSDoc rewrite (both files).** Replace the multi-paragraph "unlike native `<button>`,
   this prop is required" language with a concise contract: `@default "button"`, keep the
   `@enum` values, and keep the `asChild` "has no effect / not merged with a child anchor's
   `type`" note. Update the `@example` on `Button`/`IconButton` to omit `type` for the common
   case (showing the new ergonomic default) while keeping one `type="submit"` example.

4. **`split-button.tsx` — keep in lockstep.** `SplitButton` forwards `type` to `Button` at
   lines 43 and 75. If its own `type` prop is modeled as required, relax it to optional in the
   same change so `SplitButton` doesn't keep forcing `type` after `Button` stops. (Confirm its
   current modeling; if it just passes through `...props`, no change is needed.)

5. **Tests (`button.test.tsx`, `icon-button.test.tsx`) — regression coverage.**
   - Omitted `type` renders `type="button"` (the new default) for both components.
   - Explicit `type="submit"` / `type="reset"` still render through unchanged.
   - `asChild` with an `<a>` child renders **no** `type` attribute on the anchor.
   - (These are DOM-attribute assertions — happy-dom is sufficient, no browser mode.)

6. **Docs site.**
   - `apps/www/app/docs/components/button.mdx`, `icon-button.mdx`, `split-button.mdx`: drop
     any "type is required" wording; show the defaulted common case.
   - Ensure the Field/form docs and any form example prominently use `type="submit"` to
     counter the reverse footgun.
   - Regenerate the agent surface snapshot
     (`apps/www/app/utilities/__snapshots__/components-surface.json`) — it derives from the
     JSDoc and will pick up the new `@default`/examples.

7. **Changeset — `patch`.** The public type contract changes (required → optional) and a new
   runtime default is introduced; both are backward compatible and additive. We shipped this as a
   `patch`: every existing call site already passes `type`, so no published behavior changes for
   current consumers — the relaxation only removes a compile error from previously-invalid code.
   (`minor` is defensible too, treating the new optional-usage capability as a feature.)

## Optional follow-up (separate PR)

Internal call sites that pass a now-redundant `type="button"` could be cleaned up, but that is
churn across ~300 sites and unrelated to the API change. Keep it out of this PR; do it
separately if desired.

## Consequences

- `<Button>` / `<IconButton>` compile and work without `type`; ergonomics match the ecosystem
  and the agent-generated common case stops erroring.
- The stale `react/button-has-type` lint-disable comment becomes accurate.
- New responsibility on docs: native form-submit buttons must opt in with `type="submit"`,
  since the default no longer submits.
- No change for any existing call site (all already pass `type`).

## Resolved

- `minor` vs `patch` — **shipped as `patch`.** Existing explicit usage is unchanged and no
  published runtime behavior changes for current consumers; the relaxation only removes a
  compile error from previously-invalid code.
- Simplify the `asChild` discriminated union — **yes, simplified.** Once `type` was relaxed to
  optional in both arms, the discriminant gated nothing else, so both `Button` and `IconButton`
  now use a single flat `WithAsChild`-based shape. `split-button.tsx` dropped its now-redundant
  `Pick<…, "type">` and `type="button"` defaults, deferring to the components' default.
