"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import { Children, forwardRef, isValidElement, useCallback, useId, useMemo, useRef } from "react";
import type { ComponentRef, ReactNode } from "react";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import {
	GridNavContext,
	isRowChildDisabled,
	ListContext,
	ListRowContext,
	listCollectionClassName,
	listViewportClassName,
	useGridNavigation,
} from "./primitive.js";
import type {
	GridNavContextValue,
	ListContextValue,
	ListRootProps,
	ListRowContextValue,
	ListRowPlacement,
} from "./primitive.js";

/**
 * Props for {@link VirtualRoot}. The same surface as the plain `Root` plus the
 * virtualizer knobs.
 *
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.VirtualRoot aria-label="Accounts" className="max-h-80" estimateRowHeight={36} overscan={12}>
 *   <List.Row>
 *     <button type="button">Acme Inc</button>
 *   </List.Row>
 * </List.VirtualRoot>
 * ```
 */
type VirtualRootProps = ListRootProps & {
	/** Estimated row height in px, used to seed the virtualizer before rows are measured. */
	estimateRowHeight?: number;
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
function buildRowPlacement(
	virtualRow: VirtualItem,
	count: number,
	measureRef: Virtualizer<HTMLDivElement, Element>["measureElement"],
): ListRowPlacement {
	return {
		posInSet: virtualRow.index + 1,
		setSize: count,
		measureRef,
		style: {
			position: "absolute",
			left: 0,
			top: 0,
			width: "100%",
			transform: `translateY(${virtualRow.start}px)`,
		},
	};
}

/**
 * One windowed row: memoizes its {@link ListRowContextValue} (index + placement)
 * and hands it to the composed `Row` (wherever it sits, even inside a consumer's
 * item wrapper). Extracted so the provider value is a `useMemo` result rather
 * than reconstructed inline — a `.map()` body can't call hooks itself.
 */
function VirtualRow({
	children,
	count,
	measureRef,
	virtualRow,
}: {
	children: ReactNode;
	count: number;
	measureRef: Virtualizer<HTMLDivElement, Element>["measureElement"];
	virtualRow: VirtualItem;
}) {
	const value = useMemo<ListRowContextValue>(
		() => ({
			index: virtualRow.index,
			placement: buildRowPlacement(virtualRow, count, measureRef),
		}),
		[virtualRow, count, measureRef],
	);

	return <ListRowContext.Provider value={value}>{children}</ListRowContext.Provider>;
}
VirtualRow.displayName = "ListVirtualRow";

/**
 * The windowed counterpart to `Root`: renders only the visible slice of its
 * composed `Row` children via `@tanstack/react-virtual`, sharing the plain
 * shell's chrome, semantics, and — for a grid — `aria-activedescendant`
 * keyboard navigation. Authored identically to `Root` (you still compose `<Row>`
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
 * @see https://mantle.ngrok.com/components/list
 *
 * @example
 * ```tsx
 * <List.VirtualRoot semantics="grid" aria-label="Access keys" className="max-h-80" onActivate={toggleByIndex}>
 *   {keys.map((key) => (
 *     <List.Row key={key.id} selected={selected.has(key.id)}>
 *       <div role="gridcell"><Checkbox checked={selected.has(key.id)} tabIndex={-1} /></div>
 *       <div role="gridcell">{key.name}</div>
 *     </List.Row>
 *   ))}
 * </List.VirtualRoot>
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
			estimateRowHeight = 44,
			onActivate,
			overscan = 8,
			rowId,
			semantics = "list",
			...props
		},
		ref,
	) => {
		const baseId = useId();
		const scrollRef = useRef<HTMLDivElement>(null);
		// Memoized so a scroll or keyboard-nav re-render (`useVirtualizer` re-renders
		// on every offset change) doesn't re-walk + re-filter the full child set each
		// frame — only the windowed slice below needs to re-render.
		const rows = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);
		const count = rows.length;
		const virtualizer = useVirtualizer({
			count,
			getScrollElement: () => scrollRef.current,
			estimateSize: () => estimateRowHeight,
			overscan,
			// Reproduce the plain collection's `gap-px` between windowed rows, which
			// are out of flow and so can't inherit the flex gap.
			gap: 1,
		});
		const listContext = useMemo<ListContextValue>(() => ({ semantics }), [semantics]);
		const resolveRowId = useMemo(
			() => rowId ?? ((index: number) => `${baseId}-row-${index}`),
			[rowId, baseId],
		);
		const scrollToIndex = useCallback(
			(index: number) => virtualizer.scrollToIndex(index, { align: "auto" }),
			[virtualizer],
		);
		const { activeIndex, collectionProps } = useGridNavigation({
			count,
			enabled: semantics === "grid",
			// Windowed rows aren't all mounted, so read `disabled` from the row
			// elements (which we hold in full) rather than the DOM.
			isRowDisabled: (index) => isRowChildDisabled(rows[index]),
			onActivate,
			rowId: resolveRowId,
			scrollToIndex,
		});
		const gridNav = useMemo<GridNavContextValue>(
			() => ({ activeIndex, rowId: resolveRowId, ownsRowIds: rowId == null }),
			[activeIndex, resolveRowId, rowId],
		);
		const virtualItems = virtualizer.getVirtualItems();
		// `aria-activedescendant` must reference an element in the DOM: when the
		// user mouse-scrolls the active row outside the mounted window, drop the
		// reference rather than leave a dangling IDREF (the active index is kept, so
		// the next arrow key scrolls the row back into view and restores it).
		const activeRowIsMounted = virtualItems.some((item) => item.index === activeIndex);
		const windowedCollectionProps = {
			...collectionProps,
			"aria-activedescendant": activeRowIsMounted
				? collectionProps["aria-activedescendant"]
				: undefined,
		};

		return (
			<ListContext.Provider value={listContext}>
				<GridNavContext.Provider value={gridNav}>
					<div
						ref={composeRefs(scrollRef, ref)}
						data-slot="list"
						className={cx(listViewportClassName, className)}
						{...props}
					>
						<div
							data-slot="list-collection"
							role={semantics === "grid" ? "grid" : "list"}
							aria-label={ariaLabel}
							aria-labelledby={ariaLabelledby}
							aria-multiselectable={ariaMultiselectable}
							// Only the windowed slice is in the DOM, so tell AT how many rows
							// the grid really has (rows carry the matching aria-rowindex).
							aria-rowcount={semantics === "grid" ? count : undefined}
							className={listCollectionClassName}
							style={{ height: `${virtualizer.getTotalSize()}px` }}
							{...windowedCollectionProps}
						>
							{virtualItems.map((virtualRow) => {
								const row = rows[virtualRow.index];
								if (row == null) {
									return null;
								}
								return (
									<VirtualRow
										key={virtualRow.key}
										virtualRow={virtualRow}
										count={count}
										measureRef={virtualizer.measureElement}
									>
										{row}
									</VirtualRow>
								);
							})}
						</div>
					</div>
				</GridNavContext.Provider>
			</ListContext.Provider>
		);
	},
);
VirtualRoot.displayName = "ListVirtualRoot";

export {
	//,
	VirtualRoot,
};

export type {
	//,
	VirtualRootProps,
};
