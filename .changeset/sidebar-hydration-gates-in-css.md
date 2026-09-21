---
"@ngrok/mantle": patch
---

`Sidebar.Nav` keys its pre-hydration visibility gate and its width transition off `data-hydrated` in CSS (`not-data-hydrated:hidden`, `lg:not-data-hydrated:block`, `data-hydrated:transition-[width]`) instead of toggling the classes in JS. The rendered behavior is the same: the desktop panel stays hidden below `mobileBreakpoint` until hydration, and a collapse applied on the server snaps into place with no animation. A consumer `className` that sets a display utility no longer overrides the pre-hydration gate through tailwind-merge, so a narrow screen never flashes the desktop panel before hydration. `Sidebar.Nav` also owns `data-hydrated` now: a value passed through props no longer overrides it.
