/**
 * Re-exports for the ConversationOutline component.
 *
 * @see https://mantle.ngrok.com/components/ai/conversation-outline
 */

import * as ConversationOutlineParts from "./conversation-outline-parts.js";

/**
 * A list of the person's messages in a long chat, as Amp's conversation
 * outline does. A press on one jumps to that message and moves focus to it.
 * The items of the messages in view show in the strong color, and the
 * current one carries `aria-current="location"`.
 *
 * @useWhen Let the person find and jump back to one of their own messages in a long chat.
 *
 * @siblings
 * - `Conversation`: the transcript the outline jumps in.
 * - `Message`: give each `Message.Root` an `id` for an item's `target`.
 * - `Popover`: a floating panel with other content.
 *
 * @see https://mantle.ngrok.com/components/ai/conversation-outline
 *
 * @example
 * Composition:
 * ```
 * ConversationOutline.Root
 * ├── ConversationOutline.Trigger
 * └── ConversationOutline.Content
 *     └── ConversationOutline.Item
 * ```
 *
 * @example
 * ```tsx
 * <ConversationOutline.Root>
 *   <ConversationOutline.Trigger />
 *   <ConversationOutline.Content>
 *     {userMessages.map((message) => (
 *       <ConversationOutline.Item key={message.id} target={`message-${message.id}`}>
 *         {message.text}
 *       </ConversationOutline.Item>
 *     ))}
 *   </ConversationOutline.Content>
 * </ConversationOutline.Root>
 * ```
 */
const ConversationOutline = ConversationOutlineParts;

export {
	//,
	ConversationOutline,
};

export type {
	//,
	ConversationOutlineContentProps,
	ConversationOutlineItemProps,
	ConversationOutlineRootProps,
	ConversationOutlineTriggerProps,
} from "./conversation-outline.js";
