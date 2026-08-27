---
"@ngrok/mantle": minor
---

Add `VisuallyHidden`, a primitive that renders content for screen readers without showing it. It renders a `<span>` clipped to a one-pixel box (never `display: none`), stamps `data-slot="visually-hidden"`, and takes `asChild` to hide a more semantic element (a `<caption>`, a `<legend>`, a heading). Do not use it to name an icon-only control: voice-control software skips a control whose only label is hidden DOM text, so use `aria-label` there instead.

Docs: https://mantle.ngrok.com/components/primitives/visually-hidden
