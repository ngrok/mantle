/**
 * The Robinson projection and the world geometry `WorldMap` paints with it.
 *
 * Pure math, except {@link landPath} and its siblings, which build `Path2D`
 * objects for the renderer. Nothing here reads the DOM.
 *
 * This module is internal shared implementation — not exported from the package.
 */
import type { GeoLand } from "./types.js";
/**
 * Robinson's table (Snyder, _Map Projections: A Working Manual_, table 22),
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

/** Half the projected width, in projection units: the equator spans 2π. */
const ROBINSON_HALF_WIDTH = Math.PI;

/** Half the projected height, in projection units: the pole sits at the y factor. */
const ROBINSON_HALF_HEIGHT = ROBINSON_Y_FACTOR;

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
	const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
	// Keep +180 at the east edge instead of wrapping it to the west one.
	const lambda = (longitude === 180 ? 180 : wrapped) * DEGREES;
	const absolute = Math.min(90, Math.abs(latitude));
	const position = Math.min(18, absolute / 5);
	const index = Math.floor(position);
	const t = position - index;
	const below = ROBINSON_TABLE[index] ?? [1, 0];
	const at = ROBINSON_TABLE[index + 1] ?? [1, 0];
	const above = ROBINSON_TABLE[Math.min(19, index + 2)] ?? at;
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
 * Fits the whole world into a plot rectangle, centered, with `inset` pixels
 * clear on the tight side so the outline stroke stays whole.
 *
 * @example
 * ```ts
 * const fit = fitWorld({ left: 0, top: 0, width: 800, height: 400 }, { inset: 1 });
 * const [x, y] = toScreen(fit, -122.4, 37.8);
 * ```
 */
const fitWorld = (
	plot: { left: number; top: number; width: number; height: number },
	{ inset }: { inset: number },
): GeoFit => {
	const width = Math.max(0, plot.width - inset * 2);
	const height = Math.max(0, plot.height - inset * 2);
	return {
		scale: Math.min(width / (2 * ROBINSON_HALF_WIDTH), height / (2 * ROBINSON_HALF_HEIGHT)),
		centerX: plot.left + plot.width / 2,
		centerY: plot.top + plot.height / 2,
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

/** Each land's rings in projection units, decoded and projected once. */
const projectedLands = new WeakMap<GeoLand, readonly Float64Array[]>();

/**
 * A land's rings, decoded and projected to Robinson units as interleaved
 * `[x0, y0, x1, y1, …]`.
 */
const projectedLandRings = (land: GeoLand): readonly Float64Array[] => {
	const cached = projectedLands.get(land);
	if (cached != null) {
		return cached;
	}
	const projected = land.rings.map((encoded) => {
		const degrees = decodeRing(encoded, land.precision);
		const ring = new Float64Array(degrees.length);
		for (let index = 0; index < degrees.length; index += 2) {
			const [x, y] = robinson(degrees[index] ?? 0, degrees[index + 1] ?? 0);
			ring[index] = x;
			ring[index + 1] = y;
		}
		return ring;
	});
	projectedLands.set(land, projected);
	return projected;
};

/** Appends a ring of projection units to a path, in pixels. */
const traceRing = (path: Path2D, fit: GeoFit, ring: ArrayLike<number>, close: boolean): void => {
	for (let index = 0; index < ring.length; index += 2) {
		const x = fit.centerX + (ring[index] ?? 0) * fit.scale;
		const y = fit.centerY - (ring[index + 1] ?? 0) * fit.scale;
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

/**
 * The land, as one path in pixels. Fill it with the `"evenodd"` rule: the
 * rings carry lakes as holes.
 */
const landPath = (fit: GeoFit, land: GeoLand): Path2D => {
	const path = new Path2D();
	for (const ring of projectedLandRings(land)) {
		traceRing(path, fit, ring, true);
	}
	return path;
};

/** Samples a meridian from pole to pole in projection units, every `step` degrees of latitude. */
const meridian = (longitude: number, step: number): number[] => {
	const out: number[] = [];
	for (let latitude = 90; latitude >= -90; latitude -= step) {
		out.push(...robinson(longitude, latitude));
	}
	return out;
};

/**
 * The world's outline: the ±180° meridians joined by the two pole lines.
 * Robinson draws each pole as a line, not a point.
 */
const outlinePath = (fit: GeoFit): Path2D => {
	const east = meridian(180, 2.5);
	const west = meridian(-180, 2.5);
	const ring: number[] = [...east];
	// Walk the west edge from the south pole back up, so the ring does not cross itself.
	for (let index = west.length - 2; index >= 0; index -= 2) {
		ring.push(west[index] ?? 0, west[index + 1] ?? 0);
	}
	const path = new Path2D();
	traceRing(path, fit, ring, true);
	return path;
};

/**
 * Meridians and parallels every `step` degrees, without the outline. A
 * parallel is a straight line in Robinson, so it needs two points.
 */
const graticulePath = (fit: GeoFit, { step }: { step: number }): Path2D => {
	const path = new Path2D();
	for (let longitude = -180 + step; longitude < 180; longitude += step) {
		traceRing(path, fit, meridian(longitude, 2.5), false);
	}
	for (let latitude = -90 + step; latitude < 90; latitude += step) {
		traceRing(path, fit, [...robinson(-180, latitude), ...robinson(180, latitude)], false);
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

/** The projected width over height: about 1.97. */
const ROBINSON_ASPECT_RATIO = ROBINSON_HALF_WIDTH / ROBINSON_HALF_HEIGHT;

export type {
	//,
	GeoFit,
};
export {
	//,
	decodeRing,
	fitWorld,
	formatCoordinates,
	graticulePath,
	landPath,
	outlinePath,
	projectedLandRings,
	robinson,
	ROBINSON_ASPECT_RATIO,
	toScreen,
};
