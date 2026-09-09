---
"@ngrok/mantle": patch
---

Document how to announce a dynamic `Alert`. `Alert.Root` has no ARIA role of its own, so an alert that your code inserts after an action is silent to a screen reader. Pass `role="alert"` so a screen reader announces it. Assistive tech can miss a live region that mounts already populated, so for an error the user must act on, also move focus to the alert with `tabIndex={-1}`. For a less urgent message, pass `role="status"` on a region that is already mounted and write the message into it. The role passes through to the rendered `<div>` as before; the JSDoc and the docs page now show the pattern with a live example.
