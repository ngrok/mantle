---
"@ngrok/mantle": patch
---

`Sheet` parts now read a private Radix dialog scope, so each one binds to the nearest `Sheet.Root` and to nothing else. A `Command.SearchTrigger`, `Command.DialogTrigger`, `Dialog.Trigger`, or `Dialog.Close` rendered inside `Sheet.Content` (a `Sidebar.Nav` below its `mobileBreakpoint`, say) now reaches the `Dialog.Root` or `Command.DialogRoot` above the sheet instead of toggling the sheet. Before this fix, a click on the search row in the mobile sidebar closed the sheet and never opened the palette.

Two undocumented shapes now fail fast instead of controlling the wrong overlay:

- A `Dialog.Trigger` or `Dialog.Close` inside a sheet with no `Dialog.Root` above it throws Radix's "must be used within `Dialog`". Use `Sheet.Trigger` and `Sheet.Close` to control a sheet.
- A `Sheet.Trigger`, `Sheet.Close`, or `Sheet.CloseIconButton` inside a `Dialog.Content` with no `Sheet.Root` above it throws the same error. Use `Dialog.Close` there.

`Sheet.Trigger` now carries `data-slot="sheet-trigger"` and `Sheet.Close` carries `data-slot="sheet-close"`, each joined after any `data-slot` you forward. See https://mantle.ngrok.com/components/overlays/sheet#sheetroot.

The Command docs now put `Command.DialogRoot` above `Sidebar.Nav`, where `⌘K` outlives the mobile sheet and the search row inside the sheet still opens the palette: https://mantle.ngrok.com/components/navigation/command#in-a-sidebar
