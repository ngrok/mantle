"use client";

import type { ComponentProps } from "react";
import { createContext, use, useId, useMemo } from "react";
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

const speakerLabels = {
	user: "You said:",
	assistant: "The assistant said:",
} as const satisfies Record<MessageFrom, string>;

type MessageContextValue = {
	from: MessageFrom;
	/** The speaker label that `Message.Content` renders. */
	speaker: string;
	/** The `id` of the speaker label, which names the article. */
	labelId: string;
};

const MessageContext = createContext<MessageContextValue | null>(null);

function useMessageContext(part: string): MessageContextValue {
	const context = use(MessageContext);
	invariant(context != null, `Message.${part} must be rendered inside Message.Root.`);
	return context;
}

/**
 * The props for `Message.Root`.
 */
type MessageRootProps = ComponentProps<"article"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Who wrote the message. A person's message sits at the end of the row in a
		 * bubble. The assistant's spans the full width, so code and tables get
		 * the room.
		 */
		from: MessageFrom;
		/**
		 * The speaker label, such as `"Error"` or `"Tool result"`. It names the
		 * article and starts the body for a screen reader, in place of "You said:"
		 * or "The assistant said:". It does not change the layout, which `from` sets.
		 * `Message.Content` renders the label, and an `aria-label` on the root
		 * replaces the article's name.
		 *
		 * @default "You said:" when `from` is "user", else "The assistant said:"
		 */
		speaker?: string;
	};

/**
 * One message in a `Conversation.Content` feed: an `<article>` that lays out
 * the message's content, its actions, and any pending marker.
 *
 * It takes keyboard focus, and the focus ring goes around it.
 * `Conversation.Viewport` keeps one message in the tab order and sets
 * `tabIndex`, `aria-posinset`, and `aria-setsize`, so do not set them.
 *
 * A new person's message makes `Conversation.Viewport` follow the end again,
 * because the answer lands there.
 *
 * Set `speaker` when the default speaker label is wrong, such as for an error
 * or a tool result in a captured conversation.
 *
 * | Data Attribute | Value                     | Description                                         |
 * | -------------- | ------------------------- | --------------------------------------------------- |
 * | `data-from`    | `"user"` or `"assistant"` | Who wrote the message. Style with `data-[from=user]:`. |
 *
 * @see https://mantle.ngrok.com/components/ai/message#messageroot
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
	speaker = speakerLabels[from],
	...props
}: MessageRootProps) {
	const Component = asChild ? Slot : "article";
	const labelId = useId();
	const context = useMemo(() => ({ from, speaker, labelId }), [from, speaker, labelId]);

	return (
		<MessageContext value={context}>
			<Component
				// Why: the feed pattern names each article; the speaker label in `Message.Content` says who wrote it.
				// Why `aria-label` wins: a caller's own name for the message beats the speaker label.
				aria-labelledby={props["aria-label"] == null ? labelId : undefined}
				data-slot={joinDataSlot(dataSlot, "message")}
				data-from={from}
				className={cx(
					// Why the scroll margin: a message that Up or Down scrolls to the top keeps room for its ring.
					"flex min-w-0 scroll-my-2 flex-col gap-2 rounded-lg focus-visible:focus-ring",
					rootClassNames[from],
					className,
				)}
				{...props}
			/>
		</MessageContext>
	);
}

/**
 * The props for `Message.Content`.
 */
type MessageContentProps = ComponentProps<"div"> & WithDataSlot;

/**
 * The body of a message. A person's message renders as typed, in a bubble
 * that keeps its line breaks. The assistant's renders full-width prose, the
 * home for formatted text, such as Markdown. A visually hidden speaker label comes first, so a
 * screen reader says who wrote it. `Message.Root`'s `speaker` sets the label.
 *
 * The children sit in a `display: contents` wrapper, `data-slot="message-content-label"`,
 * so a translated page survives a change to them. A child selector such as
 * `space-y-3` does not reach through it, so space the children with
 * `flex flex-col gap-3`.
 *
 * @see https://mantle.ngrok.com/components/ai/message#messagecontent
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
	const { from, speaker, labelId } = useMessageContext("Content");

	return (
		<div
			data-slot={joinDataSlot(dataSlot, "message-content")}
			className={cx("text-sm wrap-break-word", contentClassNames[from], className)}
			{...props}
		>
			{/* Why the trailing space: the label stays a separate word in the text content. */}
			<VisuallyHidden id={labelId}>{`${speaker} `}</VisuallyHidden>
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
 * @see https://mantle.ngrok.com/components/ai/message#messageactions
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
 * @see https://mantle.ngrok.com/components/ai/message#messagepending
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
