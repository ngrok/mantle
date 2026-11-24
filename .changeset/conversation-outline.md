---
"@ngrok/mantle": minor
---

Add `ConversationOutline`, a list of the person's messages in a long chat, as Amp's conversation outline does.

`ConversationOutline` at `@ngrok/mantle/conversation-outline` composes with `Conversation` and `Message`:

- `ConversationOutline.Trigger` is an icon button that opens the outline. Put it in a side panel's header, or float it over a full-width chat.
- `ConversationOutline.Content` is a popover that lists the messages. It flips above the trigger when there is no room below, and closes on Escape or a press outside. When it opens, focus moves to the current message's item.
- `ConversationOutline.Item` is one message, as one line of text. Pass the `id` of its `Message.Root` as `target`. A press closes the outline, scrolls the message to the top of the transcript, and moves focus to it. The item of each message in view carries `data-in-view` and shows in the strong color. The current one carries `aria-current="location"`.

A jump up while an answer streams stays at the message. `Conversation.Viewport` follows the end again as usual: when the reader scrolls back to the end, presses `Conversation.ScrollButton`, or sends a message. The jump respects reduced motion.

Docs: https://mantle.ngrok.com/components/ai/conversation-outline
