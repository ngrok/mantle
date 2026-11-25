---
"@ngrok/mantle": minor
---

Add `Conversation` and `Message`, the chat transcript parts.

`Conversation` at `@ngrok/mantle/conversation` is a chat transcript that follows the newest message while an answer streams:

- `Conversation.Viewport` follows the end while the reader is at the end. When the reader scrolls up by any means, the view stays where they put it. It follows again when they scroll back to the end, press `Conversation.ScrollButton`, or send a message. The bottom edge fades with `scroll-fade-b` while newer text is below the view; the top does not fade. It reserves the scrollbar's space on both sides, so centered content lines up with a centered composer. It takes keyboard focus, and `Conversation.Root` draws the focus ring, so the fade does not cover it.
- `Conversation.ScrollButton` is a round button at the bottom right of the viewport that goes back to the newest message. It shows only while the end is out of view, and grows in and out.
- `Conversation.Content` is the ordered list of messages.
- `Conversation.Root` owns the chat's one status announcement. Set `streaming`, and screen readers hear "Answering…" when an answer starts and "Answer ended." when it ends. It stamps `data-scrolled-up` while the end is out of view, and `data-streaming` while `streaming` is set.

The viewport preserves a place restored by `useScrollAnchor`, including the top of a long transcript. Loading older history does not resume following. The scroll button respects reduced motion and returns focus to the viewport before it becomes inert. A `conversation-label` wrapper protects translated loading text when it changes to a transcript.

`Message` at `@ngrok/mantle/message` is one message of a chat:

- `Message.Root` renders an `<li>` with `from="user"` or `from="assistant"`, and stamps `data-from`.
- `Message.Content` renders a person's message in a bubble and the assistant's answer as full-width prose. It starts with a visually hidden speaker label.
- `Message.Pending` marks an answer on its way with a pulsing dot.
- `Message.Actions` holds actions such as copy.

Docs: https://mantle.ngrok.com/components/ai/conversation and https://mantle.ngrok.com/components/ai/message
