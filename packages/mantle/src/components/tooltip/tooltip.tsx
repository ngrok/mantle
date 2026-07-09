import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { forwardRef } from "react";
import type { ComponentProps, ComponentPropsWithoutRef, ComponentRef } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * Wraps your app to provide global functionality to your tooltips.
 * Only one instance of this component should be rendered in your app, preferably at the root.
 *
 * @see https://mantle.ngrok.com/components/tooltip#tooltipprovider
 *
 * @example
 * ```tsx
 * <TooltipProvider>
 *   <App />
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
TooltipProvider.displayName = "Tooltip.Provider";

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 * This is the root, stateful component that manages the open/closed state of the tooltip.
 * Will throw if you have not wrapped your app in a `TooltipProvider`.
 *
 * @see https://mantle.ngrok.com/components/tooltip#tooltiproot
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined">
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
Root.displayName = "Tooltip.Root";

/**
 * The trigger button that opens the tooltip.
 *
 * @see https://mantle.ngrok.com/components/tooltip#tooltiptrigger
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined">
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
Trigger.displayName = "Tooltip.Trigger";

/**
 * The content to render inside the tooltip.
 *
 * @see https://mantle.ngrok.com/components/tooltip#tooltipcontent
 *
 * @example
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger asChild>
 *     <Button type="button" appearance="outlined">
 *       Hover me
 *     </Button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>
 *     This is a tooltip
 *   </Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
const Content = forwardRef<
	ComponentRef<typeof TooltipPrimitive.Content>,
	ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ children, className, sideOffset = 4, ...props }, ref) => (
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
));
Content.displayName = "Tooltip.Content";

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 * Wrapping your app in a `TooltipProvider` is recommended to share global tooltip behavior (delay, hover settings) across your application.
 *
 * Use a `Tooltip` for short, non-interactive labels — for example, to clarify
 * the purpose of an icon-only button. Per the WAI-ARIA tooltip pattern,
 * tooltips never receive focus, so interactive content inside them is
 * unreachable for keyboard users. Prefer `Popover` when the floating content
 * must be interactive, or `HoverCard` for a sighted-only preview of content
 * that already lives behind a link.
 *
 * @see https://mantle.ngrok.com/components/tooltip
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
 *     <Button type="button" appearance="outlined">
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
	 * This is the root, stateful component that manages the open/closed state of the tooltip.
	 * Will throw if you have not wrapped your app in a `TooltipProvider`.
	 *
	 * @see https://mantle.ngrok.com/components/tooltip#tooltiproot
	 *
	 * @example
	 * ```tsx
	 * <Tooltip.Root>
	 *   <Tooltip.Trigger asChild>
	 *     <Button type="button" appearance="outlined">
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
	 * @see https://mantle.ngrok.com/components/tooltip#tooltipcontent
	 *
	 * @example
	 * ```tsx
	 * <Tooltip.Root>
	 *   <Tooltip.Trigger asChild>
	 *     <Button type="button" appearance="outlined">
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
	 * @see https://mantle.ngrok.com/components/tooltip#tooltiptrigger
	 *
	 * @example
	 * ```tsx
	 * <Tooltip.Root>
	 *   <Tooltip.Trigger asChild>
	 *     <Button type="button" appearance="outlined">
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
