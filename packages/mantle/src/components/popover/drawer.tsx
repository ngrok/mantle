"use client";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Content, Root } from "../drawer/drawer.js";

/**
 * The drawer presentation of `Popover.Content`: the content in a `Drawer`.
 * `Popover.Content` loads this module on demand, so a page that never
 * presents a drawer does not pay for the dialog and swipe behavior.
 */

type PopoverDrawerProps = ComponentProps<typeof Content> &
	WithDataSlot & {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		/** The `id` of the popover trigger, which names the drawer when the content has no name. */
		triggerId: string;
	};

/**
 * Renders `Popover.Content` as a `Drawer`. The popover owns the open state;
 * the drawer reports each close a swipe, Escape, back, or the scrim asks for.
 *
 * Why the scroll box: the drawer panel takes no touch scroll, so a drag
 * anywhere outside the content moves it, and content taller than the
 * screen still scrolls. `Popover.Arrow` has no anchor to point at, so it hides.
 */
const PopoverDrawer = ({
	children,
	className,
	"data-slot": dataSlot,
	onClick,
	onOpenAutoFocus,
	onOpenChange,
	open,
	triggerId,
	...props
}: PopoverDrawerProps) => (
	<Root open={open} onOpenChange={onOpenChange}>
		<Content
			// Why the trigger names the drawer: as in the popover, the trigger says what opens.
			aria-labelledby={props["aria-label"] == null ? triggerId : undefined}
			data-slot={joinDataSlot(dataSlot, "popover-content")}
			data-presentation="drawer"
			className={cx("[&_[data-float-arrow]]:hidden", className)}
			// Why the dialog keeps focus: focus on the first field would open the
			// on-screen keyboard over the drawer.
			onOpenAutoFocus={(event) => {
				onOpenAutoFocus?.(event);
				event.preventDefault();
			}}
			{...props}
			onClick={(event) => {
				// Why: a click in the content must not reach a clickable parent of the trigger.
				event.stopPropagation();
				onClick?.(event);
			}}
		>
			<div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-4">
				{children}
			</div>
		</Content>
	</Root>
);

export {
	//,
	PopoverDrawer,
};
