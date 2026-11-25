/**
 * Re-exports for the Conversation component.
 *
 * @see https://mantle.ngrok.com/components/ai/conversation
 */

import * as ConversationParts from "./conversation-parts.js";

/**
 * A chat transcript that follows the newest message while an answer streams,
 * as Amp does. When the reader scrolls up, it stays put and shows a button
 * back to the end. The bottom edge fades when newer text is below the view.
 *
 * @useWhen Show the messages of a chat with an assistant or a model, and keep the newest text in view
 * while an answer streams.
 *
 * @siblings
 * - `Message`: one message inside the conversation.
 * - `List`: a list of items that does not grow at its end while the reader watches.
 *
 * @see https://mantle.ngrok.com/components/ai/conversation
 *
 * @example
 * Composition:
 * ```
 * Conversation.Root
 * ├── Conversation.Viewport
 * │   └── Conversation.Content
 * │       └── Message.Root
 * └── Conversation.ScrollButton
 * ```
 *
 * @example
 * ```tsx
 * <Conversation.Root streaming={isAnswering} className="flex-1">
 *   <Conversation.Viewport>
 *     <Conversation.Content
 *       aria-label="Conversation with the assistant"
 *       className="mx-auto max-w-3xl p-4"
 *     >
 *       {messages.map((message) => (
 *         <Message.Root key={message.id} from={message.role}>
 *           <Message.Content>{message.text}</Message.Content>
 *         </Message.Root>
 *       ))}
 *     </Conversation.Content>
 *   </Conversation.Viewport>
 *   <Conversation.ScrollButton />
 * </Conversation.Root>
 * ```
 */
const Conversation = ConversationParts;

export {
	//,
	Conversation,
};

export type {
	//,
	ConversationContentProps,
	ConversationRootProps,
	ConversationScrollButtonProps,
	ConversationViewportProps,
} from "./conversation.js";
