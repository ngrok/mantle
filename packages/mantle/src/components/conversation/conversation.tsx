"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/ArrowDown";
import type { ComponentProps, RefObject } from "react";
import { createContext, use, useCallback, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useScrollBehavior } from "../../hooks/use-scroll-behavior.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { IconButton } from "../button/icon-button.js";
import { LiveRegion } from "../live-region/live-region.js";
import { Slot } from "../slot/index.js";

/** How close to the end, in pixels, a scroll position counts as the end. */
const END_THRESHOLD = 8;

/** The attribute `Conversation.Root` carries while the end of the conversation is out of view. */
const SCROLLED_UP_ATTRIBUTE = "data-scrolled-up";

/** A new person's message re-pins the view to the end: they sent it, and the answer lands there. */
const USER_MESSAGE_SELECTOR = '[data-from="user"]';

type ConversationContextValue = {
	rootRef: RefObject<HTMLDivElement | null>;
	/** Scrolls the viewport to its end and follows it again. Set while a viewport is mounted. */
	scrollToEndRef: RefObject<((behavior: ScrollBehavior) => void) | null>;
	viewportRef: RefObject<HTMLDivElement | null>;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

function useConversationContext(part: string): ConversationContextValue {
	const context = use(ConversationContext);
	invariant(context != null, `Conversation.${part} must be rendered inside Conversation.Root.`);
	return context;
}

/**
 * The props for `Conversation.Root`.
 */
type ConversationRootProps = ComponentProps<"div"> &
	WithDataSlot & {
		/**
		 * True while an answer streams. `Conversation.Root` announces "Answering…"
		 * to screen readers when it turns true, and "Answer ended." when it turns
		 * false. It never reads the answer aloud.
		 *
		 * @default false
		 */
		streaming?: boolean;
	};

/**
 * A chat transcript that keeps the newest message in view, as Amp does. It
 * holds `Conversation.Viewport`, the region that scrolls, and
 * `Conversation.ScrollButton`, which floats over the viewport's bottom edge.
 * Give it a height, such as `flex-1` in a flex column.
 *
 * It owns the chat's one screen-reader announcement: when an answer starts and
 * when it ends. A live region that read each streamed word would interrupt
 * the reader.
 *
 * | Data Attribute     | Value                                 | Description                                    |
 * | ------------------ | ------------------------------------- | ---------------------------------------------- |
 * | `data-scrolled-up` | present while the end is out of view  | Presence-only. Shows `Conversation.ScrollButton`. |
 * | `data-streaming`   | present while `streaming`             | Presence-only. Style with `data-streaming:`.   |
 *
 * @see https://mantle.ngrok.com/components/preview/conversation#conversationroot
 *
 * @example
 * ```tsx
 * <Conversation.Root streaming={isAnswering} className="flex-1">
 *   <Conversation.Viewport aria-label="Conversation with the assistant">
 *     <Conversation.Content className="mx-auto max-w-3xl p-4">
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
// Why no asChild: Root renders its status region beside the children, and `Slot` takes one child.
function Root({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	streaming = false,
	...props
}: ConversationRootProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const scrollToEndRef = useRef<((behavior: ScrollBehavior) => void) | null>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(rootRef, ref);
	const [context] = useState<ConversationContextValue>(() => ({
		rootRef,
		scrollToEndRef,
		viewportRef,
	}));
	const announcement = useStreamAnnouncement(streaming);

	return (
		<ConversationContext value={context}>
			<div
				ref={composedRef}
				data-slot={joinDataSlot(dataSlot, "conversation")}
				data-streaming={streaming ? "" : undefined}
				className={cx("group/conversation relative flex min-h-0 flex-col", className)}
				{...props}
			>
				{children}
				{/* Why after the children: a live region that mounts last is an append, which a translated page survives. */}
				<LiveRegion data-slot="conversation-status">{announcement}</LiveRegion>
			</div>
		</ConversationContext>
	);
}

/**
 * The text for the conversation's status region: "Answering…" while an answer
 * streams, "Answer ended." after one, and nothing before the first. A region
 * announces a change, so the next answer announces again.
 */
function useStreamAnnouncement(streaming: boolean): string {
	const [hasStreamed, setHasStreamed] = useState(streaming);
	if (streaming && !hasStreamed) {
		setHasStreamed(true);
	}
	if (streaming) {
		return "Answering…";
	}
	return hasStreamed ? "Answer ended." : "";
}

/**
 * The props for `Conversation.Viewport`.
 */
type ConversationViewportProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The region that scrolls. It follows the end while the reader is at the end,
 * so streamed text never lands below the fold. When the reader scrolls up by
 * any means, it stays where they put it. It follows again when they scroll
 * back to the end, press `Conversation.ScrollButton`, or send a message.
 *
 * The top and bottom edges fade when there is more to read past them, with
 * mantle's `scroll-fade-y`. The region is focusable, so a keyboard can scroll
 * a transcript with no focusable content. Name it with `aria-label`.
 *
 * On mount it starts at the end, unless something already moved it, such as
 * `useScrollAnchor` restoring the reader's place.
 *
 * @see https://mantle.ngrok.com/components/preview/conversation#conversationviewport
 *
 * @example
 * ```tsx
 * <Conversation.Root streaming={isAnswering} className="flex-1">
 *   <Conversation.Viewport aria-label="Conversation with the assistant">
 *     <Conversation.Content className="mx-auto max-w-3xl p-4">
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
function Viewport({
	"data-slot": dataSlot,
	asChild = false,
	className,
	ref,
	...props
}: ConversationViewportProps) {
	const Component = asChild ? Slot : "div";
	const { rootRef, scrollToEndRef, viewportRef } = useConversationContext("Viewport");
	const followRef = useCallback(
		(element: HTMLDivElement | null) => {
			if (element == null) {
				return undefined;
			}
			const stop = followEnd(element, {
				onScrolledUpChange: (scrolledUp) => {
					rootRef.current?.toggleAttribute(SCROLLED_UP_ATTRIBUTE, scrolledUp);
				},
			});
			scrollToEndRef.current = stop.scrollToEnd;
			return () => {
				stop.disconnect();
				scrollToEndRef.current = null;
			};
		},
		[rootRef, scrollToEndRef],
	);
	const composedRef = useComposedRefs(viewportRef, followRef, ref);

	return (
		<Component
			ref={composedRef}
			role="region"
			// Why: Safari does not focus a scroll region with no focusable content, so a keyboard could not scroll it.
			// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Why: a scroll region must take focus to scroll by keyboard.
			tabIndex={0}
			data-slot={joinDataSlot(dataSlot, "conversation-viewport")}
			className={cx(
				"scrollbar scroll-fade-y min-h-0 flex-1 overflow-y-auto",
				// Inset, so an ancestor card does not clip the ring.
				"focus-visible:ring-focus-accent focus-visible:ring-4 focus-visible:outline-hidden focus-visible:ring-inset",
				className,
			)}
			{...props}
		/>
	);
}

type FollowEnd = {
	disconnect: () => void;
	scrollToEnd: (behavior: ScrollBehavior) => void;
};

/**
 * Keeps `viewport` at its end while its content grows, until the reader
 * scrolls up. Reports each change between "at the end" and "scrolled up".
 *
 * - A `MutationObserver` sees streamed text and new messages.
 * - A `ResizeObserver` sees a viewport that resizes and content that grows
 *   with no DOM change, such as an image that loads.
 * - Only the reader moves the view up, so a scroll or a wheel up from the
 *   last followed position releases it. A scroll back to the end follows again.
 */
function followEnd(
	viewport: HTMLElement,
	{ onScrolledUpChange }: { onScrolledUpChange: (scrolledUp: boolean) => void },
): FollowEnd {
	// Why `scrollTop === 0`: a restored place, such as one from `useScrollAnchor`, must stay.
	let isFollowing = viewport.scrollTop === 0;
	let followedTop = viewport.scrollTop;
	let scrolledUp = false;

	const distanceFromEnd = () => viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
	const report = () => {
		const next = distanceFromEnd() > END_THRESHOLD;
		if (next !== scrolledUp) {
			scrolledUp = next;
			onScrolledUpChange(next);
		}
	};
	const follow = () => {
		// Why: a scroll up whose event has not fired yet must still release the view.
		if (viewport.scrollTop < followedTop && distanceFromEnd() > END_THRESHOLD) {
			isFollowing = false;
		}
		if (isFollowing) {
			// Why `instant`: a `scroll-behavior: smooth` container would animate each update and lag the text.
			viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
			followedTop = viewport.scrollTop;
		}
		report();
	};

	const resizes = new ResizeObserver(follow);
	const observeChildren = () => {
		resizes.disconnect();
		resizes.observe(viewport);
		for (const child of viewport.children) {
			resizes.observe(child);
		}
	};
	const mutations = new MutationObserver((records) => {
		if (records.some(addsUserMessage)) {
			isFollowing = true;
			followedTop = viewport.scrollTop;
		}
		if (records.some((record) => record.target === viewport && record.type === "childList")) {
			observeChildren();
		}
		follow();
	});
	const onScroll = () => {
		if (distanceFromEnd() <= END_THRESHOLD) {
			isFollowing = true;
			followedTop = viewport.scrollTop;
		} else if (viewport.scrollTop < followedTop) {
			isFollowing = false;
		}
		report();
	};
	// Why a wheel listener: a follow that lands before the scroll event would undo the reader's scroll up.
	const onWheel = (event: WheelEvent) => {
		if (event.deltaY < 0) {
			isFollowing = false;
		}
	};

	mutations.observe(viewport, { childList: true, subtree: true, characterData: true });
	observeChildren();
	viewport.addEventListener("scroll", onScroll, { passive: true });
	viewport.addEventListener("wheel", onWheel, { passive: true });
	follow();

	return {
		disconnect: () => {
			mutations.disconnect();
			resizes.disconnect();
			viewport.removeEventListener("scroll", onScroll);
			viewport.removeEventListener("wheel", onWheel);
		},
		scrollToEnd: (behavior) => {
			isFollowing = true;
			followedTop = viewport.scrollTop;
			viewport.scrollTo({ top: viewport.scrollHeight, behavior });
		},
	};
}

/** Whether a mutation adds a person's message, or an element that holds one. */
function addsUserMessage(record: MutationRecord): boolean {
	for (const node of record.addedNodes) {
		if (
			node instanceof Element &&
			(node.matches(USER_MESSAGE_SELECTOR) || node.querySelector(USER_MESSAGE_SELECTOR))
		) {
			return true;
		}
	}
	return false;
}

/**
 * The props for `Conversation.Content`.
 */
type ConversationContentProps = ComponentProps<"ol"> & WithAsChild & WithDataSlot;

/**
 * The ordered list of messages. Each child is a `Message.Root`, which renders
 * an `<li>`. Set the measure and padding here, such as `mx-auto max-w-3xl p-4`.
 *
 * @see https://mantle.ngrok.com/components/preview/conversation#conversationcontent
 *
 * @example
 * ```tsx
 * <Conversation.Root streaming={isAnswering} className="flex-1">
 *   <Conversation.Viewport aria-label="Conversation with the assistant">
 *     <Conversation.Content className="mx-auto max-w-3xl p-4">
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
function Content({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: ConversationContentProps) {
	const Component = asChild ? Slot : "ol";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "conversation-content")}
			className={cx("flex flex-col gap-6", className)}
			{...props}
		/>
	);
}

/**
 * The props for `Conversation.ScrollButton`.
 */
type ConversationScrollButtonProps = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label" | "type"
> & {
	/**
	 * The accessible name of the button.
	 *
	 * @default "Scroll to the latest message"
	 */
	label?: string;
};

/**
 * The round button over the bottom edge of the viewport that goes back to the
 * newest message, as Amp's does. It shows only while the end is out of view,
 * and leaves the tab order while hidden. A press scrolls to the end, follows
 * the end again, and moves focus to the viewport, because the button hides.
 *
 * @see https://mantle.ngrok.com/components/preview/conversation#conversationscrollbutton
 *
 * @example
 * ```tsx
 * <Conversation.Root streaming={isAnswering} className="flex-1">
 *   <Conversation.Viewport aria-label="Conversation with the assistant">
 *     <Conversation.Content className="mx-auto max-w-3xl p-4">
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
// Why no asChild: the part owns its icon, label, and position over the viewport.
function ScrollButton({
	"data-slot": dataSlot,
	className,
	label = "Scroll to the latest message",
	onClick,
	...props
}: ConversationScrollButtonProps) {
	const { scrollToEndRef, viewportRef } = useConversationContext("ScrollButton");
	const scrollBehavior = useScrollBehavior();

	return (
		<IconButton
			appearance="outlined"
			intent="neutral"
			size="sm"
			type="button"
			data-slot={joinDataSlot(dataSlot, "conversation-scroll-button")}
			className={cx(
				"bg-popover absolute bottom-3 left-1/2 size-8 -translate-x-1/2 rounded-full shadow-md",
				// Hidden until the end leaves the view. `invisible` also takes it out of the tab order.
				"invisible opacity-0 transition-[opacity,visibility] transition-discrete duration-150 ease-out motion-reduce:transition-none",
				"group-data-scrolled-up/conversation:visible group-data-scrolled-up/conversation:opacity-100",
				className,
			)}
			icon={<ArrowDownIcon />}
			label={label}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) {
					return;
				}
				scrollToEndRef.current?.(scrollBehavior);
				viewportRef.current?.focus({ preventScroll: true });
			}}
			{...props}
		/>
	);
}

export {
	//,
	Root,
	Viewport,
	Content,
	ScrollButton,
};

export type {
	//,
	ConversationRootProps,
	ConversationViewportProps,
	ConversationContentProps,
	ConversationScrollButtonProps,
};
