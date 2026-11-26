"use client";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Content, createScope, Root } from "../dialog/native-primitive.js";

/**
 * The drawer presentation of `Popover.Content`: a modal `<dialog>` that slides
 * up from the bottom edge. `Popover.Content` loads this module on demand, so a
 * page that never presents a drawer does not pay for the dialog behavior.
 *
 * Why the dialog primitive: it already owns the modal stack, the inert page,
 * the scroll lock, Escape and the Android back gesture, the exit before
 * `close()`, and the move of each `OverlayPrompt` host (toasts, `Sandbar`)
 * into the top modal.
 */

// Why a scope of its own: a `Dialog.Trigger` inside the popover must bind to
// the nearest `Dialog.Root`, not to the drawer.
const scope = createScope();

/**
 * The classes of the drawer panel. It slides its full height from the bottom
 * edge, as an edge panel does (docs/motion.md). `[&>[data-float-arrow]]:hidden`
 * hides a `Popover.Arrow`, which has no anchor to point at in a drawer.
 */
const drawerClassName = cx(
	"bg-popover border-popover fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-xl border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg outline-hidden",
	"data-open:animate-in data-open:slide-in-from-bottom data-closing:animate-out data-closing:slide-out-to-bottom",
	"duration-200 ease-out-strong data-closing:duration-150 motion-reduce:animate-none!",
	"[&>[data-float-arrow]]:hidden",
);

type PopoverDrawerProps = Omit<
	ComponentProps<typeof Content>,
	"scope" | "positionerClassName" | "positionerSlot" | "forceMount" | "inline" | "layer" | "role"
> & {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/**
 * Renders `Popover.Content` as a modal drawer. The popover owns the open
 * state; the drawer reports each close the browser asks for, such as Escape,
 * back, or a press on the backdrop.
 */
const PopoverDrawer = ({ className, onOpenChange, open, ...props }: PopoverDrawerProps) => (
	<Root scope={scope} open={open} onOpenChange={onOpenChange}>
		<Content
			scope={scope}
			positionerSlot="popover-drawer-positioner"
			positionerClassName="fixed z-60"
			className={cx(drawerClassName, className)}
			{...props}
		/>
	</Root>
);

export {
	//,
	PopoverDrawer,
};
