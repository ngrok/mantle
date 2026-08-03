---
"@ngrok/mantle": patch
---

Add `appearance` to `Dialog.Content`, so a full-page or edge-to-edge dialog is one prop instead of a
class recipe.

```tsx
// a card, capped — the default, unchanged
<Dialog.Content preferredWidth="max-w-2xl">

// fills the 16px-inset box, still a rounded card
<Dialog.Content appearance="full-page">

// fills the whole viewport, square and unbordered
<Dialog.Content appearance="full-bleed">
```

| `appearance`   | Width                      | Viewport inset | Corners and border   |
| -------------- | -------------------------- | -------------- | -------------------- |
| `"centered"`   | capped at `preferredWidth` | 16px           | rounded and bordered |
| `"full-page"`  | fills the box              | 16px           | rounded and bordered |
| `"full-bleed"` | fills the box              | none           | square, no border    |

- **Every dialog already sat 16px from each viewport edge.** `Dialog.Content` positions itself inside a
  `fixed inset-4` wrapper, which nothing documented, so filling that box meant discovering
  `preferredWidth="max-w-none"` and adding `h-full` by hand. Going edge to edge meant more: the wrapper takes
  no props, so the only way out was `fixed inset-0` on the content, which escapes the wrapper only because the
  wrapper happens not to be a containing block for fixed elements. `appearance="full-bleed"` sets the
  wrapper's inset directly instead.
- **The three values move together as one decision**, because a dialog that fills the viewport has no width
  left to cap and no corner left to round. `preferredWidth` therefore belongs to `"centered"` only —
  `<Dialog.Content appearance="full-bleed" preferredWidth="max-w-lg" />` is a type error rather than a prop
  that silently does nothing. A computed `appearance` still typechecks, so a consumer can toggle between
  appearances from state.
- **`"full-bleed"` keeps its backdrop.** The content opens at `zoom-in-95`, so a sliver of viewport edge stays
  uncovered for the length of the animation, and the overlay is what fills it.
- **`Dialog.Content` now stamps `data-appearance`** with the resolved value, so consumer CSS can target a
  full-bleed dialog without threading a class through.
- `appearance` defaults to `"centered"`, which paints exactly what `Dialog.Content` painted before, so no
  existing call site changes.

`Dialog` also ships its first test file, covering the three appearances, the width cap, dismissal, and the
type-level contract.

Docs: https://mantle.ngrok.com/components/overlays/dialog#full-page-dialog
