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
 * testable transform: the SR-facing `aria-posinset`/`aria-setsize` and the
 * absolute `translateY` come straight from the virtual item and full count.
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
 * module is the sole importer of `@tanstack/react-virtual`, so plain-only
 * bundles never pull it in.
 *
 * Grid navigation works across the **full** collection, not just the window:
 * arrow keys move an active index over all rows, `scrollToIndex` reveals + mounts
 * the active row, and focus stays on the collection (never on a row) so it
 * survives windowing. Each windowed row still carries `aria-posinset` /
 * `aria-setsize`, and `overscan` keeps the active row mounted. **Bound the
 * height** so the virtualizer has a viewport to measure.
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
		const rows = Children.toArray(children).filter(isValidElement);
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
			() => ({ activeIndex, rowId: resolveRowId }),
			[activeIndex, resolveRowId],
		);

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
							role={semantics === "grid" ? "grid" : "list"}
							aria-label={ariaLabel}
							aria-labelledby={ariaLabelledby}
							className={listCollectionClassName}
							style={{ height: `${virtualizer.getTotalSize()}px` }}
							{...collectionProps}
						>
							{virtualizer.getVirtualItems().map((virtualRow) => {
								const row = rows[virtualRow.index];
								if (row == null) {
									return null;
								}
								return (
									<VirtualRow
										key={virtualRow.key}
										virtualRow={virtualRow}
										count={rows.length}
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
	buildRowPlacement,
	VirtualRoot,
};

export type {
	//,
	VirtualRootProps,
};
