import { Content, Provider, Root, Trigger } from "@radix-ui/react-tooltip";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { cx } from "../../cx";

/**
 * Wraps your app to provide global functionality to your tooltips.
 * Only one instance of this component should be rendered in your app, preferably at the root.
 *
 * @preview This component is in `preview` mode which means the API is not stable and may change.
 * There may also be bugs! Please file an issue if you find any! <3
 */
const TooltipProvider = ({ delayDuration = 0, ...props }: ComponentPropsWithoutRef<typeof Provider>) => (
	<Provider delayDuration={delayDuration ?? 0} {...props} />
);

/**
 * A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
 * This is the root, stateful component that manages the open/closed state of the tooltip.
 * Will throw if you have not wrapped your app in a `TooltipProvider`.
 *
 * @preview This component is in `preview` mode which means the API is not stable and may change.
 * There may also be bugs! Please file an issue if you find any! <3
 */
const Tooltip = Root;

/**
 * The trigger button that opens the tooltip.
 *
 * @preview This component is in `preview` mode which means the API is not stable and may change.
 * There may also be bugs! Please file an issue if you find any! <3
 */
const TooltipTrigger = Trigger;

/**
 * The content to render inside the tooltip.
 *
 * @preview This component is in `preview` mode which means the API is not stable and may change.
 * There may also be bugs! Please file an issue if you find any! <3
 */
const TooltipContent = forwardRef<ElementRef<typeof Content>, ComponentPropsWithoutRef<typeof Content>>(
	({ children, className, sideOffset = 4, ...props }, ref) => (
		<Content
			ref={ref}
			sideOffset={sideOffset}
			className={cx(
				"z-50 overflow-hidden rounded-md bg-tooltip px-3 py-1.5 text-sm text-tooltip shadow animate-in fade-in-0 zoom-in-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95",
				className,
			)}
			{...props}
		>
			{children}
		</Content>
	),
);
TooltipContent.displayName = "TooltipContent";

export {
	//,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
};
