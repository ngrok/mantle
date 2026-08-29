---
"@ngrok/mantle": minor
---

Add `LiveRegion`, a persistent, visually hidden live region that announces its text to screen readers when the text changes. The `politeness` prop picks the urgency: `"polite"` (the default) renders `role="status"` and `aria-live="polite"`, and `"assertive"` renders `role="alert"` alone, because a redundant `aria-live` makes VoiceOver on iOS announce the message twice. The region stamps `aria-atomic="true"` and `data-slot="live-region"`, takes `asChild`, and treats the derived `role` and `aria-live` as defaults a consumer prop can override. Keep the region mounted from first paint and swap only its children: a region created after the fact announces unreliably.

Docs: https://mantle.ngrok.com/components/primitives/live-region
