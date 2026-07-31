import type { ComponentProps, ReactNode } from "react";
import type {
	BarOrientation,
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
 * Create the store a chart Root owns for its lifetime.
 *
 * Color slots are STICKY per `dataKey`: the first registration of a dataKey
 * claims the next never-used slot, unmounting does not free it, and a
 * returning dataKey gets its old slot back — filtering a series out never
 * repaints the survivors (color follows the entity, not its row number).
 *
 * Every series that carries one identity spends one of the eight slots, so the
 * budget counts what a reader sees rather than what auto-assignment handed out.
 * A series with a custom CSS color paints that color and still spends a slot;
 * `#claimSlot` states what each color shape spends.
 *
 * Two things override stickiness:
 *
 * - A series pinning a chart token evicts the holder of that token (the evicted
 *   dataKey moves to the next free slot and stays sticky there), so an explicit
 *   pin wins its color regardless of registration order. This is the one path
 *   that repaints a mounted series. It moves only a holder whose slot is a
 *   reservation, never one that paints the token itself.
 * - Once the never-used slots run out, an incoming series takes a slot back
 *   from an UNMOUNTED holder rather than falling to `chart-other`, oldest
 *   registration first. Without it the cursor counts every dataKey the store
 *   has ever seen, so a Root that swaps one series vocabulary for another paints
 *   the overflow gray while the chart shows two series. A mounted series is
 *   never a candidate, which is what makes the reclaim safe by construction. The
 *   cost is that a reclaimed dataKey no longer returns to its original slot —
 *   stickiness holds for as long as the palette has room, which is the whole
 *   eight-slot budget.
 *
 * A chart that genuinely mounts more than eight series still paints the ninth
 * and later with `chart-other`; fold them into an "Other" series or facet
 * instead.
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
	/**
	 * The slot each dataKey holds. `pinned` marks a slot that IS the series'
	 * painted color, which eviction must never move; an unpinned entry is a
	 * budget reservation held by a series that paints the slot itself or paints a
	 * custom color. Both kinds outlive unmount, and both are reclaimable.
	 */
	#slotByKey = new Map<string, { slot: ChartColorToken; pinned: boolean }>();
	#claimedSlots = new Set<ChartColorToken>();
	#nextSequence = 0;
	#nextSlot = 0;

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
	 * The auto-assigned slot a dataKey holds that no mounted series needs — the
	 * one an incoming series takes rather than falling to `chart-other`.
	 *
	 * Only an unmounted holder is a candidate, which is what keeps a mounted
	 * series from ever repainting. Among candidates the longest-registered key
	 * gives its slot up first: `#sequenceByKey` already outlives unmount, so the
	 * order needs no new state and does not depend on unmount timing.
	 *
	 * A pinned holder is a candidate too. Its token is the color it painted while
	 * mounted, so retiring the slot forever would starve the palette: a dashboard
	 * that pins eight providers and then regroups by API key would paint every
	 * series the overflow gray. If the pinned series remounts, its pin evicts
	 * whichever series took the token.
	 */
	#reclaimableSlot(): { dataKey: string; slot: ChartColorToken } | null {
		let oldest: { dataKey: string; slot: ChartColorToken; sequence: number } | null = null;
		for (const [dataKey, held] of this.#slotByKey) {
			if (this.#seriesByKey.has(dataKey)) {
				continue;
			}
			const sequence = this.#sequenceByKey.get(dataKey) ?? Number.POSITIVE_INFINITY;
			if (oldest == null || sequence < oldest.sequence) {
				oldest = { dataKey, slot: held.slot, sequence };
			}
		}
		return oldest == null ? null : { dataKey: oldest.dataKey, slot: oldest.slot };
	}

	/** The sticky slot for a dataKey (assigned on first registration). */
	slotFor(dataKey: string): ChartColorToken {
		const existing = this.#slotByKey.get(dataKey);
		if (existing != null) {
			return existing.slot;
		}
		// Skip slots another series pinned explicitly, so an unpinned series
		// never claims a pinned color. The reverse arrival order — a pin
		// registering after its token was auto-claimed — is handled by eviction
		// in `registerSeries`.
		while (
			this.#nextSlot < SLOT_ORDER.length &&
			this.#claimedSlots.has(SLOT_ORDER[this.#nextSlot] ?? "chart-other")
		) {
			this.#nextSlot += 1;
		}
		if (this.#nextSlot >= SLOT_ORDER.length) {
			// The cursor counts every dataKey the store has ever seen, so a Root that
			// swaps one vocabulary for another runs out of never-used slots while the
			// chart shows two series. Take a slot back from an unmounted holder
			// before falling to the overflow gray.
			const reclaimed = this.#reclaimableSlot();
			if (reclaimed != null) {
				this.#slotByKey.delete(reclaimed.dataKey);
				this.#slotByKey.set(dataKey, { slot: reclaimed.slot, pinned: false });
				return reclaimed.slot;
			}
		}
		const slot = SLOT_ORDER[this.#nextSlot] ?? "chart-other";
		if (this.#nextSlot < SLOT_ORDER.length) {
			this.#nextSlot += 1;
		}
		this.#slotByKey.set(dataKey, { slot, pinned: false });
		this.#claimedSlots.add(slot);
		return slot;
	}

	/**
	 * Move the dataKey holding `token` as a reservation (if any) to the next free
	 * slot because `pinnedBy` just pinned that token explicitly — a pin wins its
	 * color regardless of registration order. Idempotent: once no other dataKey
	 * holds the token as a reservation this is a no-op, so effect re-runs of the
	 * pinned series never churn slots. Another pin of the same token is left
	 * alone: pinned-vs-pinned collisions are the consumer's explicit choice.
	 */
	#evictReservedSlot({ token, pinnedBy }: { token: ChartColorToken; pinnedBy: string }): void {
		for (const [dataKey, held] of this.#slotByKey) {
			if (held.slot !== token || dataKey === pinnedBy || held.pinned) {
				continue;
			}
			this.#slotByKey.delete(dataKey);
			this.slotFor(dataKey);
			// `slotFor` never assigns an already-claimed token, so at most one
			// reservation holder can exist per token.
			return;
		}
	}

	/**
	 * Take the slot this series spends out of circulation.
	 *
	 * One series carries one identity, so it spends one of the eight slots and the
	 * budget counts the series a reader sees:
	 *
	 * - No `color` — the series paints its slot. A later pin of that token may
	 *   move it.
	 * - A chart token — the slot IS the painted color, so nothing moves it.
	 * - Any other CSS color — the series paints that color and still spends a
	 *   slot, so an unpinned sibling is never handed a color the consumer already
	 *   put on screen. The reservation is movable, because the series does not
	 *   paint it.
	 * - `chart-other` — the overflow gray is shared by every series past the
	 *   eighth, so pinning it spends nothing.
	 */
	#claimSlot(spec: SeriesSpec): void {
		if (spec.color === "chart-other") {
			return;
		}
		if (spec.color != null && isChartColorToken(spec.color)) {
			this.#claimedSlots.add(spec.color);
			this.#slotByKey.set(spec.dataKey, { slot: spec.color, pinned: true });
			this.#evictReservedSlot({ token: spec.color, pinnedBy: spec.dataKey });
			return;
		}
		const held = this.#slotByKey.get(spec.dataKey);
		if (held?.pinned) {
			// The series pinned a token on an earlier registration and now carries a
			// custom color, so its slot goes back to a movable reservation.
			this.#slotByKey.set(spec.dataKey, { slot: held.slot, pinned: false });
			return;
		}
		this.slotFor(spec.dataKey);
	}

	registerSeries(spec: SeriesSpec): () => void {
		// A dataKey keeps its first-seen paint position and color slot for the
		// store's lifetime so toggling a series round-trips to the same slot.
		const sequence = this.#sequenceByKey.get(spec.dataKey) ?? this.#nextSequence++;
		this.#sequenceByKey.set(spec.dataKey, sequence);
		// Mount before claiming: `#reclaimableSlot` reads `#seriesByKey` to tell an
		// unmounted holder from a mounted one, so a series that is not there yet
		// looks reclaimable to its own registration. A remounting pin would hand its
		// token straight back to whichever series took it.
		this.#seriesByKey.set(spec.dataKey, { spec, sequence });
		this.#claimSlot(spec);
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
		return this.seriesSpecs().map((spec) => ({
			dataKey: spec.dataKey,
			label: spec.label,
			mark: spec.mark,
			color: displayColor(spec.color, this.#slotByKey.get(spec.dataKey)?.slot ?? "chart-other"),
			colorInput: spec.color ?? this.#slotByKey.get(spec.dataKey)?.slot ?? "chart-other",
			shape: spec.shape,
			texture: spec.texture,
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
	displayColor,
};
