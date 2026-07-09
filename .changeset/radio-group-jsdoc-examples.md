---
"@ngrok/mantle": patch
---

Fix incorrect RadioGroup JSDoc `@example` blocks: the change handler is `onChange` (Headless UI), not `onValueChange`; the namespace object is not renderable (`<RadioGroup.Root>`, not `<RadioGroup>`); and `RadioGroup.ButtonGroup` renders the radio group itself, so the examples no longer nest it inside `RadioGroup.Root` — that composition binds the buttons to an inner, uncontrolled group and silently ignores outer `value`/`onChange` props. Documentation only, no runtime changes.
