"use client";

import type { ComponentProps } from "react";
import { useContext, useId, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";
import { ChartAxisContext, useChartContext } from "./context.js";
import type { YAxisSide } from "./types.js";

/**
 * The axis title part: HTML text in its own cell of the Root's grid.
 *
 * This module is internal shared implementation, not exported from the package.
 */

type AxisTitlePrimitiveProps = ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Classes for the title. The title is one line, and it truncates with an
		 * ellipsis; set `whitespace-normal` to wrap it.
		 */
		className?: string;
	};

/**
 * The cell each edge takes in the Root's grid. Why the pixel margins on a side
 * title: they match the plot's 8px top padding and its bottom band (24px under
 * a bottom axis, else 8px), so the title centers on the inner plot with no
 * measurement. Why `rtl:`: grid columns follow the text direction, and the
 * engine paints each axis on its physical edge.
 */
const EDGE_CLASSES = {
	bottom: "col-2 row-2 text-center",
	left: "col-1 row-1 mt-[8px] rotate-180 text-center [writing-mode:vertical-rl] rtl:col-3",
	right: "col-3 row-1 mt-[8px] text-center [writing-mode:vertical-rl] rtl:col-1",
} as const;

/**
 * The edge an axis title sits on. Horizontal bars put the x (category) axis on
 * the left and the value axis at the bottom, and they take no right axis.
 */
const edgeOf = (axis: "x" | YAxisSide, horizontal: boolean): keyof typeof EDGE_CLASSES => {
	if (axis === "x") {
		return horizontal ? "left" : "bottom";
	}
	return horizontal ? "bottom" : axis;
};

/**
 * Name an axis in visible HTML text. The text sits outside the canvas, so a
 * screen reader and a search engine read it. The x axis's title also heads the
 * x column of the sr-only data table.
 */
const ChartAxisTitlePrimitive = ({
	partName,
	slotName,
	asChild = false,
	children,
	className,
	ref,
	"data-slot": dataSlot,
	...props
}: AxisTitlePrimitiveProps & { partName: string; slotName: string }) => {
	const context = useChartContext(partName);
	const axis = useContext(ChartAxisContext);
	invariant(
		axis != null,
		() =>
			`${partName} must be composed inside ${context.componentName}.XAxis or ${context.componentName}.YAxis. It names the axis it sits in.`,
	);
	const { store, threeD } = context;
	const id = useId();
	const titleRef = useRef<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(titleRef, ref);
	// Why the rendered text and no dependencies: the table header reads the text
	// the title shows, whatever `asChild` element renders it, and never a copy of
	// a control inside it. An equal text is a no-op in the store.
	useLayoutEffect(() => {
		if (axis === "x") {
			store.setXTitle(id, titleRef.current?.textContent?.trim() || null);
		}
	});
	useLayoutEffect(() => () => store.setXTitle(id, null), [store, id]);
	// Why a server snapshot of `true`: most charts compose both axes, so the
	// server reserves the tick band, and only a chart with no bottom axis moves.
	const horizontal = context.orientation === "horizontal";
	const bottomAxis = useSyncExternalStore(
		store.subscribe,
		() => {
			const snapshot = store.getSnapshot();
			return (horizontal ? snapshot.yAxes.left : snapshot.xAxis) != null;
		},
		() => true,
	);
	// A 3D plot labels its own frame from the data keys, so it shows no title.
	if (threeD) {
		return null;
	}
	const edge = edgeOf(axis, horizontal);
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, `${slotName}-axis-title`)}
			data-axis={axis === "x" ? "x" : "y"}
			className={cx(
				"text-muted truncate text-xs",
				// Why the parent selectors: a title turns its Root into a grid, so a
				// chart with no title matches none of these rules. The plot is the
				// Root's first child and fills its cell; every other in-flow part
				// spans the grid below it, and a docked part keeps the Root's box.
				"[*:has(>&)]:[--_chart-display:grid] [*:has(>&)]:grid-cols-[auto_minmax(0,1fr)_auto] [*:has(>&)]:grid-rows-[minmax(0,1fr)] [*:has(>&)>:first-child]:col-2 [*:has(>&)>:first-child]:row-1 [*:has(>&)>:first-child]:self-stretch [:where(*:has(>&))>:not(:where(.absolute))]:col-span-full",
				EDGE_CLASSES[edge],
				edge !== "bottom" && (bottomAxis ? "mb-[24px]" : "mb-[8px]"),
				className,
			)}
			ref={composedRef}
			{...props}
		>
			{children}
		</Component>
	);
};

export type {
	//,
	AxisTitlePrimitiveProps,
};

export {
	//,
	ChartAxisTitlePrimitive,
};
