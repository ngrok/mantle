---
"@ngrok/mantle": patch
---

- `Toast.Icon` renders a custom `svg` for `intent="info"`. Before this change the info branch ignored `svg` and always drew the default icon.
- `Toaster` converts a `duration_ms` of `0` or less to `Number.POSITIVE_INFINITY`, as the docs describe and as `makeToast` already did. Before this change `0` fell back to sonner's 4000ms default and a negative value dismissed at once.
- `Toast.Root` no longer advertises `asChild` in its props type. The root renders the intent accent bar next to `children`, so a slot always threw at runtime.
