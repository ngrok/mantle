---
"@ngrok/mantle": patch
---

Add an opt-in `/` shortcut to `Query.Input`. Set `keyboardShortcut` to let `/` move focus into the field from anywhere on the page. The field then shows a `/` hint while it is empty and not focused, and the `<input>` carries `aria-keyshortcuts="/"`. The shortcut is off by default, because a page with many tables has many fields and `/` can focus only one. The key still types a slash in any text field.
