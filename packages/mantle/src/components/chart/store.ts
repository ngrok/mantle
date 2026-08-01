import type { ComponentProps, ReactNode } from "react";
import type {
	BarOrientation,
	ChartColorToken,
	ChartSeriesSlot,
	GridLines,
	HoverSnapshot,
	PointShape,
	ReferenceLineSpec,
	SeriesMeta,
	SeriesSpec,
	XAxisSpec,
	XValue,
	YAxisSpec,
} from "./types.js";
import { chartTokenVariable, isChartColorToken, SLOT_ORDER } from "./colors.js";

/**
 * Tooltip customization registered by a composed Tooltip part. Root renders
 * the default hover tooltip when no part is composed; a registered config
 * overrides its formatting/content, never enables or disables the hover layer
 * (interaction is Root's unconditional contract).
 */
type TooltipConfig = {
	/** Format the x/label row of the readout. */
	labelFormat: ((value: XValue) => ReactNode) | undefined;
	/** Format each series value. */
	valueFormat: ((value: number, dataKey: string) => ReactNode) | undefined;
	/** The per-series color key: a short stroke (default) or nothing. */
	indicator: "line" | "none";
	/** Extra content appended below the series rows. */
	footer: ReactNode | ((snapshot: HoverSnapshot) => ReactNode) | undefined;
	/** Replace the entire readout. */
	children: ((snapshot: HoverSnapshot) => ReactNode) | undefined;
	/** Pass-through div props (className, ref, data-*, …) for the tooltip element. */
	divProps: Omit<ComponentProps<"div">, "children">;
};

/**
 * The chart's registration + interaction store. Compound parts (series, grid,
 * axes, tooltip, legend, reference lines) render `null` and register their
 * configuration here from layout effects; the engine and the DOM-rendering
 * parts (legend, tooltip, data table) read from it. Hover/keyboard snapshots
 * are published here by the engine and consumed via `useSyncExternalStore` so
 * a pointer move re-renders only the tooltip subtree — never the chart Root.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * Immutable view of the store for React consumers. Rebuilt only when content
 * actually changes, so `useSyncExternalStore` gets stable snapshots.
 */
type StoreSnapshot = {
	/** Registered series with display colors, in paint order. */
	series: SeriesMeta[];
	/** The active hover/keyboard position, `null` when idle. */
	hover: HoverSnapshot | null;
	/**
	 * Grid configuration, `null` when no Grid part is composed. `lines` is
	 * `undefined` when the part left the direction to the chart (the engine
	 * defaults it perpendicular to the bars).
	 */
	grid: { lines: GridLines | undefined } | null;
	/** X axis configuration, `null` when no XAxis part is composed. */
	xAxis: XAxisSpec | null;
	/** Y axis configuration, `null` when no YAxis part is composed. */
	yAxis: YAxisSpec | null;
	/** Reference lines in registration order. */
	referenceLines: ReferenceLineSpec[];
	/** Tooltip customization, `null` when no Tooltip part is composed. */
	tooltip: TooltipConfig | null;
	/** The bar direction the Root registered (DOM consumers: legend texture keys). */
	orientation: BarOrientation;
};

/**
 * The CSS color a series paints/keys with in DOM surfaces (legend swatches,
 * tooltip strokes): explicit colors pass through; token names become
 * `var(--color-chart-N)` references so the DOM stays theme-reactive without
 * any JS resolution.
 */
const displayColor = (color: SeriesSpec["color"], slot: ChartColorToken): string => {
	if (color == null) {
		return `var(${chartTokenVariable(slot)})`;
	}
	if (isChartColorToken(color)) {
		return `var(${chartTokenVariable(color)})`;
	}
	return color;
};

/**
 * The glyph paired to each series slot. `"chart-other"` is the shared neutral
 * treatment, so its series use the circle.
 */
const SHAPE_BY_SLOT: Record<ChartColorToken, PointShape> = {
	"chart-1": "circle",
	"chart-2": "square",
	"chart-3": "triangle",
	"chart-4": "diamond",
	"chart-5": "triangle-down",
	"chart-6": "plus",
	"chart-7": "cross",
	"chart-8": "star",
	"chart-other": "circle",
};

/**
 * The glyph a series wears: the `shape` it set, else the one paired to its
 * series slot. A chart therefore ships redundant encoding with no consumer
 * effort — distinct color and distinct glyph.
 *
 * Pairing reads the resolved slot. An explicit `shape` can override that one
 * channel without changing the series' color.
 *
 * @example
 * ```ts
 * displayShape(undefined, "chart-2"); // "square"
 * displayShape("star", "chart-2"); // "star"
 * displayShape(undefined, "chart-other"); // "circle"
 * ```
 */
const displayShape = (shape: SeriesSpec["shape"], slot: ChartColorToken): PointShape =>
	shape ?? SHAPE_BY_SLOT[slot];

/** The chart token selected by each public `seriesSlot` value. */
const TOKEN_BY_SERIES_SLOT: Record<ChartSeriesSlot, ChartColorToken> = {
	1: "chart-1",
	2: "chart-2",
	3: "chart-3",
	4: "chart-4",
	5: "chart-5",
	6: "chart-6",
	7: "chart-7",
	8: "chart-8",
	other: "chart-other",
};

type SeriesSlotInput = Pick<SeriesSpec, "dataKey" | "seriesSlot">;

/**
 * Resolve the current series registrations into visual identity slots.
 * Explicit `seriesSlot` values reserve their slots first. Automatic series
 * then take the remaining slots in registration order.
 *
 * The result depends only on the current registrations. A `color` or `shape`
 * override changes its own channel and never changes a sibling's slot.
 *
 * @example
 * ```ts
 * assignSeriesSlots([
 *   { dataKey: "requests", seriesSlot: undefined },
 *   { dataKey: "errors", seriesSlot: 4 },
 *   { dataKey: "latency", seriesSlot: undefined },
 * ]);
 * // requests → chart-1, errors → chart-4, latency → chart-2
 * ```
 */
const assignSeriesSlots = (specs: readonly SeriesSlotInput[]): Map<string, ChartColorToken> => {
	const reserved = new Set<ChartColorToken>();
	for (const spec of specs) {
		if (spec.seriesSlot != null && spec.seriesSlot !== "other") {
			reserved.add(TOKEN_BY_SERIES_SLOT[spec.seriesSlot]);
		}
	}

	const assigned = new Map<string, ChartColorToken>();
	const unavailable = new Set(reserved);
	for (const spec of specs) {
		if (spec.seriesSlot != null) {
			assigned.set(spec.dataKey, TOKEN_BY_SERIES_SLOT[spec.seriesSlot]);
			continue;
		}
		const slot = SLOT_ORDER.find((candidate) => !unavailable.has(candidate)) ?? "chart-other";
		assigned.set(spec.dataKey, slot);
		unavailable.add(slot);
	}
	return assigned;
};

/**
 * Create the store a chart Root owns for its lifetime.
 *
 * `assignSeriesSlots` derives every automatic identity from the current series
 * registrations. When a chart must keep one series stable across conditional
 * composition, `seriesSlot` reserves a fixed identity.
 */
class ChartStore {
	#listeners = new Set<() => void>();
	#snapshot: StoreSnapshot = {
		series: [],
		hover: null,
		grid: null,
		xAxis: null,
		yAxis: null,
		referenceLines: [],
		tooltip: null,
		orientation: "vertical",
	};

	#seriesByKey = new Map<string, { spec: SeriesSpec; sequence: number }>();
	#sequenceByKey = new Map<string, number>();
	#nextSequence = 0;

	#grid: { lines: GridLines | undefined } | null = null;
	#orientation: BarOrientation = "vertical";
	#xAxis: XAxisSpec | null = null;
	#yAxis: YAxisSpec | null = null;
	#referenceLines = new Map<string, { spec: ReferenceLineSpec; sequence: number }>();
	#referenceLineSequenceById = new Map<string, number>();
	#tooltip: TooltipConfig | null = null;
	#hover: HoverSnapshot | null = null;

	/** Engine hook: series registrations changed — columnar data must re-ingest. */
	onSeriesChange: (() => void) | null = null;
	/** Engine hook: presentation registrations changed — a repaint suffices. */
	onPresentationChange: (() => void) | null = null;

	subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	};

	getSnapshot = (): StoreSnapshot => this.#snapshot;

	/** The registered series specs in paint order (engine-side read). */
	seriesSpecs(): SeriesSpec[] {
		return [...this.#seriesByKey.values()]
			.toSorted((a, b) => a.sequence - b.sequence)
			.map((entry) => entry.spec);
	}

	/**
	 * The glyph one registered series wears, resolved against its series slot —
	 * the spec-side twin of the `shape` `seriesMeta` publishes to the DOM.
	 *
	 * The canvas paints from `seriesSpecs`, where `shape` is still the raw prop.
	 * Reading it there would paint a circle under a legend key wearing the
	 * paired glyph.
	 */
	seriesShape(dataKey: string): PointShape {
		const specs = this.seriesSpecs();
		const slot = assignSeriesSlots(specs).get(dataKey) ?? "chart-other";
		return displayShape(specs.find((spec) => spec.dataKey === dataKey)?.shape, slot);
	}

	registerSeries(spec: SeriesSpec): () => void {
		// A dataKey keeps its first-seen paint position so prop changes do not move
		// the series behind its siblings.
		const sequence = this.#sequenceByKey.get(spec.dataKey) ?? this.#nextSequence++;
		this.#sequenceByKey.set(spec.dataKey, sequence);
		this.#seriesByKey.set(spec.dataKey, { spec, sequence });
		this.#publishRegistrations({ seriesChanged: true });
		return () => {
			const current = this.#seriesByKey.get(spec.dataKey);
			if (current?.spec === spec) {
				this.#seriesByKey.delete(spec.dataKey);
				this.#publishRegistrations({ seriesChanged: true });
			}
		};
	}

	/** Root-side: publish the bar direction so DOM consumers (legend keys) can mirror it. */
	setOrientation(orientation: BarOrientation): void {
		if (this.#orientation === orientation) {
			return;
		}
		this.#orientation = orientation;
		this.#publishRegistrations();
	}

	registerGrid(lines: GridLines | undefined): () => void {
		// Singleton parts: last registration wins. Cleanup compares the exact
		// registration object, never its value — an equal-valued duplicate part
		// unmounting must not clear the surviving registration.
		const registration = { lines };
		this.#grid = registration;
		this.#publishRegistrations();
		return () => {
			if (this.#grid === registration) {
				this.#grid = null;
				this.#publishRegistrations();
			}
		};
	}

	registerXAxis(spec: XAxisSpec): () => void {
		this.#xAxis = spec;
		this.#publishRegistrations();
		return () => {
			if (this.#xAxis === spec) {
				this.#xAxis = null;
				this.#publishRegistrations();
			}
		};
	}

	registerYAxis(spec: YAxisSpec): () => void {
		this.#yAxis = spec;
		this.#publishRegistrations();
		return () => {
			if (this.#yAxis === spec) {
				this.#yAxis = null;
				this.#publishRegistrations();
			}
		};
	}

	registerReferenceLine(id: string, spec: ReferenceLineSpec): () => void {
		// A reference line keeps its first-seen paint position: prop changes
		// re-register (cleanup deletes, then this re-adds), and a fresh sequence
		// would reorder the lines under the survivors.
		const sequence = this.#referenceLineSequenceById.get(id) ?? this.#nextSequence++;
		this.#referenceLineSequenceById.set(id, sequence);
		this.#referenceLines.set(id, { spec, sequence });
		this.#publishRegistrations();
		return () => {
			if (this.#referenceLines.get(id)?.spec === spec) {
				this.#referenceLines.delete(id);
				this.#publishRegistrations();
			}
		};
	}

	registerTooltip(config: TooltipConfig): () => void {
		// Singleton part: last registration wins.
		this.#tooltip = config;
		this.#publishRegistrations();
		return () => {
			if (this.#tooltip === config) {
				this.#tooltip = null;
				this.#publishRegistrations();
			}
		};
	}

	/** Engine-side: publish the current hover/keyboard snapshot (or clear it). */
	publishHover(hover: HoverSnapshot | null): void {
		if (this.#hover === hover) {
			return;
		}
		this.#hover = hover;
		this.#snapshot = { ...this.#snapshot, hover };
		this.#emit();
	}

	/** Build display metadata for DOM consumers (legend, tooltip, data table). */
	seriesMeta(): SeriesMeta[] {
		const specs = this.seriesSpecs();
		const slots = assignSeriesSlots(specs);
		return specs.map((spec) => {
			const slot = slots.get(spec.dataKey) ?? "chart-other";
			return {
				dataKey: spec.dataKey,
				label: spec.label,
				mark: spec.mark,
				color: displayColor(spec.color, slot),
				colorInput: spec.color ?? slot,
				shape: displayShape(spec.shape, slot),
				texture: spec.texture,
			};
		});
	}

	#publishRegistrations(options: { seriesChanged: boolean } = { seriesChanged: false }): void {
		this.#snapshot = {
			series: this.seriesMeta(),
			hover: this.#hover,
			grid: this.#grid,
			xAxis: this.#xAxis,
			yAxis: this.#yAxis,
			referenceLines: [...this.#referenceLines.values()]
				.toSorted((a, b) => a.sequence - b.sequence)
				.map((entry) => entry.spec),
			tooltip: this.#tooltip,
			orientation: this.#orientation,
		};
		this.#emit();
		if (options.seriesChanged) {
			this.onSeriesChange?.();
		} else {
			this.onPresentationChange?.();
		}
	}

	#emit(): void {
		for (const listener of this.#listeners) {
			listener();
		}
	}
}

export type {
	//,
	StoreSnapshot,
	TooltipConfig,
};
export {
	//,
	assignSeriesSlots,
	ChartStore,
	displayColor,
	displayShape,
};
