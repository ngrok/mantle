import invariant from "tiny-invariant";
import { datumValue, missingKeyMessage } from "./datum.js";
import type { GeoBounds, GeoFit, GeoLand } from "./geo.js";
import {
	connectorPath,
	fitBounds,
	graticulePath,
	landPath,
	outlinePath,
	toScreen,
	WORLD_BOUNDS,
} from "./geo.js";
import type { PaintContext, ResolvedPaint } from "./paint-backend.js";
import { MARKER_RADIUS } from "./renderer.js";
import type { DragEnd, DragMove, PointView, ScatterHit, ScatterHost } from "./scatter-engine.js";
import { drawScatterPoints, SCATTER_RECT_LIMIT } from "./scatter-renderer.js";
import { easeCubicOut } from "./tween.js";
import type { SeriesColor } from "./types.js";

/**
 * The world map's part of the chart engine: the Robinson paint, the hit test,
 * the connectors, and the callout placement. Only `WorldMap` passes
 * {@link createGeoViewFactory} to its Root, so no other chart loads this code
 * or the land outline.
 *
 * This module is internal shared implementation. The package does not export it.
 */

/** A place on Earth, in degrees. */
type GeoPlace = { longitude: number; latitude: number };

/** A line between two places, painted under the points. */
type GeoConnector = {
	from: GeoPlace;
	to: GeoPlace;
	color: SeriesColor;
	lineStyle: "dashed" | "solid";
};

/** An HTML element the view keeps over a place. */
type GeoCallout = {
	element: HTMLElement;
	place: GeoPlace;
	side: "top" | "bottom";
};

/** The pointer must land within this distance of a point to hit it. */
const HIT_RADIUS = 24;
/** The largest point radius, in CSS pixels: the point with the largest size value. */
const MAX_RADIUS = 16;
/** How long the ring around a newly arrived point grows and fades. */
const ARRIVAL_PULSE_MS = 900;
/** Past this many points the map stops tracking arrivals: a pulse among thousands says nothing. */
const ARRIVAL_TRACK_LIMIT = 5000;
/** The most pulses one map runs at once; a burst pulses its newest points. */
const ARRIVAL_PULSE_LIMIT = 48;
/** The smallest alpha that changes a canvas pixel: half of one 8-bit step. */
const MIN_VISIBLE_ALPHA = 1 / 510;
/** The gap between a callout and the edge of its point. */
const CALLOUT_GAP = 8;

/**
 * What the world map's React parts tell its view: the land, the region to
 * show, the connectors, and the callouts. A Root owns one scene for
 * its lifetime, so a view that the engine builds again reads the same parts.
 */
class GeoScene {
	land: GeoLand | null = null;
	bounds: GeoBounds | null = null;
	readonly connectors = new Map<string, GeoConnector>();
	readonly callouts = new Map<string, GeoCallout>();
	/** Increments on each change the canvas shows, so a view can key its caches on it. */
	version = 0;
	#listener: { paint: () => void; place: () => void } | null = null;

	/** Set the Root's inputs, and repaint. */
	configure(inputs: { land: GeoLand | null; bounds: GeoBounds | null }): void {
		this.land = inputs.land;
		this.bounds = inputs.bounds;
		this.changed();
	}

	/** Connect the current view. A new view replaces the last one. */
	listen(listener: { paint: () => void; place: () => void } | null): void {
		this.#listener = listener;
	}

	/** A change the canvas shows: the land, the region, or a connector. */
	changed(): void {
		this.version += 1;
		this.#listener?.paint();
	}

	/** A callout moved or changed size: place the callouts again, with no repaint. */
	calloutsChanged(): void {
		this.#listener?.place();
	}
}

/** Whether the paint context is a 2D canvas, which the map's `Path2D` layers need. */
const isCanvasContext = (ctx: PaintContext): ctx is PaintContext & CanvasRenderingContext2D =>
	"isPointInPath" in ctx;

/** Whether two fits place every pixel the same. */
const sameFit = (a: GeoFit, b: GeoFit): boolean =>
	a.scale === b.scale && a.centerX === b.centerX && a.centerY === b.centerY;

/** The land, outline, and graticule paths for one fit. */
type GeoLayers = {
	fit: GeoFit;
	land: GeoLand | null;
	landPath: Path2D;
	outline: Path2D;
	graticule: Path2D;
};

/** Consecutive points of one series in the paint order. */
type GeoRun = { seriesIndex: number; indexes: number[] };

/** The screen position of each point, per series, and the paint order (larger points first). */
type GeoPoints = {
	fit: GeoFit;
	columns: readonly Float64Array[];
	sizes: Float64Array;
	x: Float64Array[];
	y: Float64Array[];
	runs: GeoRun[];
	total: number;
};

/**
 * The world map state one engine owns. Each cache keys on the inputs that
 * change it, so a frame that only runs a pulse projects nothing again.
 */
class GeoView implements PointView {
	readonly kind = "geo";
	readonly #host: ScatterHost;
	readonly #scene: GeoScene;
	#now = 0;
	/** Each sorted row's size value (NaN = none), and the largest; empty without a size key. */
	#sizes = new Float64Array(0);
	#sizeMax = 0;
	#sizedFor: { columns: readonly Float64Array[]; sizeKey: string | null } | null = null;
	/** The current fit and the paths and positions built for it. */
	#fit: GeoFit | null = null;
	#layers: GeoLayers | null = null;
	#connectors: {
		fit: GeoFit;
		version: number;
		colors: ResolvedPaint;
		lines: { path: Path2D; color: string; dashed: boolean }[];
	} | null = null;
	#points: GeoPoints | null = null;
	#chrome: { colors: ResolvedPaint; land: string; ocean: string } | null = null;
	/** The points of the last ingest, keyed by series and place; `null` before the first. */
	#arrivalKeys: Set<string> | null = null;
	#arrivals: { seriesIndex: number; longitude: number; latitude: number; start: number }[] = [];

	constructor(host: ScatterHost, scene: GeoScene) {
		this.#host = host;
		this.#scene = scene;
		scene.listen({ paint: host.requestPaint, place: () => this.#placeCallouts() });
	}

	setDimensions(): void {}

	/** Motion stopped: drop the running pulses. */
	settle(): void {
		this.#arrivals = [];
	}

	tick(now: number): boolean {
		this.#now = now;
		return this.#arrivals.length > 0;
	}

	/** The engine ingested new rows: read the sizes, and pulse each new place. */
	resetProjection(): void {
		this.#sizesFor({ validate: true });
		this.#trackArrivals();
	}

	pressAt(): boolean {
		return false;
	}

	dragTo(): DragMove {
		return "none";
	}

	release(): DragEnd {
		return "none";
	}

	paintLabels(): void {}

	/**
	 * The ocean, the graticule when `Graticule` is composed, the land, the
	 * outline, the connectors, the points, then the pulse rings.
	 */
	paint(ctx: PaintContext): null {
		const colors = this.#host.colors();
		if (colors == null) {
			return null;
		}
		invariant(isCanvasContext(ctx), "WorldMap paints on the canvas backend only.");
		const fit = this.#currentFit();
		const layers = this.#layersFor(fit);
		const chrome = this.#chromeFor(colors);
		ctx.fillStyle = chrome.ocean;
		ctx.fill(layers.outline);
		if (this.#host.grid()) {
			ctx.save();
			ctx.clip(layers.outline);
			ctx.strokeStyle = colors.chrome.grid;
			ctx.lineWidth = 1;
			ctx.stroke(layers.graticule);
			ctx.restore();
		}
		ctx.fillStyle = chrome.land;
		ctx.fill(layers.landPath);
		ctx.strokeStyle = colors.chrome.grid;
		ctx.lineWidth = 1;
		ctx.stroke(layers.outline);

		for (const line of this.#connectorsFor(fit, colors)) {
			ctx.save();
			ctx.strokeStyle = line.color;
			ctx.lineWidth = 1.5;
			ctx.lineCap = "round";
			ctx.setLineDash(line.dashed ? [4, 4] : []);
			ctx.stroke(line.path);
			ctx.restore();
		}

		const specs = this.#host.specs();
		const points = this.#host.rowCount() === 0 || specs.length === 0 ? null : this.#pointsFor(fit);
		if (points == null) {
			this.#arrivals = [];
			return null;
		}
		// Why the cap: past the limit the renderer paints 2×2 squares, which drop the size each point shows.
		const totalPointCount =
			this.#sizes.length > 0 ? Math.min(points.total, SCATTER_RECT_LIMIT) : points.total;
		for (const { seriesIndex, indexes } of points.runs) {
			const spec = specs[seriesIndex];
			const xs = points.x[seriesIndex];
			const ys = points.y[seriesIndex];
			if (spec == null || xs == null || ys == null) {
				continue;
			}
			const reveal = this.#host.reveal(spec.dataKey);
			if (reveal < MIN_VISIBLE_ALPHA) {
				continue;
			}
			ctx.save();
			ctx.globalAlpha = reveal;
			drawScatterPoints(ctx, {
				color: colors.series.get(spec.dataKey) ?? "currentColor",
				surface: colors.chrome.surface,
				shape: this.#host.shape(spec.dataKey),
				totalPointCount,
				indexes,
				xAt: (index) => xs[index] ?? 0,
				yAt: (index) => ys[index] ?? 0,
				radiusAt: (index) => this.radiusAt(index),
			});
			ctx.restore();
		}

		// Why check each frame: `animate` or reduced motion can turn off while a ring grows.
		this.#arrivals = this.#host.animates()
			? this.#arrivals.filter((arrival) => this.#now - arrival.start < ARRIVAL_PULSE_MS)
			: [];
		for (const arrival of this.#arrivals) {
			const progress = easeCubicOut(Math.max(0, this.#now - arrival.start) / ARRIVAL_PULSE_MS);
			const [x, y] = toScreen(fit, arrival.longitude, arrival.latitude);
			const spec = specs[arrival.seriesIndex];
			ctx.save();
			ctx.globalAlpha = 0.6 * (1 - progress);
			ctx.strokeStyle =
				spec == null ? "currentColor" : (colors.series.get(spec.dataKey) ?? "currentColor");
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(x, y, MARKER_RADIUS + 14 * progress, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		return null;
	}

	/** The nearest point within {@link HIT_RADIUS} of the pointer, both inside the plot. */
	hitAt(cssX: number, cssY: number): ScatterHit | null {
		if (!this.#inPlot(cssX, cssY)) {
			return null;
		}
		const points = this.#pointsFor(this.#currentFit());
		const specs = this.#host.specs();
		let bestDistance = HIT_RADIUS * HIT_RADIUS;
		let best: ScatterHit | null = null;
		// Why the paint order backward: the point painted last is on top, so it wins a tie.
		for (const { seriesIndex, indexes } of points.runs.toReversed()) {
			const spec = specs[seriesIndex];
			const xs = points.x[seriesIndex];
			const ys = points.y[seriesIndex];
			if (spec == null || xs == null || ys == null) {
				continue;
			}
			for (let position = indexes.length - 1; position >= 0; position--) {
				const index = indexes[position] ?? 0;
				const screenX = xs[index] ?? 0;
				const screenY = ys[index] ?? 0;
				const distance = (screenX - cssX) ** 2 + (screenY - cssY) ** 2;
				// Why in the plot: the clip hides a point outside the region, so the pointer must not find it.
				if (distance < bestDistance && this.#inPlot(screenX, screenY)) {
					bestDistance = distance;
					best = { seriesKey: spec.dataKey, index, screenX, screenY };
				}
			}
		}
		return best;
	}

	/**
	 * The screen position of a row reached without a pointer: the point of
	 * `seriesKey`, else the row's first populated series. `null` when the place
	 * is outside the plot.
	 */
	screenFor(index: number, seriesKey: string | null = null): { x: number; y: number } | null {
		const points = this.#pointsFor(this.#currentFit());
		const columns = this.#host.columns();
		const specs = this.#host.specs();
		for (let seriesIndex = 0; seriesIndex < columns.length; seriesIndex++) {
			if (seriesKey != null && specs[seriesIndex]?.dataKey !== seriesKey) {
				continue;
			}
			if (!Number.isNaN(columns[seriesIndex]?.[index] ?? Number.NaN)) {
				const x = points.x[seriesIndex]?.[index] ?? 0;
				const y = points.y[seriesIndex]?.[index] ?? 0;
				return this.#inPlot(x, y) ? { x, y } : null;
			}
		}
		return null;
	}

	/** Whether a row has a point: a latitude in any series. The keyboard skips a row with none. */
	plots(index: number): boolean {
		return this.#host.columns().some((latitudes) => !Number.isNaN(latitudes[index] ?? Number.NaN));
	}

	/**
	 * The radius of the point at a sorted row index. Its area follows its size
	 * value, so the radius follows the square root, with {@link MARKER_RADIUS}
	 * as the floor so the smallest point stays a target.
	 */
	radiusAt(index: number): number {
		const size = this.#sizes[index];
		if (size == null || Number.isNaN(size) || this.#sizeMax <= 0) {
			return MARKER_RADIUS;
		}
		return Math.max(MARKER_RADIUS, MAX_RADIUS * Math.sqrt(size / this.#sizeMax));
	}

	#inPlot(x: number, y: number): boolean {
		const plot = this.#host.plot();
		return (
			x >= plot.left && x <= plot.left + plot.width && y >= plot.top && y <= plot.top + plot.height
		);
	}

	/** The region in the plot. A new fit places the callouts again. */
	#currentFit(): GeoFit {
		const plot = this.#host.plot();
		const bounds = this.#scene.bounds;
		const fit = fitBounds(plot, bounds ?? WORLD_BOUNDS, { inset: bounds == null ? 1 : 0 });
		const previous = this.#fit;
		if (previous != null && sameFit(previous, fit)) {
			return previous;
		}
		this.#fit = fit;
		this.#placeCallouts();
		return fit;
	}

	#layersFor(fit: GeoFit): GeoLayers {
		const land = this.#scene.land;
		const cached = this.#layers;
		if (cached != null && cached.fit === fit && cached.land === land) {
			return cached;
		}
		const layers = {
			fit,
			land,
			landPath: land == null ? new Path2D() : landPath(fit, land),
			outline: outlinePath(fit),
			graticule: graticulePath(fit, { step: 30 }),
		};
		this.#layers = layers;
		return layers;
	}

	// Why key on the colors object: a Root style override resolves new colors with the same theme signature.
	#chromeFor(colors: ResolvedPaint): { land: string; ocean: string } {
		const cached = this.#chrome;
		if (cached?.colors === colors) {
			return cached;
		}
		const chrome = {
			colors,
			land: colors.resolve("var(--world-map-land-color, var(--color-neutral-200))"),
			ocean: colors.resolve("var(--world-map-ocean-color, var(--color-neutral-50))"),
		};
		this.#chrome = chrome;
		return chrome;
	}

	#connectorsFor(
		fit: GeoFit,
		colors: ResolvedPaint,
	): readonly { path: Path2D; color: string; dashed: boolean }[] {
		const scene = this.#scene;
		const cached = this.#connectors;
		if (
			cached != null &&
			cached.fit === fit &&
			cached.version === scene.version &&
			cached.colors === colors
		) {
			return cached.lines;
		}
		const lines = [...scene.connectors.values()].map((connector) => ({
			path: connectorPath(fit, connector.from, connector.to),
			color: colors.resolve(connector.color),
			dashed: connector.lineStyle === "dashed",
		}));
		this.#connectors = { fit, version: scene.version, colors, lines };
		return lines;
	}

	/** The size column, read again when the rows or the size key change. */
	#sizesFor({ validate }: { validate: boolean }): void {
		const host = this.#host;
		const columns = host.columns();
		const sizeKey = host.sizeKey();
		const sized = this.#sizedFor;
		if (sized != null && sized.columns === columns && sized.sizeKey === sizeKey) {
			return;
		}
		this.#sizedFor = { columns, sizeKey };
		const count = host.rowCount();
		if (sizeKey == null) {
			this.#sizes = new Float64Array(0);
			this.#sizeMax = 0;
			return;
		}
		const sizes = new Float64Array(count);
		let max = 0;
		let found = false;
		for (let index = 0; index < count; index++) {
			const row = host.sourceRow(index);
			const raw = row == null ? undefined : datumValue(row, sizeKey);
			found ||= raw !== undefined;
			const value = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : Number.NaN;
			sizes[index] = value;
			if (value > max) {
				max = value;
			}
		}
		invariant(!validate || count === 0 || found, () =>
			missingKeyMessage("WorldMap.Root", "sizeKey", sizeKey, [host.sourceRow(0) ?? {}]),
		);
		this.#sizes = sizes;
		this.#sizeMax = max;
	}

	/** The screen positions and the paint order, built again when the fit, the rows, or the sizes change. */
	#pointsFor(fit: GeoFit): GeoPoints {
		this.#sizesFor({ validate: false });
		const host = this.#host;
		const columns = host.columns();
		const sizes = this.#sizes;
		const cached = this.#points;
		if (cached != null && cached.columns === columns && cached.sizes === sizes) {
			if (cached.fit === fit) {
				return cached;
			}
			// Why reuse the order: a resize moves every point but changes no size.
			const points = { ...cached, fit, ...this.#project(fit, columns) };
			this.#points = points;
			return points;
		}
		const runs = this.#paintRuns(columns);
		const points = {
			fit,
			columns,
			sizes,
			...this.#project(fit, columns),
			runs,
			total: runs.reduce((sum, run) => sum + run.indexes.length, 0),
		};
		this.#points = points;
		return points;
	}

	/**
	 * The paint order: each series in turn, or with a size key, every point by
	 * radius, largest first. Why one order across series: a large point of a
	 * later series must not cover a small point of an earlier one. The sort is
	 * stable, so a later series stays on top of an equal point.
	 */
	#paintRuns(columns: readonly Float64Array[]): GeoRun[] {
		const perSeries = columns.map((column) => this.#host.definedIndexes(column));
		if (this.#sizes.length === 0) {
			return perSeries.map((indexes, seriesIndex) => ({ seriesIndex, indexes }));
		}
		const order = perSeries
			.flatMap((indexes, seriesIndex) => indexes.map((index) => ({ seriesIndex, index })))
			.toSorted((a, b) => this.radiusAt(b.index) - this.radiusAt(a.index));
		const runs: GeoRun[] = [];
		for (const { seriesIndex, index } of order) {
			const last = runs.at(-1);
			if (last?.seriesIndex === seriesIndex) {
				last.indexes.push(index);
			} else {
				runs.push({ seriesIndex, indexes: [index] });
			}
		}
		return runs;
	}

	#project(
		fit: GeoFit,
		columns: readonly Float64Array[],
	): { x: Float64Array[]; y: Float64Array[] } {
		const longitudes = this.#host.xs();
		const count = this.#host.rowCount();
		const x: Float64Array[] = [];
		const y: Float64Array[] = [];
		for (const latitudes of columns) {
			const screenX = new Float64Array(count);
			const screenY = new Float64Array(count);
			for (let index = 0; index < count; index++) {
				const latitude = latitudes[index] ?? Number.NaN;
				if (Number.isNaN(latitude)) {
					continue;
				}
				const [px, py] = toScreen(fit, longitudes[index] ?? 0, latitude);
				screenX[index] = px;
				screenY[index] = py;
			}
			x.push(screenX);
			y.push(screenY);
		}
		return { x, y };
	}

	/**
	 * Compare the points of this ingest with the last one, and start a pulse
	 * for each point at a new place. The first ingest pulses nothing: the
	 * series reveal covers it. Reduced motion and `animate={false}` start none.
	 */
	#trackArrivals(): void {
		const host = this.#host;
		const count = host.rowCount();
		if (count > ARRIVAL_TRACK_LIMIT) {
			this.#arrivalKeys = null;
			this.#arrivals = [];
			return;
		}
		const previous = this.#arrivalKeys;
		const pulse = previous != null && host.animates();
		const now = performance.now();
		const longitudes = host.xs();
		const keys = new Set<string>();
		host.columns().forEach((latitudes, seriesIndex) => {
			const dataKey = host.specs()[seriesIndex]?.dataKey ?? "";
			for (let index = 0; index < count; index++) {
				const latitude = latitudes[index] ?? Number.NaN;
				if (Number.isNaN(latitude)) {
					continue;
				}
				const longitude = longitudes[index] ?? Number.NaN;
				const key = `${dataKey}|${longitude}|${latitude}`;
				keys.add(key);
				if (pulse && !previous.has(key)) {
					this.#arrivals.push({ seriesIndex, longitude, latitude, start: now });
				}
			}
		});
		if (this.#arrivals.length > ARRIVAL_PULSE_LIMIT) {
			this.#arrivals = this.#arrivals.slice(-ARRIVAL_PULSE_LIMIT);
		}
		this.#arrivalKeys = keys;
	}

	/**
	 * Put each callout over its place, above or below the point, kept inside
	 * the plot. A callout whose place is outside the plot hides. The callouts
	 * are the Root's children, so their positions add the plot's offset.
	 */
	#placeCallouts(): void {
		const fit = this.#fit;
		const callouts = this.#scene.callouts;
		if (fit == null || callouts.size === 0) {
			return;
		}
		const plot = this.#host.plot();
		const offset = this.#host.plotOffset();
		for (const { element, place, side } of callouts.values()) {
			const [x, y] = toScreen(fit, place.longitude, place.latitude);
			if (!this.#inPlot(x, y)) {
				element.style.visibility = "hidden";
				continue;
			}
			const width = element.offsetWidth;
			const height = element.offsetHeight;
			const reach = this.#largestRadiusAt(place) + CALLOUT_GAP;
			const left = Math.min(
				Math.max(x - width / 2, plot.left),
				Math.max(plot.left, plot.left + plot.width - width),
			);
			const above = y - reach - height;
			const below = y + reach;
			const fitsAbove = above >= plot.top;
			const fitsBelow = below + height <= plot.top + plot.height;
			// Why flip: a callout clamped on its own side would cover its point.
			const placeAbove = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
			const top = placeAbove
				? Math.max(plot.top, above)
				: Math.min(below, Math.max(plot.top, plot.top + plot.height - height));
			element.style.transform = `translate(${offset.left + left}px, ${offset.top + top}px)`;
			element.style.visibility = "visible";
		}
	}

	/** The radius of the largest point at a place, so a callout clears it. */
	#largestRadiusAt(place: GeoPlace): number {
		this.#sizesFor({ validate: false });
		if (this.#sizes.length === 0) {
			return MARKER_RADIUS;
		}
		const longitudes = this.#host.xs();
		let largest = MARKER_RADIUS;
		for (const latitudes of this.#host.columns()) {
			for (let index = 0; index < latitudes.length; index++) {
				if (longitudes[index] === place.longitude && latitudes[index] === place.latitude) {
					largest = Math.max(largest, this.radiusAt(index));
				}
			}
		}
		return largest;
	}
}

/**
 * Build the view factory for one world map Root. Pass a stable scene: the
 * engine may build a new view from the factory, and each reads the same parts.
 *
 * @example
 * ```ts
 * const [scene] = useState(() => new GeoScene());
 * const [geoView] = useState(() => createGeoViewFactory(scene));
 * ```
 */
const createGeoViewFactory =
	(scene: GeoScene) =>
	(host: ScatterHost): GeoView =>
		new GeoView(host, scene);

export type {
	//,
	GeoCallout,
	GeoConnector,
	GeoPlace,
};

export {
	//,
	createGeoViewFactory,
	GeoScene,
};
