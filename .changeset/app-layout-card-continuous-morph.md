---
"@ngrok/mantle": patch
---

The `app-layout-card` morph between `AppLayout.Content` and `AppLayout.SidePanel` now reads as one card. The frame paints the card's surface and edge, and grows or shrinks from its start edge. Each snapshot keeps the frame's end edge and drops its own border, so the panel stays where it is while the page grows out of it, and no second card edge shows inside the frame. The old snapshot fades out in 150ms, so two layouts of the same text do not show through each other.

The Assistant Across Routes recipe moves the title, the new conversation button, and the composer on their own across the switch, and slides the close button out past the end edge, so the header reads as one panel.
