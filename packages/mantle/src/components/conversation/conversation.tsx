"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/ArrowDown";
import type { ComponentProps, RefObject } from "react";
import { createContext, use, useCallback, useLayoutEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { hasScrollAnchor } from "../../hooks/use-scroll-anchor.js";
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
	/** Scrolls the viewport to its end and follows it again. Set while a viewport is mounted. */
	scrollToEndRef: RefObject<((behavior: ScrollBehavior) => void) | null>;
	viewportRef: RefObject<HTMLDivElement | null>;
	scrollButtonRef: RefObject<HTMLButtonElement | null>;
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
 * The children sit in a `display: contents` wrapper, `data-slot="conversation-label"`,
 * so a translated loading message can change to a transcript.
 *
 * | Data Attribute     | Value                                 | Description                                    |
 * | ------------------ | ------------------------------------- | ---------------------------------------------- |
 * | `data-scrolled-up` | present while the end is out of view  | Presence-only. Shows `Conversation.ScrollButton`. |
 * | `data-streaming`   | present while `streaming`             | Presence-only. Style with `data-streaming:`.   |
 *
 * @see https://mantle.ngrok.com/components/ai/conversation#conversationroot
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
	const scrollToEndRef = useRef<((behavior: ScrollBehavior) => void) | null>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const scrollButtonRef = useRef<HTMLButtonElement>(null);
	const [context] = useState<ConversationContextValue>(() => ({
		scrollToEndRef,
		viewportRef,
		scrollButtonRef,
	}));
	const announcement = useStreamAnnouncement(streaming);

	return (
		<ConversationContext value={context}>
			<div
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "conversation")}
				data-streaming={streaming ? "" : undefined}
				className={cx("group/conversation relative flex min-h-0 flex-col", className)}
				{...props}
			>
				<div data-slot="conversation-label" className="contents">
					{children}
				</div>
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
 * @see https://mantle.ngrok.com/components/ai/conversation#conversationviewport
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
	const { scrollToEndRef, viewportRef, scrollButtonRef } = useConversationContext("Viewport");
	const [element, setElement] = useState<HTMLDivElement | null>(null);
	const initializedRef = useRef<HTMLDivElement | null>(null);
	const attachViewport = useCallback((viewport: HTMLDivElement | null) => {
		// Initialize before an anchor's StrictMode ref replay can save the fresh viewport's top.
		if (viewport != null && initializedRef.current !== viewport) {
			initializedRef.current = viewport;
			if (!hasScrollAnchor(viewport) && viewport.scrollTop === 0) {
				// Why `scrollTo?.`: jsdom has no Element scrollTo, and a consumer's tests render chats there.
				viewport.scrollTo?.({ top: viewport.scrollHeight, behavior: "instant" });
			}
		}
		setElement(viewport);
	}, []);
	const composedRef = useComposedRefs(viewportRef, attachViewport, ref);

	// Why the element dependency: a consumer ref can change without replacing the viewport or its follow state.
	useLayoutEffect(() => {
		// Why: jsdom has no ResizeObserver, and with no layout there is no end to follow.
		if (element == null || typeof ResizeObserver === "undefined") {
			return;
		}
		const root = element.closest('[data-slot~="conversation"]');
		const onScrolledUpChange = (scrolledUp: boolean) => {
			root?.toggleAttribute(SCROLLED_UP_ATTRIBUTE, scrolledUp);
			const button = scrollButtonRef.current;
			if (button != null) {
				if (!scrolledUp && button.contains(document.activeElement)) {
					element.focus({ preventScroll: true });
				}
				button.inert = !scrolledUp;
			}
		};
		const stop = followEnd(element, { onScrolledUpChange });
		scrollToEndRef.current = stop.scrollToEnd;
		return () => {
			stop.disconnect();
			scrollToEndRef.current = null;
			// Why: Root can outlive the viewport, such as while a loading message replaces it.
			onScrolledUpChange(false);
		};
	}, [element, scrollToEndRef, scrollButtonRef]);

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
	const distanceFromEnd = () => viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
	let isFollowing = distanceFromEnd() <= END_THRESHOLD;
	let lastTop = viewport.scrollTop;
	let lastMax = viewport.scrollHeight - viewport.clientHeight;
	let smoothTarget: number | null = null;

	const report = () => {
		onScrolledUpChange(distanceFromEnd() > END_THRESHOLD);
	};
	const follow = () => {
		// A held anchor can be clamped to the end until a later width change restores its real place.
		if (hasScrollAnchor(viewport)) {
			isFollowing = distanceFromEnd() <= END_THRESHOLD;
			lastTop = viewport.scrollTop;
			report();
			return;
		}
		// Why: a scroll up whose event has not fired yet must still release the view.
		if (viewport.scrollTop < lastTop && distanceFromEnd() > END_THRESHOLD) {
			isFollowing = false;
			smoothTarget = null;
		}
		if (isFollowing && smoothTarget == null) {
			// Why `instant`: a `scroll-behavior: smooth` container would animate each update and lag the text.
			viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
		}
		lastTop = viewport.scrollTop;
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
			smoothTarget = null;
			viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
			lastTop = viewport.scrollTop;
		}
		if (records.some((record) => record.target === viewport && record.type === "childList")) {
			observeChildren();
		}
		// Read a clamped position before another mutation grows the content and hides the clamp.
		follow();
	});
	const onScroll = () => {
		const max = viewport.scrollHeight - viewport.clientHeight;
		// Why `>= lastTop`: the first step of a smooth scroll up can still be near the end.
		// Why `max < lastMax`: a taller viewport clamps the view to the end, but a reader's tiny scroll up does not.
		if (
			distanceFromEnd() <= END_THRESHOLD &&
			(viewport.scrollTop >= lastTop || (distanceFromEnd() <= 1 && max < lastMax))
		) {
			isFollowing = true;
		} else if (viewport.scrollTop < lastTop && distanceFromEnd() > END_THRESHOLD) {
			isFollowing = false;
			smoothTarget = null;
		}
		lastTop = viewport.scrollTop;
		lastMax = max;
		report();
	};
	const onScrollEnd = () => {
		// A previous instant scroll can deliver its scrollend after the button starts a smooth scroll.
		if (
			smoothTarget != null &&
			viewport.scrollTop >=
				Math.min(smoothTarget, viewport.scrollHeight - viewport.clientHeight) - 1
		) {
			smoothTarget = null;
			follow();
		}
	};
	// Why a wheel listener: a follow that lands before the scroll event would undo the reader's scroll up.
	const onWheel = (event: WheelEvent) => {
		if (event.deltaY > 0) {
			holdSmoothScroll();
			return;
		}
		// Why: a pinch zoom, or a wheel that a nested scroller takes, does not move the viewport.
		if (event.ctrlKey || nestedScrollerTakes(event.target, viewport)) {
			return;
		}
		if (event.deltaY < 0 && viewport.scrollTop > 0) {
			isFollowing = false;
			if (smoothTarget != null) {
				smoothTarget = null;
				viewport.scrollTo({ top: viewport.scrollTop, behavior: "instant" });
			}
		}
	};
	// A reader's scroll down can replace the native smooth scroll with a shorter one.
	// Wait for movement beyond the one-pixel completion tolerance before accepting its scrollend.
	const holdSmoothScroll = () => {
		if (smoothTarget != null) {
			smoothTarget = viewport.scrollTop + 2;
		}
	};
	// Why on the document: it runs after React's handlers, so their preventDefault is visible.
	// Why the skips: a nested scroller takes the key, and Space on a button presses it.
	const onKeyDown = (event: KeyboardEvent) => {
		if (
			!event.composedPath().includes(viewport) ||
			event.defaultPrevented ||
			isEditable(event.target) ||
			nestedScrollerTakes(event.target, viewport) ||
			(event.key === " " && event.target instanceof Element && event.target.closest("button"))
		) {
			return;
		}
		const up =
			["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.key === " " && event.shiftKey);
		// Why: a smooth key scroll moves after the next stream update, which would scroll back to the end.
		if (up && viewport.scrollTop > 0) {
			isFollowing = false;
			smoothTarget = null;
			return;
		}
		if (["ArrowDown", "PageDown", "End", " "].includes(event.key) && !event.shiftKey) {
			holdSmoothScroll();
		}
	};

	mutations.observe(viewport, { childList: true, subtree: true, characterData: true });
	observeChildren();
	viewport.addEventListener("scroll", onScroll, { passive: true });
	viewport.addEventListener("scrollend", onScrollEnd);
	viewport.addEventListener("wheel", onWheel, { passive: true });
	viewport.ownerDocument.addEventListener("keydown", onKeyDown);
	// Why: a touch drag or a scrollbar drag starts with a press in the viewport.
	viewport.addEventListener("pointerdown", holdSmoothScroll, { passive: true });
	follow();

	return {
		disconnect: () => {
			mutations.disconnect();
			resizes.disconnect();
			viewport.removeEventListener("scroll", onScroll);
			viewport.removeEventListener("scrollend", onScrollEnd);
			viewport.removeEventListener("wheel", onWheel);
			viewport.ownerDocument.removeEventListener("keydown", onKeyDown);
			viewport.removeEventListener("pointerdown", holdSmoothScroll);
		},
		scrollToEnd: (behavior) => {
			isFollowing = true;
			lastTop = viewport.scrollTop;
			smoothTarget =
				behavior === "smooth" && distanceFromEnd() > 1
					? viewport.scrollHeight - viewport.clientHeight
					: null;
			viewport.scrollTo({
				top: viewport.scrollHeight,
				behavior: smoothTarget != null ? "smooth" : "instant",
			});
		},
	};
}

/** Whether a key press edits text in `target` and so does not scroll the viewport. */
function isEditable(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || target.matches("input, textarea, select"))
	);
}

/** Whether an element between `target` and `viewport` can scroll up, so it takes an upward wheel. */
function nestedScrollerTakes(target: EventTarget | null, viewport: HTMLElement): boolean {
	for (
		let node = target instanceof Element ? target : null;
		node != null && node !== viewport;
		node = node.parentElement
	) {
		if (node.scrollTop > 0 && node.scrollHeight > node.clientHeight) {
			const { overflowY } = getComputedStyle(node);
			if (overflowY === "auto" || overflowY === "scroll") {
				return true;
			}
		}
	}
	return false;
}

/** Whether a mutation adds a person's message, or an element that holds one. */
function addsUserMessage(record: MutationRecord): boolean {
	// Older history has a following sibling; only a new message at the end resumes following.
	if (record.nextSibling != null) {
		return false;
	}
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
 * @see https://mantle.ngrok.com/components/ai/conversation#conversationcontent
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
 * @see https://mantle.ngrok.com/components/ai/conversation#conversationscrollbutton
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
	ref,
	...props
}: ConversationScrollButtonProps) {
	const { scrollToEndRef, viewportRef, scrollButtonRef } = useConversationContext("ScrollButton");
	const scrollBehavior = useScrollBehavior();
	const setButton = useCallback((element: HTMLButtonElement | null) => {
		if (element != null) {
			element.inert = !element
				.closest('[data-slot~="conversation"]')
				?.hasAttribute(SCROLLED_UP_ATTRIBUTE);
		}
	}, []);
	const composedRef = useComposedRefs(scrollButtonRef, setButton, ref);

	return (
		<IconButton
			ref={composedRef}
			inert
			appearance="outlined"
			intent="neutral"
			size="sm"
			type="button"
			data-slot={joinDataSlot(dataSlot, "conversation-scroll-button")}
			className={cx(
				"bg-popover absolute bottom-3 left-1/2 size-8 -translate-x-1/2 rounded-full shadow-md",
				// Inert ends interaction at once; visibility lets the exit fade finish.
				"invisible opacity-0 transition-[opacity,visibility] transition-discrete duration-150 ease-out-strong motion-reduce:transition-none",
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
