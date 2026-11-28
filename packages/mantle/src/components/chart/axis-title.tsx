"use client";

import type { ComponentProps, ReactNode } from "react";
import { isValidElement, useContext, useLayoutEffect } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
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
 * The cell each edge takes in the Root's grid. Why the `mt-2 mb-6` on a side
 * title: they match the plot's 8px top padding and its 24px tick band, so the
 * title centers on the inner plot with no measurement and never moves.
 */
const EDGE_CLASSES = {
	bottom: "col-2 row-2 text-center",
	left: "col-1 row-1 mt-2 mb-6 rotate-180 text-center [writing-mode:vertical-rl]",
	right: "col-3 row-1 mt-2 mb-6 text-center [writing-mode:vertical-rl]",
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
	// Why the child's children: with `asChild`, the element is the wrapper, and
	// the table header takes only the text inside it.
	const title: ReactNode =
		asChild && isValidElement<{ children?: ReactNode }>(children)
			? children.props.children
			: children;
	useLayoutEffect(
		() => (axis === "x" && !threeD ? store.registerXTitle(title) : undefined),
		[store, axis, threeD, title],
	);
	// A 3D plot draws no axes, so it names none.
	if (threeD) {
		return null;
	}
	const edge = edgeOf(axis, context.orientation === "horizontal");
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, `${slotName}-axis-title`)}
			data-axis={axis === "x" ? "x" : "y"}
			className={cx(
				"text-muted truncate text-xs",
				// Why the parent selectors: a title turns its Root into a grid, so a
				// chart with no title ships none of these rules. The plot is the Root's
				// first child, and every other part spans the grid below it.
				"[*:has(>&)]:grid [*:has(>&)]:grid-cols-[auto_minmax(0,1fr)_auto] [*:has(>&)]:grid-rows-[minmax(0,1fr)] [*:has(>&)>:first-child]:col-2 [*:has(>&)>:first-child]:row-1 [:where(*:has(>&))>*]:col-span-full",
				EDGE_CLASSES[edge],
				className,
			)}
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
