# ThemeSwitcher compound API: no prop-bag passthrough props

**Date:** 2026-07-15
**Status:** Accepted
**Applies to:** `@ngrok/mantle/theme-switcher`, and API design for every component that renders another component internally
**Distilled rules:** [CONVENTIONS.md → Component API Design](../CONVENTIONS.md#component-api-design)

## Context

`ThemeSwitcher` shipped as a monolithic component: one `<ThemeSwitcher />` that
internally composed `DropdownMenu.Root` + `DropdownMenu.Trigger` (an
`IconButton`) + `DropdownMenu.Content` (hosting `ThemeDropdownMenuRadioGroup`).
To let consumers position or style the popover, it grew a `contentProps` prop —
an `Omit<ComponentProps<typeof DropdownMenu.Content>, "children">` bag forwarded
wholesale to the internal `DropdownMenu.Content`.

That prop bag is the tell that the component wanted to be a compound all along:

- It re-encodes the component's internal structure as prop names. The consumer
  must already know there _is_ a content element to configure; the JSX shows
  none of it, and nothing autocompletes toward it.
- It scales by widening — the next request is `triggerProps`, then
  `triggerProps.iconProps` — each a new bag with its own `Omit` carve-outs,
  drifting from the wrapped component's real API.
- It creates a second way to do what composition already does. Every other
  mantle overlay is `X.Root`/`X.Trigger`/`X.Content`; a `contentProps` bag on a
  closed component forces consumers to learn a special case.

## Decisions

### 1. `ThemeSwitcher` is a compound: `Root`, `Trigger`, `Content`

```tsx
<ThemeSwitcher.Root>
	<ThemeSwitcher.Trigger />
	<ThemeSwitcher.Content align="end" collisionPadding={{ right: 16 }} />
</ThemeSwitcher.Root>
```

Each part is a thin forwarding wrapper: `Root` forwards `DropdownMenu.Root`
(open-state control), `Trigger` renders the ghost `IconButton` with the
SSR-safe themed icon wired up as the menu trigger, `Content` forwards
`DropdownMenu.Content`. "It's just forwarding" is not an argument against a
part — the forwarding **is** the API: it puts every prop of the wrapped
primitive where the consumer already expects it, with zero bag types to
maintain.

### 2. The rule: never expose `*Props` prop-bag passthrough props

If a consumer needs to reach an element a component renders internally, the
component is a compound — expose that element as a part. Prop bags
(`contentProps`, `triggerProps`, `slotProps`, MUI-style `componentsProps`) are
forbidden in mantle component APIs. This is now a Component API Design rule in
[CONVENTIONS.md](../CONVENTIONS.md#component-api-design) and part of the
diff-audit checklist in [AGENTS.md](../AGENTS.md).

### 3. Parts own what makes them _this_ component; everything else forwards

`Trigger` owns `icon` (the SSR-safe themed icon is the component's identity)
and `intent` (always `"neutral"`), and defaults `appearance` to `"ghost"` and
`label` to `"Change Theme"`. `asChild` and `children` are removed at the type
level — the trigger renders only its icon and sr-only label, so both would be
silently meaningless (make invalid states unrepresentable). Everything else is
`IconButtonProps`, forwarded — including `disabled`, which the trigger also
threads into `DropdownMenu.Trigger` so Radix's open behavior honors it.
A fully custom trigger is out of scope for the compound: compose `DropdownMenu`
\+ `ThemeDropdownMenuRadioGroup` directly instead (the documented escape hatch).

### 4. `Content` defaults its children, it doesn't append to them

`<ThemeSwitcher.Content />` renders `ThemeDropdownMenuRadioGroup`; passing
children **replaces** that default (compose the radio group yourself alongside
extra items). Replace-with-default keeps the contract explicit — no hidden
merging, no ordering surprises.

### 5. `ThemeDropdownMenuRadioGroup` stays a standalone export

It is not `ThemeSwitcher.RadioGroup`: it renders inside _any_
`DropdownMenu.Content`/`SubContent` (the embed-in-your-account-menu case), not
just the switcher's, and aliasing it under the namespace would create two
import paths for the same primitive — the exact thing the compound-component
record warns against.

## Consequences

- Breaking change for `<ThemeSwitcher />`/`contentProps` call sites; released
  as a **patch** by explicit maintainer decision (pre-1.0-style tolerance for
  breaking changes in mantle's release train). The changeset documents the
  migration.
- `data-slot` values are now per-part: `theme-switcher-trigger` on the trigger
  (previously a single `theme-switcher`) and
  `theme-switcher-content dropdown-menu-content` on the menu —
  `DropdownMenu.Content` now joins an incoming `data-slot` chain ahead of its
  own slot name (per the `joinDataSlot` contract) instead of letting it clobber
  its `dropdown-menu-content` identity, so consumers selecting
  `[data-slot~="dropdown-menu-content"]` still match the switcher's menu.
