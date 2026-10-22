---
"@ngrok/mantle": patch
---

Stop a closed `AppLayout.SidePanel` from sliding when the viewport crosses `mobileBreakpoint` or the rail changes. When a close ends, the transition stays off until the next open, so the closed panel changes presentation at once. An open and a close still slide, and a merged `duration-*` still sets how long a close runs.
