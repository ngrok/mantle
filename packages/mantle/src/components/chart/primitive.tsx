"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import type { ComponentProps, CSSProperties, ReactNode, Ref } from "react";
import {
	createContext,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import invariant from "tiny-invariant";
import { useCopyToClipboard } from "../../hooks/use-copy-to-clipboard.js";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { IconButton } from "../button/icon-button.js";
import { datumValue } from "./datum.js";
import { ChartEngine, POINT_SHAPE_CLIP_PATHS } from "./engine.js";
import { formatNumber, formatXValue, hasTimeOfDay } from "./format.js";
import { serializeChartMarkdown } from "./serialize.js";
import { ChartStore } from "./store.js";
import { textureInkColor } from "./texture.js";
import type {
	BarOrientation,
	BarTexture,
	ChartDatum,
	ChartDatumEvent,
	ContinuousXScale,
	CurveKind,
	GridLines,
	HoverSnapshot,
	PointShape,
	SeriesColor,
	SeriesMark,
	SeriesMeta,
	XScaleKind,
	XValue,
	YDomain,
} from "./types.js";

/**
 * The shared React layer of the chart family. `BarChart`, `LineChart`,
 * `AreaChart`, and `ScatterPlot` are thin public wrappers over these
 * primitives, mirroring how `dialog/primitive` backs the dialog family and
 * `list/primitive` backs the list family.
 *
 * Interaction is the Root's UNCONDITIONAL contract: the crosshair/hover band,
 * tooltip, keyboard stepping (arrows / PageUp / PageDown / Home / End /
 * Escape, Enter/Space to activate), aria-live announcements, and the sr-only
 * data table all ship with Root itself. The composed Tooltip part customizes
 * the readout; omitting it never removes the hover layer, and no part removal
 * can strip keyboard access to the data.
 *
 * This module is internal shared implementation — it is not exported from the
 * package.
 */

/**
 * Every interactive chart must have an accessible name: either a direct
 * `aria-label` or an `aria-labelledby` reference to a visible title (preferred
 * when the chart sits under a heading — no drift-prone duplicated text).
 * Enforced at the type level; the name lands on the interaction overlay (the
 * chart's single named element — the canvas itself is aria-hidden so AT never
 * announces the chart twice). Decorative charts are exempt — see
 * {@link ChartAccessibilityProps}.
 */
type ChartAccessibleName =
	| { "aria-label": string; "aria-labelledby"?: never }
	| { "aria-labelledby": string; "aria-label"?: never };

/**
 * The interaction props an interactive chart may wire — the controlled
 * `activeIndex` and the two notification callbacks. Modeled apart from the base
 * props so a decorative chart can forbid them: a decorative chart has no hover
 * UI and never activates a datum, so these would be dead code.
 */
type ChartInteractionProps = {
	/**
	 * Controlled active datum index — an index into `data` (`null` = none).
	 * Omit for uncontrolled hover.
	 */
	activeIndex?: number | null;
	/** Notified when hover/keyboard moves the active index (an index into `data`). */
	onActiveIndexChange?: (index: number | null) => void;
	/** Notified on datum activation: mark click, or Enter/Space on the focused chart. */
	onDatumActivate?: (event: ChartDatumEvent) => void;
};

/**
 * The accessibility + interactivity contract every chart Root takes, modeled
 * as a discriminated union over `decorative` so invalid combinations are
 * unrepresentable:
 *
 * - **Interactive** (the default — `decorative` omitted or `false`): the chart
 *   carries real data. It requires an accessible name (`aria-label` xor
 *   `aria-labelledby`) and may wire the interaction callbacks. This is the
 *   full contract charts have always had.
 * - **Decorative** (`decorative: true`): the chart is a placeholder or
 *   atmospheric graphic whose values are not real data — synthetic bars behind
 *   an empty state, a hero backdrop. It still renders and animates, but it is
 *   hidden from assistive technology (no accessible name, no sr-only data
 *   table, no live region), removed from the tab order, and inert to pointer
 *   and keyboard, so the accessible-name and interaction props are forbidden.
 *
 * `decorative` communicates intent — "these values are not information" —
 * where a `disabled` flag would be ambiguous (a chart is not a form control).
 */
type ChartAccessibilityProps =
	| ({ decorative?: false } & ChartAccessibleName & ChartInteractionProps)
	| {
			/**
			 * Render the chart as a decorative placeholder: it keeps its visual
			 * rendering and animation but is hidden from assistive technology,
			 * removed from the tab order, and inert to pointer and keyboard — no
			 * hover band, tooltip, data table, or live region. Use it for
			 * empty-state backdrops and atmospheric graphics whose values are not
			 * real data; it forbids the accessible-name and interaction props,
			 * which have no meaning without real data.
			 *
			 * @default false
			 */
			decorative: true;
			"aria-label"?: never;
			"aria-labelledby"?: never;
			activeIndex?: never;
			onActiveIndexChange?: never;
			onDatumActivate?: never;
	  };

type ChartContextValue = {
	kind: SeriesMark;
	/** The public namespace name, e.g. `"BarChart"` — used in error messages. */
	componentName: string;
	store: ChartStore;
	engineRef: { current: ChartEngine | null };
	/**
	 * The Root's current data props, read at interaction time (never at render
	 * time) by parts like `CopyButton` — a ref so the context value, created
	 * once per Root lifetime, stays stable across data updates.
	 */
	dataRef: {
		current: { data: readonly ChartDatum[]; xKey: string; zKey: string | undefined };
	};
};

const ChartContext = createContext<ChartContextValue | null>(null);

/**
 * Read the chart context, throwing a descriptive invariant when a part is
 * rendered outside its Root (a renderless part would otherwise no-op with
 * zero signal).
 */
const useChartContext = (partName: string): ChartContextValue => {
	const context = useContext(ChartContext);
	invariant(
		context,
		`${partName} must be composed inside ${partName.split(".")[0]}.Root — it registers into the chart it belongs to and renders nothing on its own.`,
	);
	return context;
};

const useStoreSnapshot = (store: ChartStore) =>
	useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

/**
 * Rows the sr-only data-table twin renders before summarizing. Screen-reader
 * users navigate the keyboard point cursor for dense data; the table is the
 * bounded structural alternative (an unbounded table at 100k rows would be a
 * million-node DOM bomb and unusable to AT anyway).
 */
const CHART_TABLE_ROW_LIMIT = 150;

// ---- Root -------------------------------------------------------------------

/**
 * Root props shared by every chart kind, WITHOUT the accessibility/interaction
 * union or the data/x props. Public wrappers `Omit` from this base and
 * re-intersect `ChartAccessibilityProps` — `Omit` over a union type flattens
 * it, which would silently make the required accessible name optional and
 * erase the `decorative` discriminant.
 */
type ChartRootBaseProps = Omit<ComponentProps<"div">, "aria-label" | "aria-labelledby"> &
	WithDataSlot & {
		/** Override the automatic y domain. */
		yDomain?: YDomain;
		/** Stack the composed series (bar/area charts). */
		stacked?: boolean;
		/** Animate enter/update transitions. `prefers-reduced-motion` always wins. */
		animate?: boolean;
		/**
		 * Hold the previous render at reduced opacity while fresh data loads —
		 * never swap a chart that has rendered once for a skeleton.
		 */
		pending?: boolean;
	};

type ChartRootPrimitiveProps = ChartRootBaseProps &
	ChartAccessibilityProps & {
		/** Rows of data; series parts read one numeric key per row. */
		data: readonly ChartDatum[];
		/** The key of each row's x value. */
		xKey: string;
		/**
		 * Override the auto-detected x scale (`Date` values → `"time"`, numbers →
		 * `"linear"`, strings → `"point"`). Bar charts are always `"band"`.
		 */
		xScale?: ContinuousXScale;
		/**
		 * Scatter plots only: the row key of each point's depth value. Providing
		 * it switches the scatter into the 3D projection (drag to rotate).
		 */
		zKey?: string;
		/**
		 * 3D scatter only: how many axes the cloud currently occupies. Changing
		 * it morphs points onto the x axis line (1), the xy plane (2), or the
		 * full cube (3).
		 */
		dimensions?: 1 | 2 | 3;
		/**
		 * Bar charts only: the direction the bars point (not an axis). `"vertical"`
		 * (default) bars stand up from a bottom baseline with categories along x;
		 * `"horizontal"` bars run rightward from a left baseline with categories
		 * down y. Ignored by other kinds.
		 */
		orientation?: BarOrientation;
	};

type InternalRootProps = ChartRootPrimitiveProps & {
	kind: SeriesMark;
	componentName: string;
	slotName: string;
};

/**
 * Detect the x scale kind from the first row whose x value is present — a
 * leading null/missing x (a gap row the engine drops anyway) must not
 * misclassify a numeric or time series as categorical.
 */
const detectXScale = (data: readonly ChartDatum[], xKey: string): ContinuousXScale => {
	for (const row of data) {
		const value = datumValue(row, xKey);
		if (value == null) {
			continue;
		}
		if (value instanceof Date) {
			return "time";
		}
		if (typeof value === "number") {
			return "linear";
		}
		return "point";
	}
	return "point";
};

const AUTO_Y_DOMAIN: YDomain = ["auto", "auto"];

/**
 * The chart Root implementation: renders the canvas, the interaction overlay,
 * the hover overlay elements, the tooltip container, the aria-live region,
 * and the sr-only data table; owns the engine lifecycle.
 *
 * When `decorative`, it keeps the canvas and hover overlay elements (the engine
 * still paints) but omits the interaction overlay, the aria-live region, and
 * the sr-only data table, and marks the root `aria-hidden` — a placeholder
 * backdrop with no interaction and nothing for assistive technology.
 *
 * No `asChild`: Root owns a fixed internal structure (canvas + observers +
 * overlay) whose lifecycles are bound to this exact element tree, so
 * element-swapping polymorphism does not apply.
 */
const ChartRootPrimitive = ({
	kind,
	componentName,
	slotName,
	data,
	xKey,
	xScale,
	zKey,
	dimensions = 3,
	yDomain = AUTO_Y_DOMAIN,
	stacked = false,
	orientation = "vertical",
	animate = true,
	pending = false,
	decorative = false,
	activeIndex,
	onActiveIndexChange,
	onDatumActivate,
	className,
	children,
	ref,
	"data-slot": dataSlot,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	// Pulled out of `props` so the decorative contract can't be clobbered by a
	// consumer value spread after it. A decorative chart is unconditionally
	// hidden from AT and never a tab stop; an interactive one honors what's
	// passed (its own keyboard focus lives on the interaction overlay, not here).
	"aria-hidden": ariaHidden,
	tabIndex,
	...props
}: InternalRootProps) => {
	// One store per Root lifetime: sticky color slots and part registrations
	// survive re-renders (and StrictMode's double effect pass).
	const [store] = useState(() => new ChartStore());
	const engineRef = useRef<ChartEngine | null>(null);
	const [context] = useState<ChartContextValue>(() => ({
		kind,
		componentName,
		store,
		engineRef,
		dataRef: { current: { data, xKey, zKey } },
	}));

	useLayoutEffect(() => {
		context.dataRef.current = { data, xKey, zKey };
	}, [context, data, xKey, zKey]);

	const rootRef = useRef<HTMLDivElement | null>(null);
	const composedRootRef = useComposedRefs(rootRef, ref);
	const plotRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const crosshairRef = useRef<HTMLDivElement | null>(null);
	const bandRef = useRef<HTMLDivElement | null>(null);
	const markersRef = useRef<HTMLDivElement | null>(null);
	const tooltipRef = useRef<HTMLDivElement | null>(null);

	const instructionsId = useId();
	const resolvedXScale: XScaleKind = kind === "bar" ? "band" : (xScale ?? detectXScale(data, xKey));
	// Scatter axes are continuous by contract — a string x would silently render
	// evenly-spaced categorical positions misaligned against the value axis.
	invariant(
		kind !== "scatter" || data.length === 0 || resolvedXScale !== "point",
		`${componentName}.Root requires numeric or Date x values — the "${xKey}" values are not numbers or dates, so they have no position on a continuous scatter axis.`,
	);
	const [yDomainMin, yDomainMax] = yDomain;

	// Date label granularity is a property of the dataset, not the sample: the
	// midnight point inside an hourly series must keep its time of day, while
	// all-midnight daily data reads as dates. Computed here (not per formatted
	// value) and shared by the tooltip, the announcer, and the data table.
	const xHasTimeOfDay = useMemo(() => {
		for (const row of data) {
			const value = datumValue(row, xKey);
			if (value instanceof Date && hasTimeOfDay(value)) {
				return true;
			}
		}
		return false;
	}, [data, xKey]);

	// Engine lifecycle. Child part registrations land in the store first
	// (child layout effects run before the parent's), so the engine's first
	// ingest sees the composed series.
	useLayoutEffect(() => {
		const root = rootRef.current;
		const plot = plotRef.current;
		const canvas = canvasRef.current;
		const crosshair = crosshairRef.current;
		const band = bandRef.current;
		const markers = markersRef.current;
		const tooltip = tooltipRef.current;
		if (
			root == null ||
			plot == null ||
			canvas == null ||
			crosshair == null ||
			band == null ||
			markers == null ||
			tooltip == null
		) {
			return;
		}
		const engine = new ChartEngine({
			kind,
			store,
			elements: { root, plot, canvas, crosshair, band, markers, tooltip },
		});
		engineRef.current = engine;
		return () => {
			engineRef.current = null;
			engine.destroy();
		};
	}, [kind, store]);

	useLayoutEffect(() => {
		engineRef.current?.setOptions({
			xKey,
			xScale: resolvedXScale,
			yDomain: [yDomainMin, yDomainMax],
			zKey: zKey ?? null,
			dimensions,
			stacked,
			orientation,
			animate,
		});
		// Publish the orientation to DOM consumers too: the legend mirrors bar
		// textures whose direction-dependent stripes must match the bars.
		store.setOrientation(orientation);
	}, [
		store,
		xKey,
		resolvedXScale,
		yDomainMin,
		yDomainMax,
		zKey,
		dimensions,
		stacked,
		orientation,
		animate,
	]);

	useLayoutEffect(() => {
		engineRef.current?.setRows(data);
	}, [data]);

	useLayoutEffect(() => {
		// A decorative chart never activates a datum or moves an active index, so
		// it never wires the consumer's callbacks — the type union already forbids
		// them, and clearing here keeps a stray runtime value from ever firing.
		engineRef.current?.setCallbacks(
			decorative
				? { onDatumActivate: null, onActiveIndexChange: null }
				: {
						onDatumActivate: onDatumActivate ?? null,
						onActiveIndexChange: onActiveIndexChange ?? null,
					},
		);
	});

	useLayoutEffect(() => {
		// Force uncontrolled when decorative: a controlled index would otherwise
		// drive the tooltip/marker overlay visible on a chart that must not react.
		engineRef.current?.setControlledActiveIndex(decorative ? undefined : activeIndex);
	}, [decorative, activeIndex]);

	// Must stay the LAST effect: rows, options, and series registrations from
	// one commit land in the engine as a single consistent ingest. Ingesting
	// inline (mid-commit) would validate one render's series specs against the
	// previous render's rows — swapping `data` and a series `dataKey` together
	// would fail fast on a key the settled commit does contain.
	useLayoutEffect(() => {
		engineRef.current?.flushIngest();
	});

	return (
		<div
			data-slot={joinDataSlot(dataSlot, slotName)}
			// relative: DOM parts composed as children (e.g. CopyButton) can dock
			// against the whole chart with absolute positioning.
			className={cx("relative flex aspect-video w-full flex-col", className)}
			// A decorative chart is a placeholder backdrop, not information: hide the
			// whole visualization from assistive technology and keep it out of the tab
			// order, always winning over any consumer value. Interactive charts name
			// the overlay instead (the canvas is always aria-hidden) and honor a
			// consumer-passed aria-hidden/tabIndex.
			aria-hidden={decorative ? true : ariaHidden}
			tabIndex={decorative ? undefined : tabIndex}
			ref={composedRootRef}
			{...props}
		>
			<ChartContext.Provider value={context}>
				<div
					data-slot={`${slotName}-plot`}
					className={cx(
						"relative min-h-0 w-full flex-1",
						pending && "opacity-60 transition-opacity duration-300",
					)}
					ref={plotRef}
				>
					{/* aria-hidden: the overlay is the chart's single named element for
					    AT — a role="img" sibling with the same name would announce the
					    chart twice. The sr-only table carries the structured data. */}
					<canvas
						data-slot={`${slotName}-canvas`}
						ref={canvasRef}
						aria-hidden
						className="absolute inset-0 size-full"
					/>
					{/* The interaction overlay is the chart's only focusable element and
					    the surface every pointer/keyboard handler lives on. A decorative
					    chart omits it entirely — no tab stop, no hover band, no
					    crosshair, no activation — so it stays inert without any consumer
					    CSS or `inert` workaround. */}
					{decorative ? null : (
						<>
							<div
								role="application"
								aria-label={ariaLabel}
								aria-labelledby={ariaLabelledBy}
								aria-describedby={instructionsId}
								// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- role="application" is the keyboard point-cursor widget; focus is how arrow-key stepping works
								tabIndex={0}
								className={cx(
									"focus-visible:ring-focus-accent absolute inset-0 rounded-sm outline-none focus-visible:ring-2",
									(kind === "line" || kind === "area") && "cursor-crosshair",
									// touch-none only in 3D: without it the browser claims the pan
									// gesture and cancels the rotation drag on touch devices. 2D
									// charts must NOT block page scrolling.
									kind === "scatter" &&
										zKey != null &&
										"touch-none cursor-grab active:cursor-grabbing",
								)}
								onPointerDown={(event) => {
									// Capture only for the 3D rotation drag (it must keep tracking
									// outside the plot); on 2D charts, capture would also make
									// drag-away-to-cancel activation impossible. Synthetic events
									// (tests) have no active pointer to capture — capturing one
									// throws before the engine ever sees the press.
									if (event.isTrusted && kind === "scatter" && zKey != null) {
										event.currentTarget.setPointerCapture(event.pointerId);
									}
									engineRef.current?.handlePointerDown(
										event.nativeEvent.offsetX,
										event.nativeEvent.offsetY,
									);
								}}
								onPointerMove={(event) => {
									engineRef.current?.handlePointerMove(
										event.nativeEvent.offsetX,
										event.nativeEvent.offsetY,
									);
								}}
								onPointerUp={(event) => {
									engineRef.current?.handlePointerUp(
										event.nativeEvent.offsetX,
										event.nativeEvent.offsetY,
									);
								}}
								onPointerLeave={() => {
									engineRef.current?.handlePointerLeave();
								}}
								onPointerCancel={() => {
									// The browser reclaimed the pointer (e.g. a touch pan won) —
									// reset drag/hover state deterministically.
									engineRef.current?.handlePointerLeave();
								}}
								onBlur={() => {
									engineRef.current?.handlePointerLeave();
								}}
								onKeyDown={(event) => {
									if (engineRef.current?.handleKeyDown(event.key)) {
										event.preventDefault();
									}
								}}
							/>
							<span id={instructionsId} className="sr-only">
								Use the left and right arrow keys to move between data points, Home and End to jump
								to the first and last, and Enter to activate the current point.
							</span>
						</>
					)}
					<div
						ref={crosshairRef}
						aria-hidden
						className="bg-neutral-500 pointer-events-none absolute left-0 top-0 w-px opacity-0"
					/>
					<div
						ref={bandRef}
						aria-hidden
						className="bg-neutral-500/10 pointer-events-none absolute left-0 top-0 rounded-sm opacity-0"
					/>
					<div
						ref={markersRef}
						aria-hidden
						className="pointer-events-none absolute inset-0 opacity-0"
					/>
					<ChartTooltipSurface
						slotName={slotName}
						store={store}
						tooltipRef={tooltipRef}
						xHasTimeOfDay={xHasTimeOfDay}
					/>
				</div>
				{children}
				{/* No live region and no data-table twin for a decorative chart: its
				    values are not meaningful data, so there is nothing to announce or
				    tabulate for assistive technology. */}
				{decorative ? null : (
					<>
						<ChartAnnouncer store={store} xHasTimeOfDay={xHasTimeOfDay} />
						<ChartDataTable
							data={data}
							label={ariaLabel}
							slotName={slotName}
							store={store}
							xHasTimeOfDay={xHasTimeOfDay}
							xKey={xKey}
							zKey={zKey}
						/>
					</>
				)}
			</ChartContext.Provider>
		</div>
	);
};

// ---- registration parts -----------------------------------------------------

type SeriesPrimitiveProps = {
	dataKey: string;
	label?: string;
	color?: SeriesColor;
	curve?: CurveKind;
	markers?: boolean;
	connectNulls?: boolean;
	shape?: PointShape;
	/** The fill texture (bar marks only) — worn by the bars and their legend key. */
	texture?: BarTexture;
};

/**
 * Register a series (renderless). The public series parts — `BarChart.Bar`,
 * `LineChart.Line`, `AreaChart.Area` — wrap this with their mark fixed.
 */
const useSeriesPrimitive = (
	partName: string,
	mark: SeriesMark,
	props: SeriesPrimitiveProps,
): null => {
	const context = useChartContext(partName);
	invariant(
		context.kind === mark,
		`${partName} cannot be composed inside ${context.componentName}.Root — compose ${context.componentName} series parts instead.`,
	);
	const {
		dataKey,
		label,
		color,
		curve = "linear",
		markers = false,
		connectNulls = false,
		shape = "circle",
		texture = "solid",
	} = props;
	useLayoutEffect(
		() =>
			context.store.registerSeries({
				dataKey,
				label: label ?? dataKey,
				color,
				mark,
				curve,
				markers,
				connectNulls,
				shape,
				texture,
			}),
		[context.store, dataKey, label, color, mark, curve, markers, connectNulls, shape, texture],
	);
	return null;
};

type GridPrimitiveProps = {
	/** Which gridlines to draw. */
	lines?: GridLines;
};

const useGridPrimitive = (partName: string, props: GridPrimitiveProps): null => {
	const context = useChartContext(partName);
	// Pass `undefined` through when the author left the direction unset, so the
	// engine defaults it perpendicular to the bars (value gridlines). A hard
	// "horizontal" default draws category-parallel lines on horizontal bars.
	const { lines } = props;
	useLayoutEffect(() => context.store.registerGrid(lines), [context.store, lines]);
	return null;
};

type XAxisPrimitiveProps = {
	/**
	 * Format a tick label. Receives the chart's x values: the category value on
	 * band/point scales, a `Date` on time scales, and a number on linear scales.
	 */
	tickFormat?: (value: XValue) => string;
	/**
	 * Target tick count (continuous scales only; a density-derived default
	 * otherwise). Approximate: ticks land on human-friendly steps, and a linear
	 * axis whose x values are all integers never renders fractional ticks —
	 * the integer step wins over the requested count.
	 */
	tickCount?: number;
};

const useXAxisPrimitive = (partName: string, props: XAxisPrimitiveProps): null => {
	const context = useChartContext(partName);
	const { tickFormat, tickCount } = props;
	useLayoutEffect(
		() => context.store.registerXAxis({ tickFormat, tickCount }),
		[context.store, tickFormat, tickCount],
	);
	return null;
};

type YAxisPrimitiveProps = {
	/** Format a tick label. Defaults to thousands-separated numbers. */
	tickFormat?: (value: number) => string;
	/**
	 * Target tick count. Approximate: ticks land on human-friendly steps, and
	 * when every series value is an integer (counts) the axis never renders
	 * fractional ticks — the integer step wins over the requested count.
	 */
	tickCount?: number;
};

const useYAxisPrimitive = (partName: string, props: YAxisPrimitiveProps): null => {
	const context = useChartContext(partName);
	const { tickFormat, tickCount } = props;
	useLayoutEffect(
		() => context.store.registerYAxis({ tickFormat, tickCount }),
		[context.store, tickFormat, tickCount],
	);
	return null;
};

type ReferenceLinePrimitiveProps = {
	/** The y value the line marks (an SLO threshold, a budget, a limit). */
	y: number;
	/** A short label painted above the line's right end. */
	label?: string;
	/** Line color; defaults to the neutral reference color. */
	color?: SeriesColor;
};

const useReferenceLinePrimitive = (partName: string, props: ReferenceLinePrimitiveProps): null => {
	const context = useChartContext(partName);
	const id = useId();
	const { y, label, color } = props;
	useLayoutEffect(
		() => context.store.registerReferenceLine(id, { y, label, color }),
		[context.store, id, y, label, color],
	);
	return null;
};

// ---- tooltip ----------------------------------------------------------------

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
 * so the hover layer exists whether or not this part is composed).
 */
const useTooltipPrimitive = (partName: string, props: TooltipPrimitiveProps): null => {
	const context = useChartContext(partName);
	const { labelFormat, valueFormat, indicator = "line", footer, children, ...divProps } = props;
	useLayoutEffect(() =>
		context.store.registerTooltip({
			labelFormat,
			valueFormat,
			indicator,
			footer,
			children,
			divProps,
		}),
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
	// into the element's ref prop would never re-fire — the composed callback's
	// identity is stable. Attach it imperatively, keyed on the ref itself.
	useLayoutEffect(() => {
		if (consumerRef == null) {
			return;
		}
		const node = surfaceRef.current;
		if (typeof consumerRef === "function") {
			const cleanup = consumerRef(node);
			return () => {
				if (typeof cleanup === "function") {
					cleanup();
				} else {
					consumerRef(null);
				}
			};
		}
		consumerRef.current = node;
		return () => {
			consumerRef.current = null;
		};
	}, [consumerRef]);
	const footer = config?.footer;
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
			{hover == null ? null : config?.children != null ? (
				config.children(hover)
			) : (
				<>
					<div className="text-muted font-medium">
						{config?.labelFormat == null
							? formatXValue(hover.xValue, { datasetHasTimeOfDay: xHasTimeOfDay })
							: config.labelFormat(hover.xValue)}
					</div>
					<div className="mt-1 grid gap-1">
						{hover.points.map((point) => (
							<div key={point.dataKey} className="flex items-center gap-1.5">
								{config?.indicator === "none" ? null : (
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
					{hover.zValue === undefined ? null : (
						<div className="mt-1 flex items-center gap-1.5">
							<span className="text-muted">z</span>
							<span className="text-strong ml-auto pl-3 font-medium tabular-nums">
								{hover.zValue == null ? "—" : formatNumber(hover.zValue)}
							</span>
						</div>
					)}
					{footer == null ? null : (
						<div className="text-muted mt-1">
							{typeof footer === "function" ? footer(hover) : footer}
						</div>
					)}
				</>
			)}
		</div>
	);
};

// ---- legend -----------------------------------------------------------------

type LegendPrimitiveProps = Omit<ComponentProps<"div">, "children"> & {
	/** Replace the default legend items; receives the registered series. */
	children?: (series: SeriesMeta[]) => ReactNode;
};

/**
 * One stripe family of the CSS texture a textured bar legend key wears. The
 * stripes are denser than the canvas tile (a key is read at 8px, not bar
 * scale) but carry the same tone-on-tone ink, so key and bars match. CSS
 * gradient angles are perpendicular to their stripes: `135deg` renders the
 * 45° `/` family, `45deg` its `\` mirror, `0deg` horizontal rungs, `90deg`
 * vertical rungs.
 */
const legendHatchGradient = (
	angle: "0deg" | "45deg" | "90deg" | "135deg",
	ink: string,
	period = 3,
): string =>
	`repeating-linear-gradient(${angle}, ${ink} 0, ${ink} 1px, transparent 1px, transparent ${period}px)`;

/**
 * Legend keys are pure color/texture chips, so they keep their author colors
 * where backgrounds are normally stripped: forced-colors mode (the sanctioned
 * `forced-color-adjust: none` use) and printing (where default settings drop
 * CSS backgrounds entirely) — otherwise the series↔label mapping vanishes in
 * exactly the modes textures exist to serve.
 */
const LEGEND_SWATCH_PAINT_CLASSES =
	"forced-color-adjust-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

/**
 * The background layers mirroring a bar series' canvas texture on its legend
 * key — empty for solid fills so the plain swatch color shows. Dots tile a
 * sized radial gradient; every line texture is a repeating stripe gradient.
 */
const legendTextureStyle = (
	texture: BarTexture,
	color: string,
	orientation: BarOrientation,
): CSSProperties => {
	if (texture === "solid") {
		return {};
	}
	const ink = textureInkColor(color);
	if (texture === "hatch") {
		return { backgroundImage: legendHatchGradient("135deg", ink) };
	}
	if (texture === "hatch-reverse") {
		return { backgroundImage: legendHatchGradient("45deg", ink) };
	}
	if (texture === "crosshatch") {
		// A wider period than the single-direction hatches: two 3px-period
		// families on an 8px chip are ~56% ink and read as a darker solid.
		return {
			backgroundImage: `${legendHatchGradient("135deg", ink, 4)}, ${legendHatchGradient("45deg", ink, 4)}`,
		};
	}
	if (texture === "perpendicular") {
		// The rung runs across the bar's length, so it flips with the bars:
		// horizontal rungs on vertical bars, vertical rungs on horizontal bars —
		// matching the canvas tile in texture.ts.
		return {
			backgroundImage: legendHatchGradient(orientation === "horizontal" ? "90deg" : "0deg", ink),
		};
	}
	return {
		backgroundImage: `radial-gradient(circle at 1px 1px, ${ink} 0.75px, transparent 0.8px)`,
		backgroundSize: "3px 3px",
	};
};

/**
 * A legend key that mirrors its series' mark AND its redundant encoding —
 * the channel that keeps series apart without color vision — so the key
 * carries it everywhere the marks do: scatter and area keys are the glyph
 * itself (the area glyph is exactly what its hover dot shows), line keys are
 * the glyph riding a short stroke, and bar keys are filled squares wearing
 * the series' fill texture (bars encode identity by texture, not glyph).
 */
const LegendSwatch = ({
	series,
	orientation,
}: {
	series: SeriesMeta;
	orientation: BarOrientation;
}) => {
	if (series.mark === "bar") {
		return (
			<span
				aria-hidden
				data-texture={series.texture}
				className={cx("size-2 shrink-0 rounded-[2px]", LEGEND_SWATCH_PAINT_CLASSES)}
				style={{
					backgroundColor: series.color,
					...legendTextureStyle(series.texture, series.color, orientation),
				}}
			/>
		);
	}
	if (series.mark === "line") {
		// The classic composite line key: the series' glyph centered on a short
		// stroke, mirroring canvas markers and the hover dot.
		return (
			<span aria-hidden className="relative flex h-2 w-3 shrink-0 items-center justify-center">
				<span
					className={cx(
						"absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full",
						LEGEND_SWATCH_PAINT_CLASSES,
					)}
					style={{ backgroundColor: series.color }}
				/>
				<span
					data-shape={series.shape}
					className={cx("relative size-2", LEGEND_SWATCH_PAINT_CLASSES)}
					style={{
						backgroundColor: series.color,
						clipPath: POINT_SHAPE_CLIP_PATHS[series.shape],
					}}
				/>
			</span>
		);
	}
	return (
		<span
			aria-hidden
			data-shape={series.shape}
			className={cx("size-2 shrink-0", LEGEND_SWATCH_PAINT_CLASSES)}
			style={{
				backgroundColor: series.color,
				clipPath: POINT_SHAPE_CLIP_PATHS[series.shape],
			}}
		/>
	);
};

/**
 * The legend: a real DOM flex row keyed by series color. Renders nothing for
 * a single series — one color needs no legend box; the chart's title already
 * names it. Swatches mirror the mark and its glyph: the shape riding a short
 * stroke for lines, the shape itself for scatter points and areas, a filled
 * square for bars.
 *
 * No `asChild`: `children` is a render prop (the series list), which is
 * incompatible with Slot's single-element-child contract; use `className`
 * or the render prop for customization.
 */
const ChartLegendPrimitive = ({
	partName,
	slotName,
	className,
	children,
	...props
}: LegendPrimitiveProps & { partName: string; slotName: string }) => {
	const context = useChartContext(partName);
	const snapshot = useStoreSnapshot(context.store);
	if (snapshot.series.length < 2) {
		return null;
	}
	return (
		<div
			data-slot={`${slotName}-legend`}
			className={cx(
				"text-muted flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs",
				className,
			)}
			{...props}
		>
			{children != null
				? children(snapshot.series)
				: snapshot.series.map((series) => (
						<div key={series.dataKey} className="flex items-center gap-1.5">
							<LegendSwatch series={series} orientation={snapshot.orientation} />
							{series.label}
						</div>
					))}
		</div>
	);
};

// ---- copy button ------------------------------------------------------------

// The native `onCopy` clipboard event handler is omitted so the part's own
// callback (fired with the serialized markdown) can own the name — on a copy
// button, the DOM event is noise and the collision would poison both types.
type CopyButtonPrimitiveProps = Omit<ComponentProps<"button">, "children" | "type" | "onCopy"> &
	SelfClosingWithAsChild & {
		/**
		 * The accessible label for the copy button. This label will be visually
		 * hidden but announced to screen reader users, similar to alt text for
		 * img tags.
		 *
		 * @default "Copy data as Markdown"
		 */
		label?: string;
		/**
		 * Callback fired after a successful copy, passes the serialized markdown.
		 */
		onCopy?: (value: string) => void;
		/**
		 * Callback fired when an error occurs during copying.
		 */
		onCopyError?: (error: unknown) => void;
	};

/**
 * A button that copies the chart's current data to the clipboard as a
 * GitHub-flavored markdown table. Columns mirror the sr-only data table twin:
 * x first, one column per composed series in paint order, and the z column on
 * 3D scatters. Output is machine-stable (ISO 8601 dates, un-separated
 * numbers, em dash gaps) so the paste target — Slack, an issue, a
 * spreadsheet, an LLM chat — receives parseable data, not locale formatting.
 *
 * The data is serialized at click time, so the copy always reflects the
 * chart's current rows.
 */
const ChartCopyButtonPrimitive = ({
	partName,
	slotName,
	label = "Copy data as Markdown",
	onCopy,
	onCopyError,
	onClick,
	ref,
	...props
}: CopyButtonPrimitiveProps & { partName: string; slotName: string }) => {
	const context = useChartContext(partName);
	const copyToClipboard = useCopyToClipboard();
	const [wasCopied, setWasCopied] = useState(false);
	const timeoutHandle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		return () => {
			if (timeoutHandle.current != null) {
				clearTimeout(timeoutHandle.current);
			}
		};
	}, []);

	return (
		<IconButton
			type="button"
			appearance="ghost"
			intent="neutral"
			size="sm"
			data-slot={`${slotName}-copy-button`}
			label={label}
			icon={wasCopied ? <CheckIcon /> : <CopyIcon />}
			ref={ref}
			onClick={async (event) => {
				try {
					onClick?.(event);
					if (event.defaultPrevented) {
						// The consumer took over the click — cancel any pending revert and
						// return the icon to its idle copy state, rather than stranding the
						// check icon left over from a prior copy.
						if (timeoutHandle.current != null) {
							clearTimeout(timeoutHandle.current);
							timeoutHandle.current = undefined;
						}
						setWasCopied(false);
						return;
					}
					const { data, xKey, zKey } = context.dataRef.current;
					const markdown = serializeChartMarkdown({
						data,
						xKey,
						zKey,
						series: context.store.getSnapshot().series,
					});
					await copyToClipboard(markdown);
					onCopy?.(markdown);
					setWasCopied(true);
					if (timeoutHandle.current != null) {
						clearTimeout(timeoutHandle.current);
					}
					timeoutHandle.current = setTimeout(() => {
						setWasCopied(false);
					}, 2000);
				} catch (error) {
					onCopyError?.(error);
				}
			}}
			{...props}
		/>
	);
};

// ---- accessibility ----------------------------------------------------------

/**
 * Debounced polite announcements for keyboard stepping, so rapid arrowing
 * doesn't flood the screen-reader queue.
 */
const ChartAnnouncer = ({
	store,
	xHasTimeOfDay,
}: {
	store: ChartStore;
	/** Whether the dataset's x dates carry a time-of-day component (label granularity). */
	xHasTimeOfDay: boolean;
}) => {
	const snapshot = useStoreSnapshot(store);
	const [announcement, setAnnouncement] = useState("");
	const hover = snapshot.hover;
	useEffect(() => {
		if (hover == null || !hover.viaKeyboard) {
			// Clear so re-stepping to the same datum after Escape/blur produces a
			// DOM change — identical consecutive text is not re-announced by AT.
			setAnnouncement("");
			return;
		}
		const values = hover.points
			.map(
				(point) => `${point.label}: ${point.value == null ? "no data" : formatNumber(point.value)}`,
			)
			.join(", ");
		const zPart =
			hover.zValue === undefined
				? ""
				: `, z: ${hover.zValue == null ? "no data" : formatNumber(hover.zValue)}`;
		const timer = setTimeout(() => {
			setAnnouncement(
				`${formatXValue(hover.xValue, { datasetHasTimeOfDay: xHasTimeOfDay })}. ${values}${zPart}`,
			);
		}, 120);
		return () => clearTimeout(timer);
	}, [hover, xHasTimeOfDay]);
	return (
		<span role="status" aria-live="polite" className="sr-only">
			{announcement}
		</span>
	);
};

/**
 * The chart's structural twin: an sr-only table of the data, bounded to
 * {@link CHART_TABLE_ROW_LIMIT} rows with a caption stating the summarization.
 * Tooltips enhance, they never gate — every plotted value is reachable here
 * or through the keyboard point cursor.
 */
const ChartDataTable = ({
	data,
	label,
	slotName,
	store,
	xHasTimeOfDay,
	xKey,
	zKey,
}: {
	data: readonly ChartDatum[];
	/** The chart's accessible name, so multi-chart pages get distinct captions. */
	label: string | undefined;
	slotName: string;
	store: ChartStore;
	/** Whether the dataset's x dates carry a time-of-day component (label granularity). */
	xHasTimeOfDay: boolean;
	xKey: string;
	zKey: string | undefined;
}) => {
	const snapshot = useStoreSnapshot(store);
	if (data.length === 0 || snapshot.series.length === 0) {
		return null;
	}
	const rows = data.slice(0, CHART_TABLE_ROW_LIMIT);
	return (
		// The slot names the twin for programmatic discovery — an agent scraping
		// the machine-readable table targets it without heuristics.
		<div className="sr-only" data-slot={`${slotName}-data-table`}>
			<table>
				<caption>
					{`${label == null ? "Chart data" : `${label} — chart data`}${
						data.length > CHART_TABLE_ROW_LIMIT
							? `. Showing the first ${CHART_TABLE_ROW_LIMIT} of ${data.length} rows.`
							: "."
					}`}
				</caption>
				<thead>
					<tr>
						<th scope="col">{xKey}</th>
						{snapshot.series.map((series) => (
							<th key={series.dataKey} scope="col">
								{series.label}
							</th>
						))}
						{zKey == null ? null : <th scope="col">{zKey}</th>}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, index) => {
						// Cells carry the display-formatted text for AT and the raw value
						// beside it for machines — `<time dateTime>` and `data-value` let
						// agents scrape exact timestamps/numbers from the DOM without
						// reverse-engineering locale formatting.
						const x = datumValue(row, xKey);
						const isValidDate = x instanceof Date && !Number.isNaN(x.getTime());
						const xText =
							typeof x === "string" || typeof x === "number" || x instanceof Date
								? formatXValue(x, { datasetHasTimeOfDay: xHasTimeOfDay })
								: String(x);
						return (
							// oxlint-disable-next-line react/no-array-index-key -- rows have no identity beyond position; the table is regenerated wholesale on data change, never reordered
							<tr key={index}>
								<th
									scope="row"
									data-value={typeof x === "number" && Number.isFinite(x) ? x : undefined}
								>
									{isValidDate ? <time dateTime={x.toISOString()}>{xText}</time> : xText}
								</th>
								{snapshot.series.map((series) => {
									const value = datumValue(row, series.dataKey);
									const isFinite = typeof value === "number" && Number.isFinite(value);
									return (
										<td key={series.dataKey} data-value={isFinite ? value : undefined}>
											{isFinite ? formatNumber(value) : "—"}
										</td>
									);
								})}
								{zKey == null
									? null
									: (() => {
											const zRaw = datumValue(row, zKey);
											const zIsFinite = typeof zRaw === "number" && Number.isFinite(zRaw);
											return (
												<td data-value={zIsFinite ? zRaw : undefined}>
													{zIsFinite ? formatNumber(zRaw) : "—"}
												</td>
											);
										})()}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

export type {
	//,
	ChartAccessibilityProps,
	ChartRootBaseProps,
	ChartRootPrimitiveProps,
	CopyButtonPrimitiveProps,
	GridPrimitiveProps,
	LegendPrimitiveProps,
	ReferenceLinePrimitiveProps,
	SeriesPrimitiveProps,
	TooltipPrimitiveProps,
	XAxisPrimitiveProps,
	YAxisPrimitiveProps,
};
export {
	//,
	CHART_TABLE_ROW_LIMIT,
	ChartCopyButtonPrimitive,
	ChartLegendPrimitive,
	ChartRootPrimitive,
	useGridPrimitive,
	useReferenceLinePrimitive,
	useSeriesPrimitive,
	useTooltipPrimitive,
	useXAxisPrimitive,
	useYAxisPrimitive,
};
