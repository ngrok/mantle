"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A floating card that appears when a user hovers over a trigger element.
 * This is the root, stateful component that manages the open/closed state of the hover card.
 *
 * @see https://mantle.ngrok.com/components/hover-card#hovercardroot
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
 * @see https://mantle.ngrok.com/components/hover-card#hovercardtrigger
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
 * The portal for a HoverCard. Should be rendered as a child of the `HoverCard` component.
 * Renders a portal that the `HoverCard.Content` is rendered into.
 *
 * You likely don't need to use this component directly, as it is used internally by the `HoverCard.Content` component.
 */
const Portal = HoverCardPrimitive.Portal;
Portal.displayName = "HoverCardPortal";

/**
 * The content to render inside the hover card.
 *
 * @see https://mantle.ngrok.com/components/hover-card#hovercardcontent
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
 * `HoverCard` is intended primarily for sighted users — it is not a
 * reliably discoverable path for keyboard or screen reader users, since it
 * opens on pointer hover. Use it for supplemental previews of content that
 * is already available through another accessible path (typically the
 * underlying link). Prefer `Popover` when the floating content must be
 * reachable by all users, or `Tooltip` for short, non-interactive labels on
 * controls.
 *
 * @see https://mantle.ngrok.com/components/hover-card
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
	 * @see https://mantle.ngrok.com/components/hover-card#hovercardroot
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
	 * @see https://mantle.ngrok.com/components/hover-card#hovercardcontent
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
	 *
	 * @see https://mantle.ngrok.com/components/hover-card#api-reference
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Text>Hover over me</Text>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Portal>
	 *     <HoverCard.Content>
	 *       <Text>This content is rendered in a portal.</Text>
	 *     </HoverCard.Content>
	 *   </HoverCard.Portal>
	 * </HoverCard.Root>
	 * ```
	 */
	Portal,
	/**
	 * The trigger element that opens the hover card when hovered.
	 *
	 * @see https://mantle.ngrok.com/components/hover-card#hovercardtrigger
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
