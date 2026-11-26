"use client";

import { ListBulletsIcon } from "@phosphor-icons/react/ListBullets";
import type { ComponentProps, RefObject } from "react";
import { createContext, use, useCallback, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useScrollBehavior } from "../../hooks/use-scroll-behavior.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { IconButton } from "../button/icon-button.js";
import { releaseFollow } from "../conversation/conversation.js";
import { Popover } from "../popover/index.js";
import { outlinePlace } from "./outline-place.js";

/** The attribute on `ConversationOutline.Item` while its message is in view. */
const IN_VIEW_ATTRIBUTE = "data-in-view";

type ConversationOutlineContextValue = {
	/** The message that an item press jumps to. Focus moves to it when the outline closes. */
	jumpTargetRef: RefObject<HTMLElement | null>;
};

const ConversationOutlineContext = createContext<ConversationOutlineContextValue | null>(null);

function useConversationOutlineContext(part: string): ConversationOutlineContextValue {
	const context = use(ConversationOutlineContext);
	invariant(
		context != null,
		`ConversationOutline.${part} must be rendered inside ConversationOutline.Root.`,
	);
	return context;
}

/**
 * The props for `ConversationOutline.Root`.
 */
type ConversationOutlineRootProps = ComponentProps<typeof Popover.Root>;

/**
 * A list of the person's messages in a long chat, as Amp's conversation outline
 * does. A press on one jumps to that message. This is the root, stateful part
 * that owns the open state. It renders no element.
 *
 * @see https://mantle.ngrok.com/components/ai/conversation-outline#conversationoutlineroot
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
function Root(props: ConversationOutlineRootProps) {
	const jumpTargetRef = useRef<HTMLElement>(null);
	const [context] = useState<ConversationOutlineContextValue>(() => ({ jumpTargetRef }));

	return (
		<ConversationOutlineContext value={context}>
			<Popover.Root {...props} />
		</ConversationOutlineContext>
	);
}

/**
 * The props for `ConversationOutline.Trigger`.
 */
type ConversationOutlineTriggerProps = Omit<
	ComponentProps<typeof IconButton>,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label" | "type"
> & {
	/**
	 * The accessible name of the button. It also names the outline.
	 *
	 * @default "Conversation outline"
	 */
	label?: string;
};

/**
 * The icon button that opens and closes the outline. Put it where the layout
 * is the chat's header, at every width. The outline is not a frequent
 * action, so it stays clear of the message box and
 * `Conversation.ScrollButton`. Render it once the person has sent a few
 * messages: with one or two, a scroll is faster.
 *
 * @see https://mantle.ngrok.com/components/ai/conversation-outline#conversationoutlinetrigger
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
// Why no asChild: the part owns its icon and its label.
function Trigger({
	"data-slot": dataSlot,
	label = "Conversation outline",
	size = "sm",
	...props
}: ConversationOutlineTriggerProps) {
	return (
		<Popover.Trigger asChild>
			<IconButton
				appearance="ghost"
				intent="neutral"
				size={size}
				type="button"
				data-slot={joinDataSlot(dataSlot, "conversation-outline-trigger")}
				icon={<ListBulletsIcon />}
				label={label}
				{...props}
			/>
		</Popover.Trigger>
	);
}

/**
 * The props for `ConversationOutline.Content`.
 */
type ConversationOutlineContentProps = Omit<
	ComponentProps<typeof Popover.Content>,
	"preferredWidth"
>;

/**
 * The floating panel that lists the messages, one `ConversationOutline.Item`
 * each. It is a `Popover.Content`: it flips above the trigger when there is
 * no room below, and closes on Escape or a press outside.
 *
 * When it opens, it marks the items whose messages are in view, marks the
 * current one with `aria-current="location"`, and moves focus to it. It keeps
 * both marks up to date while the transcript scrolls.
 *
 * @see https://mantle.ngrok.com/components/ai/conversation-outline#conversationoutlinecontent
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
// Why no asChild: the content portals into the top layer as a popover.
function Content({
	"data-slot": dataSlot,
	className,
	onCloseAutoFocus,
	onEscapeKeyDown,
	onOpenAutoFocus,
	ref,
	...props
}: ConversationOutlineContentProps) {
	const { jumpTargetRef } = useConversationOutlineContext("Content");
	const contentRef = useRef<HTMLDivElement>(null);
	const markItems = useCallback((content: HTMLDivElement | null) => {
		contentRef.current = content;
		if (content == null) {
			return;
		}
		// Why at once: the open autofocus reads the current item in this commit.
		markPlaces(content);
		let frame = 0;
		// Why one frame: each mark pass measures every message, so a burst of events measures once.
		const update = () => {
			if (frame === 0) {
				frame = requestAnimationFrame(() => {
					frame = 0;
					markPlaces(content);
				});
			}
		};
		const document = content.ownerDocument;
		const view = document.defaultView;
		// Why capture: a scroll event does not bubble, and the transcript is not an ancestor.
		document.addEventListener("scroll", update, { capture: true, passive: true });
		view?.addEventListener("resize", update, { passive: true });
		// Why: a new or retargeted item needs its marks with no scroll.
		const items = new MutationObserver(update);
		items.observe(content, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["data-target"],
		});
		// Why: a viewport that changes height can show or hide a message with no scroll.
		const resizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
		for (const viewport of document.querySelectorAll('[data-slot~="conversation-viewport"]')) {
			resizes?.observe(viewport);
		}
		return () => {
			contentRef.current = null;
			resizes?.disconnect();
			cancelAnimationFrame(frame);
			document.removeEventListener("scroll", update, { capture: true });
			view?.removeEventListener("resize", update);
			items.disconnect();
		};
	}, []);
	const composedRef = useComposedRefs(ref, markItems);

	return (
		<Popover.Content
			ref={composedRef}
			data-slot={joinDataSlot(dataSlot, "conversation-outline-content")}
			// Why the viewport cap: a 320px screen is narrower than 22rem.
			preferredWidth="max-w-[min(22rem,calc(100vw-1rem))]"
			className={cx(
				"scrollbar flex max-h-[min(24rem,var(--available-height))] flex-col gap-0.5 overflow-y-auto p-1",
				className,
			)}
			onOpenAutoFocus={(event) => {
				onOpenAutoFocus?.(event);
				const current = contentRef.current?.querySelector<HTMLElement>(
					'[data-slot~="conversation-outline-item"][aria-current]:not(:disabled)',
				);
				if (event.defaultPrevented || current == null) {
					return;
				}
				// Why the current item: it says where the reader is, and Tab moves on from there.
				event.preventDefault();
				current.focus();
			}}
			onEscapeKeyDown={(event) => {
				onEscapeKeyDown?.(event);
				// Why: Escape closes the outline with no jump, so focus returns to the trigger.
				jumpTargetRef.current = null;
			}}
			onCloseAutoFocus={(event) => {
				onCloseAutoFocus?.(event);
				const target = jumpTargetRef.current;
				jumpTargetRef.current = null;
				if (event.defaultPrevented || target == null || !target.isConnected) {
					return;
				}
				// Why: a screen reader then reads on from the message the person chose.
				event.preventDefault();
				target.focus({ preventScroll: true });
				// Why only on a miss: a link or a message with its own tab stop takes focus as it is.
				if (target.ownerDocument.activeElement !== target) {
					target.tabIndex = -1;
					target.focus({ preventScroll: true });
				}
			}}
			{...props}
		/>
	);
}

/**
 * Marks the items in `content`: `data-in-view` on each item whose message is
 * in view, and `aria-current="location"` on the current one. Writes the DOM
 * directly, so a scroll renders nothing.
 */
function markPlaces(content: HTMLElement) {
	const items = [
		...content.querySelectorAll<HTMLElement>('[data-slot~="conversation-outline-item"]'),
	];
	const document = content.ownerDocument;
	const targets = items.map((item) => {
		const id = item.dataset.target;
		return id == null ? null : document.getElementById(id);
	});
	const first = targets.find((target) => target != null);
	if (first == null) {
		for (const item of items) {
			item.removeAttribute(IN_VIEW_ATTRIBUTE);
			item.removeAttribute("aria-current");
		}
		return;
	}
	const viewport = visibleEdges(first);
	const { inView, current } = outlinePlace(
		targets.map((target) => target?.getBoundingClientRect() ?? null),
		viewport,
	);
	items.forEach((item, index) => {
		item.toggleAttribute(IN_VIEW_ATTRIBUTE, inView[index] ?? false);
		if (index === current) {
			item.setAttribute("aria-current", "location");
		} else {
			item.removeAttribute("aria-current");
		}
	});
}

/** The visible edges of the area that scrolls `message`: its `Conversation.Viewport`, else the window. */
function visibleEdges(message: HTMLElement): { top: number; bottom: number } {
	const viewport = message.closest<HTMLElement>('[data-slot~="conversation-viewport"]');
	if (viewport != null) {
		return viewport.getBoundingClientRect();
	}
	// Why not the root's rect: it spans the whole document, not the part on screen.
	return { top: 0, bottom: message.ownerDocument.documentElement.clientHeight };
}

/**
 * Scrolls `message` to the top of its viewport, less its `scroll-margin-top`,
 * as `scrollIntoView` would. Set `scroll-mt-*` on the message for room above it.
 * A `Conversation.Viewport` stops following the end first, so a streamed
 * answer cannot pull the view back down before the scroll starts.
 */
function jumpTo(message: HTMLElement, behavior: ScrollBehavior) {
	const viewport = message.closest<HTMLElement>('[data-slot~="conversation-viewport"]');
	if (viewport == null) {
		// Why `?.`: jsdom has no element scroll APIs, and a consumer's tests click items there.
		message.scrollIntoView?.({ block: "start", behavior });
		return;
	}
	// Why not `scrollIntoView`: it also scrolls the page and each scroller around the viewport.
	const margin = Number.parseFloat(getComputedStyle(message).scrollMarginTop) || 0;
	const top =
		viewport.scrollTop +
		message.getBoundingClientRect().top -
		viewport.getBoundingClientRect().top -
		margin;
	const max = viewport.scrollHeight - viewport.clientHeight;
	// Why 8: it is how close to the end `Conversation.Viewport` counts as the end.
	// A jump that lands there, such as in a short chat, keeps following the end.
	if (max - Math.min(Math.max(top, 0), max) > 8) {
		releaseFollow(viewport);
	}
	viewport.scrollTo?.({ top, behavior });
}

/**
 * The props for `ConversationOutline.Item`.
 */
type ConversationOutlineItemProps = Omit<ComponentProps<typeof Popover.Close>, "type"> & {
	/**
	 * The `id` of the message this item jumps to, such as the `id` of its
	 * `Message.Root`.
	 */
	target: string;
};

/**
 * One of the person's messages in the outline, as one line of text. A press
 * closes the outline, scrolls the message to the top of the transcript, and
 * moves focus to it. Give each `Message.Root` an `id` and pass it as `target`.
 *
 * | Data Attribute | Value                                  | Description                                          |
 * | -------------- | -------------------------------------- | ---------------------------------------------------- |
 * | `data-in-view` | present while its message is in view   | Presence-only. The item shows in the strong color.   |
 * | `aria-current` | `"location"` on the current message    | The message the reader is at: the first in view, else the last above the view. |
 * | `data-target` | the `target` prop | The `id` of the message the item jumps to. The outline watches it to update `data-in-view`. |
 *
 * @see https://mantle.ngrok.com/components/ai/conversation-outline#conversationoutlineitem
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
function Item({
	"data-slot": dataSlot,
	className,
	onClick,
	target,
	...props
}: ConversationOutlineItemProps) {
	const { jumpTargetRef } = useConversationOutlineContext("Item");
	const scrollBehavior = useScrollBehavior();

	return (
		<Popover.Close
			data-slot={joinDataSlot(dataSlot, "conversation-outline-item")}
			data-target={target}
			className={cx(
				"text-muted data-in-view:text-strong block w-full shrink-0 cursor-pointer truncate rounded-md px-2 py-1.5 text-start text-sm",
				"hover:bg-active-menu-item focus-visible:bg-active-menu-item outline-hidden",
				className,
			)}
			onClick={(event) => {
				onClick?.(event);
				const message = event.currentTarget.ownerDocument.getElementById(target);
				if (event.defaultPrevented || message == null) {
					return;
				}
				jumpTargetRef.current = message;
				jumpTo(message, scrollBehavior === "smooth" ? "smooth" : "instant");
			}}
			{...props}
		/>
	);
}

export {
	//,
	Root,
	Trigger,
	Content,
	Item,
};

export type {
	//,
	ConversationOutlineRootProps,
	ConversationOutlineTriggerProps,
	ConversationOutlineContentProps,
	ConversationOutlineItemProps,
};
