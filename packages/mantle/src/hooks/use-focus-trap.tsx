import type { RefObject } from "react";
import { useEffect } from "react";
import { findTabbableDescendants } from "../components/alert/tabbable-neighbors.js";

/**
 * The options for {@link useFocusTrap}.
 *
 * @see https://mantle.ngrok.com/hooks#usefocustrap
 *
 * @example
 * ```tsx
 * useFocusTrap(panelRef, { active: open && coversThePage });
 * ```
 */
type UseFocusTrapOptions = {
	/**
	 * Whether the trap holds focus. Flip it to engage and release the trap on
	 * one mounted element: a panel that covers the page at one viewport width
	 * and sits beside it at another keeps its DOM and turns the trap on and off.
	 *
	 * @default true
	 */
	active?: boolean;
};

/** How many frames the trap keeps trying to move focus inside after it activates. */
const focusRetryFrames = 60;

/**
 * The element a Tab press should land on when the browser's default move would
 * leave the container, or `null` when the default move stays inside it. The
 * caller passes at least one tab stop, in document order.
 *
 * When `current` is not a tab stop (the container itself, or a child with a
 * negative `tabIndex`), the next stop is the first one after it in document
 * order, and the previous stop is the last one before it.
 */
function findWrappedTabStop(
	tabStops: ReadonlyArray<HTMLElement>,
	current: Element | null,
	backwards: boolean,
): HTMLElement | null {
	const first = tabStops[0];
	const last = tabStops[tabStops.length - 1];
	if (first == null || last == null) {
		return null;
	}
	const index = tabStops.findIndex((stop) => stop === current);
	if (index !== -1) {
		if (backwards) {
			return index === 0 ? last : null;
		}
		return index === tabStops.length - 1 ? first : null;
	}
	if (current == null) {
		return backwards ? last : first;
	}
	if (backwards) {
		const preceding = tabStops.filter(
			(stop) => (current.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
		);
		return preceding[preceding.length - 1] ?? last;
	}
	const following = tabStops.find(
		(stop) => (current.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
	);
	return following ?? first;
}

/**
 * Keeps keyboard focus inside the element `ref` points at while `active` is
 * `true`. On activation, when focus is outside the element, it moves focus to
 * the element's first tab stop, else to the element itself, which gets
 * `tabindex="-1"` for the trap's lifetime when it has none. An element that
 * opens with a transition can hold nothing focusable in the commit that
 * activates the trap, so the move retries for up to a second of frames until
 * focus lands. While active, Tab on the last tab stop wraps to the first and
 * Shift+Tab on the first wraps to the last, in document order. A child that
 * prevents the default on `Tab` keeps it. On release the trap leaves focus
 * where it is, so the caller decides where focus returns.
 *
 * It traps the keyboard only. Focus that a pointer or a script moves out of
 * the element stays out, so a menu, a popover, or a dialog that portals out of
 * the element keeps working. Make the rest of the page `inert` to block
 * pointer focus, the way `AppLayout.SidePanel` does when it covers the page.
 *
 * The element must be mounted when `active` turns on; the hook reads the ref
 * then and not on a later mount.
 *
 * @see https://mantle.ngrok.com/hooks#usefocustrap
 *
 * @example
 * ```tsx
 * function CoverPanel({ open, children }: { open: boolean; children: ReactNode }) {
 *   const panelRef = useRef<HTMLDivElement>(null);
 *   const coversThePage = useMatchesMediaQuery("(width < 48rem)");
 *   useFocusTrap(panelRef, { active: open && coversThePage });
 *
 *   return (
 *     <div ref={panelRef} role="region" aria-label="Assistant" inert={!open}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
function useFocusTrap(
	ref: RefObject<HTMLElement | null>,
	{ active = true }: UseFocusTrapOptions = {},
): void {
	useEffect(() => {
		const container = ref.current;
		if (!active || container == null) {
			return;
		}

		// Why a tabindex of its own: a container with nothing tabbable inside
		// still has to hold focus, or `Escape` and `Tab` never reach the trap.
		const addedTabIndex = !container.hasAttribute("tabindex");
		if (addedTabIndex) {
			container.tabIndex = -1;
		}

		// Why retry over frames: a container that opens with a transition can
		// be `visibility: hidden` in the commit that activates the trap, and
		// nothing inside it can take focus until the first frame of the slide.
		let frame = 0;
		let framesLeft = focusRetryFrames;
		const focusInside = () => {
			if (container.contains(document.activeElement)) {
				return;
			}
			const [firstTabStop] = findTabbableDescendants(container);
			(firstTabStop ?? container).focus();
			framesLeft -= 1;
			if (!container.contains(document.activeElement) && framesLeft > 0) {
				frame = requestAnimationFrame(focusInside);
			}
		};
		focusInside();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.key !== "Tab" ||
				event.defaultPrevented ||
				!(event.target instanceof Node) ||
				!container.contains(event.target)
			) {
				return;
			}
			const tabStops = findTabbableDescendants(container);
			if (tabStops.length === 0) {
				// Why prevent the move: with nothing inside to land on, the browser
				// would take focus out of the container.
				event.preventDefault();
				return;
			}
			const target = findWrappedTabStop(tabStops, document.activeElement, event.shiftKey);
			if (target != null) {
				event.preventDefault();
				target.focus();
			}
		};

		// Why the document: React's own handlers run at its root, so a child
		// that prevents the default on `Tab` (an editor that inserts one) has
		// done so by the time the event bubbles here.
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("keydown", handleKeyDown);
			if (addedTabIndex) {
				container.removeAttribute("tabindex");
			}
		};
	}, [active, ref]);
}

export {
	//,
	useFocusTrap,
};

export type {
	//,
	UseFocusTrapOptions,
};
