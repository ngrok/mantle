---
"@ngrok/mantle": patch
---

Bump the `@ariakit/react` runtime dependency from 0.4.35 to 0.4.36.

`Combobox.Root` and `MultiSelect.Root` pass their props to Ariakit's `ComboboxProvider`, and their prop
types are Ariakit's `ComboboxProviderProps`, so 0.4.36's store changes reach both:

- **The combobox store now separates the input text from the selection.** `inputValue`,
  `defaultInputValue`, and `setInputValue` control the query text. Ariakit marks the older `value`,
  `defaultValue`, and `setValue` names deprecated — they still work, and code that controls a
  `Combobox.Root` query through `value` / `setValue` should move to `inputValue` / `setInputValue`.
- **The store gained `selectOnMove`**, which selects the active item as the user moves through the list
  with the popover open. It defaults to `false`, so no existing call site changes.
- **`Combobox.Content` and `MultiSelect.Content` are Ariakit `ComboboxPopover`s**, so three of its fixes
  reach them:
  - A click on the popover's empty space no longer pulls focus into the popover, which used to leave the
    arrow keys unable to move through the items.
  - A non-modal popover now honors a consumer's `getPersistentElements` callback, so interacting with the
    elements it returns no longer dismisses the popover.
  - An item no longer renders as a tab stop for a frame while the list mounts.
- **A combobox popover now closes across a same-origin iframe boundary** — when focus moves from an
  embedded popup to the ancestor document, or when a pointer interaction happens in an existing sibling
  frame. Ariakit still ignores a real browser or application window blur.

Mantle's own API does not change.
