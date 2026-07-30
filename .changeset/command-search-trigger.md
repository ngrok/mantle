---
"@ngrok/mantle": minor
---

**Command: a search trigger, a stateful `DialogRoot`, and the `⌘K` shortcut.**

**`Command.SearchTrigger`** is a new part that makes any control behave like a search field that opens the palette. It renders no DOM of its own — it clones its single child — so presentation belongs entirely to that child and the part never has an opinion about how the trigger looks or how it behaves in a collapsed sidebar rail. The child stays a `<button>`, not a text field: it opens a modal palette, so it announces "has popup dialog" while looking like a field. Because a search-shaped control invites typing, typing works — a printable keystroke or a paste opens the palette with that text already in `Command.Input`, so no character is lost.

It ships the accessibility rather than leaving it to the call site: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, `data-state`, and focus restoration come from the dialog trigger it composes; `aria-keyshortcuts` announces the `⌘K` binding that is usually drawn but never spoken; and it adds no accessible name, so the child's visible label is the name and the two cannot drift apart. Its `data-slot="command-search-trigger"` joins ahead of the child's own.

`Command.DialogRoot` is now a real state owner instead of an alias for `Dialog.Root`. It owns:

- **The open state**, controlled (`open` / `onOpenChange`) or uncontrolled (`defaultOpen`) — unchanged for existing consumers.
- **The query text**, which is what makes seeding work: the seed and the open state land in one state update, so `Command.Input` mounts with the character already in it rather than racing the dialog's mount. Every open starts from a known query — the seed, or empty — so dismissing and reopening never resurrects the previous search. Read it with `useCommandDialog().query` when your palette does its own matching; `Command.Input` still accepts `value` to take the query over completely.
- **The `⌘K` / `Ctrl+K` shortcut**, new and on by default (`keyboardShortcut`). It claims the event (Firefox binds `⌘K` to its own search bar), keeps the two platform modifiers distinct so macOS's native `Ctrl+K` still works, has exactly one owner per window so two palettes never open on one keypress, and yields inside `contenteditable` hosts and `<textarea>`s where `⌘K` is already bound.

**If you already bind `⌘K` yourself, pass `keyboardShortcut={false}`** — otherwise the chord has two owners after this upgrade. `Command.SearchTrigger` then adds no `aria-keyshortcuts`, and `useCommandDialog().keyboardShortcut` reports the same flag so your row can drop its visible `⌘K` hint too — the UI never advertises a binding mantle does not own.

Also new, for triggers that cannot use `Command.SearchTrigger` at all: `useCommandDialog()` (`open`, `setOpen`, `openWithQuery`, `toggle`, `query`, `setQuery`, `keyboardShortcut`), and the pure helpers `searchActionFromKeyDown` / `searchActionFromPaste`, which classify a keystroke or paste into a `SearchAction` — `seed`, `open`, or `ignore`. They handle the cases a hand-rolled `event.key.length === 1` check gets wrong: `Space` seeding a stray space, astral characters counted as two and dropped, composition in an input method editor silently doing nothing, and paste doing nothing at all.

`Command.DialogContent` now takes over the dialog's initial focus so the caret lands at the end of a seeded query — Radix's own open-autofocus selects the focused field's whole value, which would make the first keystroke after a seeded open replace the seed instead of extending it.

In a sidebar, the control it wraps is [`Sidebar.SearchTrigger`](https://mantle.ngrok.com/components/navigation/sidebar#sidebarsearchtrigger) — see that component's own release note.

Docs: https://mantle.ngrok.com/components/navigation/command
