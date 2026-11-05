import { describe, expect, test } from "vitest";
import { decodeRing, fitWorld, formatCoordinates, robinson, toScreen } from "./geo.js";
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

	test("clamps latitudes past the poles", () => {
		expect(robinson(30, 120)).toEqual(robinson(30, 90));
	});
});

describe("fitWorld", () => {
	test("fits the tight side and centers the world in the plot", () => {
		// A 2:1 plot is wider than Robinson's 1.97:1, so the height decides the scale.
		const fit = fitWorld({ left: 10, top: 20, width: 800, height: 400 }, { inset: 0 });
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
		const fit = fitWorld({ left: 0, top: 0, width: 2000, height: 400 }, { inset: 2 });
		expect(toScreen(fit, 0, 90)[1]).toBeCloseTo(2, 6);
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
});
