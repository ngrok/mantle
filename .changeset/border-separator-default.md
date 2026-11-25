---
"@ngrok/mantle": patch
---

A border with no color class now draws in the separator color, not the text color. In Tailwind v4 a bare `border-b` was `currentColor`: black in light mode and white in dark mode. Any `border-*` color class, such as `border-current`, still wins. Write the color class anyway: `border-separator` for a divider, the surface token such as `border-card-muted` for an edge, and `border-form` for a control.

Docs: https://mantle.ngrok.com/base/colors#borders-and-dividers
