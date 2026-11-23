---
"@ngrok/mantle": minor
---

Add `OverlayPrompt` (`@ngrok/mantle/overlay-prompt`). It keeps a banner, a bar, or another floating element usable above an open `Dialog`, `AlertDialog`, or `Sheet`, such as a cookie banner. An open modal dialog makes the rest of the page inert. While one is open, `OverlayPrompt` moves its content into the top modal dialog, at each depth of a stack, so the content takes clicks and focus, and a press in it does not close the dialog. When the last modal closes, the content moves back to where you render it, so a form owns its buttons and Tab reaches them in page order.

- With no dialog open, it renders a wrapper with no box (`data-slot="overlay-prompt"`, `display: contents`) and adds no listener.
- The server renders the content in place. After hydration the content renders through a portal, so it mounts again one time when the page hydrates, and never when a dialog opens or closes.
- In Chrome and Firefox the move keeps a frame in the content loaded and keeps focus (`moveBefore`). Safari reloads the frame.

`Toaster` and `Sandbar` now use `OverlayPrompt`. A `Sandbar` keeps the state of its children when a dialog opens or closes; before this change, they mounted again.

Docs: https://mantle.ngrok.com/components/primitives/overlay-prompt
