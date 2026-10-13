---
"@ngrok/mantle": patch
---

Bump the runtime dependencies to their latest patch or minor release:

- `@ariakit/react` from 0.4.40 to 0.4.41
- `@radix-ui/react-dialog` from 1.1.23 to 1.3.1
- `@radix-ui/react-dropdown-menu` from 2.1.24 to 2.2.1
- `@radix-ui/react-hover-card` from 1.1.23 to 1.2.1
- `@radix-ui/react-popover` from 1.1.23 to 1.3.1
- `@radix-ui/react-progress` from 1.1.16 to 1.2.1
- `@radix-ui/react-select` from 2.3.7 to 2.4.1
- `@radix-ui/react-slider` from 1.4.7 to 1.6.1
- `@radix-ui/react-slot` from 1.3.3 to 1.5.0
- `@radix-ui/react-switch` from 1.3.7 to 1.4.1
- `@radix-ui/react-tabs` from 1.1.21 to 1.2.1
- `@radix-ui/react-tooltip` from 1.2.16 to 1.4.1
- `@tanstack/react-table` from 9.2.4 to 9.3.1
- `@tanstack/react-virtual` from 3.14.13 to 3.14.18

No API change. `TruncatedText` keeps its contract under the new Radix tooltip: the root still carries no `aria-describedby` for the tooltip, so a screen reader reads the value once. A consumer's own `aria-describedby` still lands on the root.
