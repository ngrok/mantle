/**
 * Writes `src/components/world-map/world-land.ts`: the Natural Earth 110m land
 * outline that `WorldMap` paints, as polyline-encoded rings in tenths of a
 * degree.
 *
 * Run it from `packages/mantle` with `node ./scripts/generate-world-land.ts`.
 * The source is the `world-atlas` dev dependency (ISC). Natural Earth data is
 * public domain.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

type Position = [longitude: number, latitude: number];

type Topology = {
	transform: { scale: [number, number]; translate: [number, number] };
	arcs: [number, number][][];
	objects: { land: { geometries: [{ type: "MultiPolygon"; arcs: number[][][] }] } };
};

/** One tenth of a degree is about 11 km at the equator, below one pixel on a 1440px map. */
const PRECISION = 10;

const require = createRequire(import.meta.url);
const topology: Topology = JSON.parse(
	readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"),
);

const decodeArcs = ({ arcs, transform }: Topology): Position[][] => {
	const [scaleX, scaleY] = transform.scale;
	const [translateX, translateY] = transform.translate;
	return arcs.map((arc) => {
		let x = 0;
		let y = 0;
		return arc.map(([deltaX, deltaY]): Position => {
			x += deltaX;
			y += deltaY;
			return [x * scaleX + translateX, y * scaleY + translateY];
		});
	});
};

const arcs = decodeArcs(topology);

const ringFromArcs = (indexes: number[]): Position[] =>
	indexes.flatMap((arcIndex, position) => {
		const arc = arcIndex >= 0 ? arcs[arcIndex] : arcs[~arcIndex]?.toReversed();
		if (arc == null) {
			throw new Error(`world-atlas land-110m has no arc ${arcIndex}`);
		}
		// Consecutive arcs share their joining point.
		return position === 0 ? arc : arc.slice(1);
	});

/** The latitude where the segment from `from` to `to` meets the antimeridian. */
const crossingLatitude = (from: Position, to: Position): number => {
	const fromLongitude = from[0];
	// Unwrap `to` so the segment is short, then interpolate at ±180.
	const toLongitude = to[0] + (fromLongitude > 0 ? 360 : -360);
	const edge = fromLongitude > 0 ? 180 : -180;
	const t = (edge - fromLongitude) / (toLongitude - fromLongitude);
	return from[1] + t * (to[1] - from[1]);
};

/**
 * Cuts a ring at the antimeridian so each piece fills correctly on a plane.
 * Natural Earth 110m has rings with one crossing (Antarctica, which closes
 * along the pole) and with two (Fiji, Chukotka, Wrangel Island).
 */
const cutAtAntimeridian = (ring: Position[]): Position[][] => {
	const crossings: number[] = [];
	for (let index = 1; index < ring.length; index++) {
		const previous = ring[index - 1];
		const current = ring[index];
		if (previous != null && current != null && Math.abs(current[0] - previous[0]) > 180) {
			crossings.push(index);
		}
	}
	if (crossings.length === 0) {
		return [ring];
	}
	// Start the walk at the first crossing, so each piece is one contiguous run.
	const start = crossings[0] ?? 0;
	const open = ring.slice(0, -1);
	const walk = [...open.slice(start), ...open.slice(0, start)];
	const pieces: Position[][] = [];
	let piece: Position[] = [];
	for (let index = 0; index < walk.length; index++) {
		const current = walk[index];
		const next = walk[(index + 1) % walk.length];
		if (current == null || next == null) {
			continue;
		}
		piece.push(current);
		if (Math.abs(next[0] - current[0]) > 180) {
			const latitude = crossingLatitude(current, next);
			const edge = current[0] > 0 ? 180 : -180;
			piece.push([edge, latitude]);
			pieces.push(piece);
			piece = [[-edge, latitude]];
		}
	}
	if (crossings.length === 1) {
		// The ring goes around a pole: join both ends along the pole line.
		const [only] = pieces;
		if (only == null) {
			throw new Error("expected one piece for a ring with one crossing");
		}
		const joined = [...piece, ...only];
		const first = joined[0];
		const last = joined.at(-1);
		if (first == null || last == null) {
			throw new Error("empty polar ring");
		}
		const pole = Math.sign(first[1]) * 90;
		return [[...joined, [last[0], pole], [first[0], pole]]];
	}
	if (crossings.length !== 2) {
		throw new Error(`unsupported ring with ${crossings.length} antimeridian crossings`);
	}
	// Two crossings: the walk ends where it began, so the open tail closes the first piece.
	const [head] = pieces;
	if (head == null) {
		throw new Error("expected two pieces for a ring with two crossings");
	}
	return [[...piece, ...head], ...pieces.slice(1)];
};

/** Rounds to {@link PRECISION}, drops repeats, and keeps rings that still enclose an area. */
const quantize = (ring: Position[]): Position[] => {
	const out: Position[] = [];
	for (const [longitude, latitude] of ring) {
		const point: Position = [Math.round(longitude * PRECISION), Math.round(latitude * PRECISION)];
		const last = out.at(-1);
		if (last == null || last[0] !== point[0] || last[1] !== point[1]) {
			out.push(point);
		}
	}
	const first = out[0];
	const last = out.at(-1);
	if (
		out.length > 1 &&
		first != null &&
		last != null &&
		first[0] === last[0] &&
		first[1] === last[1]
	) {
		out.pop();
	}
	return out.length >= 3 ? out : [];
};

/** Google's polyline algorithm, on integers that are already scaled. */
const encodeSigned = (value: number): string => {
	let rest = value < 0 ? ~(value << 1) : value << 1;
	let out = "";
	while (rest >= 0x20) {
		out += String.fromCharCode((0x20 | (rest & 0x1f)) + 63);
		rest >>= 5;
	}
	return out + String.fromCharCode(rest + 63);
};

const encodeRing = (ring: Position[]): string => {
	let previousLongitude = 0;
	let previousLatitude = 0;
	let out = "";
	for (const [longitude, latitude] of ring) {
		out += encodeSigned(longitude - previousLongitude) + encodeSigned(latitude - previousLatitude);
		previousLongitude = longitude;
		previousLatitude = latitude;
	}
	return out;
};

const rings = topology.objects.land.geometries[0].arcs
	.flatMap((polygon) => polygon.map(ringFromArcs))
	.flatMap(cutAtAntimeridian)
	.map(quantize)
	.filter((ring) => ring.length > 0);

const pointCount = rings.reduce((sum, ring) => sum + ring.length, 0);
const encoded = rings.map(encodeRing);

const source = `import type { GeoLand } from "../chart/types.js";

/**
 * The Natural Earth 110m land outline (public domain, through world-atlas
 * 2.0.2), cut at the antimeridian. Each ring is polyline-encoded in tenths of
 * a degree, longitude first. ${rings.length} rings, ${pointCount} points.
 *
 * Only \`WorldMap\` imports it, so the other charts do not ship it.
 * Generated by \`scripts/generate-world-land.ts\`. Do not edit.
 *
 * This module is internal shared implementation — not exported from the package.
 */
const WORLD_LAND: GeoLand = {
	precision: ${PRECISION},
	rings: ${JSON.stringify(encoded)},
};

export {
	//,
	WORLD_LAND,
};
`;

writeFileSync(new URL("../src/components/world-map/world-land.ts", import.meta.url), source);
console.log(`world-land.ts: ${rings.length} rings, ${pointCount} points, ${source.length} bytes`);
