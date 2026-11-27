"use client";

import type { ComponentProps, CSSProperties, ReactNode, Ref } from "react";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { formatNumber, formatXValue } from "./format.js";
import type { ChartStore } from "./store.js";
import type { TooltipConfig } from "./store.js";
import type { HoverSnapshot, XValue } from "./types.js";
import type { ChartReadout } from "./context.js";
import { useChartContext, useShallowStable } from "./context.js";

/**
 * The tooltip part and the tooltip surface the Root renders on the first hover.
 *
 * This module is internal shared implementation. The package does not export it.
 */

/**
 * Subscribe to the hover and the tooltip config only. A data update
 * publishes a new snapshot, and a chart nobody points at keeps the same
 * `null` hover, so its surface skips the re-render.
 */
const useTooltipState = (store: ChartStore) => {
	const hover = useSyncExternalStore(
		store.subscribe,
		() => store.getSnapshot().hover,
		() => store.getSnapshot().hover,
	);
	const config = useSyncExternalStore(
		store.subscribe,
		() => store.getSnapshot().tooltip,
		() => store.getSnapshot().tooltip,
	);
	return { hover, config };
};

type TooltipPrimitiveProps = Omit<ComponentProps<"div">, "children"> & {
	/** Format the x/label row of the readout. */
	labelFormat?: (value: XValue) => ReactNode;
	/** Format each series value. The Total row of a stacked chart passes the `dataKey` `"total"`. */
	valueFormat?: (value: number, dataKey: string) => ReactNode;
	/** The per-series color key: a short stroke (default) or nothing. */
	indicator?: "line" | "none";
	/** Extra content appended below the series rows (e.g. a "view logs" hint). */
	footer?: ReactNode | ((snapshot: HoverSnapshot) => ReactNode);
	/** Replace the entire readout. */
	children?: (snapshot: HoverSnapshot) => ReactNode;
	/**
	 * The most series rows the default readout shows, largest value first. The
	 * rest fold into a "+N more" row. The readout also shows only the rows that
	 * fit the plot, so the cap can be lower. It does not apply to a `children`
	 * readout.
	 * @default 8
	 */
	maxRows?: number;
};

/**
 * Register tooltip customization (renderless: Root owns the tooltip element
 * so the hover layer exists even when this part is absent).
 */
const useTooltipPrimitive = (partName: string, props: TooltipPrimitiveProps): null => {
	const context = useChartContext(partName);
	const {
		labelFormat,
		valueFormat,
		indicator = "line",
		footer,
		children,
		maxRows = 8,
		...divProps
	} = props;
	// Why a stable rest object: every render rebuilds `divProps`. Without a
	// stable identity, every parent re-render re-registers the tooltip, and each
	// registration republishes to every DOM consumer.
	const stableDivProps = useShallowStable(divProps);
	useLayoutEffect(
		() =>
			context.store.registerTooltip({
				labelFormat,
				valueFormat,
				indicator,
				footer,
				children,
				maxRows,
				divProps: stableDivProps,
			}),
		[context.store, labelFormat, valueFormat, indicator, footer, children, maxRows, stableDivProps],
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
	readout,
}: {
	slotName: string;
	store: ChartStore;
	tooltipRef: Ref<HTMLDivElement>;
	/** The family's own readout, which renders the default tooltip body. */
	readout?: ChartReadout;
	/** Whether the dataset's x dates carry a time-of-day component (label granularity). */
	xHasTimeOfDay: boolean;
}) => {
	const { hover, config } = useTooltipState(store);
	const space = useSyncExternalStore(
		store.subscribe,
		() => store.readoutSpace,
		() => 0,
	);
	// Why a measured cap: a readout taller than the plot spills past it, and a
	// card that clips cuts its last rows off. The rows that fit depend on the
	// space and the row count, not on the hovered index, so one measure of the
	// full readout serves every hover until either changes.
	const rowCount = hover == null || hover.emptySlotLabel != null ? 0 : hover.points.length;
	const fitKey = `${space}:${rowCount}`;
	const [fit, setFit] = useState<{ key: string; rows: number } | null>(null);
	const fitRows = fit?.key === fitKey ? fit.rows : Number.POSITIVE_INFINITY;
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
	const rowsRef = useRef<HTMLDivElement | null>(null);
	useLayoutEffect(() => {
		const surface = surfaceRef.current;
		const rows = rowsRef.current;
		if (surface == null || rows == null || rowCount === 0 || space === 0 || fit?.key === fitKey) {
			return;
		}
		const overflow = surface.offsetHeight - space;
		const last = rows.lastElementChild;
		const previous = last?.previousElementSibling;
		if (overflow <= 0 || !(last instanceof HTMLElement) || !(previous instanceof HTMLElement)) {
			setFit({ key: fitKey, rows: Number.POSITIVE_INFINITY });
			return;
		}
		// The measure runs on the uncapped rows, which `maxRows` alone limits.
		const shown = Math.min(rowCount, config?.maxRows ?? 8);
		const step = last.offsetTop - previous.offsetTop;
		// Why the extra row without a count yet: the "+N more" row takes a row's height.
		const extra = shown < rowCount ? 0 : 1;
		const drop = step > 0 ? Math.ceil(overflow / step) + extra : shown;
		setFit({ key: fitKey, rows: Math.max(0, shown - drop) });
	}, [config?.maxRows, fit, fitKey, rowCount, space]);
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
					fitRows={fitRows}
					rowsRef={rowsRef}
					xHasTimeOfDay={xHasTimeOfDay}
					readout={readout}
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
	fitRows,
	rowsRef,
	xHasTimeOfDay,
	readout,
}: {
	slotName: string;
	config: TooltipConfig | null;
	hover: HoverSnapshot;
	/** The series rows that fit the plot, `Infinity` before a measure. */
	fitRows: number;
	/** The rows' container, which the surface measures to fit the plot. */
	rowsRef: Ref<HTMLDivElement>;
	xHasTimeOfDay: boolean;
	readout?: ChartReadout;
}) => {
	if (config?.children != null) {
		return (
			// Why the label div: decisions/2026-08-04-translation-safe-label-wrappers.md
			<div data-slot={`${slotName}-tooltip-label`} className="contents">
				{config.children(hover)}
			</div>
		);
	}
	if (readout != null) {
		return <readout.Tooltip hover={hover} config={config} />;
	}
	const footer = config?.footer;
	// Why largest first: a capped readout keeps the leaders, and the order does
	// not change when the cap does. A missing value sorts last. `toSorted` is
	// stable, so ties keep the drawn order.
	const points = hover.points.toSorted(
		(a, b) => (b.value ?? Number.NEGATIVE_INFINITY) - (a.value ?? Number.NEGATIVE_INFINITY),
	);
	const shown = Math.min(points.length, config?.maxRows ?? 8, fitRows);
	return (
		<>
			<div className="text-muted font-medium">
				{config?.labelFormat == null
					? formatXValue(hover.xValue, { datasetHasTimeOfDay: xHasTimeOfDay })
					: config.labelFormat(hover.xValue)}
			</div>
			<div ref={rowsRef} className="mt-1 grid gap-1">
				{hover.emptySlotLabel != null && (
					<span className="text-strong">{hover.emptySlotLabel}</span>
				)}
				{hover.total !== undefined && (
					<div className="flex items-center gap-1.5">
						{/* Why a hidden indicator: it keeps the label in line with the series labels. */}
						{config?.indicator !== "none" && (
							<span aria-hidden className="invisible h-2.5 w-0.5 shrink-0" />
						)}
						<span className="text-muted">Total</span>
						<span className="text-strong ml-auto pl-3 font-medium tabular-nums">
							{config?.valueFormat == null
								? formatNumber(hover.total)
								: config.valueFormat(hover.total, "total")}
						</span>
					</div>
				)}
				{/* Why no rows for an empty slot: a column of em dashes repeats what its label says. */}
				{hover.emptySlotLabel == null &&
					points.slice(0, shown).map((point) => (
						<div key={point.dataKey} className="flex items-center gap-1.5">
							{config?.indicator !== "none" && (
								<span
									aria-hidden
									// Why `forced-color-adjust-none`: the indicator is a color key, and
									// forced colors mode replaces its background with the page background.
									className="forced-color-adjust-none h-2.5 w-0.5 shrink-0 rounded-full"
									style={{ backgroundColor: point.color }}
								/>
							)}
							<span className="text-muted">{point.label}</span>
							<span className="text-strong ml-auto pl-3 font-medium tabular-nums">
								{formatTooltipValue(point.value, point.dataKey, config?.valueFormat)}
							</span>
						</div>
					))}
				{hover.emptySlotLabel == null && shown < points.length && (
					<div className="text-muted">+{points.length - shown} more</div>
				)}
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
