/**
 * The Robinson projection and the world geometry `WorldMap` paints with it.
 *
 * Pure math, except {@link worldPaths}, {@link placePath}, and
 * {@link connectorPath}, which build `Path2D` objects for the renderer.
 * Nothing here reads the DOM.
 *
 * This module is internal shared implementation. The package does not export it.
 */

/**
 * A land outline: polyline-encoded rings of longitude and latitude, in units
 * of `1 / precision` degrees. `WorldMap` passes the Natural Earth outline.
 */
type GeoLand = {
	precision: number;
	rings: readonly string[];
};

/**
 * A region of the world, in degrees: the west and east longitudes and the
 * south and north latitudes of its edges. `west` is less than `east`.
 */
type GeoBounds = {
	west: number;
	south: number;
	east: number;
	north: number;
};

/** A place on Earth, in degrees. */
type GeoPlace = { longitude: number; latitude: number };

/** The whole world, edge to edge. */
const WORLD_BOUNDS: GeoBounds = { west: -180, south: -90, east: 180, north: 90 };

/**
 * Robinson's table (Snyder and Voxland, _An Album of Map Projections_, 1989),
 * one row per 5° of latitude: the parallel length and the distance from the
 * equator, both relative to the equator. The first row mirrors 5° to −5° so
 * the interpolation at the equator has a row on each side. The same values
 * back d3-geo-projection's `geoRobinson`.
 */
const ROBINSON_TABLE: readonly (readonly [parallelLength: number, distance: number])[] = [
	[0.9986, -0.062],
	[1.0, 0.0],
	[0.9986, 0.062],
	[0.9954, 0.124],
	[0.99, 0.186],
	[0.9822, 0.248],
	[0.973, 0.31],
	[0.96, 0.372],
	[0.9427, 0.434],
	[0.9216, 0.4958],
	[0.8962, 0.5571],
	[0.8679, 0.6176],
	[0.835, 0.6769],
	[0.7986, 0.7346],
	[0.7597, 0.7903],
	[0.7186, 0.8435],
	[0.6732, 0.8936],
	[0.6213, 0.9394],
	[0.5722, 0.9761],
	[0.5322, 1.0],
];

/**
 * Robinson's y factor over his x factor (1.3523 / 0.8487), written the way
 * d3 does: (π / 2) × 1.0144. A distance of 1 maps to this many x units.
 */
const ROBINSON_Y_FACTOR = (Math.PI / 2) * 1.0144;

const DEGREES = Math.PI / 180;

/**
 * Projects a longitude and latitude (degrees) to Robinson units: x in
 * [−π, π] east-positive, y in [−1.5934, 1.5934] north-positive. Longitudes
 * outside ±180 wrap; latitudes clamp to ±90.
 *
 * Interpolation is d3's second-order central difference between the three
 * table rows around the latitude, so the two agree to floating-point error.
 *
 * @example
 * ```ts
 * robinson(0, 0); // [0, 0]
 * robinson(180, 90); // [π × 0.5322, 1.5934]
 * ```
 */
const robinson = (longitude: number, latitude: number): [x: number, y: number] => {
	// Why wrap only past the edges: the wrap rounds, and it would move a longitude just inside +180 to the west edge.
	const wrapped =
		Math.abs(longitude) <= 180 ? longitude : ((((longitude + 180) % 360) + 360) % 360) - 180;
	const lambda = wrapped * DEGREES;
	const position = Math.min(18, Math.abs(latitude) / 5);
	const index = Math.floor(position);
	const t = position - index;
	const below = ROBINSON_TABLE[index] ?? [1, 0];
	const at = ROBINSON_TABLE[index + 1] ?? [1, 0];
	const above = ROBINSON_TABLE[index + 2] ?? at;
	const interpolate = (column: 0 | 1): number =>
		at[column] +
		(t * (above[column] - below[column])) / 2 +
		(t * t * (above[column] - 2 * at[column] + below[column])) / 2;
	const y = ROBINSON_Y_FACTOR * interpolate(1);
	return [lambda * interpolate(0), latitude < 0 ? -y : y];
};

/**
 * How the projected world sits in a plot: a uniform scale and the pixel of
 * the projection's origin (0°, 0°).
 */
type GeoFit = {
	scale: number;
	centerX: number;
	centerY: number;
};

/**
 * Fits a region into a plot rectangle, centered, with `inset` pixels clear on
 * the tight side so the outline stroke stays whole. The region keeps its
 * aspect ratio, so the plot shows more of the map on the loose side. The map
 * ends at the antimeridian, so a region that reaches past ±180° stops there.
 *
 * @example
 * ```ts
 * const plot = { left: 0, top: 0, width: 800, height: 400 };
 * const fit = fitBounds(plot, { west: -15, south: 35, east: 35, north: 60 }, { inset: 0 });
 * const [x, y] = toScreen(fit, 13.4, 52.5); // Berlin
 * ```
 */
const fitBounds = (
	plot: { left: number; top: number; width: number; height: number },
	bounds: GeoBounds,
	{ inset }: { inset: number },
): GeoFit => {
	// Why the turn: a region wholly past the antimeridian is the same region whole turns back.
	const turn =
		bounds.west >= 180 || bounds.east <= -180 ? -360 * Math.floor((bounds.west + 180) / 360) : 0;
	const west = Math.max(-180, bounds.west + turn);
	const east = Math.min(180, bounds.east + turn);
	const { south, north } = bounds;
	// Why the corners and the equator: a parallel is longest at the equator, so
	// a region is widest at its latitude nearest the equator.
	const latitudes = south * north < 0 ? [south, 0, north] : [south, north];
	const xs = latitudes.flatMap((latitude) => [
		robinson(west, latitude)[0],
		robinson(east, latitude)[0],
	]);
	const ys = [robinson(0, south)[1], robinson(0, north)[1]];
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const width = Math.max(0, plot.width - inset * 2);
	const height = Math.max(0, plot.height - inset * 2);
	const scale = Math.min(width / Math.max(maxX - minX, 1e-9), height / Math.max(maxY - minY, 1e-9));
	return {
		scale,
		centerX: plot.left + plot.width / 2 - ((minX + maxX) / 2) * scale,
		centerY: plot.top + plot.height / 2 + ((minY + maxY) / 2) * scale,
	};
};

/**
 * Projects a longitude and latitude to a pixel in the fitted plot.
 *
 * @example
 * ```ts
 * const [x, y] = toScreen(fit, 13.4, 52.5); // Berlin
 * ```
 */
const toScreen = (fit: GeoFit, longitude: number, latitude: number): [x: number, y: number] => {
	const [x, y] = robinson(longitude, latitude);
	return [fit.centerX + x * fit.scale, fit.centerY - y * fit.scale];
};

/** Decodes one polyline-encoded ring to interleaved degrees: `[lng0, lat0, lng1, lat1, …]`. */
const decodeRing = (encoded: string, precision: number): number[] => {
	const out: number[] = [];
	const totals = [0, 0];
	let cursor = 0;
	let axis = 0;
	while (cursor < encoded.length) {
		let shift = 0;
		let value = 0;
		let byte: number;
		do {
			byte = encoded.charCodeAt(cursor) - 63;
			cursor += 1;
			value |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);
		const delta = value & 1 ? ~(value >> 1) : value >> 1;
		const total = (totals[axis] ?? 0) + delta;
		totals[axis] = total;
		out.push(total / precision);
		axis = 1 - axis;
	}
	return out;
};

/** Projects interleaved degrees to interleaved projection units. */
const projectRing = (degrees: readonly number[]): number[] => {
	const ring: number[] = [];
	for (let index = 0; index < degrees.length; index += 2) {
		ring.push(...robinson(degrees[index] ?? 0, degrees[index + 1] ?? 0));
	}
	return ring;
};

/** Appends a ring of interleaved projection units to a path. */
const traceRing = (path: Path2D, ring: readonly number[], close: boolean): void => {
	for (let index = 0; index < ring.length; index += 2) {
		const x = ring[index] ?? 0;
		const y = ring[index + 1] ?? 0;
		if (index === 0) {
			path.moveTo(x, y);
		} else {
			path.lineTo(x, y);
		}
	}
	if (close) {
		path.closePath();
	}
};

/** Samples a meridian from pole to pole in projection units, every 2.5° of latitude. */
const meridian = (longitude: number): number[] => {
	const out: number[] = [];
	for (let latitude = 90; latitude >= -90; latitude -= 2.5) {
		out.push(...robinson(longitude, latitude));
	}
	return out;
};

/**
 * The paths of one world in projection units: x to the east, y to the north.
 * {@link placePath} puts each in a plot.
 */
type WorldPaths = {
	/**
	 * The land. The ring of a lake winds against the land around it, so the
	 * default fill rule leaves the lake open.
	 */
	land: Path2D;
	/**
	 * The world's outline: the ±180° meridians joined by the two pole lines.
	 * Robinson draws each pole as a line, not a point.
	 */
	outline: Path2D;
	/**
	 * Meridians and parallels every 30°, without the outline. A parallel is a
	 * straight line in Robinson, so it needs two points.
	 */
	graticule: Path2D;
};

const worldPathsByLand = new WeakMap<GeoLand, WorldPaths>();

/**
 * A land's world paths. The first call for a land decodes, projects, and
 * traces it; each map that shows the land shares the result.
 *
 * @example
 * ```ts
 * ctx.fill(placePath(worldPaths(WORLD_LAND).land, fit));
 * ```
 */
const worldPaths = (land: GeoLand): WorldPaths => {
	const cached = worldPathsByLand.get(land);
	if (cached != null) {
		return cached;
	}
	const paths = { land: new Path2D(), outline: new Path2D(), graticule: new Path2D() };
	for (const encoded of land.rings) {
		traceRing(paths.land, projectRing(decodeRing(encoded, land.precision)), true);
	}
	const edge = meridian(180);
	const west = meridian(-180);
	// Walk the west edge from the south pole back up, so the ring does not cross itself.
	for (let index = west.length - 2; index >= 0; index -= 2) {
		edge.push(west[index] ?? 0, west[index + 1] ?? 0);
	}
	traceRing(paths.outline, edge, true);
	for (let longitude = -150; longitude < 180; longitude += 30) {
		traceRing(paths.graticule, meridian(longitude), false);
	}
	for (let latitude = -60; latitude < 90; latitude += 30) {
		traceRing(paths.graticule, projectRing([-180, latitude, 180, latitude]), false);
	}
	worldPathsByLand.set(land, paths);
	return paths;
};

/**
 * Places a path of projection units in a plot, as a new path in pixels.
 * Why `addPath`: the browser maps each point itself, so a new plot size does
 * not trace the land again in JavaScript.
 *
 * @example
 * ```ts
 * ctx.stroke(placePath(worldPaths(WORLD_LAND).outline, fit));
 * ```
 */
const placePath = (path: Path2D, fit: GeoFit): Path2D => {
	const placed = new Path2D();
	placed.addPath(path, { a: fit.scale, d: -fit.scale, e: fit.centerX, f: fit.centerY });
	return placed;
};

/** A unit vector on the sphere: x toward 0°E, y toward 90°E, z toward the north pole. */
const toUnit = (longitude: number, latitude: number): [number, number, number] => {
	const lambda = longitude * DEGREES;
	const phi = latitude * DEGREES;
	return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
};

/**
 * The great-circle route between two places, sampled every 2° of arc, as
 * pieces of interleaved degrees: `[lng0, lat0, lng1, lat1, …]`. A route that
 * crosses the antimeridian is cut there: one piece ends on the edge that the
 * route leaves, and the next piece starts on the opposite edge.
 *
 * @example
 * ```ts
 * greatCircle({ longitude: 139.7, latitude: 35.7 }, { longitude: -122.4, latitude: 37.8 });
 * // [[139.7, 35.7, …, 180, 48.2], [-180, 48.2, …, -122.4, 37.8]]
 * ```
 */
const greatCircle = (from: GeoPlace, to: GeoPlace): number[][] => {
	const a = toUnit(from.longitude, from.latitude);
	const b = toUnit(to.longitude, to.latitude);
	const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
	const angle = Math.acos(dot);
	const steps = Math.max(1, Math.ceil(angle / (2 * DEGREES)));
	const sin = Math.sin(angle);
	let piece: number[] = [];
	const pieces = [piece];
	for (let step = 0; step <= steps; step++) {
		const t = step / steps;
		// Why the guard: two equal places, or two exact antipodes, have no one arc, and the slerp divides by zero.
		const wa = sin < 1e-9 ? 1 - t : Math.sin((1 - t) * angle) / sin;
		const wb = sin < 1e-9 ? t : Math.sin(t * angle) / sin;
		const x = wa * a[0] + wb * b[0];
		const y = wa * a[1] + wb * b[1];
		const z = wa * a[2] + wb * b[2];
		const longitude = Math.atan2(y, x) / DEGREES;
		const latitude = Math.atan2(z, Math.hypot(x, y)) / DEGREES;
		const lastLongitude = piece.at(-2);
		const lastLatitude = piece.at(-1);
		if (
			lastLongitude != null &&
			lastLatitude != null &&
			Math.abs(longitude - lastLongitude) > 180
		) {
			const edge = lastLongitude > 0 ? 180 : -180;
			const share = (edge - lastLongitude) / (longitude + 2 * edge - lastLongitude);
			const crossing = lastLatitude + share * (latitude - lastLatitude);
			// Why the two tests: a sample on the antimeridian is its own edge point, and a copy of it would draw a dot.
			if (lastLongitude !== edge) {
				piece.push(edge, crossing);
			}
			piece = longitude === -edge ? [] : [-edge, crossing];
			pieces.push(piece);
		}
		piece.push(longitude, latitude);
	}
	return pieces;
};

/**
 * The great-circle route between two places, as a path in projection units.
 * Where the route crosses the antimeridian, the path runs to the edge of the
 * map and starts again at the opposite edge.
 *
 * @example
 * ```ts
 * ctx.stroke(placePath(connectorPath(chicago, ohio), fit));
 * ```
 */
const connectorPath = (from: GeoPlace, to: GeoPlace): Path2D => {
	const path = new Path2D();
	for (const piece of greatCircle(from, to)) {
		traceRing(path, projectRing(piece), false);
	}
	return path;
};

/** One coordinate to one decimal with its hemisphere letter. Zero takes no letter. */
const formatHemisphere = (value: number, [positive, negative]: [string, string]): string => {
	const rounded = Math.round(Math.abs(value) * 10) / 10;
	if (rounded === 0) {
		return "0.0°";
	}
	return `${rounded.toFixed(1)}° ${value < 0 ? negative : positive}`;
};

/**
 * Formats a coordinate pair for people: `"37.8° N, 122.4° W"`. One decimal
 * is about 11 km, finer than IP geolocation resolves.
 *
 * @example
 * ```ts
 * formatCoordinates(-122.42, 37.77); // "37.8° N, 122.4° W"
 * ```
 */
const formatCoordinates = (longitude: number, latitude: number): string =>
	`${formatHemisphere(latitude, ["N", "S"])}, ${formatHemisphere(longitude, ["E", "W"])}`;

export type {
	//,
	GeoBounds,
	GeoFit,
	GeoLand,
	GeoPlace,
};
export {
	//,
	connectorPath,
	decodeRing,
	fitBounds,
	WORLD_BOUNDS,
	formatCoordinates,
	greatCircle,
	placePath,
	robinson,
	toScreen,
	worldPaths,
};
