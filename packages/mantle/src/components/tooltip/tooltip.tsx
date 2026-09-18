"use client";

import {
	Arrow as TooltipPrimitiveArrow,
	Content as TooltipPrimitiveContent,
	Portal as TooltipPrimitivePortal,
	Provider as TooltipPrimitiveProvider,
	Root as TooltipPrimitiveRoot,
	Trigger as TooltipPrimitiveTrigger,
} from "@radix-ui/react-tooltip";
import type { ComponentProps, ComponentPropsWithoutRef } from "react";
import { cx } from "../../utils/cx/cx.js";
import { useLayerContainer } from "../../utils/layer-container/layer-container.js";

/**
 * Wraps your app to set shared global behavior for your tooltips, such
 * as consistent delay and hover settings. Mount exactly one instance, preferably
 * at the root of your app. A nested provider applies its own timing props to its
 * subtree. It also tracks `skipDelayDuration` separately, so a pointer that moves
 * from one provider's trigger to the other's waits the delay again. Children
 * render `Tooltip.Root` / `Tooltip.Trigger` / `Tooltip.Content` trees as usual.
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
}: ComponentPropsWithoutRef<typeof TooltipPrimitiveProvider>) => (
	// Why no `data-slot`: the Radix provider renders no DOM, so the attribute
	// named an element that never existed.
	<TooltipPrimitiveProvider delayDuration={delayDuration ?? 0} {...props} />
);

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 * This is the root, stateful component that manages the open/closed state of
 * the tooltip. Wrap your app in `TooltipProvider` when you want shared
 * app-wide delay and hover settings.
 *
 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's float tier. When
 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
 * that overlay's positioner and paints above the overlay that owns it. Outside
 * every overlay, it portals to `document.body`, below the overlay tier
 * (`z-60`). When sibling floats share a container, the most recently mounted
 * float paints on top.
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
function Root(props: ComponentProps<typeof TooltipPrimitiveRoot>) {
	// Why no data-slot: the Radix Root renders no DOM, so an attribute never lands.
	return <TooltipPrimitiveRoot {...props} />;
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
function Trigger(props: ComponentProps<typeof TooltipPrimitiveTrigger>) {
	return <TooltipPrimitiveTrigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * Props for `Tooltip.Content`. `asChild` is omitted: the content renders its own
 * arrow next to `children`, so a slot would receive more than one element and
 * throw.
 */
type TooltipContentProps = Omit<ComponentProps<typeof TooltipPrimitiveContent>, "asChild">;

/**
 * The content to render inside the tooltip.
 *
 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's float tier. When
 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
 * that overlay's positioner and paints above the overlay that owns it. Outside
 * every overlay, it portals to `document.body`, below the overlay tier
 * (`z-60`). When sibling floats share a container, the most recently mounted
 * float paints on top.
 *
 * **Structure.** `children` render inside a
 * `<div data-slot="tooltip-label">`. The arrow is a permanent element sibling,
 * so without the wrapper a bare text body is never a lone child: a browser
 * translation engine reparents that text node, and the removal React runs when
 * the body changes shape or goes away throws. The wrapper is a `<div>` because a
 * tooltip body is often a `<p>`, which a `<span>` may not contain. It is
 * `display: contents`, so it adds no box and every child of the body stays a
 * layout child of the surface.
 *
 * **Data attributes:**
 *
 * | Data Attribute   | Value                                              | Description                                       |
 * | ---------------- | -------------------------------------------------- | ------------------------------------------------- |
 * | `data-slot`      | `"tooltip-content"`                                | On the tooltip surface.                           |
 * | `data-slot`      | `"tooltip-label"`                                  | On the `<div>` wrapping `children`.               |
 * | `data-state`     | `"delayed-open"` \| `"instant-open"` \| `"closed"` | The open state Radix stamps on the surface.       |
 * | `data-side`      | `"top"` \| `"right"` \| `"bottom"` \| `"left"`     | Which side of the trigger the surface resolved to. |
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
const Content = ({ children, className, ref, sideOffset = 4, ...props }: TooltipContentProps) => {
	const layerContainer = useLayerContainer();

	return (
		<TooltipPrimitivePortal container={layerContainer}>
			<TooltipPrimitiveContent
				className={cx(
					"bg-tooltip text-tooltip animate-in fade-in-0 zoom-in-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 z-50 max-w-72 overflow-visible wrap-break-word rounded-md px-3 py-1.5 text-sm font-sans shadow",
					className,
				)}
				data-slot="tooltip-content"
				ref={ref}
				sideOffset={sideOffset}
				{...props}
			>
				{/* Why the label div: decisions/2026-08-04-translation-safe-label-wrappers.md
				    Why a div and not a span: a documented tooltip body is a `<p>`, which a
				    `<span>` may not contain. */}
				<div data-slot="tooltip-label" className="contents">
					{children}
				</div>
				<TooltipPrimitiveArrow asChild>
					<div className="bg-tooltip z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs" />
				</TooltipPrimitiveArrow>
			</TooltipPrimitiveContent>
		</TooltipPrimitivePortal>
	);
};

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
 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's float tier. When
 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
 * that overlay's positioner and paints above the overlay that owns it. Outside
 * every overlay, it portals to `document.body`, below the overlay tier
 * (`z-60`). When sibling floats share a container, the most recently mounted
 * float paints on top.
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
	 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's float tier. When
	 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
	 * that overlay's positioner and paints above the overlay that owns it. Outside
	 * every overlay, it portals to `document.body`, below the overlay tier
	 * (`z-60`). When sibling floats share a container, the most recently mounted
	 * float paints on top.
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
	 * `Tooltip.Content` renders at Tailwind `z-50`, Mantle's float tier. When
	 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
	 * that overlay's positioner and paints above the overlay that owns it. Outside
	 * every overlay, it portals to `document.body`, below the overlay tier
	 * (`z-60`). When sibling floats share a container, the most recently mounted
	 * float paints on top.
	 *
	 * **Structure.** `children` render inside a
	 * `<div data-slot="tooltip-label">`. The arrow is a permanent element sibling,
	 * so without the wrapper a bare text body is never a lone child: a browser
	 * translation engine reparents that text node, and the removal React runs when
	 * the body changes shape or goes away throws. The wrapper is a `<div>` because a
	 * tooltip body is often a `<p>`, which a `<span>` may not contain. It is
	 * `display: contents`, so it adds no box and every child of the body stays a
	 * layout child of the surface.
	 *
	 * **Data attributes:**
	 *
	 * | Data Attribute   | Value                                              | Description                                       |
	 * | ---------------- | -------------------------------------------------- | ------------------------------------------------- |
	 * | `data-slot`      | `"tooltip-content"`                                | On the tooltip surface.                           |
	 * | `data-slot`      | `"tooltip-label"`                                  | On the `<div>` wrapping `children`.               |
	 * | `data-state`     | `"delayed-open"` \| `"instant-open"` \| `"closed"` | The open state Radix stamps on the surface.       |
	 * | `data-side`      | `"top"` \| `"right"` \| `"bottom"` \| `"left"`     | Which side of the trigger the surface resolved to. |
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
