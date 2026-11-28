---
"@ngrok/mantle": patch
---

The `app-layout-card` morph now reads as the panel sliding over the page. The moving card paints above the rest of the page and casts the floating panel's shadow while it moves. Add `app-layout-card-under` to a page card's `enter` and `exit` view transition classes to hold it still and opaque under the moving card, and `app-layout-card-alone` to a card that fades in or out with no card to morph into. Give `app-layout-card-alone` to any named card that can enter or leave with no pair, such as a page whose panel may be closed: CSS cannot tell a lone `app-layout-card` from a paired one, so without the class it keeps the frame and shadow until the transition ends. Reduced motion stays a cut.

The Assistant Across Routes recipe uses both classes, says why the transition is required, and has a test that fails when the recipe drops part of it.
