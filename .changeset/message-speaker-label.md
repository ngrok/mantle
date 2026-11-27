---
"@ngrok/mantle": patch
---

Add `speaker` to `Message.Root`. It sets the speaker label that `Message.Content` renders for a screen reader and that names the `<article>`, such as `speaker="Error"` or `speaker="Tool result"`. The label and the article's name always agree. `from` still sets the layout. When you omit `speaker`, the label stays "You said:" or "The assistant said:". See https://mantle.ngrok.com/components/ai/message#name-the-speaker.
