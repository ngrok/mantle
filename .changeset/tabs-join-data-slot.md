---
"@ngrok/mantle": patch
---

Every `Tabs` part now joins an incoming `data-slot` chain instead of replacing it, so a part rendered through an `asChild` ancestor keeps its own slot beside the ancestor's: `data-slot="app-layout-body tabs"`. Before, the ancestor's value won and the part's slot disappeared.

`Tabs.Badge` now accepts `ref`.

Every `Tabs` part documents the `data-*` attributes it stamps, including the `data-orientation`, `data-state`, and `data-disabled` values Radix sets, in both the JSDoc and the API reference: https://mantle.ngrok.com/components/navigation/tabs#api-reference
