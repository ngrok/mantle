"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { forwardRef, useRef } from "react";
import type { ComponentProps, ComponentRef, ReactNode } from "react";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";

type VirtualListProps = Omit<ComponentProps<"div">, "children"> & {
	/** Total number of rows. The virtualizer renders only the visible window. */
	count: number;
	/** Estimated row height in pixels, used to seed the virtualizer before rows are measured. */
	estimateRowHeight?: number;
	/** Stable React key for the row at `index`. */
	getItemKey: (index: number) => string;
	/** Whether the row at `index` is selected (drives the selected pill tint). */
	isItemSelected?: (index: number) => boolean;
	/** Whether the row at `index` is disabled (suppresses the hover tint; the row itself owns its disabled control). */
	isItemDisabled?: (index: number) => boolean;
	/** Render the row content (the interactive element) for `index`. */
	children: (index: number) => ReactNode;
};

/**
 * Internal shared shell for mantle's virtualized lists (`SelectableList`,
 * `ScrollableList`). Not published — both list components import it directly.
 *
 * Owns the scroll viewport and the row chrome, styled after the `MultiSelect`
 * popover (minus its shadow): a bordered, rounded `bg-popover` box that rows
 * scroll inside of and clip against, plus a `<ul role="list">` of `<li>` rows
 * whose hover / selected state paints an inset, rounded pill in the shared
 * `*-menu-item` tokens. The consumer provides the row count, per-row state
 * accessors, and the row content; the content fills the pill and owns the
 * click / label semantics.
 *
 * @example
 * ```tsx
 * <VirtualList
 *   count={items.length}
 *   getItemKey={(index) => items[index].id}
 *   isItemSelected={(index) => items[index].id === activeId}
 *   aria-label="Items"
 *   className="max-h-80"
 * >
 *   {(index) => <button className="w-full px-2 py-1.5">{items[index].name}</button>}
 * </VirtualList>
 * ```
 */
const VirtualList = forwardRef<ComponentRef<"div">, VirtualListProps>(
	(
		{
			"aria-label": ariaLabel,
			"aria-labelledby": ariaLabelledby,
			children,
			className,
			count,
			estimateRowHeight = 44,
			getItemKey,
			isItemSelected,
			isItemDisabled,
			...props
		},
		ref,
	) => {
		const scrollRef = useRef<HTMLDivElement>(null);
		const virtualizer = useVirtualizer({
			count,
			getScrollElement: () => scrollRef.current,
			estimateSize: () => estimateRowHeight,
			overscan: 8,
		});

		if (count === 0) {
			return null;
		}

		const virtualRows = virtualizer.getVirtualItems();
		// Render the list through a variable element so the explicit `role="list"` —
		// which preserves list semantics after `list-none` strips them in Safari /
		// VoiceOver, mirroring Field.ErrorList — does not trip
		// jsx-a11y/no-redundant-roles (which only inspects a literal `<ul>`).
		const List = "ul";

		return (
			<div
				ref={composeRefs(scrollRef, ref)}
				data-slot="virtual-list"
				className={cx(
					// Looks like the MultiSelect popover container (minus its shadow): a
					// bordered, rounded `bg-popover` box the rows scroll inside of and clip
					// against. No height on purpose — the consumer must bound it (`max-h-*`,
					// `h-*`, or `min-h-0 flex-1` in a flex parent) so the virtualizer has a
					// scroll viewport to measure. `py-1` is the gap around the whole list.
					"border-popover bg-popover scrollbar overscroll-none overflow-y-auto overflow-x-hidden rounded-md border py-1",
					className,
				)}
				{...props}
			>
				<List
					role="list"
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					className="relative m-0 w-full list-none p-0"
					style={{ height: `${virtualizer.getTotalSize()}px` }}
				>
					{virtualRows.map((virtualRow) => {
						const index = virtualRow.index;
						const selected = isItemSelected?.(index) ?? false;
						const disabled = isItemDisabled?.(index) ?? false;
						const state = selected ? "selected" : "unselected";
						return (
							<li
								key={getItemKey(index)}
								data-slot="virtual-list-row"
								data-index={index}
								data-state={state}
								ref={virtualizer.measureElement}
								// A full-width positioned slot. `px-1` insets the pill from the
								// container edges and `pb-px` leaves a 1px gap below it, so adjacent
								// tinted rows read as separate pills — mirroring `MultiSelect.Item`'s
								// `mx-1` + `mt-px`.
								className="absolute left-0 top-0 w-full px-1 pb-px"
								style={{ transform: `translateY(${virtualRow.start}px)` }}
							>
								<div
									// `data-state` is duplicated from the <li> so the selected/hover
									// chrome can read both on one element — stacking two `group-*`
									// variants can't express "selected AND hovered".
									data-state={state}
									data-slot="virtual-list-row-pill"
									// The row's hover / selected chrome: an inset, rounded pill tinted
									// with the shared menu-item tokens (the same ones `MultiSelect.Item`
									// uses). No border. Hover is suppressed for disabled rows.
									className={cx(
										"rounded-md",
										"data-[state=selected]:bg-selected-menu-item",
										!disabled &&
											"hover:bg-active-menu-item hover:data-[state=selected]:bg-active-selected-menu-item",
									)}
								>
									{children(index)}
								</div>
							</li>
						);
					})}
				</List>
			</div>
		);
	},
);
VirtualList.displayName = "VirtualList";

export {
	//,
	VirtualList,
};

export type {
	//,
	VirtualListProps,
};
