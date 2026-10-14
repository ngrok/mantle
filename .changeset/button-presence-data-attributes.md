---
"@ngrok/mantle": minor
---

`Button` and `IconButton` now stamp `data-disabled` and `data-loading` by presence alone: `data-disabled=""` while the button is disabled, loading, or `aria-disabled="true"`, and `data-loading=""` while `isLoading`. An enabled, idle button carries neither attribute. Before, every button carried both with a `"true"` or `"false"` value, and mantle's `data-disabled:` variant matches the attribute's presence, so a consumer's `data-disabled:` style fired on every button.

Migration: a selector on a value no longer matches: `[data-disabled="true"]`, `[data-disabled="false"]`, `[data-loading="true"]`, and `[data-loading="false"]`. Match presence instead: `[data-disabled]` and `[data-loading]`, or the `data-disabled:` variant, and `:not([data-disabled])` for the enabled state. `Sandbar.SaveButton` and `Sandbar.DiscardButton` reflect the same two attributes from the `Button` they render.
