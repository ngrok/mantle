import { describe, expect, test } from "vitest";
import {
	decodeRing,
	fitBounds,
	formatCoordinates,
	greatCircle,
	robinson,
	toScreen,
	WORLD_BOUNDS,
} from "./geo.js";
import { WORLD_LAND } from "../world-map/world-land.js";

/** Robinson's y factor: 1.3523 / 0.8487, as (π / 2) × 1.0144. */
const Y_FACTOR = (Math.PI / 2) * 1.0144;

describe("robinson", () => {
	test("puts the origin at 0, 0", () => {
		const [x, y] = robinson(0, 0);
		expect(x).toBeCloseTo(0, 12);
		expect(y).toBeCloseTo(0, 12);
	});

	test("reads the table row exactly on a 5° latitude", () => {
		// Snyder's row for 45°: parallel length 0.8962, distance 0.5571.
		const [x, y] = robinson(90, 45);
		expect(x).toBeCloseTo((Math.PI / 2) * 0.8962, 10);
		expect(y).toBeCloseTo(Y_FACTOR * 0.5571, 10);
	});

	test("draws each pole as a line 0.5322 times the equator", () => {
		const [east, north] = robinson(180, 90);
		const [west, south] = robinson(-180, -90);
		expect(east).toBeCloseTo(Math.PI * 0.5322, 10);
		expect(west).toBeCloseTo(-Math.PI * 0.5322, 10);
		expect(north).toBeCloseTo(Y_FACTOR, 10);
		expect(south).toBeCloseTo(-Y_FACTOR, 10);
	});

	test("is continuous between table rows", () => {
		// The second-order interpolation meets the next row at t = 1.
		const [, below] = robinson(0, 49.999_999);
		const [, at] = robinson(0, 50);
		expect(below).toBeCloseTo(at, 6);
	});

	test("wraps longitudes past the antimeridian and keeps +180 on the east edge", () => {
		expect(robinson(190, 10)[0]).toBeCloseTo(robinson(-170, 10)[0], 12);
		expect(robinson(180, 10)[0]).toBeGreaterThan(0);
	});

	test("keeps the last longitude before +180 on the east edge", () => {
		// Why this value: it plus 180 rounds to 360, so the wrap arithmetic moves it to the west edge.
		expect(robinson(179.99999999999997, 0)[0]).toBeGreaterThan(0);
	});

	test("clamps latitudes past the poles", () => {
		expect(robinson(30, 120)).toEqual(robinson(30, 90));
	});
});

describe("fitBounds", () => {
	const plot = { left: 0, top: 0, width: 400, height: 200 };
	const widePlot = { left: 0, top: 0, width: 800, height: 400 };
	const region = { west: -105, south: 30, east: -65, north: 50 };

	test("fits the tight side and centers the world in the plot", () => {
		// A 2:1 plot is wider than Robinson's 1.97:1, so the height decides the scale.
		const fit = fitBounds({ left: 10, top: 20, width: 800, height: 400 }, WORLD_BOUNDS, {
			inset: 0,
		});
		const [, top] = toScreen(fit, 0, 90);
		const [, bottom] = toScreen(fit, 0, -90);
		const [left] = toScreen(fit, -180, 0);
		const [right] = toScreen(fit, 180, 0);
		expect(top).toBeCloseTo(20, 6);
		expect(bottom).toBeCloseTo(420, 6);
		expect((left + right) / 2).toBeCloseTo(410, 6);
		expect(right - left).toBeLessThan(800);
	});

	test("keeps the inset clear on the tight side", () => {
		const fit = fitBounds({ left: 0, top: 0, width: 2000, height: 400 }, WORLD_BOUNDS, {
			inset: 2,
		});
		expect(toScreen(fit, 0, 90)[1]).toBeCloseTo(2, 6);
	});

	test("centers the region and fills the tight side", () => {
		const fit = fitBounds(plot, region, { inset: 0 });
		const [, north] = toScreen(fit, -85, 50);
		const [, south] = toScreen(fit, -85, 30);
		// A region about 1.6 times as wide as tall fills a 2:1 plot's height.
		expect(north).toBeCloseTo(0, 0);
		expect(south).toBeCloseTo(200, 0);
		// A parallel is longer nearer the equator. West of Greenwich, that makes the
		// south-west and north-east corners the region's two ends in x.
		const [left] = toScreen(fit, -105, 30);
		const [right] = toScreen(fit, -65, 50);
		expect(left).toBeGreaterThan(0);
		expect((left + right) / 2).toBeCloseTo(200, 6);
	});

	test("fits a region that ends at +180, not the whole world", () => {
		const fit = fitBounds(widePlot, { west: -76.6, south: 20, east: 180, north: 60 }, { inset: 0 });
		// The region is widest on its south edge, the parallel nearest the equator.
		expect(toScreen(fit, -76.6, 20)[0]).toBeCloseTo(0, 6);
		expect(toScreen(fit, 180, 20)[0]).toBeCloseTo(800, 6);
	});

	// Why both sides: each edge has its own clamp.
	test.each([
		// Auckland, in a region that runs 14.76° past +180.
		{
			side: "east",
			bounds: { west: 154.76, south: -50, east: 194.76, north: -25 },
			longitude: 174.76,
		},
		{
			side: "west",
			bounds: { west: -194.76, south: -50, east: -154.76, north: -25 },
			longitude: -174.76,
		},
	])(
		"a region that reaches past the antimeridian on the $side stops there",
		({ bounds, longitude }) => {
			const fit = fitBounds(widePlot, bounds, { inset: 0 });
			// The part inside ±180 is narrower than 2:1, so it fills the plot's height.
			expect(toScreen(fit, longitude, -25)[1]).toBeCloseTo(0, 6);
			expect(toScreen(fit, longitude, -50)[1]).toBeCloseTo(400, 6);
			const [x] = toScreen(fit, longitude, -36.85);
			expect(x).toBeGreaterThan(0);
			expect(x).toBeLessThan(800);
		},
	);

	test.each([
		{ edge: "east", bounds: { west: 190, south: -50, east: 200, north: -30 }, longitude: 195 },
		{ edge: "west", bounds: { west: -200, south: -50, east: -190, north: -30 }, longitude: -195 },
	])(
		"a region wholly past the $edge edge fits as the same region one turn back",
		({ bounds, longitude }) => {
			const fit = fitBounds(widePlot, bounds, { inset: 0 });
			// The 10° region is narrower than 2:1, so it fills the plot's height.
			expect(toScreen(fit, longitude, -30)[1]).toBeCloseTo(0, 6);
			expect(toScreen(fit, longitude, -50)[1]).toBeCloseTo(400, 6);
		},
	);

	test("puts a place inside the region inside the plot, and one outside it outside", () => {
		const fit = fitBounds(plot, region, { inset: 0 });
		const [chicagoX, chicagoY] = toScreen(fit, -87.63, 41.88);
		expect(chicagoX).toBeGreaterThan(0);
		expect(chicagoX).toBeLessThan(400);
		expect(chicagoY).toBeGreaterThan(0);
		expect(chicagoY).toBeLessThan(200);
		expect(toScreen(fit, 13.4, 52.5)[0]).toBeGreaterThan(400);
	});
});

describe("greatCircle", () => {
	const tokyo = { longitude: 139.69, latitude: 35.69 };
	const sanFrancisco = { longitude: -122.42, latitude: 37.77 };
	const chicago = { longitude: -87.63, latitude: 41.88 };
	const ohio = { longitude: -82.99, latitude: 39.96 };

	/** The longitude and latitude a piece starts and ends on. */
	const endsOf = (piece: readonly number[] | undefined) => ({
		start: piece?.slice(0, 2),
		end: piece?.slice(-2),
	});

	test("returns one piece from the first place to the second", () => {
		const pieces = greatCircle(chicago, ohio);
		expect(pieces).toHaveLength(1);
		expect(endsOf(pieces[0])).toEqual({
			start: [expect.closeTo(-87.63, 9), expect.closeTo(41.88, 9)],
			end: [expect.closeTo(-82.99, 9), expect.closeTo(39.96, 9)],
		});
	});

	test("cuts a route across the antimeridian into a piece to one edge and a piece from the other", () => {
		const pieces = greatCircle(tokyo, sanFrancisco);
		expect(pieces).toHaveLength(2);
		// This great circle meets the antimeridian at 48.19° N.
		expect(endsOf(pieces[0])).toEqual({
			start: [expect.closeTo(139.69, 9), expect.closeTo(35.69, 9)],
			end: [180, expect.closeTo(48.19, 1)],
		});
		expect(endsOf(pieces[1])).toEqual({
			start: [-180, pieces[0]?.at(-1)],
			end: [expect.closeTo(-122.42, 9), expect.closeTo(37.77, 9)],
		});
	});

	test("cuts a hop shorter than one sample at the antimeridian", () => {
		// The hop is 1° long, under the 2° between samples, so the two places are its only samples.
		const pieces = greatCircle(
			{ longitude: 179.5, latitude: -17 },
			{ longitude: -179.5, latitude: -17 },
		);
		expect(pieces).toEqual([
			[expect.closeTo(179.5, 9), expect.closeTo(-17, 9), 180, expect.closeTo(-17, 9)],
			[-180, expect.closeTo(-17, 9), expect.closeTo(-179.5, 9), expect.closeTo(-17, 9)],
		]);
	});

	test("adds no second point at an end that is on the antimeridian", () => {
		// The route runs on the east side. A second point on the west edge would draw a dot there.
		const pieces = greatCircle({ longitude: -180, latitude: 10 }, { longitude: 170, latitude: 20 });
		expect(pieces).toHaveLength(2);
		expect(pieces[0]).toEqual([expect.closeTo(-180, 9), expect.closeTo(10, 9)]);
		expect(endsOf(pieces[1])).toEqual({
			start: [180, expect.closeTo(10, 9)],
			end: [expect.closeTo(170, 9), expect.closeTo(20, 9)],
		});
	});

	test("keeps each coordinate a number on a route along the antimeridian", () => {
		// Why these places: the cut between a sample at +180 and a sample at −180 divides zero by zero, and no piece may hold the result.
		const pieces = greatCircle({ longitude: 180, latitude: 10 }, { longitude: -180, latitude: 20 });
		expect(pieces.flat().filter((value) => Number.isNaN(value))).toEqual([]);
	});
});

describe("formatCoordinates", () => {
	test("names each hemisphere and rounds to a tenth of a degree", () => {
		expect(formatCoordinates(-122.42, 37.77)).toBe("37.8° N, 122.4° W");
		expect(formatCoordinates(151.21, -33.87)).toBe("33.9° S, 151.2° E");
	});

	test("gives zero no hemisphere", () => {
		expect(formatCoordinates(0.01, -0.04)).toBe("0.0°, 0.0°");
	});
});

describe("world land", () => {
	const rings = WORLD_LAND.rings.map((ring) => decodeRing(ring, WORLD_LAND.precision));

	test("decodes every ring to at least three valid coordinates", () => {
		const invalid = rings.filter(
			(ring) =>
				ring.length % 2 !== 0 ||
				ring.length < 6 ||
				ring.some((value, index) => Math.abs(value) > (index % 2 === 0 ? 180 : 90)),
		);
		expect(invalid).toEqual([]);
	});

	test("cuts every ring at the antimeridian, so no edge spans half the world", () => {
		// An uncut ring would fill a band across the whole map on a plane. The
		// one exception runs along a pole, which Robinson draws as a straight line.
		const wideEdges = rings.flatMap((ring) =>
			ring.flatMap((longitude, index) => {
				if (index % 2 === 1 || index === 0) {
					return [];
				}
				const latitude = ring[index + 1] ?? 0;
				const alongPole = Math.abs(latitude) === 90 && latitude === ring[index - 1];
				const span = Math.abs(longitude - (ring[index - 2] ?? 0));
				return span >= 180 && !alongPole ? [span] : [];
			}),
		);
		expect(wideEdges).toEqual([]);
	});

	test("closes Antarctica along the south pole", () => {
		const polar = rings.filter((ring) =>
			ring.some((value, index) => index % 2 === 1 && value === -90),
		);
		expect(polar).toHaveLength(1);
	});

	test("repeats no point back to back in a ring", () => {
		// Why: the generator drops each repeat. A repeat that is in the data is a
		// coordinate that was not a number, which the encoder writes as a zero step.
		const repeats = rings.flatMap((ring, ringIndex) =>
			ring.flatMap((longitude, index) => {
				const latitude = ring[index + 1];
				const repeated =
					index % 2 === 0 &&
					index >= 2 &&
					longitude === ring[index - 2] &&
					latitude === ring[index - 1];
				return repeated ? [{ ring: ringIndex, longitude, latitude }] : [];
			}),
		);
		expect(repeats).toEqual([]);
	});
});
