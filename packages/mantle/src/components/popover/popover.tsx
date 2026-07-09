import * as PopoverPrimitive from "@radix-ui/react-popover";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A floating overlay that displays rich content in a portal, triggered by a button.
 * This is the root, stateful component that manages the open/closed state of the popover.
 *
 * @see https://mantle.ngrok.com/components/popover#popoverroot
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Root = PopoverPrimitive.Root;
Root.displayName = "Popover";

/**
 * The trigger button that opens the popover.
 *
 * @see https://mantle.ngrok.com/components/popover#popovertrigger
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Trigger = PopoverPrimitive.Trigger;
Trigger.displayName = "PopoverTrigger";

/**
 * An optional element to position the PopoverContent against. If this part is not used, the content will position alongside the PopoverTrigger.
 *
 * @see https://mantle.ngrok.com/components/popover#popoveranchor
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Anchor asChild>
 *     <div>Anchor element</div>
 *   </Popover.Anchor>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Anchor = PopoverPrimitive.Anchor;
Anchor.displayName = "PopoverAnchor";

/**
 * A button that closes an open popover.
 *
 * @see https://mantle.ngrok.com/components/popover#popoverclose
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *     <Popover.Close asChild>
 *       <Button type="button">Close</Button>
 *     </Popover.Close>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Close = PopoverPrimitive.Close;
Close.displayName = "PopoverClose";

type PopoverContentProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
	/**
	 * The preferred width of the `PopoverContent` as a tailwind `max-w-` class.
	 *
	 * By default, a `Popover`'s content width is responsive with a default
	 * preferred width: the maximum width of the `PopoverContent`
	 *
	 * @default `max-w-72`
	 */
	preferredWidth?: `max-w-${string}`;
};

/**
 * The content to render inside the popover.
 *
 * @see https://mantle.ngrok.com/components/popover#popovercontent
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Content = forwardRef<ComponentRef<"div">, PopoverContentProps>(
	(
		{
			//,
			align = "center",
			className,
			onClick,
			preferredWidth = "max-w-72",
			sideOffset = 4,
			...props
		},
		ref,
	) => (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				data-slot="popover-content"
				className={cx(
					"text-popover-foreground border-popover bg-popover data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95 z-50 rounded-md border p-4 shadow-md outline-hidden",
					preferredWidth,
					className,
				)}
				onClick={(event) => {
					/**
					 * Prevent the click event from propagating up to parent/containing elements
					 * of the PopoverContent
					 */
					event.stopPropagation();
					onClick?.(event);
				}}
				ref={ref}
				sideOffset={sideOffset}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	),
);
Content.displayName = "PopoverContent";

/**
 * A floating overlay that displays rich content in a portal, triggered by a button.
 *
 * `Popover` is a non-modal dialog by default: focus moves into the content
 * when it opens, `Escape` closes and returns focus to the trigger, clicking
 * outside dismisses, and the page (body and any scroll containers) continues
 * to scroll normally. Pass `modal` on `Popover.Root` to trap focus inside
 * the content, block interaction with the rest of the page, and lock body
 * scroll while the popover is open. Use a `Popover` when the floating
 * content must be interactive — forms, action menus, filters, settings.
 * Prefer `Tooltip` for short, non-interactive labels on controls, or
 * `HoverCard` for a sighted-only preview of content that already lives
 * behind a link.
 *
 * @see https://mantle.ngrok.com/components/popover
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * @example
 * Composition:
 * ```
 * Popover.Root
 * ├── Popover.Trigger
 * ├── Popover.Anchor
 * └── Popover.Content
 *     └── Popover.Close
 * ```
 *
 * @example
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Open Popover
 *     </Button>
 *   </Popover.Trigger>
 *   <Popover.Content>
 *     <p>This is the popover content.</p>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
const Popover = {
	/**
	 * The root, stateful component that manages the open/closed state of the popover.
	 *
	 * @see https://mantle.ngrok.com/components/popover#popoverroot
	 *
	 * @example
	 * ```tsx
	 * <Popover.Root>
	 *   <Popover.Trigger asChild>
	 *     <Button>Open popover</Button>
	 *   </Popover.Trigger>
	 *   <Popover.Content>
	 *     <p>This is the popover content.</p>
	 *   </Popover.Content>
	 * </Popover.Root>
	 * ```
	 */
	Root,
	/**
	 * An optional element to position the PopoverContent against. If not used, content positions alongside the trigger.
	 *
	 * @see https://mantle.ngrok.com/components/popover#popoveranchor
	 *
	 * @example
	 * ```tsx
	 * <Popover.Root>
	 *   <Popover.Anchor asChild>
	 *     <div>Position relative to this element</div>
	 *   </Popover.Anchor>
	 *   <Popover.Trigger asChild>
	 *     <Button type="button" appearance="outlined">Open Popover</Button>
	 *   </Popover.Trigger>
	 *   <Popover.Content>
	 *     <p>This popover is positioned relative to the anchor.</p>
	 *     <Popover.Close asChild>
	 *       <Button type="button">Close</Button>
	 *     </Popover.Close>
	 *   </Popover.Content>
	 * </Popover.Root>
	 * ```
	 */
	Anchor,
	/**
	 * A button that closes an open popover. Can be placed anywhere within the popover content.
	 *
	 * @see https://mantle.ngrok.com/components/popover#popoverclose
	 *
	 * @example
	 * ```tsx
	 * <Popover.Root>
	 *   <Popover.Trigger asChild>
	 *     <Button type="button">Settings</Button>
	 *   </Popover.Trigger>
	 *   <Popover.Content>
	 *     <div className="flex items-center justify-between">
	 *       <Text>Settings Panel</Text>
	 *       <Popover.Close asChild>
	 *         <Button type="button" appearance="ghost" size="sm">✕</Button>
	 *       </Popover.Close>
	 *     </div>
	 *     <Text>Configure your preferences here.</Text>
	 *   </Popover.Content>
	 * </Popover.Root>
	 * ```
	 */
	Close,
	/**
	 * The content to render inside the popover. Appears in a portal with rich styling and animations.
	 *
	 * @see https://mantle.ngrok.com/components/popover#popovercontent
	 *
	 * @example
	 * ```tsx
	 * <Popover.Root>
	 *   <Popover.Trigger asChild>
	 *     <Button type="button">Show Info</Button>
	 *   </Popover.Trigger>
	 *   <Popover.Content side="top" align="center">
	 *     <div className="space-y-2">
	 *       <Text weight="strong">Additional Information</Text>
	 *       <Text>This is the content inside the popover.</Text>
	 *       <Button type="button" size="sm">Action</Button>
	 *     </div>
	 *   </Popover.Content>
	 * </Popover.Root>
	 * ```
	 */
	Content,
	/**
	 * The trigger button that opens the popover when clicked or focused.
	 *
	 * @see https://mantle.ngrok.com/components/popover#popovertrigger
	 *
	 * @example
	 * ```tsx
	 * <Popover.Root>
	 *   <Popover.Trigger asChild>
	 *     <Button type="button" appearance="outlined">
	 *       Options
	 *     </Button>
	 *   </Popover.Trigger>
	 *   <Popover.Content>
	 *     <div className="space-y-2">
	 *       <Button type="button" variant="ghost">Edit</Button>
	 *       <Button type="button" variant="ghost">Delete</Button>
	 *     </div>
	 *   </Popover.Content>
	 * </Popover.Root>
	 * ```
	 */
	Trigger,
} as const;

export {
	//,
	Popover,
};
