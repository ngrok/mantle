"use client";

import type { ComponentProps } from "react";
import { createContext, use } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";
import { VisuallyHidden } from "../visually-hidden/visually-hidden.js";

/**
 * Who wrote a message: the person at the screen, or the assistant.
 */
type MessageFrom = "user" | "assistant";

const rootClassNames = {
	user: "items-end",
	assistant: "items-start",
} as const satisfies Record<MessageFrom, string>;

const contentClassNames = {
	user: "text-strong max-w-[85%] rounded-2xl bg-neutral-500/8 px-3.5 py-2 whitespace-pre-wrap",
	assistant: "text-body w-full min-w-0 leading-relaxed",
} as const satisfies Record<MessageFrom, string>;

const MessageContext = createContext<MessageFrom | null>(null);

function useMessageFrom(part: string): MessageFrom {
	const from = use(MessageContext);
	invariant(from != null, `Message.${part} must be rendered inside Message.Root.`);
	return from;
}

/**
 * The props for `Message.Root`.
 */
type MessageRootProps = ComponentProps<"li"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Who wrote the message. A person's message sits at the end of the row in a
		 * bubble. The assistant's spans the full width, so code and tables get
		 * the room.
		 */
		from: MessageFrom;
	};

/**
 * One message in a `Conversation.Content` list: an `<li>` that lays out the
 * message's content, its actions, and any pending marker.
 *
 * A new person's message makes `Conversation.Viewport` follow the end again,
 * because the answer lands there.
 *
 * | Data Attribute | Value                     | Description                                         |
 * | -------------- | ------------------------- | --------------------------------------------------- |
 * | `data-from`    | `"user"` or `"assistant"` | Who wrote the message. Style with `data-[from=user]:`. |
 *
 * @see https://mantle.ngrok.com/components/preview/message#messageroot
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
function Root({
	"data-slot": dataSlot,
	asChild = false,
	className,
	from,
	...props
}: MessageRootProps) {
	const Component = asChild ? Slot : "li";

	return (
		<MessageContext value={from}>
			<Component
				data-slot={joinDataSlot(dataSlot, "message")}
				data-from={from}
				className={cx("flex min-w-0 flex-col gap-2", rootClassNames[from], className)}
				{...props}
			/>
		</MessageContext>
	);
}

/**
 * The props for `Message.Content`.
 */
type MessageContentProps = ComponentProps<"div"> & WithDataSlot;

const speakerLabels = {
	user: "You said: ",
	assistant: "The assistant said: ",
} as const satisfies Record<MessageFrom, string>;

/**
 * The body of a message. A person's message renders as typed, in a bubble
 * that keeps its line breaks. The assistant's renders full-width prose, the
 * home for formatted text, such as Markdown. A visually hidden speaker label comes first, so a
 * screen reader says who wrote it.
 *
 * The children sit in a `display: contents` wrapper, `data-slot="message-content-label"`,
 * so a translated page survives a change to them. A child selector such as
 * `space-y-3` does not reach through it, so space the children with
 * `flex flex-col gap-3`.
 *
 * @see https://mantle.ngrok.com/components/preview/message#messagecontent
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
// Why no asChild: the part renders its speaker label beside the children, and `Slot` takes one child.
function Content({ "data-slot": dataSlot, children, className, ...props }: MessageContentProps) {
	const from = useMessageFrom("Content");

	return (
		<div
			data-slot={joinDataSlot(dataSlot, "message-content")}
			className={cx("text-sm wrap-break-word", contentClassNames[from], className)}
			{...props}
		>
			<VisuallyHidden>{speakerLabels[from]}</VisuallyHidden>
			<div data-slot="message-content-label" className="contents">
				{children}
			</div>
		</div>
	);
}

/**
 * The props for `Message.Actions`.
 */
type MessageActionsProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * A row of small actions and facts under a message, such as a copy button and
 * a count of tool calls.
 *
 * @see https://mantle.ngrok.com/components/preview/message#messageactions
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
function Actions({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: MessageActionsProps) {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "message-actions")}
			className={cx("text-muted flex items-center gap-1 text-xs", className)}
			{...props}
		/>
	);
}

/**
 * The props for `Message.Pending`.
 */
type MessagePendingProps = ComponentProps<"div"> & WithDataSlot;

/**
 * A marker that an answer is on its way, with a pulsing dot, such as
 * "Thinking…". Keep it under the part of the answer that arrived until the
 * answer ends: a first sentence can come before seconds of tool calls.
 *
 * It is not a live region. `Conversation.Root` announces the answer's start
 * and end once. The children sit in a `display: contents` wrapper,
 * `data-slot="message-pending-label"`, so a translated page survives a change
 * to them.
 *
 * @see https://mantle.ngrok.com/components/preview/message#messagepending
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
// Why no asChild: the part renders its dot beside the children, and `Slot` takes one child.
function Pending({ "data-slot": dataSlot, children, className, ...props }: MessagePendingProps) {
	return (
		<div
			data-slot={joinDataSlot(dataSlot, "message-pending")}
			className={cx("text-muted flex items-center gap-2 text-sm", className)}
			{...props}
		>
			<span
				aria-hidden
				className="size-1.5 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none"
			/>
			<span data-slot="message-pending-label" className="contents">
				{children}
			</span>
		</div>
	);
}

export {
	//,
	Root,
	Content,
	Actions,
	Pending,
};

export type {
	//,
	MessageFrom,
	MessageRootProps,
	MessageContentProps,
	MessageActionsProps,
	MessagePendingProps,
};
