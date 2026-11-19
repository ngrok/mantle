import invariant from "tiny-invariant";
import { datumValue, missingKeyMessage } from "./datum.js";
import type { GeoBounds, GeoFit, GeoLand, GeoPlace } from "./geo.js";
import {
	connectorPath,
	fitBounds,
	placePath,
	robinson,
	toScreen,
	WORLD_BOUNDS,
	worldPaths,
} from "./geo.js";
import type { PaintContext } from "./paint-backend.js";
import { MARKER_RADIUS } from "./renderer.js";
import type { PointView, ScatterHit, ScatterHost } from "./scatter-engine.js";
import { drawScatterPoints, SCATTER_RECT_LIMIT } from "./scatter-renderer.js";
import { easeCubicOut } from "./tween.js";
import type { SeriesColor } from "./types.js";

/**
 * The world map's part of the chart engine: the Robinson paint, the hit test,
 * the connectors, and the callout placement. Only `WorldMap` builds a
 * {@link GeoScene}, so no other chart loads this code or the land outline.
 *
 * This module is internal shared implementation. The package does not export it.
 */

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
	/** The element's size in CSS pixels from its last size report; `null` before the first one. */
	size: { width: number; height: number } | null;
};

/** The pointer must land within this distance of a point to hit it. */
const HIT_RADIUS = 24;
/** The largest point radius, in CSS pixels: the point with the largest size value. */
const MAX_RADIUS = 16;
/** How long the ring around a newly arrived point grows and fades. */
const ARRIVAL_PULSE_MS = 900;
/** The ring's alpha when it starts. */
const ARRIVAL_PULSE_ALPHA = 0.6;
/** Past this many rows the map stops tracking arrivals: a pulse among thousands says nothing. */
const ARRIVAL_TRACK_LIMIT = 5000;
/** The most pulses one map runs at once. An update that adds more places plays none. */
const ARRIVAL_PULSE_LIMIT = 48;
/** The smallest alpha that changes a canvas pixel: half of one 8-bit step. */
const MIN_VISIBLE_ALPHA = 1 / 510;
/** The gap between a callout and the edge of its point. */
const CALLOUT_GAP = 8;

/** How far a ring has grown, from 0 to 1, at a time after its point arrived. */
const ringProgress = (elapsed: number): number =>
	easeCubicOut(Math.max(0, elapsed) / ARRIVAL_PULSE_MS);

/**
 * What the world map's React parts tell its view: the land, the region to
 * show, the connectors, and the callouts. A Root owns one scene for
 * its lifetime, so a view that the engine builds again reads the same parts.
 *
 * @example
 * ```tsx
 * const [scene] = useState(() => new GeoScene(WORLD_LAND, bounds ?? null));
 *
 * <ChartRootPrimitive scatterView={scene.createView} … />
 * ```
 */
class GeoScene {
	readonly land: GeoLand;
	bounds: GeoBounds | null;
	readonly connectors = new Map<string, GeoConnector>();
	readonly callouts = new Map<string, GeoCallout>();
	/** Increments on each change the canvas shows, so a view can key its caches on it. */
	version = 0;
	#listener: { paint: () => void; place: () => void } | null = null;

	constructor(land: GeoLand, bounds: GeoBounds | null) {
		this.land = land;
		this.bounds = bounds;
	}

	/** Builds the view of one engine. The function keeps one identity, so the Root's engine effect does not run again. */
	readonly createView = (host: ScatterHost): PointView => new GeoView(host, this);

	/** Show another region, or the whole world for `null`, and repaint. */
	setBounds(bounds: GeoBounds | null): void {
		this.bounds = bounds;
		this.changed();
	}

	/** Connect the current view. A new view replaces the last one. */
	listen(listener: { paint: () => void; place: () => void }): void {
		this.#listener = listener;
	}

	/** A change the canvas shows: the region or a connector. */
	changed(): void {
		this.version += 1;
		this.#listener?.paint();
	}

	/** A callout reported a new size: the next frame places the callouts again. */
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

/** The land, outline, and graticule paths in the pixels of one fit. */
type GeoLayers = {
	fit: GeoFit;
	land: Path2D;
	outline: Path2D;
	graticule: Path2D;
};

/** Consecutive points of one series in the paint order. */
type GeoRun = { seriesIndex: number; indexes: number[] };

/** Each point in projection units, per series, and the paint order (larger points first). */
type GeoPoints = {
	columns: readonly Float64Array[];
	x: Float64Array[];
	y: Float64Array[];
	runs: GeoRun[];
	total: number;
};

/** A ring that grows from a point at a new place. */
type GeoArrival = {
	seriesIndex: number;
	longitude: number;
	latitude: number;
	radius: number;
	start: number;
};

/**
 * The world map state one engine owns. Each cache keys on the inputs that
 * change it: the layers on the fit, and the points on the rows.
 */
class GeoView implements PointView {
	readonly kind = "geo";
	readonly #host: ScatterHost;
	readonly #scene: GeoScene;
	#now = 0;
	/** Each sorted row's point radius; empty without a size key. */
	#radii = new Float64Array(0);
	#fit: GeoFit | null = null;
	#layers: GeoLayers | null = null;
	#connectors: {
		fit: GeoFit;
		version: number;
		lines: { path: Path2D; color: SeriesColor; dashed: boolean }[];
	} | null = null;
	#points: GeoPoints | null = null;
	/** The points of the last ingest, keyed by series and place; `null` until a map has had rows. */
	#arrivalKeys: Set<string> | null = null;
	#arrivals: GeoArrival[] = [];
	/** A callout reported a new size, and the next paint places the callouts. */
	#calloutsMoved = false;

	constructor(host: ScatterHost, scene: GeoScene) {
		this.#host = host;
		this.#scene = scene;
		scene.listen({
			paint: host.requestPaint,
			// Why a frame: a size report comes from a `ResizeObserver` callback, and a
			// move there can resize an observed box in the same pass.
			place: () => {
				this.#calloutsMoved = true;
				host.requestPaint();
			},
		});
	}

	/** Motion stopped: drop the running pulses. */
	settle(): void {
		this.#arrivals = [];
	}

	/** Drop each ring that no longer changes a pixel. Returns `true` while a ring still grows. */
	tick(now: number): boolean {
		this.#now = now;
		// Why check each frame: `animate` or reduced motion can turn off while a ring grows.
		this.#arrivals = this.#host.animates()
			? this.#arrivals.filter(
					(arrival) =>
						ARRIVAL_PULSE_ALPHA * (1 - ringProgress(now - arrival.start)) >= MIN_VISIBLE_ALPHA,
				)
			: [];
		return this.#arrivals.length > 0;
	}

	/**
	 * The engine ingested new rows: read the sizes, pulse each new place, and
	 * move each callout clear of the point under it.
	 */
	resetProjection(): void {
		this.#readRadii();
		this.#trackArrivals();
		this.#placeCallouts();
	}

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
		if (this.#calloutsMoved) {
			this.#placeCallouts();
		}
		const layers = this.#layersFor(fit);
		ctx.fillStyle = colors.resolve("var(--world-map-ocean-color, var(--color-neutral-50))");
		ctx.fill(layers.outline);
		if (this.#host.grid()) {
			ctx.save();
			ctx.clip(layers.outline);
			ctx.strokeStyle = colors.chrome.grid;
			ctx.lineWidth = 1;
			ctx.stroke(layers.graticule);
			ctx.restore();
		}
		ctx.fillStyle = colors.resolve("var(--world-map-land-color, var(--color-neutral-200))");
		ctx.fill(layers.land);
		ctx.strokeStyle = colors.chrome.grid;
		ctx.lineWidth = 1;
		ctx.stroke(layers.outline);

		for (const line of this.#connectorsFor(fit)) {
			ctx.save();
			ctx.strokeStyle = colors.resolve(line.color);
			ctx.lineWidth = 1.5;
			ctx.lineCap = "round";
			ctx.setLineDash(line.dashed ? [4, 4] : []);
			ctx.stroke(line.path);
			ctx.restore();
		}

		const specs = this.#host.specs();
		if (this.#host.rowCount() === 0 || specs.length === 0) {
			this.#arrivals = [];
			return null;
		}
		const points = this.#pointsFor();
		// Why the cap: past the limit the renderer paints 2×2 squares, which drop the size each point shows.
		const totalPointCount =
			this.#radii.length > 0 ? Math.min(points.total, SCATTER_RECT_LIMIT) : points.total;
		const { scale, centerX, centerY } = fit;
		const radii = this.#radii;
		ctx.save();
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
			ctx.globalAlpha = reveal;
			drawScatterPoints(ctx, {
				color: colors.series.get(spec.dataKey) ?? "currentColor",
				surface: colors.chrome.surface,
				shape: this.#host.shape(spec.dataKey),
				totalPointCount,
				indexes,
				xAt: (index) => centerX + (xs[index] ?? 0) * scale,
				yAt: (index) => centerY - (ys[index] ?? 0) * scale,
				radiusAt: (index) => radii[index] ?? MARKER_RADIUS,
			});
		}
		ctx.restore();

		for (const arrival of this.#arrivals) {
			const progress = ringProgress(this.#now - arrival.start);
			const [x, y] = toScreen(fit, arrival.longitude, arrival.latitude);
			const spec = specs[arrival.seriesIndex];
			ctx.save();
			ctx.globalAlpha = ARRIVAL_PULSE_ALPHA * (1 - progress);
			ctx.strokeStyle =
				spec == null ? "currentColor" : (colors.series.get(spec.dataKey) ?? "currentColor");
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(x, y, arrival.radius + 14 * progress, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		return null;
	}

	/**
	 * The point under the pointer: the top point whose disc holds the pointer,
	 * else the nearest point within {@link HIT_RADIUS}. The pointer and the
	 * point are both inside the plot.
	 */
	hitAt(cssX: number, cssY: number): ScatterHit | null {
		if (!this.#inPlot(cssX, cssY)) {
			return null;
		}
		const { scale, centerX, centerY } = this.#currentFit();
		const points = this.#pointsFor();
		const specs = this.#host.specs();
		const radii = this.#radii;
		// Why projection units: the loop then tests each point with no multiply to place it.
		const unitX = (cssX - centerX) / scale;
		const unitY = (centerY - cssY) / scale;
		const perPixel = 1 / scale ** 2;
		let bestDistance = HIT_RADIUS ** 2 * perPixel;
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
				const x = xs[index] ?? 0;
				const y = ys[index] ?? 0;
				const distance = (x - unitX) ** 2 + (y - unitY) ** 2;
				// Why sized maps only: points of one size overlap only near one place, and the nearest center is right there.
				const onDisc = radii.length > 0 && distance <= (radii[index] ?? 0) ** 2 * perPixel;
				if (!onDisc && distance >= bestDistance) {
					continue;
				}
				const screenX = centerX + x * scale;
				const screenY = centerY - y * scale;
				// Why in the plot: the clip hides a point outside the region, so the pointer must not find it.
				if (!this.#inPlot(screenX, screenY)) {
					continue;
				}
				bestDistance = distance;
				best = { seriesKey: spec.dataKey, index, screenX, screenY };
				// Why stop: a pointer on a large point must not name a small neighbor with a nearer center.
				if (onDisc) {
					return best;
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
	screenFor(index: number, seriesKey: string | null): { x: number; y: number } | null {
		const fit = this.#currentFit();
		const points = this.#pointsFor();
		const columns = this.#host.columns();
		const specs = this.#host.specs();
		for (let seriesIndex = 0; seriesIndex < columns.length; seriesIndex++) {
			if (seriesKey != null && specs[seriesIndex]?.dataKey !== seriesKey) {
				continue;
			}
			if (!Number.isNaN(columns[seriesIndex]?.[index] ?? Number.NaN)) {
				const x = fit.centerX + (points.x[seriesIndex]?.[index] ?? 0) * fit.scale;
				const y = fit.centerY - (points.y[seriesIndex]?.[index] ?? 0) * fit.scale;
				return this.#inPlot(x, y) ? { x, y } : null;
			}
		}
		return null;
	}

	/**
	 * Whether the plot shows a point for a row: the row has a latitude, and the
	 * region holds the place. The keyboard skips a row with none.
	 */
	plots(index: number): boolean {
		return this.screenFor(index, null) != null;
	}

	/** The radius of the point at a sorted row index. */
	radiusAt(index: number): number {
		return this.#radii[index] ?? MARKER_RADIUS;
	}

	/** Whether a pixel is in the plot. Why half a pixel more: rounding puts a point on the region's own edge just outside it. */
	#inPlot(x: number, y: number): boolean {
		const plot = this.#host.plot();
		return (
			x >= plot.left - 0.5 &&
			x <= plot.left + plot.width + 0.5 &&
			y >= plot.top - 0.5 &&
			y <= plot.top + plot.height + 0.5
		);
	}

	/** The region in the plot. A new fit places the callouts again. */
	#currentFit(): GeoFit {
		const plot = this.#host.plot();
		const bounds = this.#scene.bounds;
		// Why half a pixel: the 1px outline stroke of the whole world then covers one row of pixels.
		const fit = fitBounds(plot, bounds ?? WORLD_BOUNDS, { inset: bounds == null ? 0.5 : 0 });
		const previous = this.#fit;
		if (previous != null && sameFit(previous, fit)) {
			return previous;
		}
		this.#fit = fit;
		this.#placeCallouts();
		return fit;
	}

	#layersFor(fit: GeoFit): GeoLayers {
		const cached = this.#layers;
		if (cached?.fit === fit) {
			return cached;
		}
		const world = worldPaths(this.#scene.land);
		const layers = {
			fit,
			land: placePath(world.land, fit),
			outline: placePath(world.outline, fit),
			graticule: placePath(world.graticule, fit),
		};
		this.#layers = layers;
		return layers;
	}

	#connectorsFor(fit: GeoFit): readonly { path: Path2D; color: SeriesColor; dashed: boolean }[] {
		const scene = this.#scene;
		const cached = this.#connectors;
		if (cached != null && cached.fit === fit && cached.version === scene.version) {
			return cached.lines;
		}
		const lines = [...scene.connectors.values()].map((connector) => ({
			path: placePath(connectorPath(connector.from, connector.to), fit),
			color: connector.color,
			dashed: connector.lineStyle === "dashed",
		}));
		this.#connectors = { fit, version: scene.version, lines };
		return lines;
	}

	/**
	 * Read each row's size value, and keep its point radius. A point's area
	 * follows its value, so the radius follows the square root, with
	 * {@link MARKER_RADIUS} as the floor so the smallest point stays a target.
	 */
	#readRadii(): void {
		const host = this.#host;
		const sizeKey = host.sizeKey();
		if (sizeKey == null) {
			this.#radii = new Float64Array(0);
			return;
		}
		const count = host.rowCount();
		const radii = new Float64Array(count);
		let max = 0;
		let found = false;
		for (let index = 0; index < count; index++) {
			const row = host.sourceRow(index);
			const raw = row == null ? undefined : datumValue(row, sizeKey);
			found ||= raw !== undefined;
			const size = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
			radii[index] = size;
			max = Math.max(max, size);
		}
		invariant(count === 0 || found, () =>
			missingKeyMessage(
				"WorldMap.Root",
				"sizeKey",
				sizeKey,
				Array.from({ length: count }, (_, index) => host.sourceRow(index) ?? {}),
			),
		);
		for (let index = 0; index < count; index++) {
			// Why `|| 1`: with no positive size, each value is 0 and takes the floor.
			radii[index] = Math.max(
				MARKER_RADIUS,
				MAX_RADIUS * Math.sqrt((radii[index] ?? 0) / (max || 1)),
			);
		}
		this.#radii = radii;
	}

	/** The projected points and the paint order, built again when the rows change. */
	#pointsFor(): GeoPoints {
		const columns = this.#host.columns();
		const cached = this.#points;
		if (cached?.columns === columns) {
			return cached;
		}
		const runs = this.#paintRuns(columns);
		const points = {
			columns,
			...this.#project(columns),
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
		if (this.#radii.length === 0) {
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

	/** Each point in projection units. The fit places them, so a new plot size projects nothing again. */
	#project(columns: readonly Float64Array[]): { x: Float64Array[]; y: Float64Array[] } {
		const longitudes = this.#host.xs();
		const count = this.#host.rowCount();
		const x: Float64Array[] = [];
		const y: Float64Array[] = [];
		for (const latitudes of columns) {
			const unitX = new Float64Array(count);
			const unitY = new Float64Array(count);
			for (let index = 0; index < count; index++) {
				const latitude = latitudes[index] ?? Number.NaN;
				if (Number.isNaN(latitude)) {
					continue;
				}
				const [px, py] = robinson(longitudes[index] ?? 0, latitude);
				unitX[index] = px;
				unitY[index] = py;
			}
			x.push(unitX);
			y.push(unitY);
		}
		return { x, y };
	}

	/**
	 * Compare the points of this ingest with the last one, and start a pulse
	 * for each point at a place its series did not have. The first rows of a
	 * map pulse nothing: the series reveal covers them. Reduced motion,
	 * `animate={false}`, and a map that is off screen start none.
	 */
	#trackArrivals(): void {
		const host = this.#host;
		const count = host.rowCount();
		const previous = this.#arrivalKeys;
		// Why an empty map before its first rows stays `null`: the reveal plays for those rows, and only once.
		if (count > ARRIVAL_TRACK_LIMIT || (count === 0 && previous == null)) {
			this.#arrivalKeys = null;
			this.#arrivals = [];
			return;
		}
		const pulse = previous != null && host.animates();
		const now = performance.now();
		const longitudes = host.xs();
		const keys = new Set<string>();
		// Why by key: rows that share one new place get one ring, at the radius of the largest of them.
		const arrivals = new Map<string, GeoArrival>();
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
					const radius = Math.max(this.radiusAt(index), arrivals.get(key)?.radius ?? 0);
					arrivals.set(key, { seriesIndex, longitude, latitude, radius, start: now });
				}
			}
		});
		// Why none past the limit: each place of one update is as new as the next, so no 48 of them are the newest.
		if (arrivals.size <= ARRIVAL_PULSE_LIMIT) {
			this.#arrivals = [...this.#arrivals, ...arrivals.values()].slice(-ARRIVAL_PULSE_LIMIT);
		}
		this.#arrivalKeys = keys;
	}

	/**
	 * Put each callout over its place, above or below the point, kept inside
	 * the plot, and write the side it sits on to `data-side`. A callout whose
	 * place is outside the plot hides, and one with no size report yet stays as
	 * it is. The callouts are the Root's children, so their positions add the
	 * plot's offset.
	 */
	#placeCallouts(): void {
		this.#calloutsMoved = false;
		const fit = this.#fit;
		const callouts = this.#scene.callouts;
		if (fit == null || callouts.size === 0) {
			return;
		}
		const plot = this.#host.plot();
		const offset = this.#host.plotOffset();
		for (const { element, place, side, size } of callouts.values()) {
			// Why no read here: the size comes from the callout's report, so a placement forces no layout.
			if (size == null) {
				continue;
			}
			const [x, y] = toScreen(fit, place.longitude, place.latitude);
			if (!this.#inPlot(x, y)) {
				element.style.visibility = "hidden";
				continue;
			}
			const { width, height } = size;
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
			element.dataset.side = placeAbove ? "top" : "bottom";
			// Why round: a callout between two pixels has a blurred border on a 1x display.
			element.style.transform = `translate(${Math.round(offset.left + left)}px, ${Math.round(offset.top + top)}px)`;
			element.style.visibility = "visible";
		}
	}

	/** The radius of the largest point at a place, so a callout clears it. */
	#largestRadiusAt(place: GeoPlace): number {
		if (this.#radii.length === 0) {
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

export {
	//,
	GeoScene,
};
