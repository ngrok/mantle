---
"@ngrok/mantle": minor
---

feat(sandbar): add the Sandbar component — a floating save bar for unsaved changes

`Sandbar` is a persistent, decision-bearing bar that floats near the bottom edge of the viewport. It surfaces pending state — primarily a form's unsaved ("dirty") changes — and stays until the user resolves it: save or discard. Unlike Toast, which announces something that already happened and leaves on its own, a Sandbar surfaces something pending and stays until resolved. (The name: a sandbar is a bar that blocks navigation.)

- Compound parts: `Sandbar.Root` (always-mounted, controlled `open` prop), `Sandbar.Message`, `Sandbar.Actions`, `Sandbar.SaveButton`, `Sandbar.DiscardButton`. There is deliberately no error part — a failed save is reported contextually in the form (field message, or a form-level `Alert` that takes focus), because the bar carries the *pending decision*, not the outcome of the request
- Accessible by default: persistent polite + assertive live regions announce opening, pending saves, and blocked navigation; the panel is a `role="group"` named by the visible message; focus is parked and restored around loading/close transitions; Escape is intentionally inert
- `handleRef` receives a `SandbarHandle` — `shake(options?: { announcement?: string })` wiggles the panel (skipped under `prefers-reduced-motion`) and always announces assertively; wire it to your router's navigation guard
- Sonner-style interruptible motion: state-driven CSS transitions (a reopen mid-exit retargets smoothly from the panel's current position); the panel slides fully off the viewport edge with a motion-led, late fade — 400ms enter, 200ms exit — degrading to fade-only under reduced motion
- Data attributes: every part stamps a `data-slot` (`sandbar`, `sandbar-message`, `sandbar-actions`, `sandbar-save-button`, `sandbar-discard-button`) and joins any incoming chain ahead of its own name, so `asChild` composition accumulates the whole chain instead of clobbering it. The panel also stamps `data-state="open" | "closed"`, which drives the enter/exit transition. No public CSS variables.

Import it: `import { Sandbar } from "@ngrok/mantle/sandbar"`.
