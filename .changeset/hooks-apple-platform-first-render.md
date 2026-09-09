---
"@ngrok/mantle": patch
---

`MetaKey`, `Command.SearchTrigger`, and `Sidebar.Trigger` now resolve the host platform in the first render of a client mount. Before this change they rendered the non-Apple answer (`⌃`, `Control+K`, `Control+B`), committed, and then corrected themselves in an effect, so a palette that opened on macOS committed twice and could show `⌃` before `⌘`. The server HTML and the hydration render still carry the non-Apple answer, and React still corrects them once after hydration, so nothing changes for a server-rendered page's first paint.
