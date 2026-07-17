---
"@ngrok/mantle": patch
---

Add `CenteredLayout.Notice`: a full-window-width strip pinned above everything else in the layout —
including `CenteredLayout.Header` — for impersonation notices, environment warnings, and similar app-wide
messaging. It renders an unstyled `<div>` (`w-full shrink-0`) that collapses to nothing when empty, the same
slot contract as `AppLayout.Notice`, so an app-wide banner composes identically across both layouts. On
flows that scroll, merge `sticky top-0 z-20` via `className` to keep it pinned to the window.
