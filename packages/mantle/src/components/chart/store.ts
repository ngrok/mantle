import type { ComponentProps, ReactNode } from "react";
import type {
	BarOrientation,
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
import { CHART_DECORATIVE_COLOR, cssSeriesColor } from "./colors.js";

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

/** The glyph a series wears when it sets no `shape`. */
const DEFAULT_SHAPE: PointShape = "circle";

/**
 * Create the store a chart Root owns for its lifetime.
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
	/** The sorted specs, rebuilt only when a series registers or unregisters. */
	#specs: readonly SeriesSpec[] | null = null;
	#sequenceByKey = new Map<string, number>();
	#nextSequence = 0;

	#grid: { lines: GridLines | undefined } | null = null;
	#decorative = false;
	#orientation: BarOrientation = "vertical";
	#xAxis: XAxisSpec | null = null;
	#yAxis: YAxisSpec | null = null;
	#referenceLines = new Map<string, { spec: ReferenceLineSpec; sequence: number }>();
	#referenceLineSequenceById = new Map<string, number>();
	#tooltip: TooltipConfig | null = null;
	#hover: HoverSnapshot | null = null;
	#hoverEver = false;

	/**
	 * Whether a hover was ever published. The Root mounts the tooltip surface
	 * on the first one and keeps it, so a chart nobody points at holds none.
	 */
	get hoverEver(): boolean {
		return this.#hoverEver;
	}

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

	/**
	 * The registered series specs in paint order (engine-side read). The engine
	 * reads them on every frame and every pointer move, so the store keeps the
	 * sorted list until the registrations change.
	 */
	seriesSpecs(): readonly SeriesSpec[] {
		this.#specs ??= [...this.#seriesByKey.values()]
			.toSorted((a, b) => a.sequence - b.sequence)
			.map((entry) => entry.spec);
		return this.#specs;
	}

	/** The glyph one registered series wears. An unregistered key gets the circle. */
	seriesShape(dataKey: string): PointShape {
		return this.#seriesByKey.get(dataKey)?.spec.shape ?? DEFAULT_SHAPE;
	}

	registerSeries(spec: SeriesSpec): () => void {
		// A dataKey keeps its first-seen paint position so prop changes do not move
		// the series behind its siblings.
		const sequence = this.#sequenceByKey.get(spec.dataKey) ?? this.#nextSequence++;
		this.#sequenceByKey.set(spec.dataKey, sequence);
		this.#seriesByKey.set(spec.dataKey, { spec, sequence });
		this.#specs = null;
		this.#publishRegistrations({ seriesChanged: true });
		return () => {
			const current = this.#seriesByKey.get(spec.dataKey);
			if (current?.spec === spec) {
				this.#seriesByKey.delete(spec.dataKey);
				this.#specs = null;
				this.#publishRegistrations({ seriesChanged: true });
			}
		};
	}

	/**
	 * Root-side: publish whether the chart is a decorative placeholder, which
	 * repaints every series with the one neutral fill.
	 *
	 * Publishing as a series change is what makes a runtime flip repaint. The
	 * engine's color cache keys on the theme, not on the series, and re-resolves
	 * only when an ingest sees a series' paint input change — which is exactly
	 * what this is.
	 */
	setDecorative(decorative: boolean): void {
		if (this.#decorative === decorative) {
			return;
		}
		this.#decorative = decorative;
		this.#publishRegistrations({ seriesChanged: true });
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
		if (hover != null) {
			this.#hoverEver = true;
		}
		this.#snapshot = { ...this.#snapshot, hover };
		this.#emit();
	}

	/** Build display metadata for DOM consumers (legend, tooltip, data table). */
	seriesMeta(): SeriesMeta[] {
		const specs = this.seriesSpecs();
		return specs.map((spec) => {
			// A decorative chart paints the neutral fill and outranks `color`: the
			// values are not information, so nothing about the marks may read as a
			// series.
			const color = this.#decorative ? CHART_DECORATIVE_COLOR : cssSeriesColor(spec.color);
			const colorInput = this.#decorative ? CHART_DECORATIVE_COLOR : spec.color;
			return {
				dataKey: spec.dataKey,
				label: spec.label,
				mark: spec.mark,
				color,
				colorInput,
				shape: spec.shape,
				texture: spec.texture,
			};
		});
	}

	#publishRegistrations(options: { seriesChanged: boolean } = { seriesChanged: false }): void {
		this.#snapshot = {
			// Why keep the old list on other changes: the legend and the data table
			// subscribe to `series` by identity, so an axis or tooltip registration
			// must not re-render them.
			series: options.seriesChanged ? this.seriesMeta() : this.#snapshot.series,
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
	ChartStore,
};
