# Overlays yield to a layer that covers them

**Date:** 2026-11-16
**Status:** Accepted
**Applies to:** `@ngrok/mantle/dialog`, `alert-dialog`, `sheet`, and each part built on `dialog/primitive.tsx`

## Context

A widget in an open overlay can put its own popup on `<body>`. Stripe.js does this for the Link wallet and for a 3-D Secure challenge. Each popup is a wrapper that fills the viewport at `z-index: 2147483647`, with a frame from another origin that sets `pointer-events: auto`.

The overlay did not know the popup (MNTL-136):

- Stripe calls `focus()` on the Link frame from the page. The Radix focus trap took focus back, so the keyboard acted on the overlay.
- Escape then closed the overlay under the popup.
- Stripe saves the inline style of `<body>` when a popup shows, and puts it back when the popup hides. The saved style had the `pointer-events: none` of the overlay, so the page took no clicks until a reload.

The dashboard added an `onEscapeKeyDown` guard to each sheet with a card field. A new sheet got the bug back when its author did not add the guard.

Measurements in Chromium 159 and Firefox 159, with Radix dialog 1.3.1, set the limits of a fix:

- A click in a frame, and a frame that focuses itself, give the page a `focusout` with no `relatedTarget`. The trap does nothing.
- A `focus()` call on the frame from the page gives the trap a target outside the content. In Chromium the trap takes focus back.
- A key press in a frame never reaches the page. Escape reaches the overlay only while focus is in the page.
- An open modal overlay sets `pointer-events: none` on `<body>`. A layer that sets no `pointer-events` of its own takes no click, and the click falls through to the backdrop.

## Decisions

### 1. The overlay finds the layer, and the app declares nothing

The dialog primitive finds a covering layer at the time of each event, with a hit test at the center of the viewport. A covering layer is a child of `<body>` that:

- is on top at that point and takes pointer input there
- has a `z-index` at or above the `z-index` of the overlay

These are not covering layers: the content, the floats, and the backdrop of the overlay, a floating prompt (`overlay-prompt`), and the page. Page chrome can paint above an overlay, but its `<body>` child is the page, with no `z-index` at the overlay tier.

Only the top open overlay looks for a covering layer. Radix already sends Escape, focus, and presses to an overlay above another one.

[Decision 1 of the floating layer tiers](./2026-08-11-floating-layer-tiers.md) says that layer ownership comes from the React tree. That holds for each layer mantle renders. A layer from a script has no place in the React tree, so paint order and pointer input decide for it.

### 2. While a layer covers it, the overlay yields

- **Escape:** both Escape paths prevent the close. The `onEscapeKeyDown` of the consumer still runs, with the event prevented.
- **Press:** the overlay does not count a press in the layer as a press outside. The primitive records the press on pointer down, because Radix reports an outside press on the click that follows it, and a layer that closes on the press is gone by then.
- **Focus:** a listener on the document stops a focus event that moves focus into the layer, so the trap never sees it. The listener is in the bubble phase, after the handlers of React. A layout effect adds it, so it is on the document before the trap, which Radix adds in an effect.

### 3. No write to the layer, no observer, and no new dependency

The primitive reads the page at event time and changes nothing on the layer. It does not set `pointer-events` on a layer that sets none: the app does that in its CSS, as the docs already say for `overlay-prompt`.

## Alternatives considered

- **A hook or a prop that takes a selector** (the options in MNTL-136). Rejected: the Stripe provider is above `Sheet.Root` in each dashboard sheet, so a hook there reads no overlay. A prop on each sheet is the guard the issue wants to remove.
- **Radix focus scope branches (`useFocusScopeBranch`).** Rejected, for four reasons:
  - It needs a direct dependency, pinned to the copy the dialog uses.
  - It needs each node before the focus event, so it needs an observer on `<body>`.
  - It needs a part inside the content element, which ends the repair of a lone text child ([COMPONENT_SPEC.md §3.8](../COMPONENT_SPEC.md#38-browser-translation)).
  - The trap then remembers the frame, and returns focus to it after the popup closes.
- **`data-react-aria-top-layer`**, which Stripe sets on its wrapper. Rejected: it is the private attribute of another library, one vendor sets it, Stripe leaves it out in its `<dialog>` mode, and the hidden Link wrapper carries it too.
- **"A frame outside the content keeps focus."** Rejected: a script can then move focus into a frame of the page under the backdrop, and the rule has no answer for Escape.
- **A visibility test of known frames**, as the dashboard guard did. Rejected: it needs a selector for each vendor.
- **Mount time** ("a `<body>` child added after the overlay opened"). Rejected: Stripe keeps the Link wrapper on the page, hidden, between uses. The floating layer tiers decision also rejects mount time as a source of ownership.
- **"Only a press on the backdrop closes a modal overlay."** Not taken in this change: it changes each press on UI above an overlay, and each test that presses an arbitrary element to close a dialog.

## Consequences

- A popup counts only when it takes pointer input and has a `z-index` at the overlay tier. The popups of Stripe and hCaptcha do. reCAPTCHA and Plaid Link set no `pointer-events`, so the app adds that rule.
- Escape from the overlay does nothing while a layer covers it. The user closes the popup first.
- The focus listener calls `stopImmediatePropagation()` on a focus event of the document, the one such call in the package. It depends on the order of listeners. The Chromium test in `layer-container.browser.test.tsx` fails if a Radix upgrade changes that order.
- happy-dom and jsdom do no layout. The rule does nothing in a unit test that does not stub `elementFromPoint`.
- **Not fixed:** an overlay that the app closes, or unmounts, while a layer covers it. The script then puts back a `<body>` style that still has `pointer-events: none`. Stripe also puts back `aria-hidden` on the other children of `<body>`. No event tells the page when the script does this, so the docs tell the app to close the overlay after the popup closes.
- **Not fixed:** Radix marks a wrapper `aria-hidden` when the wrapper is on the page as the overlay opens. The mark stays when the script shows the wrapper later.
