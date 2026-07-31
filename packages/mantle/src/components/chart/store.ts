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
 * claims the lowest slot no series holds, unmounting does not free it, and a
 * returning dataKey gets its old slot back — filtering a series out never
 * repaints the survivors (color follows the entity, not its row number).
 *
 * Every series that carries one identity spends one of the eight slots, so the
 * budget counts what a reader sees rather than what auto-assignment handed out.
 * A series with a custom CSS color paints that color and still spends a slot;
 * `#claimSlot` states what each color shape spends.
 *
 * `#slotByKey` is the whole ledger. A slot is spent exactly while a record names
 * it, so dropping a record hands the slot straight back. No separate claimed-set
 * or cursor can fall out of step with the ledger, and no slot can stay spent
 * with nobody holding it.
 *
 * Two things override stickiness:
 *
 * - A series pinning a chart token evicts the holder of that token, so an
 *   explicit pin wins its color regardless of registration order. This is the
 *   one path that repaints a mounted series, and a full palette can push the
 *   holder it displaces onto `chart-other`. It never moves a mounted series that
 *   pins the same token: pinned-vs-pinned is the consumer's explicit choice. Such
 *   a group holds that single slot between its members, not one slot each, so
 *   pinning one token across several series — each with its own `texture` —
 *   paints more series than the eight slots alone allow.
 * - Once every slot is held, an incoming series takes one back from an
 *   UNMOUNTED holder rather than falling to `chart-other`, oldest registration
 *   first. Without it the ledger holds slots for every dataKey still on the
 *   books, so a Root that swaps one series vocabulary for another paints the
 *   overflow gray while the chart shows two series. A slot a mounted series
 *   holds is never a candidate. The cost is that a reclaimed dataKey no longer
 *   returns to its original slot — stickiness holds for as long as the palette
 *   has room, which is the whole eight-slot budget.
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
	 * The slot each dataKey holds, kept past unmount so a returning dataKey gets
	 * its old color back. A slot is spent exactly while a record names it, which
	 * is the invariant every other method reads: `#freeSlot` looks for a slot no
	 * record names, and `#reclaimableSlot` looks for a record no mounted series
	 * needs. A dataKey that drops its record therefore releases its slot with no
	 * second structure to update.
	 *
	 * Only the eight palette slots are ever recorded. No record means the series
	 * wears the shared `chart-other` gray, whether it pinned the token or
	 * overflowed a full palette.
	 */
	#slotByKey = new Map<string, ChartColorToken>();
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
	 * Whether `dataKey`'s registered spec pins the very slot it holds, which makes
	 * the slot the series' own painted color.
	 *
	 * Derived from the spec rather than stored beside the slot. A pin is a fact
	 * about a mounted registration, so an unmounted holder pins nothing and its
	 * slot is free to move — a stored flag instead outlived the series that set
	 * it, and eviction then refused to move a token two records already named.
	 */
	#pinsItsSlot(dataKey: string): boolean {
		const held = this.#slotByKey.get(dataKey);
		return held != null && this.#seriesByKey.get(dataKey)?.spec.color === held;
	}

	/** Whether a mounted series holds `slot`, which puts it out of reach. */
	#heldByMounted(slot: ChartColorToken): boolean {
		for (const [dataKey, held] of this.#slotByKey) {
			if (held === slot && this.#seriesByKey.has(dataKey)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether another mounted series holds the slot `dataKey` holds.
	 *
	 * Two series may pin one token, and the store leaves both alone — so two
	 * records can name one slot, and one of them can outlive the pin that made it.
	 * The question is who holds the slot now, never who pins it: a key that stops
	 * pinning must let the slot go rather than keep an unpinned hold on it, or two
	 * mounted series end up painting the one color.
	 */
	#heldByAnotherMounted(dataKey: string): boolean {
		const held = this.#slotByKey.get(dataKey);
		if (held == null) {
			return false;
		}
		for (const other of this.#seriesByKey.keys()) {
			if (other !== dataKey && this.#slotByKey.get(other) === held) {
				return true;
			}
		}
		return false;
	}

	/** Whether any dataKey holds `slot`, mounted or not. */
	#held(slot: ChartColorToken): boolean {
		for (const held of this.#slotByKey.values()) {
			if (held === slot) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The first palette slot no dataKey holds, or `null` when all eight are spent.
	 *
	 * Scanned rather than tracked by a cursor. A cursor only moves forward, so it
	 * cannot see a slot that a dataKey released — and releasing a slot is the
	 * whole point of the reclaim.
	 */
	#freeSlot(): ChartColorToken | null {
		return SLOT_ORDER.find((slot) => !this.#held(slot)) ?? null;
	}

	/**
	 * The slot a dataKey holds that no mounted series needs — the one an incoming
	 * series takes rather than falling to `chart-other`.
	 *
	 * A candidate must be held by an unmounted dataKey AND held by no mounted one.
	 * Two records can name a single token: a pin arriving after a rename inherits
	 * the token the departed key still holds. So the second test reads the slot,
	 * not the key, which is what keeps a mounted series from repainting. Among
	 * candidates the longest-registered key gives its slot up first:
	 * `#sequenceByKey` already outlives unmount, so the order needs no new state.
	 *
	 * A pinned holder is a candidate too. Its token is the color it painted while
	 * mounted, so retiring the slot forever would starve the palette: a dashboard
	 * that pins eight providers and then regroups by API key would paint every
	 * series the overflow gray. If the pinned series remounts, its pin evicts
	 * whichever series took the token.
	 *
	 * The mounted set is what React last told the store, and React runs every
	 * layout-effect cleanup before any setup. A series that re-registers in the
	 * same commit that mounts a newcomer is therefore absent while the newcomer
	 * claims, so the newcomer can take its slot and push it to `chart-other`.
	 */
	#reclaimableSlot(): { dataKey: string; slot: ChartColorToken } | null {
		let oldest: { dataKey: string; slot: ChartColorToken; sequence: number } | null = null;
		for (const [dataKey, slot] of this.#slotByKey) {
			if (this.#seriesByKey.has(dataKey) || this.#heldByMounted(slot)) {
				continue;
			}
			const sequence = this.#sequenceByKey.get(dataKey) ?? Number.POSITIVE_INFINITY;
			if (oldest == null || sequence < oldest.sequence) {
				oldest = { dataKey, slot, sequence };
			}
		}
		return oldest == null ? null : { dataKey: oldest.dataKey, slot: oldest.slot };
	}

	/** The sticky slot for a dataKey (assigned on first registration). */
	#slotFor(dataKey: string): ChartColorToken {
		const existing = this.#slotByKey.get(dataKey);
		if (existing != null) {
			return existing;
		}
		// Skip a slot another series already holds, so an unpinned series never
		// claims a color that is spoken for. The reverse arrival order — a pin
		// registering after its token was auto-claimed — is handled by eviction in
		// `#claimSlot`.
		const free = this.#freeSlot();
		if (free != null) {
			this.#slotByKey.set(dataKey, free);
			return free;
		}
		// The ledger holds a slot for every dataKey still on the books, so a Root
		// that swaps one vocabulary for another spends the palette while the chart
		// shows two series. Take a slot back from an unmounted holder before falling
		// to the overflow gray.
		const reclaimed = this.#reclaimableSlot();
		if (reclaimed != null) {
			this.#slotByKey.delete(reclaimed.dataKey);
			this.#slotByKey.set(dataKey, reclaimed.slot);
			return reclaimed.slot;
		}
		// Every slot is on screen, so this series overflows to the shared gray and
		// records nothing. Recording it would strand the series: `chart-other` is no
		// palette slot, so the record could only shadow a real candidate in the
		// reclaim and hold the series gray for the Root's lifetime. With no record
		// the next registration takes a slot that has since come free.
		return "chart-other";
	}

	/**
	 * Take `token` back from every dataKey that holds it without pinning it,
	 * because `pinnedBy` just pinned it explicitly — a pin wins its color
	 * regardless of registration order. Idempotent: once no such holder is left
	 * this is a no-op, so effect re-runs of the pinned series never churn slots. A
	 * mounted series pinning the same token is left alone: pinned-vs-pinned
	 * collisions are the consumer's explicit choice.
	 *
	 * An unmounted holder gives the token up and takes nothing back. Handing it a
	 * fresh slot would spend the palette on a series no reader sees and permute
	 * the colors of the ones who do; it claims again when it remounts.
	 */
	#evictHoldersOf({ token, pinnedBy }: { token: ChartColorToken; pinnedBy: string }): void {
		const displaced = [...this.#slotByKey]
			.filter(
				([dataKey, held]) => held === token && dataKey !== pinnedBy && !this.#pinsItsSlot(dataKey),
			)
			.map(([dataKey]) => dataKey);
		for (const dataKey of displaced) {
			this.#slotByKey.delete(dataKey);
			if (this.#seriesByKey.has(dataKey)) {
				this.#slotFor(dataKey);
			}
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
	 * - A chart token — the slot IS the painted color, so nothing moves it while
	 *   the series is mounted.
	 * - Any other CSS color — the series paints that color and still spends a
	 *   slot, so the palette never hands an unpinned sibling a color the consumer
	 *   already put on screen. The slot is movable: the series does not paint it.
	 * - `chart-other` — the overflow gray is shared by every series past the
	 *   eighth, so pinning it spends nothing.
	 *
	 * A `color` prop can change between registrations, so each branch writes the
	 * dataKey's one record outright. The slot it held before goes back to the
	 * palette, because a slot is spent only while a record names it.
	 */
	#claimSlot(spec: SeriesSpec): void {
		if (spec.color === "chart-other") {
			this.#slotByKey.delete(spec.dataKey);
			return;
		}
		if (spec.color != null && isChartColorToken(spec.color)) {
			// Record the pin before evicting: that is what makes the token spent, so
			// a displaced holder cannot be handed the same slot straight back.
			this.#slotByKey.set(spec.dataKey, spec.color);
			this.#evictHoldersOf({ token: spec.color, pinnedBy: spec.dataKey });
			return;
		}
		if (this.#heldByAnotherMounted(spec.dataKey)) {
			// The series dropped a pin two series held, so its record still names a
			// slot someone else holds. Let go and take a slot of this series' own.
			this.#slotByKey.delete(spec.dataKey);
		}
		this.#slotFor(spec.dataKey);
	}

	registerSeries(spec: SeriesSpec): () => void {
		// A dataKey keeps its first-seen paint position and color slot for the
		// store's lifetime so toggling a series round-trips to the same slot.
		const sequence = this.#sequenceByKey.get(spec.dataKey) ?? this.#nextSequence++;
		this.#sequenceByKey.set(spec.dataKey, sequence);
		// Mount before claiming: `#pinsItsSlot` and `#heldByMounted` both read
		// `#seriesByKey`, so the mounted set has to include this series before
		// anything derives from it.
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
		return this.seriesSpecs().map((spec) => {
			const slot = this.#slotByKey.get(spec.dataKey) ?? "chart-other";
			return {
				dataKey: spec.dataKey,
				label: spec.label,
				mark: spec.mark,
				color: displayColor(spec.color, slot),
				colorInput: spec.color ?? slot,
				shape: spec.shape,
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
	ChartStore,
	displayColor,
};
