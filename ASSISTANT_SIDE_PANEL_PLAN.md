# Assistant side panel: follow-up plan

A handoff for the agent who picks up the work PR #1563 left open. The PR ships the
[Assistant Across Routes](apps/www/app/docs/recipes/assistant-across-routes.mdx) recipe, a row-driven
float for `AppLayout.SidePanel`, and a full-width canvas for recipe pages. Cody asked for the items
below during review. None of them is started.

Read [AGENTS.md](./AGENTS.md), [CONVENTIONS.md](./CONVENTIONS.md), and [COMPONENT_SPEC.md](./COMPONENT_SPEC.md)
first. Items 1 to 4 change `packages/mantle/src/components/app-layout/app-layout.tsx`, so the component
spec's review checklist applies, and each needs a `patch` changeset.

## Where the panel stands today

- `AppLayout.SidePanel` has three presentations. In the lane, it is a flex item beside the card. Floating,
  it is `absolute` over the card with a strip of page visible beside it. Covering, it spans the row from
  gutter to gutter. The viewport `mobileBreakpoint` picks floating one tier down and covering two tiers
  down (`sm` has no cover tier).
- The panel also floats when the `AppLayout.Workspace` row is narrower than the
  `--container-side-panel-lane` theme token (56.5rem). The row is the container named
  `app-layout-workspace`. The token is the expanded rail (13rem), the card at the panel's floor (21rem),
  the panel (21rem), and three gutters (1.5rem). See `sidePanelLaneFloatClassName` and
  `sidePanelLaneStripWidthClassName`.
- The floating panel is not modal. No backdrop, no focus trap, no scroll lock. The page beneath stays
  clickable. The header's close trigger and the page's `AppLayout.SidePanelTrigger` close it, and the
  root returns focus to the first trigger outside the panel.
- The float is pure CSS, so JavaScript does not know whether the panel floats. At pointer-down time,
  `getComputedStyle(aside).position === "absolute"` is the truth, including the container rule.
- `Sidebar.Nav` stamps `data-slot="sidebar-nav"` and `data-state="expanded" | "collapsed"` on the rail,
  which is the panel's earlier sibling in the row. Below the rail's own `mobileBreakpoint` the nav is a
  `Sheet`, and no expanded rail is in the row.
- Browser tests inline the Tailwind output for the utilities under test; see the `STYLE` string and the
  "lane float" describe in `app-layout.browser.test.tsx`. Use `page.viewport()` from `vitest/browser` for
  a viewport-driven case. happy-dom resolves no stylesheet, so a geometry assertion belongs in the browser
  project.

## 1. Rail-aware lane threshold

**Ask.** A collapsed icon rail needs only 46.75rem (3.25rem rail, two 21rem cards, 1.5rem gutters) to hold
the card and the panel side by side. Today the single 56.5rem token floats the panel at 48rem even when the
rail is collapsed, so collapsing the rail buys nothing.

**Design.** Two container rules on the panel, keyed through `:has()` on the row:

- The row has an expanded rail (`:has(> [data-slot~=sidebar-nav]:not([data-state~=collapsed]))`): float
  below `--container-side-panel-lane`, as now.
- Otherwise (collapsed rail, no rail, or the rail is a sheet): float below a second theme token,
  `--container-side-panel-lane-icon-rail: 46.75rem`.

Tailwind can express the parent condition as an arbitrary variant on the aside, for example
`[[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:`,
stacked with the container variant. Verify the generated CSS with `@tailwindcss/node`'s `compile()` before
you trust the syntax; the PR's history has a scratch script for that.

**Acceptance.** A browser test at a 48rem row with a collapsed rail resolves `position: relative`, and the
same row with an expanded rail resolves `position: absolute`. The card is never narrower than the panel in
either state. Document both tokens in the `AppLayout.SidePanel` JSDoc and in the API reference of
`apps/www/app/docs/layouts/app-layout.mdx`.

## 2. Collapse the rail while the panel is open at tablet widths

**Ask.** When the assistant opens between 748px and 904px, collapse the rail so the panel fits in the lane
beside a 356px card, and bring the rail back when the panel closes.

**Design.** Derive it in the shell, do not store it. Pass `Sidebar.Root` an `open` of `false` while the
panel is open and the viewport is below `lg`, and the rail's own preference otherwise. A derived override
never reaches the rail's cookie and nothing has to be restored. The trade-off: while the panel is open at
that width, the rail's trigger cannot expand it. Say so in the recipe.

This item depends on item 1. Without the rail-aware threshold, the panel keeps floating over the collapsed
rail.

**Where.** The recipe's shell fence in `assistant-across-routes.mdx` and the demo in
`apps/www/app/features/assistant-across-routes-demo.tsx`, with one test in
`assistant-across-routes-demo.test.tsx` that opens the panel at a narrow viewport and asserts the rail's
`data-state`.

**Rejected.** Storing the previous state and writing it back on close. It has to guard the cookie, the
user's own toggle while the panel is open, and a reload mid-state.

## 3. Tablet: swipe or minimize the floating panel, still non-modal

**Ask.** At tablet widths the panel should act as an overlay the user can swipe away or minimize, with the
page beneath still usable.

**Design.**

- A drag on `AppLayout.SidePanelHeader` as the handle, with `touch-action: pan-y`. The drag moves the panel
  through the `translate` it already animates for the closed slide, with the transition off while the
  pointer is down. Past a threshold (40% of the panel's width) or a flick, release calls `setOpen(false)`;
  otherwise the panel springs back.
- Only a floating panel drags. Read `getComputedStyle(aside).position` at pointer-down.
- Escape closes the panel while focus is inside it. The root already returns focus to the trigger.
- Minimize is a third root state, `minimized`, that renders a docked pill at the row's end edge and reopens
  on tap. This is additive API: a new value on `AppLayout.SidePanelRoot` and one new part. Decide with Cody
  whether the pill is worth a part before you build it; the close trigger plus the header's
  `AppLayout.SidePanelTrigger` already reopen the panel.

**Acceptance.** A browser test drives a pointer drag past the threshold and asserts `data-state="closed"`;
a drag under the threshold leaves it open; the same drag in the lane does nothing. Honor
`prefers-reduced-motion`: the spring-back is a cut.

## 4. Phone: the covering panel is modal

**Ask.** On a phone, where the panel covers the card, nothing beneath it is interactive.

**Design.** When the panel covers the row, add a backdrop, set `inert` on `AppLayout.Content` and the rail,
trap focus inside the panel, close on Escape and on a backdrop tap, and lock body scroll. Keep the one
mounted `<aside>`: the recipe depends on the chat's DOM never moving between the lane, the float, and the
cover, so this is modal behavior added to the same element, not a `Sheet` that portals the content
elsewhere. Look at how `Sheet.Content` and `Sidebar.Nav`'s mobile sheet do each of these.

The panel must know when it covers. Two options: a `ResizeObserver` on the aside that compares its width to
the row's, or a `matchMedia` on the cover tier derived from `mobileBreakpoint`. The first also covers the
row-driven float; the second is simpler and matches the viewport rule.

**Acceptance.** Browser tests at a phone viewport: Tab from the last control inside the panel lands on the
first; a click on the page beneath does nothing; Escape closes; the `complementary` landmark keeps its
name. At a tablet viewport none of that applies.

## 5. Dashboard adoption notes

Not mantle work. For whoever wires the recipe into `ngrok-private/frontend`:

- Frontend pins `@ngrok/mantle` 0.88.0. The side panel APIs arrived in 0.89.0, and the row-driven float
  ships with the version PR #1563 releases.
- Put `AssistantConversationProvider` above every shell the conversation must survive. The settings and
  billing zones render a sibling shell (`settings-shell.tsx`), so a provider inside
  `AuthenticatedAppLayout` loses the conversation at that crossing.
- A reload needs server-backed conversation data with the active conversation's id in the URL or a cookie.
  The recipe's store is in memory.

## 6. A skip-link gap in the existing docs

`Pinning a footer to the card` on the App Layout page pins the footer by nesting a scroll region inside
`AppLayout.Body`. The skip link then lands on `main`, which no longer scrolls, so Page Down after the skip
link moves nothing. The assistant recipe avoids it with a `sticky bottom-0` composer inside the one scroll
region. Rewrite that section and `AppLayoutPinnedFooterDemo` the same way.
