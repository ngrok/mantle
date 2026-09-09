---
"@ngrok/mantle": patch
---

`Command.Shortcut` now locks `translate="no"`, like `Kbd`, so a browser translator never renames a shortcut key. `MetaKey` hides its glyph from assistive technology, so a screen reader reads its label ("Command" or "Control") once. The `translate` prop is removed from its type. The search icon in `Command.Input` is hidden from assistive technology, and the `Command.SearchTrigger`, `Command.DialogRoot`, and `Command.DialogContent` summaries in the built types now match their docs: `SearchTrigger` renders no DOM of its own.
