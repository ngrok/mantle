---
"@ngrok/mantle": patch
---

`Choice.Description` now forwards its click to the sibling `Choice.Label`, so the whole content column toggles the control. The accessible name stays the label alone, and the description stays wired through `aria-describedby`.

The forward skips a click on a link or other interactive content inside the description, and it runs after a consumer `onClick`, so `event.preventDefault()` cancels it. When the choice uses `Choice.Title`, the description forwards nothing, because an ancestor already owns that click. The description also shows the pointer cursor when a `Choice.Label` precedes it.
