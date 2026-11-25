---
"@ngrok/mantle": patch
---

An `AppLayout.SidePanel` that is open on mount (`defaultOpen` or a saved cookie) and covers the card at a phone width no longer moves focus into itself. Before, the page load put focus in the panel and trapped `Tab` there, and a demo in a narrow frame took focus from the parent page. The panel still covers the card and keeps the card and the sidebar `inert`. The focus trap starts when focus first enters the panel or the reader opens it again.
