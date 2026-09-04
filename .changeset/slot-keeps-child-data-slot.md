---
"@ngrok/mantle": patch
---

`Slot` no longer erases a component child's own `data-slot`. It passed `data-slot: undefined` to the child when neither side set one, and a part that spreads its props after its own `data-slot` lost the attribute. `Field.Control` wraps its child in `Slot`, so a `Checkbox` or `Choice.Root` inside one rendered without `data-slot="checkbox"` or `data-slot="choice"`.
