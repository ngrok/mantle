"use client";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Content, Root } from "../drawer/drawer.js";

/**
 * The drawer presentation of `Popover.Content`: the content in a `Drawer`.
 * `Popover.Content` loads this module on demand, so a page that never
 * presents a drawer does not pay for the dialog and swipe behavior.
 */

type PopoverDrawerProps = ComponentProps<typeof Content> & {
	open: boolean;
	onOpenChange: (open: boolean) => void;
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
	onOpenChange,
	open,
	...props
}: PopoverDrawerProps) => (
	<Root open={open} onOpenChange={onOpenChange}>
		<Content className={cx("[&_[data-float-arrow]]:hidden", className)} {...props}>
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
