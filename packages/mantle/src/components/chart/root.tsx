"use client";

import type { ComponentProps, CSSProperties, RefObject } from "react";
import {
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import invariant from "tiny-invariant";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { assertChartKeys, datumValue } from "./datum.js";
import { cancelActivation, promoteActivation, queueActivation } from "./activation.js";
import { describeSeries, scanX } from "./describe.js";
import type { HoverLayers } from "./engine.js";
import { ChartEngine } from "./engine.js";
import { onPrint } from "./environment.js";
import type { PaintBackendFactory } from "./paint-backend.js";
import type { ScatterViewFactory } from "./scatter-engine.js";
import { ChartStore } from "./store.js";
import { observeChartVisibility } from "./visibility.js";
import type {
	BarOrientation,
	ChartDatum,
	ContinuousXScale,
	SeriesMark,
	XScaleKind,
	YDomain,
} from "./types.js";
import { ChartAnnouncer, ChartDataTable, ChartDescription, ChartListAnnouncer } from "./a11y.js";
import { ChartContext, useShallowStable } from "./context.js";
import type { ChartAccessibilityProps, ChartContextValue } from "./context.js";
import { ChartListContext } from "./list.js";
import { ChartTooltipSurface } from "./tooltip.js";

/**
 * The chart Root: the plot, the interaction overlay, the engine lifecycle,
 * and the engagement latch. Each family's `Root` wraps `ChartRootPrimitive`.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/** The `style` identity a Root with no inline style keys its color effect on. */
const NO_STYLE: CSSProperties = {};

/**
 * Root props shared by every chart kind, WITHOUT the accessibility/interaction
 * union or the data/x props. Public wrappers `Omit` from this base and
 * re-intersect `ChartAccessibilityProps` — `Omit` over a union type flattens
 * it, which would silently make the required accessible name optional and
 * erase the `mode` discriminant.
 */
type ChartRootBaseProps = Omit<ComponentProps<"div">, "aria-label" | "aria-labelledby"> &
	WithDataSlot & {
		/**
		 * Classes for the Root. The Root is `aspect-video` by default. To size it
		 * another way, set `aspect-auto` and a height: `className="aspect-auto h-52"`.
		 */
		className?: string;
		/** Override the automatic y domain. */
		yDomain?: YDomain;
		/** Stack the series in registration order, from the baseline out (bar/area charts). */
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
		/**
		 * The key of each row's x value. If no row has the key, the Root throws.
		 */
		xKey: string;
		/**
		 * Override the auto-detected x scale (`Date` values → `"time"`, numbers →
		 * `"linear"`, strings → `"point"`). Bar charts are always `"band"`.
		 */
		xScale?: ContinuousXScale;
		/**
		 * Scatter plots only: the row key of each point's depth value. Setting
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
	/** The surface the engine paints on. Pass a stable function: a new one rebuilds the engine. */
	paintBackend: PaintBackendFactory;
	/** The scatter view factory. ScatterPlot passes it; the other families leave it out. */
	scatterView?: ScatterViewFactory;
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
 * The class strings of the engine-owned layers. They live here, not in
 * `createHoverLayers`, so the Tailwind source scan of this module finds them
 * next to the Root's own classes.
 */
const CROSSHAIR_CLASS = "bg-neutral-500 pointer-events-none absolute left-0 top-0 w-px opacity-0";

const HOVER_BAND_CLASS =
	"bg-neutral-500/10 pointer-events-none absolute left-0 top-0 rounded-sm opacity-0";

const MARKERS_CLASS = "pointer-events-none absolute inset-0 opacity-0";

/**
 * Build the three hover layers an interactive chart's engine positions. The
 * engine inserts them on the first hover and removes them on `destroy`, so
 * React never owns them, and a chart nobody points at holds none.
 */
const createHoverLayers = (document: Document, slotName: string): HoverLayers => {
	const layer = (slot: string, className: string): HTMLDivElement => {
		const element = document.createElement("div");
		element.setAttribute("data-slot", `${slotName}-${slot}`);
		element.setAttribute("aria-hidden", "true");
		element.className = className;
		return element;
	};
	return {
		crosshair: layer("crosshair", CROSSHAIR_CLASS),
		band: layer("hover-band", HOVER_BAND_CLASS),
		markers: layer("markers", MARKERS_CLASS),
	};
};

/** The series part of each family, for the key invariants a dormant Root throws. */
const SERIES_PART_NAME: Record<SeriesMark, string> = {
	bar: "Bar",
	line: "Line",
	area: "Area",
	scatter: "Point",
};

/** The engine inputs a Root pushes through its setters, held for an engine created later. */
type EngineInputs = {
	options: Parameters<ChartEngine["setOptions"]>[0];
	callbacks: Parameters<ChartEngine["setCallbacks"]>[0];
	controlledActiveIndex: number | null | undefined;
};

/** The latest visibility reports, kept for an engine created later, and whether focus holds the chart painted. */
type ChartVisibility = { near: boolean; withinFar: boolean; seen: boolean; focused: boolean };

/** The refs the Root's activation hooks share with its engine lifecycle. */
type ActivationRefs = {
	engineRef: RefObject<ChartEngine | null>;
	activateRef: RefObject<((rect: DOMRectReadOnly | null) => void) | null>;
};

/**
 * Report the plot's visibility bands to the engine. Near the viewport, a
 * dormant chart queues its activation; far away, a chart nobody focuses
 * releases its backing stores.
 */
const useChartVisibility = ({
	plotRef,
	engineRef,
	activateRef,
	visibilityRef,
}: ActivationRefs & {
	plotRef: RefObject<HTMLDivElement | null>;
	visibilityRef: RefObject<ChartVisibility>;
}): void => {
	// Why a layout effect: observing before the first frame means the browser
	// computes the entries at the end of that frame, so a chart that starts in
	// view paints on the second frame, the same frame the sized plot allows.
	useLayoutEffect(() => {
		const plot = plotRef.current;
		if (plot == null) {
			return;
		}
		return observeChartVisibility(plot, ({ band, inView, rect }) => {
			const engine = engineRef.current;
			const visibility = visibilityRef.current;
			if (band === "near") {
				visibility.near = inView;
				if (engine != null) {
					engine.setInView(inView || visibility.focused);
				} else if (inView) {
					queueActivation(plot, { rect, run: (entryRect) => activateRef.current?.(entryRect) });
				} else {
					// A chart that scrolled away before its slice ran has nothing to paint.
					cancelActivation(plot);
				}
			} else if (band === "visible" && inView) {
				visibility.seen = true;
				if (engine != null) {
					engine.markSeen();
				} else {
					promoteActivation(plot);
				}
			} else if (band === "far") {
				visibility.withinFar = inView;
				// A focused chart keeps its canvas: a reader is driving it from the keyboard.
				if (!inView && !visibility.focused) {
					engine?.releaseBackingStores();
				}
			}
		});
	}, [plotRef, engineRef, activateRef, visibilityRef]);
};

/**
 * Activate a dormant chart before the print snapshot and paint it at once.
 * The engine's own print listener is a no-op after that.
 */
const usePrintActivation = ({
	rootRef,
	engineRef,
	activateRef,
}: ActivationRefs & { rootRef: RefObject<HTMLDivElement | null> }): void => {
	useLayoutEffect(() => {
		const view = rootRef.current?.ownerDocument.defaultView;
		if (view == null) {
			return;
		}
		return onPrint(view, {
			before: () => {
				activateRef.current?.(null);
				engineRef.current?.paintForPrint();
			},
			after: () => {
				engineRef.current?.afterPrint();
			},
		});
	}, [rootRef, engineRef, activateRef]);
};

/**
 * Write the series sentence of the description from the store, not from a
 * render: the parts register after the Root's first render, and a re-render
 * for it would change the text after the first layout. The subscription also
 * follows a part that registers without a Root render.
 */
const useDescriptionSeries = ({
	store,
	decorative,
	targetRef,
}: {
	store: ChartStore;
	decorative: boolean;
	targetRef: RefObject<HTMLSpanElement | null>;
}): void => {
	// Why the `decorative` check: the span mounts with the plot's named
	// surface, so the writer rebinds when a Root stops being decorative.
	useLayoutEffect(() => {
		const target = targetRef.current;
		if (decorative || target == null) {
			return;
		}
		let last: string | null = null;
		const write = () => {
			const text = describeSeries(store.getSnapshot().series.map((series) => series.label));
			if (text !== last) {
				last = text;
				target.textContent = text;
			}
		};
		write();
		return store.subscribe(write);
	}, [store, decorative, targetRef]);
};

/**
 * The chart Root implementation: renders the plot, the interaction overlay,
 * the sr-only description, the aria-live region, the tooltip container (from
 * the first hover), and (once engaged) the sr-only data table; builds the
 * paint surface and the engine at activation; owns the engine
 * lifecycle and the engagement latch.
 *
 * In `"static"` mode it omits the interaction overlay, the tooltip, the
 * aria-live region, and the data table, and names the plot `role="img"` with
 * the description beside it. In `"decorative"` mode it omits the description
 * too, marks the root `aria-hidden` and `inert`, and publishes the decorative
 * fill to the store so every series paints neutral: a placeholder backdrop
 * with no interaction and nothing for assistive technology.
 *
 * No `asChild`: Root owns a fixed internal structure (canvas + observers +
 * overlay) whose lifecycles are bound to this exact element tree, so
 * element-swapping polymorphism does not apply.
 */
const ChartRootPrimitive = ({
	kind,
	componentName,
	slotName,
	paintBackend,
	scatterView,
	data,
	xKey,
	xScale,
	zKey,
	dimensions = 3,
	yDomain = AUTO_Y_DOMAIN,
	stacked = false,
	orientation = "vertical",
	animate: animateProp,
	pending = false,
	mode = "interactive",
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
	// hidden from AT and never a tab stop; the other modes honor what's passed
	// (an interactive chart's own focus lives on the overlay, not here).
	"aria-hidden": ariaHidden,
	tabIndex,
	onFocus,
	onBlur,
	style,
	...props
}: InternalRootProps) => {
	const interactive = mode === "interactive";
	const decorative = mode === "decorative";
	// A static chart plays no reveal unless asked: a list of sparklines that
	// each animate in as the reader scrolls is motion with no information.
	const animate = animateProp ?? mode !== "static";
	// One store per Root lifetime: series identity and part registrations
	// survive re-renders (and StrictMode's double effect pass).
	const [store] = useState(() => new ChartStore());
	// The engagement latch flips once focus lands inside the chart and never
	// flips back, so a data table a screen reader is on never unmounts under
	// its cursor. Visibility never mounts the table, or a list of sparklines
	// would hold a 30-row table in every cell.
	const [engaged, setEngaged] = useState(false);
	// A dormant Root renders the shell alone: the plot, the overlay, and the
	// description. The paint surface and the engine arrive through `activate`,
	// outside React, once the chart nears the viewport, takes focus, or prints.
	// The hover layers and the tooltip surface arrive on the first hover.
	const engineRef = useRef<ChartEngine | null>(null);
	/** Whether the engine effect's next run activates at once: its cleanup tore down a live engine. */
	const reactivateRef = useRef(false);
	const activateRef = useRef<((rect: DOMRectReadOnly | null) => void) | null>(null);
	// The observer's latest reports, kept for an engine created later, and
	// whether focus holds the chart painted wherever it is.
	const visibilityRef = useRef<ChartVisibility>({
		near: false,
		withinFar: true,
		seen: false,
		focused: false,
	});
	const descriptionSeriesRef = useRef<HTMLSpanElement | null>(null);
	// Why a selector on the latch alone: a hover publish must not re-render the Root.
	const tooltipWanted = useSyncExternalStore(
		store.subscribe,
		() => store.hoverEver,
		() => false,
	);
	// Why a hoisted ref: the context object is state, so a write through
	// `context.dataRef.current` reads as a state mutation to the React Compiler.
	const dataRef = useRef({ data, xKey, zKey });
	const [context] = useState<ChartContextValue>(() => ({
		kind,
		componentName,
		store,
		engineRef,
		dataRef,
	}));

	useLayoutEffect(() => {
		dataRef.current = { data, xKey, zKey };
	}, [data, xKey, zKey]);

	const rootRef = useRef<HTMLDivElement | null>(null);
	const composedRootRef = useComposedRefs(rootRef, ref);
	const plotRef = useRef<HTMLDivElement | null>(null);
	const tooltipRef = useRef<HTMLDivElement | null>(null);
	// Inside a List, the list owns the one live region its charts share.
	const list = useContext(ChartListContext);
	const attachTooltip = useCallback((element: HTMLDivElement | null) => {
		tooltipRef.current = element;
		engineRef.current?.attachTooltip(element);
	}, []);

	const descriptionId = useId();
	const resolvedXScale: XScaleKind = kind === "bar" ? "band" : (xScale ?? detectXScale(data, xKey));
	// Scatter axes are continuous by contract — a string x would silently render
	// evenly-spaced categorical positions misaligned against the value axis.
	invariant(
		kind !== "scatter" || data.length === 0 || resolvedXScale !== "point",
		() =>
			`${componentName}.Root requires numeric or Date x values — the "${xKey}" values are not numbers or dates, so they have no position on a continuous scatter axis.`,
	);
	const [yDomainMin, yDomainMax] = yDomain;

	// One pass over the rows feeds the description (count and x range) and the
	// date label granularity. Granularity is a property of the dataset, not the
	// sample: the midnight point inside an hourly series must keep its time of
	// day, while all-midnight daily data reads as dates. The tooltip, the
	// announcer, and the data table share it.
	const xSummary = useMemo(() => scanX(data, xKey, resolvedXScale), [data, xKey, resolvedXScale]);
	const xHasTimeOfDay = xSummary.hasTimeOfDay;

	// The latest engine inputs, applied in one go when the engine is created
	// after the commit that carried them.
	const inputsRef = useRef<EngineInputs>({
		options: {
			xKey,
			xScale: resolvedXScale,
			yDomain: [yDomainMin, yDomainMax],
			zKey: zKey ?? null,
			dimensions,
			stacked,
			orientation,
			animate,
		},
		callbacks: { onDatumActivate: null, onActiveIndexChange: null },
		controlledActiveIndex: undefined,
	});
	useLayoutEffect(() => {
		inputsRef.current = {
			options: {
				xKey,
				xScale: resolvedXScale,
				yDomain: [yDomainMin, yDomainMax],
				zKey: zKey ?? null,
				dimensions,
				stacked,
				orientation,
				animate,
			},
			callbacks: interactive
				? {
						onDatumActivate: onDatumActivate ?? null,
						onActiveIndexChange: onActiveIndexChange ?? null,
					}
				: { onDatumActivate: null, onActiveIndexChange: null },
			controlledActiveIndex: interactive ? activeIndex : undefined,
		};
	});

	// Engine lifecycle. `activate` builds the layers and the engine outside
	// React and paints in the caller's task; the cleanup tears both down. Child
	// part registrations land in the store first (child layout effects run
	// before the parent's), so an engine built later still ingests the
	// composed series.
	useLayoutEffect(() => {
		activateRef.current = (rect) => {
			const root = rootRef.current;
			const plot = plotRef.current;
			if (engineRef.current != null || root == null || plot == null) {
				return;
			}
			// Focus, print, and a press activate ahead of the queue; the stale
			// entry would spend a slice on a no-op.
			cancelActivation(plot);
			const size =
				rect != null && rect.width > 0 && rect.height > 0
					? { width: rect.width, height: rect.height }
					: undefined;
			const engine = new ChartEngine({
				kind,
				store,
				backend: paintBackend,
				scatter: scatterView,
				slotName,
				elements: { root, plot, tooltip: tooltipRef.current },
				// The engine puts its surface under the overlay and makes the hover
				// layers above it on the first hover. A static chart has no hover.
				createHoverLayers: interactive
					? () => createHoverLayers(plot.ownerDocument, slotName)
					: undefined,
				// Why false: the reveal must hold until the `visible` band reports
				// the chart on screen; `setInView` below does not mark it seen.
				inView: false,
				size,
			});
			const inputs = inputsRef.current;
			engine.setOptions(inputs.options);
			engine.setRows(dataRef.current.data);
			engine.setCallbacks(inputs.callbacks);
			engine.setControlledActiveIndex(inputs.controlledActiveIndex);
			engineRef.current = engine;
			engine.flushIngest();
			engine.setInView(visibilityRef.current.near || visibilityRef.current.focused);
			if (visibilityRef.current.seen) {
				engine.markSeen();
			}
			engine.commitNow();
		};
		// A mode change rebuilt the layers under an active chart, so it paints
		// again now instead of waiting for the next visibility report.
		if (reactivateRef.current) {
			reactivateRef.current = false;
			activateRef.current(null);
		}
		return () => {
			reactivateRef.current = engineRef.current != null;
			activateRef.current = null;
			engineRef.current?.destroy();
			engineRef.current = null;
		};
	}, [kind, store, slotName, interactive, paintBackend, scatterView]);

	useChartVisibility({ plotRef, engineRef, activateRef, visibilityRef });

	usePrintActivation({ rootRef, engineRef, activateRef });

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
		// The neutral decorative fill replaces the categorical palette in the store,
		// so the canvas and every DOM surface read one color from one place.
		store.setDecorative(decorative);
	}, [
		store,
		decorative,
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
		// Only an interactive chart activates a datum or moves an active index,
		// so the other modes never wire the consumer's callbacks: the type union
		// already forbids them, and clearing here keeps a stray value from firing.
		engineRef.current?.setCallbacks(
			interactive
				? {
						onDatumActivate: onDatumActivate ?? null,
						onActiveIndexChange: onActiveIndexChange ?? null,
					}
				: { onDatumActivate: null, onActiveIndexChange: null },
		);
	});

	useLayoutEffect(() => {
		// Force uncontrolled outside interactive mode: a controlled index would
		// otherwise drive the marker overlay visible on a chart that must not react.
		engineRef.current?.setControlledActiveIndex(interactive ? activeIndex : undefined);
	}, [interactive, activeIndex]);

	// The engine caches its resolved colors per theme, and a `--color-chart-N`
	// or `color` override scoped to this Root lives in `className` or `style`.
	// A new value re-resolves them; an equal inline `style` object does not.
	const stableStyle = useShallowStable(style ?? NO_STYLE);
	useLayoutEffect(() => {
		engineRef.current?.setColorScope(className, stableStyle);
	}, [className, stableStyle]);

	useDescriptionSeries({ store, decorative, targetRef: descriptionSeriesRef });

	// Must stay the LAST effect: rows, options, and series registrations from
	// one commit land in the engine as a single consistent ingest. Ingesting
	// inline (mid-commit) would validate one render's series specs against the
	// previous render's rows — swapping `data` and a series `dataKey` together
	// would fail fast on a key the settled commit does contain.

	// A dormant Root holds no engine, so it throws the key invariants itself:
	// a typo must fail in the mount commit, not in the observer task that
	// activates the chart. The signature skips the pass when nothing changed.
	const validatedRef = useRef<{ data: readonly ChartDatum[]; signature: string } | null>(null);
	useLayoutEffect(() => {
		const engine = engineRef.current;
		if (engine != null) {
			engine.flushIngest();
			return;
		}
		const dataKeys = store.seriesSpecs().map((spec) => spec.dataKey);
		const signature = `${xKey}|${resolvedXScale}|${zKey ?? ""}|${dataKeys.join("|")}`;
		const validated = validatedRef.current;
		if (validated != null && validated.data === data && validated.signature === signature) {
			return;
		}
		assertChartKeys({
			rootName: `${componentName}.Root`,
			partName: `${componentName}.${SERIES_PART_NAME[kind]}`,
			rows: data,
			xKey,
			xScale: resolvedXScale,
			dataKeys,
			zKey: zKey ?? null,
		});
		validatedRef.current = { data, signature };
	});

	const latchState = engaged ? "engaged" : "dormant";
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
			// Why inert: `aria-hidden` alone leaves a composed DOM part such as
			// `CopyButton` focusable inside a hidden subtree. `inert` takes the
			// whole backdrop out of the tab order too.
			inert={decorative ? true : undefined}
			ref={composedRootRef}
			onFocus={(event) => {
				onFocus?.(event);
				// Focus engages synchronously: the data table must exist before the
				// screen reader moves past the overlay, and a discrete event flushes
				// its state update before the next key arrives. A static chart has
				// no table, so focus on a composed part engages nothing.
				if (interactive) {
					setEngaged(true);
				}
				// A focused chart paints even when `preventScroll` kept it offscreen.
				visibilityRef.current.focused = true;
				activateRef.current?.(null);
				engineRef.current?.setInView(true);
			}}
			onBlur={(event) => {
				onBlur?.(event);
				// Focus that moves between the chart's own parts never left the chart.
				if (
					event.relatedTarget instanceof Node &&
					event.currentTarget.contains(event.relatedTarget)
				) {
					return;
				}
				const visibility = visibilityRef.current;
				visibility.focused = false;
				const engine = engineRef.current;
				if (engine == null) {
					return;
				}
				// The observer owns the paint gate again, and a chart beyond the far
				// band gives up the canvas focus allocated.
				engine.setInView(visibility.near);
				if (!visibility.withinFar) {
					engine.releaseBackingStores();
				}
			}}
			style={style}
			{...props}
			// Why after the spread: the latch is the Root's own state, and a wider
			// props object must not carry a stale value past it. Only an interactive
			// chart has an overlay to focus, so only it carries the latch.
			data-state={interactive ? latchState : undefined}
		>
			<ChartContext.Provider value={context}>
				<div
					data-slot={`${slotName}-plot`}
					className={cx(
						"relative min-h-0 w-full flex-1",
						pending && "opacity-60 transition-opacity duration-300",
					)}
					// A static chart is an image: the plot is its single named element,
					// and the description beside the canvas is what a screen reader
					// hears. The Root stays a plain box, so a legend or a copy button
					// composed beside the plot keeps its own semantics.
					role={mode === "static" ? "img" : undefined}
					aria-label={mode === "static" ? ariaLabel : undefined}
					aria-labelledby={mode === "static" ? ariaLabelledBy : undefined}
					aria-describedby={mode === "static" ? descriptionId : undefined}
					ref={plotRef}
				>
					{/* aria-hidden: the overlay is an interactive chart's single named
					    element for AT — a role="img" sibling with the same name would
					    announce the chart twice. The sr-only table carries the
					    structured data. */}
					{/* The interaction overlay is the chart's only focusable element and
					    the surface every pointer/keyboard handler lives on. A static or
					    decorative chart omits it entirely — no tab stop, no hover band,
					    no crosshair, no activation — so it stays quiet without any
					    consumer CSS or `inert` workaround. */}
					{interactive && (
						<div
							role="application"
							aria-label={ariaLabel}
							aria-labelledby={ariaLabelledBy}
							aria-describedby={descriptionId}
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
								// A press can land before the chart's queued activation slice
								// runs, and pointer-up activates only a press the engine saw.
								// The plot rect sizes it now; the resize observer reports a
								// frame later, after the press.
								if (engineRef.current == null) {
									activateRef.current?.(plotRef.current?.getBoundingClientRect() ?? null);
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
					)}
					{!decorative && (
						<ChartDescription
							id={descriptionId}
							kind={kind}
							slotName={slotName}
							seriesRef={descriptionSeriesRef}
							summary={xSummary}
							instructions={interactive}
						/>
					)}
					{/* The paint surface and the three hover layers are engine-owned: the
					    engine inserts the surface first at activation and appends the
					    layers on the first hover, and writes their geometry as inline styles. The
					    tooltip surface is React-rendered for the consumer's render prop,
					    so it mounts on the first hover and stays while the chart is
					    interactive. */}
					{tooltipWanted && interactive && (
						<ChartTooltipSurface
							slotName={slotName}
							store={store}
							tooltipRef={attachTooltip}
							xHasTimeOfDay={xHasTimeOfDay}
						/>
					)}
				</div>
				{children}
				{/* Only an interactive chart announces or tabulates. The live region
				    mounts with the Root, because a region that appears right before
				    its first message is not announced. */}
				{interactive && list == null && (
					<ChartAnnouncer store={store} xHasTimeOfDay={xHasTimeOfDay} />
				)}
				{interactive && list != null && (
					<ChartListAnnouncer
						id={descriptionId}
						list={list}
						store={store}
						xHasTimeOfDay={xHasTimeOfDay}
					/>
				)}
				{/* Why last: the table mounts as an append, which a translation engine cannot break. */}
				{interactive && engaged && (
					<ChartDataTable
						data={data}
						label={ariaLabel}
						labelledBy={ariaLabelledBy}
						slotName={slotName}
						store={store}
						xHasTimeOfDay={xHasTimeOfDay}
						xKey={xKey}
						zKey={zKey}
					/>
				)}
			</ChartContext.Provider>
		</div>
	);
};

export type {
	//,
	ChartRootBaseProps,
	ChartRootPrimitiveProps,
};

export {
	//,
	ChartRootPrimitive,
};
