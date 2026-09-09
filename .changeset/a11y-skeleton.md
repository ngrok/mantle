---
"@ngrok/mantle": patch
---

`Skeleton` renders `aria-hidden="true"` by default, as its docs already described. Pass `aria-hidden={false}` to opt out, which `Breadcrumb.Skeleton` does because its `role="status"` announcer lives inside the bar. The props type now uses `Omit` to drop `children`; the earlier `Exclude` was a no-op on an object type.
