---
"@ngrok/mantle": minor
---

feat(sandbar): add the Sandbar preview component — a floating save bar for unsaved changes

`Sandbar` is a persistent, decision-bearing bar that floats near the bottom edge of the viewport. It surfaces pending state — primarily a form's unsaved ("dirty") changes — and stays until the user resolves it: save or discard. Unlike Toast, which announces something that already happened and leaves on its own, a Sandbar surfaces something pending and stays until resolved. (The name: a sandbar is a bar that blocks navigation.)

- Compound parts: `Sandbar.Root` (always-mounted, controlled `open` prop), `Sandbar.Message`, `Sandbar.Actions`, `Sandbar.SaveButton`, `Sandbar.DiscardButton`, `Sandbar.Error`
- Accessible by default: persistent polite + assertive live regions announce opening, pending saves, blocked navigation, and errors; the panel is a `role="group"` named by the visible message; focus is parked and restored around loading/close transitions; Escape is intentionally inert
- `handleRef` receives a `SandbarHandle` — `shake(options?: { announcement?: string })` wiggles the panel (skipped under `prefers-reduced-motion`) and always announces assertively; wire it to your router's navigation guard
- Quick enter/exit motion (200ms/150ms, ease-out, fade + short slide) that degrades to fade-only under reduced motion

Ships as a preview component: `import { Sandbar } from "@ngrok/mantle/sandbar"`.
