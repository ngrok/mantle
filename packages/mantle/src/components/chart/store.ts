import type { ComponentProps, ReactNode } from "react";
import invariant from "tiny-invariant";
import type {
	BarOrientation,
	GridLines,
	HoverSnapshot,
	PointShape,
	ReferenceLineSpec,
	SeriesMark,
	SeriesMeta,
	SeriesSpec,
	XAxisSpec,
	XValue,
	YAxisSide,
	YAxisSpec,
} from "./types.js";
import type { EmptySlotPaintInput } from "./empty-slot.js";
import type { PaintContext } from "./paint-backend.js";
import { CHART_DECORATIVE_COLOR, cssSeriesColor } from "./colors.js";

/**
 * A composed `BarChart.EmptySlot`: its label, and the paint it brings, so a
 * chart without the part ships no empty-slot paint code.
 */
type EmptySlotSpec = {
	label: string;
	paint: (ctx: PaintContext, input: EmptySlotPaintInput) => void;
};

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
 * a pointer move re-renders only the tooltip subtree, never the chart Root.
 *
 * This module is internal shared implementation. The package does not export it.
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
	/** Each side's y axis configuration, `null` when no YAxis part names that side. */
	yAxes: Readonly<Record<YAxisSide, YAxisSpec | null>>;
	/** Reference lines in registration order. */
	referenceLines: ReferenceLineSpec[];
	/** The composed EmptySlot part's label and paint, `null` when none is composed. */
	emptySlot: EmptySlotSpec | null;
	/** Tooltip customization, `null` when no Tooltip part is composed. */
	tooltip: TooltipConfig | null;
	/** The bar direction the Root registered (DOM consumers: legend texture keys). */
	orientation: BarOrientation;
};

/**
 * What a registration changed, which picks the engine hook: `"series"` needs
 * a new ingest and `"presentation"` a repaint. `"tooltip"` calls no hook,
 * because the engine paints nothing from the tooltip config.
 */
type RegistrationChange = "series" | "presentation" | "tooltip";

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
		yAxes: { left: null, right: null },
		referenceLines: [],
		emptySlot: null,
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
	#yAxes: Record<YAxisSide, YAxisSpec | null> = { left: null, right: null };
	#referenceLines = new Map<string, { spec: ReferenceLineSpec; sequence: number }>();
	#referenceLineSequenceById = new Map<string, number>();
	#emptySlot: EmptySlotSpec | null = null;
	#tooltip: TooltipConfig | null = null;
	#hover: HoverSnapshot | null = null;
	#hoverEver = false;

	/** Whether the Root is decorative, so every mark paints the one neutral fill. */
	get decorative(): boolean {
		return this.#decorative;
	}

	/**
	 * Whether a hover was ever published. The Root mounts the tooltip surface
	 * on the first one and keeps it, so a chart nobody points at holds none.
	 */
	get hoverEver(): boolean {
		return this.#hoverEver;
	}

	/** Engine hook: series registrations changed, so columnar data must re-ingest. */
	onSeriesChange: (() => void) | null = null;
	/** Engine hook: presentation registrations changed, so a repaint suffices. */
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
		this.#publishRegistrations("series");
		return () => {
			const current = this.#seriesByKey.get(spec.dataKey);
			if (current?.spec === spec) {
				this.#seriesByKey.delete(spec.dataKey);
				this.#specs = null;
				this.#publishRegistrations("series");
			}
		};
	}

	/**
	 * Root-side: publish whether the chart is a decorative placeholder, which
	 * repaints every series with the one neutral fill.
	 *
	 * Publishing as a series change is what makes a runtime flip repaint. The
	 * engine's color cache keys on the theme, not on the series, and re-resolves
	 * only when an ingest sees a series' paint input change, which is exactly
	 * what this is.
	 */
	setDecorative(decorative: boolean): void {
		if (this.#decorative === decorative) {
			return;
		}
		this.#decorative = decorative;
		this.#publishRegistrations("series");
	}

	/** Root-side: publish the bar direction so DOM consumers (legend keys) can mirror it. */
	setOrientation(orientation: BarOrientation): void {
		if (this.#orientation === orientation) {
			return;
		}
		this.#orientation = orientation;
		this.#publishRegistrations();
	}

	/**
	 * Throw when a right-axis series cannot read a right axis: no `YAxis` with
	 * `side="right"`, no left-axis series beside it, a 3D plot, or a mark that
	 * would join the left axis's stack. The ingest and a dormant Root's commit
	 * both check it, once every part has registered.
	 */
	assertYAxes(options: {
		root: string;
		kind: SeriesMark;
		stacked: boolean;
		threeD: boolean;
	}): void {
		const specs = this.seriesSpecs();
		if (!specs.some((spec) => spec.yAxis === "right")) {
			return;
		}
		const { root, kind, stacked, threeD } = options;
		invariant(
			this.#yAxes.right != null,
			() => `A series with yAxis="right" needs a YAxis with side="right" inside ${root}.`,
		);
		invariant(
			specs.some((spec) => spec.yAxis === "left"),
			() =>
				`${root} has a series on its right axis and none on its left. Bind a chart's only y axis to the left.`,
		);
		invariant(!threeD, () => `yAxis="right" needs a 2D ${root}: a 3D plot has one value axis.`);
		invariant(
			!stacked || !specs.some((spec) => spec.mark === kind && spec.yAxis === "right"),
			() =>
				`${root} stacks the series on its left axis. Draw a right-axis series as a line, or remove \`stacked\`.`,
		);
	}

	registerGrid(lines: GridLines | undefined): () => void {
		// Singleton parts: last registration wins. Cleanup compares the exact
		// registration object, never its value: an equal-valued duplicate part
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

	registerYAxis(side: YAxisSide, spec: YAxisSpec): () => void {
		// Why a new object: a published snapshot holds the old one.
		this.#yAxes = { ...this.#yAxes, [side]: spec };
		this.#publishRegistrations();
		return () => {
			if (this.#yAxes[side] === spec) {
				this.#yAxes = { ...this.#yAxes, [side]: null };
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

	registerEmptySlot(spec: EmptySlotSpec): () => void {
		// Singleton part: last registration wins.
		this.#emptySlot = spec;
		this.#publishRegistrations();
		return () => {
			if (this.#emptySlot === spec) {
				this.#emptySlot = null;
				this.#publishRegistrations();
			}
		};
	}

	registerTooltip(config: TooltipConfig): () => void {
		// Singleton part: last registration wins.
		this.#tooltip = config;
		this.#publishRegistrations("tooltip");
		return () => {
			if (this.#tooltip === config) {
				this.#tooltip = null;
				this.#publishRegistrations("tooltip");
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
				yAxis: spec.yAxis,
			};
		});
	}

	#publishRegistrations(change: RegistrationChange = "presentation"): void {
		this.#snapshot = {
			// Why keep the old list on other changes: the legend and the data table
			// subscribe to `series` by identity, so an axis or tooltip registration
			// must not re-render them.
			series: change === "series" ? this.seriesMeta() : this.#snapshot.series,
			hover: this.#hover,
			grid: this.#grid,
			xAxis: this.#xAxis,
			yAxes: this.#yAxes,
			referenceLines: [...this.#referenceLines.values()]
				.toSorted((a, b) => a.sequence - b.sequence)
				.map((entry) => entry.spec),
			emptySlot: this.#emptySlot,
			tooltip: this.#tooltip,
			orientation: this.#orientation,
		};
		this.#emit();
		if (change === "series") {
			this.onSeriesChange?.();
		} else if (change === "presentation") {
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
