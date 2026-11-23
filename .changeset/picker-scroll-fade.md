---
"@ngrok/mantle": patch
---

The `Select`, `Combobox`, and `MultiSelect` lists now fade the top or bottom edge while more options sit past it, so a long list shows that it scrolls.

- The list gets `data-overflow-top` and `data-overflow-bottom` while it has options past that edge. An `IntersectionObserver` sets them only when an edge flips, so a scroll runs no script. The new `scroll-cue-y` utility draws each fade as a sticky gradient over the list. It masks nothing, so the border, shadow, and open animation stay whole, and it works in every engine.
- The keyboard highlight now stops 1.5rem from each edge (`scroll-py-6`), so it never sits under a fade. A list too short for that shares the room, so the option still shows in full.
- With a `MultiSelect.ContentFooter`, only the top edge fades, because the sticky footer sits on the bottom edge.
- The `Command` highlight now also stops clear of its `scroll-fade-y` edges, because `Command.List` already sets `scroll-py-6` and the shared list scroll now honors it.
