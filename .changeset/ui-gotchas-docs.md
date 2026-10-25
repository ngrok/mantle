---
"@ngrok/mantle": patch
---

Fix three behaviors that surprised consumers, and document the others in JSDoc and on the docs site.

- `Separator`, and so `Tabs.Separator`, no longer shrinks to zero height in a flex container that overflows, such as a scrolling `Dialog.Body`. A `className` with a `shrink` class still wins.
- The `Sidebar.Root` `⌘B` / `Ctrl+B` shortcut now does nothing when an earlier `keydown` listener called `preventDefault()`, as the `Command.DialogRoot` `⌘K` shortcut already does.
- The `--shadow-*` tokens are now CSS custom properties on `:root`, so a stylesheet that Tailwind does not process can read `var(--shadow-md)`. See https://mantle.ngrok.com/base/shadows.

New JSDoc notes:

- `Button`: pass an icon through the `icon` prop, never as a child. The `icon` gets `size-5` unless the icon sets its own size, `asChild` wraps a plain `<a>` and not `Anchor`, and the `disabled={!isReady || isPending}` pattern.
- `Combobox.Input`: Enter never submits a parent form while the combobox is open, with a free-text example. `Combobox.Root`: control `open` when you render `Combobox.Content` conditionally. `Combobox.Content`: children must be items, groups, or separators.
- Charts: a `xKey`, `dataKey`, or `zKey` that no row has throws. The Root is `aspect-video` by default, the legend scrolls past `max-h-16`, and a `mode="decorative"` chart hides its children from assistive technology.
- `ThemeProvider`: the `mantle-ui-theme` cookie and the events that apply it again. Set the cookie and reload in browser automation.
- `Dialog.Content`, `Sheet.Content`, and `AlertDialog.Content`: the `overlay-prompt` class keeps UI such as a consent banner usable above an open overlay.
- `useInView`: do not combine `once: true` with `initial: true`.
- `Breakpoint`: `xs` (480px) is wider than most phones, so give each `xs:` class an unprefixed base.
- The docs site lists the reserved `⌘K` and `⌘B` chords at https://mantle.ngrok.com/accessibility#reserved-keyboard-shortcuts.
