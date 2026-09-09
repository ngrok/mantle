---
"@ngrok/mantle": patch
---

`MultiSelect.Content` now decides whether to turn off Ariakit's body scroll lock from the enclosing overlay's layer container alone, instead of also probing the DOM for a `data-mantle-modal-content` ancestor after mount. Inside `Dialog`, `Sheet`, and `AlertDialog` the result is the same, because each renders its content inside its layer container. If your own overlay carries `data-mantle-modal-content` outside a mantle overlay, Ariakit's lock now stays on there; pass `preventBodyScroll={false}` to turn it off. As before, `preventBodyScroll` overrides the default in either direction.
