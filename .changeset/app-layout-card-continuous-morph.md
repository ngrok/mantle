---
"@ngrok/mantle": patch
---

The `app-layout-card` morph between `AppLayout.Content` and `AppLayout.SidePanel` now reads as one card. The frame draws the card's edge and grows or shrinks from its start edge, and each snapshot keeps the frame's end edge, so the panel stays where it is while the page grows out of it. When the two pair, the new snapshot fills the frame with the card's surface and stays opaque, and the old one fades out on top of it in 150ms, so two layouts of the same text do not show through each other. A card that enters or leaves alone fades, with no surface behind it. While a view transition other than a theme swap runs, an open docked panel holds its end gutter as margin, so its snapshot is its card and the morph shows one end edge. Under reduced motion the old snapshot hides at once.

The Assistant Across Routes recipe moves the title, the new conversation button, and the composer on their own across the switch, and slides the close button out past the end edge, so the header reads as one panel.
