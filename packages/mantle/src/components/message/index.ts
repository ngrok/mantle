/**
 * Re-exports for the Message component.
 *
 * @see https://mantle.ngrok.com/components/preview/message
 */

import * as MessageParts from "./message-parts.js";

/**
 * One message of a chat: a person's message in a bubble at the end of the
 * row, or the assistant's answer as full-width prose. Each message renders an
 * `<li>` inside `Conversation.Content`, with a visually hidden speaker label.
 *
 * @useWhen Show one message of a chat with an assistant or a model, with its actions and a marker while
 * the answer is on its way.
 *
 * @siblings
 * - `Conversation`: the transcript that holds the messages and follows the newest one.
 * - `CodeBlock`: code in an answer, inside `Message.Content`.
 *
 * @see https://mantle.ngrok.com/components/preview/message
 *
 * @example
 * Composition:
 * ```
 * Message.Root
 * ├── Message.Content
 * ├── Message.Pending
 * └── Message.Actions
 * ```
 *
 * @example
 * ```tsx
 * <Conversation.Content>
 *   <Message.Root from="user">
 *     <Message.Content>Which endpoints have no traffic policy?</Message.Content>
 *   </Message.Root>
 *   <Message.Root from="assistant">
 *     <Message.Content>{answer}</Message.Content>
 *     {isAnswering && <Message.Pending>Thinking…</Message.Pending>}
 *     <Message.Actions>
 *       <IconButton
 *         appearance="ghost"
 *         intent="neutral"
 *         size="sm"
 *         label="Copy the answer"
 *         icon={<CopyIcon />}
 *         onClick={() => copyToClipboard(answer)}
 *       />
 *     </Message.Actions>
 *   </Message.Root>
 * </Conversation.Content>
 * ```
 */
const Message = MessageParts;

export {
	//,
	Message,
};

export type {
	//,
	MessageActionsProps,
	MessageContentProps,
	MessageFrom,
	MessagePendingProps,
	MessageRootProps,
} from "./message.js";
