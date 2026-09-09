---
"@ngrok/mantle": patch
---

`MultiSelect.Item` now reads the `lockedValues` of `MultiSelect.TagValues` from React state that `MultiSelect.Root` owns, instead of a ref that `TagValues` wrote during render. A value you lock or unlock while the popover is open now takes effect on the next click, even when your items keep the same element identity across renders (a memoized item list, or a consumer compiled with the React Compiler). Before, such an `Item` kept the lock state from its first render: a click in the popover could still deselect a newly locked value, and a newly unlocked one stayed stuck. The lock also no longer depends on `MultiSelect.Trigger` rendering before `MultiSelect.Content`. `TagValues` and `Item` now compile under the React Compiler; the render-time ref writes and reads made the compiler skip both parts before.
