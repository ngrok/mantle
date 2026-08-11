# Floating layers: two z-index tiers plus per-overlay layer containers

**Date:** 2026-08-11
**Status:** Accepted
**Applies to:** `@ngrok/mantle/dialog`, `alert-dialog`, `sheet`, `popover`, `tooltip`, `select`, `dropdown-menu`, `hover-card`, and the layering contract every floating component documents

## Context

Every mantle floating layer rendered at one Tailwind `z-50`, portaled to
`document.body`, and DOM order broke ties: the most recently mounted layer
painted on top. That rule is correct for interaction-nested layers — a menu
opened from inside a dialog mounts after the dialog and paints above it — but
it encodes "opened later" as "logically above," and those are not the same
fact.

The counterexample shipped: the dashboard's "moved the cheese" onboarding
popover opens on its own after hydration. When the user loads a route whose
content is a full-bleed `Dialog`, the dialog's portal lands during hydration
and the popover's portal lands one commit later — a later `body` sibling at the
same `z-50`, painting on top of a takeover that covers its anchor
(ngrok/FEP-1754). The popover was also inert, because the modal dialog put
`pointer-events: none` on `body`.

No single z-index scale can express the intent, because the same component
sits on both sides: the sidebar's popover must paint under the dialog, and the
dialog's own popovers must paint over it.

## Decisions

### 1. Layer ownership comes from the React tree, not from mount timing

Each overlay's positioner — the fixed, transform-free element that lays out
its content — doubles as its **layer container**, published through the
internal `LayerContainerContext`
(`packages/mantle/src/utils/layer-container/layer-container.tsx`). Every
portaled float resolves its portal target through `useLayerContainer()`: the
nearest enclosing overlay's positioner, else `document.body`. A float composed
inside a dialog therefore lives inside the dialog's own stacking context and
paints above it by construction; a float composed outside lives at `body` and
cannot reach into any overlay.

The positioner, not a sibling element, must be the container for two reasons:

- Radix marks the portal's other children `aria-hidden` when a modal overlay
  opens. The positioner is on the content's ancestor chain, which the marking
  skips, so floats portaled into it stay readable.
- A `position: fixed` float inside a transformed ancestor positions against
  that ancestor, not the viewport. The open/close animations live on the
  content element; the positioner stays transform-free.

`Sheet.Content` was its own fixed, transformed box, so `Sheet` gained a
zero-box positioner wrapper. `Dialog` and `AlertDialog` already had one.

### 2. Overlays take a higher tier: floats `z-50`, overlays `z-60`

The container alone cannot fix the shipped bug — a late-opening base popover
still appends to `body` after the dialog's portal and wins the `z-50` tie. So
overlays (`Dialog`, `AlertDialog`, `Sheet`, and `Command.DialogRoot` through
`Dialog`) moved to `z-60`: a base-level float can never out-paint an overlay,
no matter when it opens. Within one tier and one container, DOM order still
breaks ties, which is the right rule for peers.

Toasts (sonner's own `z-index: 999999999`) stay above both tiers.
`skip-to-main-link` keeps `z-max`. Page chrome (`Sandbar`, `AlertCenter`
banners) stays at `z-50`, so overlays now correctly cover it.

### 3. Layers with their own placement rules keep them

- **`Combobox.Content` does not portal.** The dialog primitive's Escape guard
  (`dialog/primitive.tsx`) only yields to a popup the dialog content
  _contains_; portaling the popup would make Escape close the whole dialog.
- **`MultiSelect.Content` portals into the closest
  `[data-mantle-modal-content]`** — inside the overlay's content element — for
  the same Escape reason, resolved by DOM search rather than context.
- **An explicit `container` prop wins.** `Dialog.Portal` and `HoverCard.Portal`
  pass the resolved container back down as the layer container, so the parts
  that re-portal internally honor it — before this change, a `container` on
  those parts was silently ignored by the inner portal.

## Alternatives considered

- **Bump the popover's z-index (or the page's).** Rejected: the same `Popover`
  component renders both the base-layer announcement and the floats inside the
  creation form. Any value that buries one buries the other.
- **Container context alone, no tier split.** Rejected: a base float that
  opens after the overlay still appends later at an equal z-index and wins the
  tie. The shipped bug survives.
- **Tier split alone, no containers.** Rejected: a `z-50` float portaled to
  `body` from inside a `z-60` dialog paints under its own dialog.
- **The native top layer (`<dialog>.showModal()`, the Popover API).** Rejected
  for now: promotion order in the top layer is still chronological, so it
  re-encodes mount timing, and Radix/Ariakit do not render into it.
- **Per-depth dynamic z-index values.** Rejected: containers make nesting
  compose through DOM containment with two static utility classes; computed
  z-indexes would need inline styles and a registry.

## Consequences

- Consumer chrome at `z-50` that relied on out-stacking an open dialog by
  mount order now paints under it. The fix is to move that chrome to `z-60`
  or above — or, usually, to stop rendering it under a takeover.
- Consumer CSS that assumed a float's portal is a direct `body` child
  (`body > [data-radix-popper-content-wrapper]`) breaks when the float is
  composed inside an overlay. Target the float's `data-slot` instead.
- Floats inside overlays are no longer `aria-hidden` by timing luck — they sit
  inside the positioner, which the modal marking skips by construction.
- The `z-60` tier is two utility classes (`z-50`/`z-60`) documented in every
  floating component's JSDoc, not a CSS variable; a consumer aligning a custom
  layer uses the same classes.
- The paint-order contract is pinned by
  `packages/mantle/src/utils/layer-container/layer-container.test.tsx`
  (placement matrix) and `layer-container.browser.test.tsx` (hit-testing).
