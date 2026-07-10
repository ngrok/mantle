"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A floating card that appears when a user hovers over a trigger element.
 * This is the root, stateful component that manages the open/closed state of the hover card.
 *
 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardroot
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Root = ({
	closeDelay = 300,
	openDelay = 100,
	...props
}: ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root>) => (
	<HoverCardPrimitive.Root closeDelay={closeDelay} openDelay={openDelay} {...props} />
);
Root.displayName = "HoverCard";

/**
 * The trigger element that opens the hover card when hovered.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardtrigger
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Trigger = forwardRef<
	ComponentRef<typeof HoverCardPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>
>((props, ref) => (
	<HoverCardPrimitive.Trigger ref={ref} data-slot="hover-card-trigger" {...props} />
));
Trigger.displayName = "HoverCardTrigger";

/**
 * The portal container for rendering hover card content outside the normal DOM tree.
 * `HoverCard.Content` already renders inside this portal internally, so you typically
 * do not need to use `HoverCard.Portal` directly. Use it only when you need to
 * customize portal placement (e.g., pass a `container` prop) or wrap multiple
 * `HoverCard.Content` instances in a shared portal.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardportal
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Portal>
 *     <HoverCard.Content>
 *       <p>This is the hover card content.</p>
 *     </HoverCard.Content>
 *   </HoverCard.Portal>
 * </HoverCard.Root>
 * ```
 */
const Portal = HoverCardPrimitive.Portal;
Portal.displayName = "HoverCardPortal";

/**
 * The content to render inside the hover card.
 *
 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardcontent
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Content = forwardRef<
	ComponentRef<typeof HoverCardPrimitive.Content>,
	ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, onClick, align = "center", sideOffset = 4, ...props }, ref) => (
	<Portal>
		<HoverCardPrimitive.Content
			ref={ref}
			data-slot="hover-card-content"
			align={align}
			sideOffset={sideOffset}
			className={cx(
				"bg-popover border-popover z-50 w-64 rounded-md border p-4 shadow-md outline-hidden",
				"data-state-open:animate-in data-state-closed:animate-out data-state-closed:fade-out-0 data-state-open:fade-in-0 data-state-closed:zoom-out-95 data-state-open:zoom-in-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2",
				className,
			)}
			onClick={(event) => {
				/**
				 * Prevent the click event from propagating up to parent/containing elements
				 */
				event.stopPropagation();
				onClick?.(event);
			}}
			{...props}
		/>
	</Portal>
));
Content.displayName = HoverCardPrimitive.Content.displayName;

/**
 * A floating card that appears when a user hovers over a trigger element.
 *
 * Use `HoverCard` for non-essential preview content shown on HOVER — user
 * cards, repo previews, rich link previews. Because hover is not reachable
 * via keyboard, all content inside a `HoverCard` must be supplemental,
 * never the only path to information; the trigger is typically a link that
 * already leads to the same content for keyboard and screen reader users.
 * For short, non-interactive labels or hints, use `Tooltip`. For
 * interactive overlays the user opens deliberately, use `Popover`.
 *
 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card
 *
 * @example
 * Composition:
 * ```
 * HoverCard.Root
 * ├── HoverCard.Trigger
 * └── HoverCard.Content
 * ```
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const HoverCard = {
	/**
	 * The root, stateful component that manages the open/closed state of the hover card.
	 *
	 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
	 * z-index. When multiple shared layers are open, the most recently mounted
	 * layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardroot
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button>Hover me</Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Content>
	 *     <p>This is the hover card content.</p>
	 *   </HoverCard.Content>
	 * </HoverCard.Root>
	 * ```
	 */
	Root,
	/**
	 * The content to render inside the hover card. Appears in a portal with rich styling and animations.
	 *
	 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
	 * z-index. When multiple shared layers are open, the most recently mounted
	 * layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardcontent
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" variant="link">@username</Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Content side="top">
	 *     <div className="space-y-2">
	 *       <Text weight="strong">User Profile</Text>
	 *       <Text>Additional information about the user.</Text>
	 *       <Button type="button" size="sm">Follow</Button>
	 *     </div>
	 *   </HoverCard.Content>
	 * </HoverCard.Root>
	 * ```
	 */
	Content,
	/**
	 * The portal container for rendering hover card content outside the normal DOM tree.
	 * `HoverCard.Content` already renders inside this portal internally, so you typically
	 * do not need to use `HoverCard.Portal` directly. Use it only when you need to
	 * customize portal placement or wrap multiple `HoverCard.Content` instances.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardportal
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" appearance="outlined">
	 *       Hover me
	 *     </Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Portal>
	 *     <HoverCard.Content>
	 *       <p>This is the hover card content.</p>
	 *     </HoverCard.Content>
	 *   </HoverCard.Portal>
	 * </HoverCard.Root>
	 * ```
	 */
	Portal,
	/**
	 * The trigger element that opens the hover card when hovered.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardtrigger
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" variant="ghost">
	 *       Hover for details
	 *     </Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Content>
	 *     <div className="space-y-1">
	 *       <Text weight="strong">Quick Info</Text>
	 *       <Text>This appears when you hover over the trigger.</Text>
	 *     </div>
	 *   </HoverCard.Content>
	 * </HoverCard.Root>
	 * ```
	 */
	Trigger,
} as const;

export {
	//,
	HoverCard,
};
