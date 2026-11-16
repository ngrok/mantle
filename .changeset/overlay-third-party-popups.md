---
"@ngrok/mantle": patch
---

A `Dialog`, `AlertDialog`, or `Sheet` now treats a popup that covers it as part of itself. A widget in the overlay can put its own popup on `<body>`: a payment script does this for a 3-D Secure challenge and for a wallet sign-in. Before, the focus trap took focus back from the popup when the script moved focus there, and Escape closed the overlay under the popup. Stripe then put back the `<body>` style it saved while the overlay was open, with `pointer-events: none`, and the page took no clicks until a reload.

While a popup covers the center of the viewport and takes pointer input:

- Focus that a script moves into the popup stays there.
- Escape does not close the overlay under the popup. The user closes the popup first.
- A click in the popup is not an outside click.

The overlay finds the popup with a hit test, so your code adds nothing, and an `onEscapeKeyDown` guard for a payment popup can go. The content's `onEscapeKeyDown`, `onPointerDownOutside`, and `onInteractOutside` still run, and they get an event that is already prevented.

A popup counts when it is a child of `<body>`, has a `z-index` at or above the `z-60` of the overlay, and takes pointer input. An open overlay sets `pointer-events: none` on `<body>`: Stripe's popups set `pointer-events: auto` themselves, and a popup that does not needs that rule in your CSS. A toast or another `overlay-prompt` element takes clicks only, as before.

Close the overlay from your code only after the popup closes. An overlay that closes under a popup can still get the stale `<body>` style back from the script.

Docs: https://mantle.ngrok.com/components/overlays/sheet#third-party-popups
