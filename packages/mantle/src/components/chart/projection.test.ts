import { describe, expect, test } from "vitest";
import {
	clampPitch,
	CUBE_CORNERS,
	CUBE_EDGES,
	normalizeToCube,
	projectionMatrix,
	projectPoint,
} from "./projection.js";

describe("projectPoint", () => {
	test("the identity camera maps x/y through unchanged (up to perspective)", () => {
		const matrix = projectionMatrix({ yaw: 0, pitch: 0 });
		const origin = projectPoint(0, 0, 0, matrix);
		expect(origin.x).toBe(0);
		expect(origin.y).toBe(0);
		expect(origin.depth).toBe(0);
		expect(origin.scale).toBe(1);

		const right = projectPoint(1, 0, 0, matrix);
		expect(right.x).toBeCloseTo(1, 10);
		expect(right.y).toBe(0);
	});

	test("depth orders points along the view axis", () => {
		const matrix = projectionMatrix({ yaw: 0, pitch: 0 });
		const near = projectPoint(0, 0, -1, matrix);
		const far = projectPoint(0, 0, 1, matrix);
		expect(near.depth).toBeLessThan(far.depth);
		// Weak perspective: nearer points render slightly larger.
		expect(near.scale).toBeGreaterThan(far.scale);
	});

	test("a quarter-turn yaw swaps x and z", () => {
		const matrix = projectionMatrix({ yaw: Math.PI / 2, pitch: 0 });
		const projected = projectPoint(1, 0, 0, matrix);
		// x rotates into the depth axis (toward the viewer).
		expect(projected.x).toBeCloseTo(0, 10);
		expect(projected.depth).toBeCloseTo(-1, 10);
	});

	test("pitch moves vertical position with depth", () => {
		const matrix = projectionMatrix({ yaw: 0, pitch: Math.PI / 4 });
		const top = projectPoint(0, 1, 0, matrix);
		expect(top.y).toBeCloseTo(Math.SQRT1_2 * top.scale, 10);
		expect(top.depth).toBeCloseTo(Math.SQRT1_2, 10);
	});

	test("rotation preserves distance from the origin (before perspective)", () => {
		const matrix = projectionMatrix({ yaw: 0.83, pitch: -0.41 });
		const projected = projectPoint(0.5, -0.3, 0.8, matrix);
		const viewX = projected.x / projected.scale;
		const viewY = projected.y / projected.scale;
		const length = Math.hypot(viewX, viewY, projected.depth);
		expect(length).toBeCloseTo(Math.hypot(0.5, -0.3, 0.8), 10);
	});
});

describe("clampPitch", () => {
	test("clamps within just under a quarter turn either way", () => {
		expect(clampPitch(10)).toBeLessThan(Math.PI / 2);
		expect(clampPitch(-10)).toBeGreaterThan(-Math.PI / 2);
		expect(clampPitch(0.3)).toBe(0.3);
	});
});

describe("normalizeToCube", () => {
	test("maps the domain onto [-1, 1]", () => {
		expect(normalizeToCube(50, [50, 100])).toBe(-1);
		expect(normalizeToCube(75, [50, 100])).toBe(0);
		expect(normalizeToCube(100, [50, 100])).toBe(1);
	});

	test("a degenerate domain maps to the cube center", () => {
		expect(normalizeToCube(5, [5, 5])).toBe(0);
	});
});

describe("cube geometry", () => {
	test("8 corners: every ±1 combination exactly once", () => {
		expect(CUBE_CORNERS.map((corner) => corner.join(",")).toSorted()).toEqual([
			"-1,-1,-1",
			"-1,-1,1",
			"-1,1,-1",
			"-1,1,1",
			"1,-1,-1",
			"1,-1,1",
			"1,1,-1",
			"1,1,1",
		]);
	});

	test("12 unique edges, each corner in exactly three of them", () => {
		// The property that makes the wireframe a cube. A typo in either endpoint
		// slot (`[0, 4]` → `[8, 4]`) indexes past CUBE_CORNERS and the 3D scatter
		// silently drops or NaN-paints that edge.
		expect(CUBE_EDGES).toHaveLength(12);
		const degrees = new Map<number, number>();
		for (const [from, to] of CUBE_EDGES) {
			for (const endpoint of [from, to]) {
				expect(endpoint).toBeGreaterThanOrEqual(0);
				expect(endpoint).toBeLessThan(CUBE_CORNERS.length);
				degrees.set(endpoint, (degrees.get(endpoint) ?? 0) + 1);
			}
			expect(from).not.toBe(to);
		}
		const undirected = new Set(CUBE_EDGES.map(([from, to]) => [from, to].toSorted().join("-")));
		expect(undirected.size).toBe(12);
		expect([...degrees.entries()].toSorted(([a], [b]) => a - b)).toEqual([
			[0, 3],
			[1, 3],
			[2, 3],
			[3, 3],
			[4, 3],
			[5, 3],
			[6, 3],
			[7, 3],
		]);
	});

	test("every edge joins two corners differing in exactly one axis", () => {
		for (const [from, to] of CUBE_EDGES) {
			const start = CUBE_CORNERS[from];
			const end = CUBE_CORNERS[to];
			if (start == null || end == null) {
				throw new Error(`edge [${from}, ${to}] references a corner that does not exist`);
			}
			const differing = start.filter((value, axis) => value !== end[axis]);
			expect(differing).toHaveLength(1);
		}
	});
});
