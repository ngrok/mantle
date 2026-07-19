import type { ComponentProps, ReactNode } from "react";
import type {
	ChartColorToken,
	GridLines,
	HoverSnapshot,
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
	/** Grid configuration, `null` when no Grid part is composed. */
	grid: { lines: GridLines } | null;
	/** X axis configuration, `null` when no XAxis part is composed. */
	xAxis: XAxisSpec | null;
	/** Y axis configuration, `null` when no YAxis part is composed. */
	yAxis: YAxisSpec | null;
	/** Reference lines in registration order. */
	referenceLines: ReferenceLineSpec[];
	/** Tooltip customization, `null` when no Tooltip part is composed. */
	tooltip: TooltipConfig | null;
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
 * Create the store a chart Root owns for its lifetime.
 *
 * Color slots are STICKY per `dataKey`: the first registration of a dataKey
 * claims the next never-used slot, unmounting does not free it, and a
 * returning dataKey gets its old slot back — filtering a series out never
 * repaints the survivors (color follows the entity, not its row number).
 * Unpinned series past the eighth slot all use `chart-other`; fold them into
 * an "Other" series or facet instead.
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
	};

	#seriesByKey = new Map<string, { spec: SeriesSpec; sequence: number }>();
	#sequenceByKey = new Map<string, number>();
	#slotByKey = new Map<string, ChartColorToken>();
	#claimedSlots = new Set<ChartColorToken>();
	#nextSequence = 0;
	#nextSlot = 0;

	#grid: { lines: GridLines } | null = null;
	#xAxis: XAxisSpec | null = null;
	#yAxis: YAxisSpec | null = null;
	#referenceLines = new Map<string, { spec: ReferenceLineSpec; sequence: number }>();
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

	/** The sticky slot for a dataKey (assigned on first registration). */
	slotFor(dataKey: string): ChartColorToken {
		const existing = this.#slotByKey.get(dataKey);
		if (existing != null) {
			return existing;
		}
		// Skip slots another series pinned explicitly, so an unpinned neighbor
		// never duplicates a pinned color.
		while (
			this.#nextSlot < SLOT_ORDER.length &&
			this.#claimedSlots.has(SLOT_ORDER[this.#nextSlot] ?? "chart-other")
		) {
			this.#nextSlot += 1;
		}
		const slot = SLOT_ORDER[this.#nextSlot] ?? "chart-other";
		if (this.#nextSlot < SLOT_ORDER.length) {
			this.#nextSlot += 1;
		}
		this.#slotByKey.set(dataKey, slot);
		this.#claimedSlots.add(slot);
		return slot;
	}

	registerSeries(spec: SeriesSpec): () => void {
		// A dataKey keeps its first-seen paint position and color slot for the
		// store's lifetime so toggling a series round-trips to the same slot.
		const sequence = this.#sequenceByKey.get(spec.dataKey) ?? this.#nextSequence++;
		this.#sequenceByKey.set(spec.dataKey, sequence);
		if (spec.color == null) {
			this.slotFor(spec.dataKey);
		} else if (isChartColorToken(spec.color) && spec.color !== "chart-other") {
			// A series pinning a chart token consumes that slot for auto-assignment.
			this.#claimedSlots.add(spec.color);
		}
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

	registerGrid(lines: GridLines): () => void {
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
		this.#referenceLines.set(id, { spec, sequence: this.#nextSequence++ });
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
		return this.seriesSpecs().map((spec) => ({
			dataKey: spec.dataKey,
			label: spec.label,
			mark: spec.mark,
			color: displayColor(spec.color, this.#slotByKey.get(spec.dataKey) ?? "chart-other"),
			colorInput: spec.color ?? this.#slotByKey.get(spec.dataKey) ?? "chart-other",
		}));
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
	displayColor,
};
