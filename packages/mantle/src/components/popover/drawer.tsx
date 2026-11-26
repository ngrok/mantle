"use client";

import { useCallback } from "react";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { ScrollBody } from "../dialog/scroll-body.js";
import { Content, Root } from "../drawer/drawer.js";
import type { PopoverContentProps, PopoverState } from "./popover.js";

/**
 * The drawer presentation of `Popover.Content`: the content in a `Drawer`.
 * `Popover.Content` loads this module on demand, so a page that never
 * presents a drawer does not pay for the dialog and swipe behavior.
 */

/**
 * Renders `Popover.Content` as a `Drawer`. The popover owns the open state;
 * the drawer reports each close a swipe, Escape, back, or the scrim asks for.
 * Why the props and the state arrive whole: the popover chunk, which every
 * page with a popover loads, then carries no drawer wiring.
 *
 * Why the scroll box: content taller than the screen scrolls, and a drag on
 * the grab handle moves the panel. `Popover.Arrow` has no anchor to point
 * at, so it hides.
 */
const PopoverDrawer = ({
	// Why drop these: they place a float, and a drawer has no anchor.
	align: _align,
	side: _side,
	sideOffset: _sideOffset,
	preferredWidth: _preferredWidth,
	onFocusOutside: _onFocusOutside,
	children,
	"data-slot": dataSlot,
	id,
	onClick,
	onCloseAutoFocus,
	ref,
	state: { contentId, open, setOpen, triggerRef },
	...props
}: PopoverContentProps & { state: PopoverState }) => {
	const { "aria-label": label, "aria-labelledby": labelledBy } = props;
	// Why the trigger names the drawer: as in the popover, the trigger says
	// what opens. Why a ref: an enclosing dialog can replace the `<dialog>`
	// while open. Why its rendered `id`, after the commit: a consumer can set
	// one, and the trigger can render after the content.
	const name = useCallback(
		(panel: HTMLDivElement | null) => {
			if (panel == null || label != null || labelledBy != null) {
				return;
			}
			queueMicrotask(() => {
				const triggerId = triggerRef.current?.id;
				if (triggerId) {
					panel.closest("dialog")?.setAttribute("aria-labelledby", triggerId);
				}
			});
		},
		[label, labelledBy, triggerRef],
	);
	const composedRef = useComposedRefs(ref, name);

	return (
		<Root open={open} onOpenChange={setOpen}>
			<Content
				id={id ?? contentId}
				ref={composedRef}
				data-slot={joinDataSlot(dataSlot, "popover-content")}
				data-presentation="drawer"
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
