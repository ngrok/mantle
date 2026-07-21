---
"@ngrok/mantle": minor
---

feat(power-bar): add the PowerBar preview component — a floating save bar for unsaved changes

`PowerBar` is a persistent, decision-bearing bar that floats near the bottom edge of the viewport. It surfaces pending state — primarily a form's unsaved ("dirty") changes — and stays until the user resolves it: save or discard. Unlike Toast, which announces something that already happened and leaves on its own, a PowerBar surfaces something pending and stays until resolved. (The name joins Mantle's food-named family — Toast, Breadcrumb, Progress Donut — and, like a protein bar, it's fuel for action: the bar that carries the decision you need to make.)

- Compound parts: `PowerBar.Root` (always-mounted, controlled `open` prop), `PowerBar.Message`, `PowerBar.Actions`, `PowerBar.SaveButton`, `PowerBar.DiscardButton`, `PowerBar.Error`
- Accessible by default: persistent polite + assertive live regions announce opening, pending saves, blocked navigation, and errors; the panel is a `role="group"` named by the visible message; focus is parked and restored around loading/close transitions; Escape is intentionally inert
- `handleRef` receives a `PowerBarHandle` — `shake(options?: { announcement?: string })` wiggles the panel (skipped under `prefers-reduced-motion`) and always announces assertively; wire it to your router's navigation guard
- Sonner-style interruptible motion: state-driven CSS transitions (a reopen mid-exit retargets smoothly from the panel's current position); the panel slides fully off the viewport edge with a motion-led, late fade — 400ms enter, 200ms exit — degrading to fade-only under reduced motion

Ships as a preview component: `import { PowerBar } from "@ngrok/mantle/power-bar"`.
