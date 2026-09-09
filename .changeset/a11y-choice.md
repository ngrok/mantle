---
"@ngrok/mantle": patch
---

`Choice.Description` no longer takes `id`. `Choice.Root` owns that id and points the control's `aria-describedby` at it; a consumer `id` replaced it and left the reference dangling. The id is now stamped after the props spread, so a wider props object cannot override it either.
