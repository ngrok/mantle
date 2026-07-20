import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps, ComponentPropsWithoutRef } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * Wraps your app to provide shared global behavior for your tooltips, such
 * as consistent delay and hover settings. Mount one instance at the root of
 * your app when you want app-wide tooltip defaults. Children render
 * `Tooltip.Root` / `Tooltip.Trigger` / `Tooltip.Content` trees as usual.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltipprovider
 *
 * @example
 * ```tsx
 * <TooltipProvider>
 *   <Tooltip.Root>
 *     <Tooltip.Trigger asChild>
 *       <Button type="button" appearance="outlined" intent="neutral">
 *         Hover me
 *       </Button>
 *     </Tooltip.Trigger>
 *     <Tooltip.Content>
 *       This is a tooltip
 *     </Tooltip.Content>
 *   </Tooltip.Root>
 * </TooltipProvider>
 * ```
 */
const TooltipProvider = ({
	delayDuration = 0,
	...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) => (
	<TooltipPrimitive.Provider
		data-slot="tooltip-provider"
		delayDuration={delayDuration ?? 0}
		{...props}
	/>
);

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 * This is the root, stateful component that manages the open/closed state of
 * the tooltip. Wrap your app in `TooltipProvider` when you want shared
 * app-wide delay and hover settings.
 *
 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltiproot
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
function Root(props: ComponentProps<typeof TooltipPrimitive.Root>) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

/**
 * The trigger button that opens the tooltip.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltiptrigger
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
function Trigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * The content to render inside the tooltip.
 *
 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltipcontent
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
const Content = ({
	children,
	className,
	ref,
	sideOffset = 4,
	...props
}: ComponentProps<typeof TooltipPrimitive.Content>) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Content
			className={cx(
				"bg-tooltip text-tooltip animate-in fade-in-0 zoom-in-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 z-50 max-w-72 overflow-visible wrap-break-word rounded-md px-3 py-1.5 text-sm font-sans shadow",
				className,
			)}
			data-slot="tooltip-content"
			ref={ref}
			sideOffset={sideOffset}
			{...props}
		>
			{children}
			<TooltipPrimitive.Arrow asChild>
				<div className="bg-tooltip z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs" />
			</TooltipPrimitive.Arrow>
		</TooltipPrimitive.Content>
	</TooltipPrimitive.Portal>
);

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 *
 * Use `Tooltip` to show a short, non-essential label or hint when the user
 * hovers or focuses an element — e.g., the meaning of an icon button, a
 * keyboard shortcut, or a brief explanation. Tooltips are NON-INTERACTIVE:
 * do not put buttons, links, or form controls inside one. Per the WAI-ARIA
 * tooltip pattern, tooltips never receive focus, so interactive content
 * inside them is unreachable for keyboard users. For interactive overlay
 * content (forms, settings, color pickers), use `Popover`. For non-essential
 * preview cards (user/repo previews, link previews), use `HoverCard`.
 *
 * Mount a `<TooltipProvider>` once at the app root when you want shared
 * tooltip behavior such as consistent delay and hover settings.
 *
 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/tooltip
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 *
 * @example
 * Composition:
 * ```
 * Tooltip.Root
 * ├── Tooltip.Trigger
 * └── Tooltip.Content
 * ```
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
const Tooltip = {
	/**
	 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
	 * This is the root, stateful component that manages the open/closed state of
	 * the tooltip. Wrap your app in `TooltipProvider` when you want shared
	 * app-wide delay and hover settings.
	 *
	 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's shared floating
	 * z-index. When multiple shared layers are open, the most recently mounted
	 * layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltiproot
	 *
	 * @example
	 * ```tsx
	 * <Tooltip.Root>
	 *   <Tooltip.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">
	 *       Hover me
	 *     </Button>
	 *   </Tooltip.Trigger>
	 *   <Tooltip.Content>
	 *     This is a tooltip
	 *   </Tooltip.Content>
	 * </Tooltip.Root>
	 * ```
	 */
	Root,
	/**
	 * The content to render inside the tooltip.
	 *
	 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's shared floating
	 * z-index. When multiple shared layers are open, the most recently mounted
	 * layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltipcontent
	 *
	 * @example
	 * ```tsx
	 * <Tooltip.Root>
	 *   <Tooltip.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">
	 *       Hover me
	 *     </Button>
	 *   </Tooltip.Trigger>
	 *   <Tooltip.Content>
	 *     This is a tooltip
	 *   </Tooltip.Content>
	 * </Tooltip.Root>
	 * ```
	 */
	Content,
	/**
	 * The trigger button that opens the tooltip.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/tooltip#tooltiptrigger
	 *
	 * @example
	 * ```tsx
	 * <Tooltip.Root>
	 *   <Tooltip.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">
	 *       Hover me
	 *     </Button>
	 *   </Tooltip.Trigger>
	 *   <Tooltip.Content>
	 *     This is a tooltip
	 *   </Tooltip.Content>
	 * </Tooltip.Root>
	 * ```
	 */
	Trigger,
} as const;

export {
	//,
	Tooltip,
	TooltipProvider,
};
