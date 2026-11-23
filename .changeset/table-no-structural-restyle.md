---
"@ngrok/mantle": patch
---

Opening a select, menu, or dialog no longer restyles every element on the page in Chromium. `Table.Head` and `Table.Foot` drew their row dividers with `:last-child` and `:first-child` selectors. With those selectors in the stylesheet, Chromium restyled the whole subtree of an element that stopped being a last child, such as the app root when a portal is appended to `<body>`. The dividers look the same. A consumer utility that targets the divider cells with a selector weaker than the old one, such as `[&>tr>*]:border-t-0` on `Table.Foot`, can now win where it lost before.
