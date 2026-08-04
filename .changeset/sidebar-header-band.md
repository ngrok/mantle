---
"@ngrok/mantle": patch
---

`Sidebar.Header` now stacks rows below its alignment band, so a pinned search row can sit under the product
switcher without resizing the `AppLayout.Header` toolbar.

`--sidebar-header-height` did two jobs at once: it fixed the header's height, and it named the band an
`AppLayout.Header` toolbar matches. Stacking a switcher row and a `Sidebar.SearchTrigger` in the header
therefore meant raising the token, which grew the toolbar from 54px to 78px and left neither row on the
toolbar's center.

The header is now a grid whose first track is that token. Its first child centers on the band, every later
child takes its own row below, and the header grows to fit. The toolbar keeps matching the switcher row alone:

```tsx
<Sidebar.Header>
	{/* the first child keeps the band, so the toolbar keeps its 54px */}
	<Sidebar.SwitcherTrigger>…</Sidebar.SwitcherTrigger>
	{/* its own row below, pinned above the scrolling body */}
	<Sidebar.SearchTrigger>…</Sidebar.SearchTrigger>
</Sidebar.Header>
```

Rows after the first stack flush, the way rows stack in `Sidebar.Footer` — the band's own lower half is the
space between them. The second row also inherits the header's gutter, so it lines up with the navigation rows
without a copy of `Sidebar.Body`'s padding. The header reserves no scrollbar gutter, so on a platform whose
scrollbars take space the row runs wider than the rows inside `Sidebar.Body`.

A single-row header with no layout overrides on it renders exactly as before, pixel for pixel. If you already
stack two rows in `Sidebar.Header`, check three things:

- **Delete the `--sidebar-header-height` override you raised for the taller header.** The token is now the
  first row's band, so a raised value moves the switcher row and the toolbar down together while the header
  keeps growing for the second row — and everything below the header moves down with it.
- Keep the aligned row as the header's **first direct child**. A wrapper around both rows takes the band
  itself, and a first row taller than the band overflows it — raise the token instead.
- The header is a grid now, so `items-*` is what centers the first row on the band (under the old flex column
  it only moved rows horizontally), a flex property on a direct child (`flex-1`) no longer sizes it, and a
  `className` that replaces the header's `display` drops the band with it.
