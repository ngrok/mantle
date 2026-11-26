"use client";

import type { ComponentProps, RefObject } from "react";
import { useEffect } from "react";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { ScrollBody } from "../dialog/scroll-body.js";
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
	triggerRef,
	...props
}: PopoverDrawerProps) => {
	const { id, "aria-label": label, "aria-labelledby": labelledBy } = props;
	// Why the trigger names the drawer: as in the popover, the trigger says
	// what opens. Why its rendered `id`, after the commit: a consumer can set
	// one, and the trigger can render after the content.
	useEffect(() => {
		const triggerId = triggerRef.current?.id;
		const dialog = id == null ? null : document.getElementById(id)?.closest("dialog");
		if (open && dialog != null && triggerId && label == null && labelledBy == null) {
			dialog.setAttribute("aria-labelledby", triggerId);
		}
	}, [id, label, labelledBy, open, triggerRef]);

	return (
		<Root open={open} onOpenChange={onOpenChange}>
			<Content
				data-slot={joinDataSlot(dataSlot, "popover-content")}
				data-presentation="drawer"
				className={className}
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
				{...props}
				onClick={(event) => {
					// Why: a click in the content must not reach a clickable parent of the trigger.
					event.stopPropagation();
					onClick?.(event);
				}}
			>
				{/* Why `>` for the arrow: an arrow of a float inside is not this one. */}
				<ScrollBody className="min-h-0 flex-1 touch-pan-y touch-pinch-zoom overflow-y-auto overscroll-contain px-4 pb-4 focus-visible:focus-ring focus-visible:ring-inset [&>[data-float-arrow]]:hidden">
					{children}
				</ScrollBody>
			</Content>
		</Root>
	);
};

export {
	//,
	PopoverDrawer,
};
