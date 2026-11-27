---
"@ngrok/mantle": patch
---

Fix `Message.Root`'s `speaker` so it names the `<article>` when the message has no `Message.Content`, such as a message that holds only images. Before, the article had no name. You no longer need an `aria-label` for this case. When you omit `speaker`, nothing changes.
