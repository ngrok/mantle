import type { RefObject } from "react";
import { useLayoutEffect } from "react";

/**
 * The options for {@link useInertSiblings}.
 *
 * @see https://mantle.ngrok.com/hooks#useinertsiblings
 *
 * @example
 * ```tsx
 * useInertSiblings(panelRef, { active: open && coversThePage });
 * ```
 */
type UseInertSiblingsOptions = {
	/**
	 * Whether the siblings are inert. Flip it to make them inert and release
	 * them on one mounted element.
	 *
	 * @default true
	 */
	active?: boolean;
};

/**
 * Sets `inert` on every other child of the element's parent while `active`
 * is `true`, so nothing beside the element is clickable, focusable, or read
 * by assistive technology. A sibling that mounts while the hook is active
 * goes inert too. On release it clears `inert` from the siblings it set and
 * leaves alone one that was inert already.
 *
 * It reaches siblings only, not the rest of the document, so it fits a
 * surface that covers one row of a layout in place: a panel that covers the
 * card and the rail beside it, with a notice above the row still usable.
 * Pair it with `useFocusTrap` to keep keyboard focus inside the element.
 *
 * The element must be mounted when `active` turns on; the hook reads the ref
 * then and not on a later mount.
 *
 * @see https://mantle.ngrok.com/hooks#useinertsiblings
 *
 * @example
 * ```tsx
 * function CoverPanel({ open, children }: { open: boolean; children: ReactNode }) {
 *   const panelRef = useRef<HTMLDivElement>(null);
 *   const coversThePage = useMatchesMediaQuery("(width < 48rem)");
 *   useInertSiblings(panelRef, { active: open && coversThePage });
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
function useInertSiblings(
	ref: RefObject<HTMLElement | null>,
	{ active = true }: UseInertSiblingsOptions = {},
): void {
	// Why a layout effect: the siblings go inert in the commit that shows the
	// element, so no frame paints with a clickable page beneath it.
	useLayoutEffect(() => {
		const element = ref.current;
		const parent = element?.parentElement;
		if (!active || element == null || parent == null) {
			return;
		}
		const madeInert = new Set<HTMLElement>();
		const inertSiblings = () => {
			for (const child of parent.children) {
				if (child === element || !(child instanceof HTMLElement) || child.inert) {
					continue;
				}
				child.inert = true;
				madeInert.add(child);
			}
		};
		inertSiblings();
		const observer = new MutationObserver(inertSiblings);
		observer.observe(parent, { childList: true });
		return () => {
			observer.disconnect();
			for (const child of madeInert) {
				child.inert = false;
			}
		};
	}, [active, ref]);
}

export {
	//,
	useInertSiblings,
};

export type {
	//,
	UseInertSiblingsOptions,
};
