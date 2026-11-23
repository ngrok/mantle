---
"@ngrok/mantle": patch
---

`AppLayout.Content` and `AppLayout.SidePanel` now carry `view-transition-class: app-layout-card`, and `mantle.css` styles the view transition between them. When an app gives the card and the panel the same `view-transition-name`, a navigation that swaps one for the other morphs between them in 300ms. The morph clips to the card's corners, does not stretch text, and is a cut under reduced motion. An app no longer needs its own view transition stylesheet for this.

Add `useScrollAnchor` to `@ngrok/mantle/hooks`. It keeps the reader's place in some content when the content remounts at the same width or another, such as a conversation that moves from a page to the side panel.

The Assistant Across Routes recipe now uses React's `<ViewTransition>` in place of React Router's `viewTransition` prop, and keeps the reader's place across the switch.
