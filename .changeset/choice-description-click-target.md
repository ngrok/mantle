---
"@ngrok/mantle": patch
---

`Choice.Description` now forwards its click to the sibling `Choice.Label`, so the whole content column toggles the control. The accessible name stays the label alone, and the description stays wired through `aria-describedby`.

The forward skips a click on a link, a button, a form control, a nested label, a `<details>`, or an ARIA widget inside the description: the same rule a `List` row applies to its own click-to-activate. It runs after a consumer `onClick`, so `event.preventDefault()` cancels it. After it forwards, it marks the click handled, so a click on a `SelectableList` row's description toggles the row once. When the choice uses `Choice.Title`, the description forwards nothing, because an ancestor already owns that click. The description also shows the pointer cursor when a `Choice.Label` precedes it.

`List` and `SelectableList` rows now also defer a bare row click that lands inside a `<details>`, so a `<summary>` toggle no longer activates the row.
