---
"@ngrok/mantle": patch
---

A `Dialog`, `AlertDialog`, or `Sheet` now yields to a popup that a script shows in a frame above it. A payment script puts such a popup on `<body>` for a 3-D Secure challenge and for a wallet sign-in. Before, the focus trap took focus back from the popup when the script moved focus there, and Escape closed the overlay under the popup. Stripe then put back the `<body>` style it saved while the overlay was open, with `pointer-events: none`, and the page took no clicks until a reload.

While a popup covers the center of the viewport and takes pointer input:

- Focus that a script moves into the popup stays there.
- Escape does not close the overlay. It moves focus into the popup, and the next Escape goes to the popup.
- A click in the popup is not an outside click.
- The overlay removes the `aria-hidden` that it put on the popup, when focus moves into the popup.

The overlay finds the popup with a hit test, so an `onEscapeKeyDown` guard for a payment popup can go. For an Escape or a click that the overlay yields, the content's `onEscapeKeyDown`, `onPointerDownOutside`, and `onInteractOutside` still run, and they get an event that is already prevented.

A popup counts when it is a child of `<body>` that holds a frame, has a `z-index` at or above the `z-60` of the overlay, and takes pointer input. An open overlay sets `pointer-events: none` on `<body>`: Stripe's popups set `pointer-events: auto` themselves, and a popup that does not needs that rule in your CSS. A popup with no frame does not count. A toast or another `overlay-prompt` element takes clicks only, as before.

Your code still does two things:

- Close the overlay only after the popup closes. An overlay that closes under a popup can get stale state back from the script: a `<body>` style with `pointer-events: none`, and `aria-hidden` on the page.
- Move focus when the script gives you the result. The browser does not return focus to the overlay when the popup closes.

Docs: https://mantle.ngrok.com/components/overlays/sheet#third-party-popups
