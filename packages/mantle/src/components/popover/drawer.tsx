"use client";

import type { ComponentProps, RefObject } from "react";
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
		/** The popover trigger, which names the drawer when the content has no name. */
		triggerRef: RefObject<HTMLElement | null>;
	};

/**
 * Renders `Popover.Content` as a `Drawer`. The popover owns the open state;
 * the drawer reports each close a swipe, Escape, back, or the scrim asks for.
 *
 * Why the scroll box: content taller than the screen scrolls, and a drag on
 * the grab handle moves the panel. `Popover.Arrow` has no anchor to point
 * at, so it hides.
 */
const PopoverDrawer = ({
	children,
	className,
	"data-slot": dataSlot,
	onClick,
	onCloseAutoFocus,
	onOpenChange,
	open,
	ref,
	triggerRef,
	...props
}: PopoverDrawerProps) => (
	<Root open={open} onOpenChange={onOpenChange}>
		<Content
			data-slot={joinDataSlot(dataSlot, "popover-content")}
			data-presentation="drawer"
			className={cx("[&_[data-float-arrow]]:hidden", className)}
			// Why: the trigger names the popover in `aria-controls`, not the
			// `<dialog>`, so the drawer's own fallback does not find it after a
			// tap that did not focus it.
			onCloseAutoFocus={(event) => {
				onCloseAutoFocus?.(event);
				const body = triggerRef.current?.ownerDocument.body;
				if (!event.defaultPrevented && body?.ownerDocument.activeElement === body) {
					triggerRef.current?.focus();
				}
			}}
			ref={(panel) => {
				// Why the trigger names the drawer: as in the popover, the trigger
				// says what opens. Why its rendered `id`: a consumer can set one.
				const triggerId = triggerRef.current?.id;
				if (
					panel != null &&
					triggerId &&
					props["aria-label"] == null &&
					props["aria-labelledby"] == null
				) {
					panel.closest("dialog")?.setAttribute("aria-labelledby", triggerId);
				}
				if (typeof ref === "function") {
					return ref(panel);
				}
				if (ref != null) {
					ref.current = panel;
				}
				return undefined;
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
