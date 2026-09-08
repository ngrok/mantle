---
"@ngrok/mantle": patch
---

Document how to announce a dynamic `Alert`. `Alert.Root` has no ARIA role of its own, so an alert that your code inserts after an action is silent to a screen reader. Pass `role="alert"` for an urgent message, or `role="status"` for one that can wait. Both pass through to the rendered `<div>` as before; the JSDoc and the docs page now say so.
