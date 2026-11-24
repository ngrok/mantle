---
"@ngrok/mantle": minor
---

Add `Conversation` and `Message` (preview), the chat transcript parts.

`Conversation` at `@ngrok/mantle/conversation` is a chat transcript that follows the newest message while an answer streams:

- `Conversation.Viewport` follows the end while the reader is at the end. When the reader scrolls up by any means, the view stays where they put it. It follows again when they scroll back to the end, press `Conversation.ScrollButton`, or send a message. The top and bottom edges fade with `scroll-fade-y`.
- `Conversation.ScrollButton` is a round button over the bottom edge that goes back to the newest message. It shows only while the end is out of view.
- `Conversation.Content` is the ordered list of messages.
- `Conversation.Root` owns the chat's one status announcement. Set `streaming`, and screen readers hear "Answering…" when an answer starts and "Answer ended." when it ends. It stamps `data-scrolled-up` while the end is out of view, and `data-streaming` while `streaming` is set.

`Message` at `@ngrok/mantle/message` is one message of a chat:

- `Message.Root` renders an `<li>` with `from="user"` or `from="assistant"`, and stamps `data-from`.
- `Message.Content` renders a person's message in a bubble and the assistant's answer as full-width prose. It starts with a visually hidden speaker label.
- `Message.Pending` marks an answer on its way with a pulsing dot.
- `Message.Actions` holds actions such as copy.

Docs: https://mantle.ngrok.com/components/preview/conversation and https://mantle.ngrok.com/components/preview/message
