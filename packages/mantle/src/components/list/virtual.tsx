"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import {
	Children,
	forwardRef,
	isValidElement,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import type { ComponentRef, ReactNode } from "react";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import {
	findItemControl,
	isItemChildDisabled,
	ListItemContext,
	ListShell,
	useListShell,
} from "./primitive.js";
import type { ListRootProps, ListItemContextValue, ListItemPlacement } from "./primitive.js";

/**
 * Props for {@link VirtualRoot}. The same surface as the plain `Root` plus the
 * virtualizer knobs.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <VirtualRoot aria-label="Accounts" className="max-h-80" estimateItemHeight={36} overscan={12}>
 *   <Item>
 *     <button type="button">Acme Inc</button>
 *   </Item>
 * </VirtualRoot>
 * ```
 */
type VirtualRootProps = ListRootProps & {
	/** Estimated item height in px, used to seed the virtualizer before items are measured. */
	estimateItemHeight?: number;
	/** Rows rendered beyond the visible window on each side. The buffer keeps the active row mounted for `aria-activedescendant`. */
	overscan?: number;
};

/**
 * Compute the placement a windowed row is handed through context. A plain call
 * (not an inline object literal) so it reads as intent and stays a pure,
 * testable transform: the SR-facing position (`aria-posinset`/`aria-setsize`
 * on a listitem, `aria-rowindex` on a grid row) and the absolute `translateY`
 * come straight from the virtual item and full count.
 */
function buildItemPlacement({
	virtualItem,
	count,
	measureRef,
}: {
	virtualItem: VirtualItem;
	count: number;
	measureRef: Virtualizer<HTMLDivElement, Element>["measureElement"];
}): ListItemPlacement {
	return {
		posInSet: virtualItem.index + 1,
		setSize: count,
		measureRef,
		style: {
			position: "absolute",
			left: 0,
			top: 0,
			width: "100%",
			transform: `translateY(${virtualItem.start}px)`,
		},
	};
}

/**
 * One windowed row: memoizes its {@link ListItemContextValue} (index + placement)
 * and hands it to the composed `Item` (wherever it sits, even inside a consumer's
 * item wrapper). Extracted so the provider value is a `useMemo` result rather
 * than reconstructed inline — a `.map()` body can't call hooks itself.
 */
function WindowedItem({
	children,
	count,
	measureRef,
	virtualItem,
}: {
	children: ReactNode;
	count: number;
	measureRef: Virtualizer<HTMLDivElement, Element>["measureElement"];
	virtualItem: VirtualItem;
}) {
	const value = useMemo<ListItemContextValue>(
		() => ({
			index: virtualItem.index,
			placement: buildItemPlacement({ virtualItem, count, measureRef }),
		}),
		[virtualItem, count, measureRef],
	);

	return <ListItemContext.Provider value={value}>{children}</ListItemContext.Provider>;
}
WindowedItem.displayName = "ListPrimitiveWindowedItem";

/**
 * The windowed counterpart to `Root`: renders only the visible slice of its
 * composed `Item` children via `@tanstack/react-virtual`, sharing the plain
 * shell's chrome, semantics, and — for a grid — `aria-activedescendant`
 * keyboard navigation. Authored identically to `Root` (you still compose `<Item>`
 * children), so swapping in virtualization never changes the call site. This
 * module is the sole importer of `@tanstack/react-virtual`; because the `List`
 * namespace (and both higher-level list components) re-export `VirtualRoot`,
 * the dependency ships with every list entrypoint — it is small (~a few kB
 * gzipped) and does no windowing work until a `VirtualRoot` actually renders.
 *
 * Grid navigation works across the **full** collection, not just the window:
 * arrow keys move an active index over all rows, `scrollToIndex` reveals + mounts
 * the active row, and focus stays on the collection (never on a row) so it
 * survives windowing. Each windowed row still carries its position —
 * `aria-posinset` / `aria-setsize` on a listitem, `aria-rowindex` (with
 * `aria-rowcount` on the grid) on a grid row. `overscan` keeps the active row
 * mounted through nearby scrolling; if it is mouse-scrolled fully out of the
 * window, the `aria-activedescendant` reference is dropped until keyboard
 * navigation re-mounts it. **Bound the height** so the virtualizer has a
 * viewport to measure.
 *
 * @see https://mantle.ngrok.com/components/data-display/list
 *
 * @example
 * ```tsx
 * <VirtualRoot semantics="grid" aria-label="Access keys" className="max-h-80" onActivate={toggleByIndex}>
 *   {keys.map((key) => (
 *     <Item key={key.id} selected={selected.has(key.id)}>
 *       <div role="gridcell"><Checkbox checked={selected.has(key.id)} tabIndex={-1} /></div>
 *       <div role="gridcell">{key.name}</div>
 *     </Item>
 *   ))}
 * </VirtualRoot>
 * ```
 */
const VirtualRoot = forwardRef<ComponentRef<"div">, VirtualRootProps>(
	(
		{
			"aria-label": ariaLabel,
			"aria-labelledby": ariaLabelledby,
			"aria-multiselectable": ariaMultiselectable,
			children,
			className,
			estimateItemHeight = 44,
			isItemDisabled,
			onActivate,
			overscan = 8,
			itemId,
			semantics = "list",
			...props
		},
		ref,
	) => {
		const scrollRef = useRef<HTMLDivElement>(null);
		const composedViewportRef = useComposedRefs(scrollRef, ref);
		// Memoized so a scroll or keyboard-nav re-render (`useVirtualizer` re-renders
		// on every offset change) doesn't re-walk + re-filter the full child set each
		// frame — only the windowed slice below needs to re-render.
		const items = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);
		const count = items.length;
		const virtualizer = useVirtualizer({
			count,
			getScrollElement: () => scrollRef.current,
			estimateSize: () => estimateItemHeight,
			// Key windowed rows by the child's own key (assigned by `Children.toArray`)
			// so row identity — React reconciliation via `virtualItem.key` below AND
			// the virtualizer's measurement cache — follows the consumer's keys across
			// reorder/filter, matching the plain `Root`, instead of tracking position.
			getItemKey: (index) => items[index]?.key ?? index,
			overscan,
			// Reproduce the plain collection's `gap-px` between windowed rows, which
			// are out of flow and so can't inherit the flex gap.
			gap: 1,
		});
		const scrollToIndex = useCallback(
			(index: number) => virtualizer.scrollToIndex(index, { align: "auto" }),
			[virtualizer],
		);
		const focusFrameRef = useRef<number | null>(null);
		// Cancel any in-flight focus poll when the list unmounts, so a row that was
		// still mounting can't schedule frames (or steal focus) after teardown.
		useEffect(
			() => () => {
				if (focusFrameRef.current != null) {
					cancelAnimationFrame(focusFrameRef.current);
				}
			},
			[],
		);
		const focusItemAt = useCallback(
			(index: number, step: number) => {
				// Supersede any focus poll still chasing an earlier target so overlapping
				// keypresses don't race to move focus.
				if (focusFrameRef.current != null) {
					cancelAnimationFrame(focusFrameRef.current);
					focusFrameRef.current = null;
				}
				let target = index;
				let attempts = 0;
				const tryFocus = () => {
					focusFrameRef.current = null;
					const viewport = scrollRef.current;
					if (viewport == null || target < 0 || target >= count) {
						return;
					}
					// A jump target (Home/End) may not be mounted until the virtualizer
					// renders the new window — scroll it in, then poll for its control.
					virtualizer.scrollToIndex(target, { align: "auto" });
					const item = viewport.querySelector(`[data-index="${target}"]`);
					if (item != null) {
						const control = findItemControl(item);
						if (control != null) {
							control.focus({ preventScroll: true });
							return;
						}
						// The row is mounted but hosts no focusable control (a static row):
						// step to the next candidate rather than dead-ending on it.
						target += step;
						attempts = 0;
					}
					attempts += 1;
					// Bounded so a row that never mounts (or a run of static rows) can't
					// loop forever.
					if (attempts < 10) {
						focusFrameRef.current = requestAnimationFrame(tryFocus);
					}
				};
				tryFocus();
			},
			[count, virtualizer],
		);
		const { collectionProps, gridNav, listContext } = useListShell({
			count,
			focusItemAt,
			// Windowed items aren't all mounted, so the default reads `disabled` off
			// the item elements (which we hold in full) rather than the DOM.
			isItemDisabled: isItemDisabled ?? ((index) => isItemChildDisabled(items[index])),
			onActivate,
			itemId,
			scrollToIndex,
			semantics,
		});
		const virtualItems = virtualizer.getVirtualItems();
		// `aria-activedescendant` must reference an element in the DOM: when the
		// user mouse-scrolls the active row outside the mounted window, drop the
		// reference rather than leave a dangling IDREF (the active index is kept, so
		// the next arrow key scrolls the row back into view and restores it).
		const activeItemIsMounted = virtualItems.some((item) => item.index === gridNav.activeIndex);

		return (
			<ListShell
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledby}
				aria-multiselectable={ariaMultiselectable}
				className={className}
				collectionProps={{
					...collectionProps,
					"aria-activedescendant": activeItemIsMounted
						? collectionProps["aria-activedescendant"]
						: undefined,
					// Only the windowed slice is in the DOM, so tell AT how many rows
					// the grid really has (rows carry the matching aria-rowindex).
					"aria-rowcount": semantics === "grid" ? count : undefined,
					style: { height: `${virtualizer.getTotalSize()}px` },
				}}
				gridNav={gridNav}
				listContext={listContext}
				viewportProps={props}
				viewportRef={composedViewportRef}
			>
				{virtualItems.map((virtualItem) => {
					const item = items[virtualItem.index];
					if (item == null) {
						return null;
					}
					return (
						<WindowedItem
							key={virtualItem.key}
							virtualItem={virtualItem}
							count={count}
							measureRef={virtualizer.measureElement}
						>
							{item}
						</WindowedItem>
					);
				})}
			</ListShell>
		);
	},
);
VirtualRoot.displayName = "ListPrimitiveVirtualRoot";

export {
	//,
	VirtualRoot,
};

export type {
	//,
	VirtualRootProps,
};
