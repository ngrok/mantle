---
"@ngrok/mantle": patch
---

`DropdownMenu` and `Command.List` now cue their scrolling edges with `scroll-cue-y`, the same cue as the `Select`, `Combobox`, and `MultiSelect` lists, in place of the `scroll-fade-y` mask.

- The cue shows in every engine, and it does no style work while you scroll or type. With the mask, a `Command` query that made the list scrollable again restyled the whole list a second time.
- The scrolling element gets `data-overflow-top` and `data-overflow-bottom` while it has items past that edge.
- In every list with the cue, a group label that scrolls past the top or bottom edge now cues that edge too, not only an item.
