---
"@ngrok/mantle": patch
---

Bump runtime dependencies: `@ariakit/react` to 0.4.37, `@tanstack/react-virtual` to 3.14.10, `input-otp` to 1.5.0, and `sonner` to 2.0.8.

The ariakit bump changes two behaviors in mantle's ariakit-backed parts (`Combobox`, `MultiSelect`): a select-style popup now takes focus every time it opens, not only when the trigger itself had focus, and a prop set to an explicit `undefined` now behaves like an omitted prop, so the component keeps its computed default.

The `input-otp` bump hardens `OTPInput`: the browser no longer spellchecks the code, a 16px font-size fallback prevents the iOS focus zoom, and the library's own container now carries `translate="no"`, which backs up the lock mantle already puts on each slot.
