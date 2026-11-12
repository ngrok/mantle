"use client";

import type { ComponentProps, CSSProperties, ReactNode, Ref } from "react";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { composeRefs, useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { formatNumber, formatXValue } from "./format.js";
import type { ChartStore } from "./store.js";
import type { TooltipConfig } from "./store.js";
import type { HoverSnapshot, XValue } from "./types.js";
import { useChartContext, useShallowStable } from "./context.js";

/**
 * The tooltip part and the tooltip surface the Root renders on the first hover.
 *
 * This module is internal shared implementation — not exported from the package.
 */

const useStoreSnapshot = (store: ChartStore) =>
	useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

type TooltipPrimitiveProps = Omit<ComponentProps<"div">, "children"> & {
	/** Format the x/label row of the readout. */
	labelFormat?: (value: XValue) => ReactNode;
	/** Format each series value. */
	valueFormat?: (value: number, dataKey: string) => ReactNode;
	/** The per-series color key: a short stroke (default) or nothing. */
	indicator?: "line" | "none";
	/** Extra content appended below the series rows (e.g. a "view logs" hint). */
	footer?: ReactNode | ((snapshot: HoverSnapshot) => ReactNode);
	/** Replace the entire readout. */
	children?: (snapshot: HoverSnapshot) => ReactNode;
};

/**
 * Register tooltip customization (renderless — Root owns the tooltip element
 * so the hover layer exists even when this part is absent).
 */
const useTooltipPrimitive = (partName: string, props: TooltipPrimitiveProps): null => {
	const context = useChartContext(partName);
	const { labelFormat, valueFormat, indicator = "line", footer, children, ...divProps } = props;
	// Why a stable rest object: every render rebuilds `divProps`. Without a
	// stable identity, every parent re-render re-registers the tooltip. Each
	// registration republishes to every DOM consumer and repaints the canvas
	// with nothing changed.
	const stableDivProps = useShallowStable(divProps);
	useLayoutEffect(
		() =>
			context.store.registerTooltip({
				labelFormat,
				valueFormat,
				indicator,
				footer,
				children,
				divProps: stableDivProps,
			}),
		[context.store, labelFormat, valueFormat, indicator, footer, children, stableDivProps],
	);
	return null;
};

/**
 * Render one tooltip value cell: a gap dash for a missing value, the consumer's
 * formatter when a Tooltip part composed one, otherwise the default number
 * format. Extracted so the cell reads without a nested ternary.
 */
const formatTooltipValue = (
	value: number | null | undefined,
	dataKey: string,
	valueFormat: ((value: number, dataKey: string) => ReactNode) | undefined,
): ReactNode => {
	if (value == null) {
		return "—";
	}
	if (valueFormat == null) {
		return formatNumber(value);
	}
	return valueFormat(value, dataKey);
};

/**
 * The tooltip element Root renders inside the plot wrapper. The engine
 * positions it (writing only `transform` and `opacity`); React renders its
 * content, re-rendering only when the hover snapshot index changes.
 */
const ChartTooltipSurface = ({
	slotName,
	store,
	tooltipRef,
	xHasTimeOfDay,
}: {
	slotName: string;
	store: ChartStore;
	tooltipRef: Ref<HTMLDivElement>;
	/** Whether the dataset's x dates carry a time-of-day component (label granularity). */
	xHasTimeOfDay: boolean;
}) => {
	const snapshot = useStoreSnapshot(store);
	const config = snapshot.tooltip;
	const hover = snapshot.hover;
	const { className, ref: consumerRef, style, ...divProps } = config?.divProps ?? {};
	const surfaceRef = useRef<HTMLDivElement | null>(null);
	const composedRef = useComposedRefs(tooltipRef, surfaceRef);
	// The consumer's ref arrives through the store AFTER this div first mounts
	// (the Tooltip part registers in a later layout effect), so composing it
	// into the element's ref prop would never re-fire: the composed callback's
	// identity is stable. Attach it imperatively, keyed on the ref itself.
	// Why `composeRefs`: it owns the `.current` write, so a callback ref's
	// cleanup and an object ref's `null` reset follow one contract. The React
	// Compiler also sees an opaque call instead of a mutation of snapshot data.
	useLayoutEffect(() => {
		if (consumerRef == null) {
			return;
		}
		const attach = composeRefs(consumerRef);
		const cleanup = attach(surfaceRef.current);
		return () => {
			if (typeof cleanup === "function") {
				cleanup();
			} else {
				attach(null);
			}
		};
	}, [consumerRef]);
	return (
		<div
			data-slot={`${slotName}-tooltip`}
			ref={composedRef}
			className={cx(
				"bg-popover border-popover text-strong pointer-events-none absolute left-0 top-0 z-10 min-w-32 rounded-md border px-2.5 py-1.5 text-xs shadow-md",
				className,
			)}
			style={{ opacity: 0, ...style } satisfies CSSProperties}
			{...divProps}
		>
			{hover != null && (
				<ChartTooltipReadout
					slotName={slotName}
					config={config}
					hover={hover}
					xHasTimeOfDay={xHasTimeOfDay}
				/>
			)}
		</div>
	);
};

/** The tooltip content for one hover: the consumer's `children` readout when set, else the default rows. */
const ChartTooltipReadout = ({
	slotName,
	config,
	hover,
	xHasTimeOfDay,
}: {
	slotName: string;
	config: TooltipConfig | null;
	hover: HoverSnapshot;
	xHasTimeOfDay: boolean;
}) => {
	if (config?.children != null) {
		return (
			// Why the label div: decisions/2026-08-04-translation-safe-label-wrappers.md
			<div data-slot={`${slotName}-tooltip-label`} className="contents">
				{config.children(hover)}
			</div>
		);
	}
	const footer = config?.footer;
	return (
		<>
			<div className="text-muted font-medium">
				{config?.labelFormat == null
					? formatXValue(hover.xValue, { datasetHasTimeOfDay: xHasTimeOfDay })
					: config.labelFormat(hover.xValue)}
			</div>
			<div className="mt-1 grid gap-1">
				{hover.points.map((point) => (
					<div key={point.dataKey} className="flex items-center gap-1.5">
						{config?.indicator !== "none" && (
							<span
								aria-hidden
								className="h-2.5 w-0.5 shrink-0 rounded-full"
								style={{ backgroundColor: point.color }}
							/>
						)}
						<span className="text-muted">{point.label}</span>
						<span className="text-strong ml-auto pl-3 font-medium tabular-nums">
							{formatTooltipValue(point.value, point.dataKey, config?.valueFormat)}
						</span>
					</div>
				))}
			</div>
			{hover.zValue !== undefined && (
				<div className="mt-1 flex items-center gap-1.5">
					<span className="text-muted">z</span>
					<span className="text-strong ml-auto pl-3 font-medium tabular-nums">
						{hover.zValue == null ? "—" : formatNumber(hover.zValue)}
					</span>
				</div>
			)}
			{footer != null && (
				<div className="text-muted mt-1">
					{typeof footer === "function" ? footer(hover) : footer}
				</div>
			)}
		</>
	);
};

export type {
	//,
	TooltipPrimitiveProps,
};

export {
	//,
	ChartTooltipSurface,
	useTooltipPrimitive,
};
