---
"@ngrok/mantle": patch
---

`Conversation.Viewport` draws no focus ring. Before, a click in the blank space of the transcript focused the viewport, and the next key press drew the browser's ring around the whole transcript. Only the focused `Message.Root` draws the ring.
