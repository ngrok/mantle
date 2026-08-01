import { describe, expect, test } from "vitest";
import type { PointShape } from "./types.js";
import { POINT_SHAPE_CLIP_PATHS } from "./engine.js";
import { tracePointShape } from "./renderer.js";

/** Record path-trace calls without a real canvas context. */
const makeRecorder = () => {
	const calls: Array<{ op: string; args: number[] }> = [];
	/** The polygon corners in winding order; an arc contributes none. */
	const vertices: Array<{ x: number; y: number }> = [];
	return {
		calls,
		vertices,
		arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
			calls.push({ op: "arc", args: [x, y, radius, startAngle, endAngle] });
		},
		moveTo: (x: number, y: number) => {
			calls.push({ op: "moveTo", args: [x, y] });
			vertices.push({ x, y });
		},
		lineTo: (x: number, y: number) => {
			calls.push({ op: "lineTo", args: [x, y] });
			vertices.push({ x, y });
		},
		closePath: () => {
			calls.push({ op: "closePath", args: [] });
		},
	};
};

/**
 * Every glyph the union carries, in slot order. The clip-path record is keyed
 * by the union, so the coverage test below fails the moment a ninth shape
 * ships without an entry here.
 */
const ALL_SHAPES = [
	"circle",
	"square",
	"triangle",
	"diamond",
	"triangle-down",
	"plus",
	"cross",
	"star",
] as const satisfies readonly PointShape[];

/** The shapes CSS has no basic-shape primitive for, so their clip is a polygon. */
const POLYGON_SHAPES = ALL_SHAPES.filter((shape) => shape !== "circle" && shape !== "square");

type Vertex = { x: number; y: number };

/** Trace one glyph centered on the origin, and return the recorder that watched it. */
const trace = (shape: PointShape, radius = 4) => {
	const recorder = makeRecorder();
	tracePointShape(recorder, 0, 0, radius, shape);
	return recorder;
};

/** The area a closed polygon encloses, by the shoelace formula. */
const polygonArea = (vertices: readonly Vertex[]): number => {
	let twiceArea = 0;
	for (let index = 0; index < vertices.length; index++) {
		const current = vertices[index];
		const next = vertices[(index + 1) % vertices.length];
		if (current == null || next == null) {
			continue;
		}
		twiceArea += current.x * next.y - next.x * current.y;
	}
	return Math.abs(twiceArea) / 2;
};

/**
 * A polygon rescaled onto the unit box its own extent spans, corners left in
 * their original order. Scale and position drop out, so a canvas path and a
 * CSS clip-path of the same shape become comparable.
 */
const unitVertices = (vertices: readonly Vertex[]): Vertex[] => {
	const xs = vertices.map((vertex) => vertex.x);
	const ys = vertices.map((vertex) => vertex.y);
	const minX = Math.min(...xs);
	const minY = Math.min(...ys);
	const spanX = Math.max(...xs) - minX;
	const spanY = Math.max(...ys) - minY;
	if (spanX === 0 || spanY === 0) {
		throw new Error("expected a polygon with area, got a degenerate one");
	}
	return vertices.map((vertex) => ({
		x: (vertex.x - minX) / spanX,
		y: (vertex.y - minY) / spanY,
	}));
};

/**
 * A polygon's corner set on that unit box, sorted. Winding drops out as well,
 * so two paths that visit the same corners in a different order compare equal
 * — pair this with {@link polygonArea} to pin the order too.
 */
const unitSilhouette = (vertices: readonly Vertex[]): string[] =>
	unitVertices(vertices)
		.map((vertex) => `${vertex.x.toFixed(3)},${vertex.y.toFixed(3)}`)
		.toSorted();

/** Read a `polygon(x% y%, …)` clip path back as fractions of its box. */
const parseClipPolygon = (clipPath: string): Vertex[] => {
	const body = /^polygon\((.*)\)$/.exec(clipPath)?.[1];
	if (body == null) {
		throw new Error(`expected a polygon clip path, got "${clipPath}"`);
	}
	return body.split(",").map((pair) => {
		const [rawX, rawY] = pair.trim().split(/\s+/);
		const x = Number.parseFloat(rawX ?? "");
		const y = Number.parseFloat(rawY ?? "");
		if (Number.isNaN(x) || Number.isNaN(y)) {
			throw new Error(`expected two percentages, got "${pair}"`);
		}
		return { x: x / 100, y: y / 100 };
	});
};

/** The distances from the center to each traced vertex, largest first. */
const vertexRadii = (vertices: readonly Vertex[]): number[] =>
	vertices.map((vertex) => Math.hypot(vertex.x, vertex.y)).toSorted((a, b) => b - a);

/** The ascending values in `numbers`, with floating-point neighbors folded together. */
const distinct = (numbers: readonly number[]): number[] => {
	const sorted = numbers.toSorted((a, b) => a - b);
	return sorted.filter(
		(value, index) => index === 0 || Math.abs(value - (sorted[index - 1] ?? 0)) > 1e-9,
	);
};

describe("tracePointShape", () => {
	test("circle traces a full arc at the given radius", () => {
		const recorder = makeRecorder();
		tracePointShape(recorder, 10, 20, 4, "circle");
		expect(recorder.calls).toHaveLength(1);
		expect(recorder.calls[0]?.op).toBe("arc");
		expect(recorder.calls[0]?.args.slice(0, 3)).toEqual([10, 20, 4]);
	});

	test("square traces a closed axis-aligned box centered on the point", () => {
		const recorder = trace("square");
		const ops = recorder.calls.map((call) => call.op);
		expect(ops).toEqual(["moveTo", "lineTo", "lineTo", "lineTo", "closePath"]);
		const xs = recorder.vertices.map((vertex) => vertex.x);
		const ys = recorder.vertices.map((vertex) => vertex.y);
		expect(Math.max(...xs)).toBeCloseTo(4 * 0.886);
		expect(Math.min(...ys)).toBeCloseTo(-4 * 0.886);
	});

	test("triangle traces a closed three-vertex path with its apex up", () => {
		const recorder = trace("triangle");
		const ops = recorder.calls.map((call) => call.op);
		expect(ops).toEqual(["moveTo", "lineTo", "lineTo", "closePath"]);
		// Apex above center: the moveTo y is negative (screen y grows downward).
		expect(recorder.calls[0]?.args[1]).toBeLessThan(0);
	});

	test("diamond traces a closed four-vertex path on the axes", () => {
		const recorder = makeRecorder();
		tracePointShape(recorder, 5, 5, 4, "diamond");
		const ops = recorder.calls.map((call) => call.op);
		expect(ops).toEqual(["moveTo", "lineTo", "lineTo", "lineTo", "closePath"]);
		// Vertices sit on the vertical/horizontal axes through the center.
		expect(recorder.calls[0]?.args[0]).toBe(5);
		expect(recorder.calls[1]?.args[1]).toBe(5);
	});

	test("triangle-down is the triangle mirrored across the horizontal axis", () => {
		// The pair reads as one reflection, so both must keep the 1.55r
		// circumradius. Scaling one alone would break the mirror and the area.
		const down = trace("triangle-down");
		const up = trace("triangle");
		expect(down.calls.map((call) => call.op)).toEqual(["moveTo", "lineTo", "lineTo", "closePath"]);
		// Apex below center, against the triangle's apex above it.
		expect(down.vertices[0]?.y).toBeGreaterThan(0);
		const flipped = down.vertices.map((vertex) => ({ x: vertex.x, y: -vertex.y }));
		expect(unitSilhouette(flipped)).toEqual(unitSilhouette(up.vertices));
		expect(polygonArea(down.vertices)).toBeCloseTo(polygonArea(up.vertices), 6);
	});

	test("plus traces a twelve-corner Greek cross whose arms are a third of its span", () => {
		// The arm ratio is the glyph's whole silhouette. At a quarter the 2px
		// surface ring eats the fill; at a half the cross reads as a square.
		const recorder = trace("plus");
		expect(recorder.vertices).toHaveLength(12);
		const extents = distinct(recorder.vertices.map((vertex) => Math.abs(vertex.x)));
		expect(extents).toHaveLength(2);
		const [armHalfWidth, halfExtent] = extents;
		if (armHalfWidth == null || halfExtent == null) {
			throw new Error("expected the cross to span two x extents");
		}
		expect(armHalfWidth * 3).toBeCloseTo(halfExtent, 9);
		// Four-fold symmetry: the y extents match the x extents.
		expect(distinct(recorder.vertices.map((vertex) => Math.abs(vertex.y)))).toEqual(extents);
	});

	test("cross is the plus turned 45°, corner for corner", () => {
		// Rotation keeps the area, so the pair paints equal ink. Widening the
		// cross to fill a square box instead would multiply its ink by 9/8.
		const cross = trace("cross");
		const plus = trace("plus");
		const rotated = plus.vertices.map((vertex) => ({
			x: (vertex.x - vertex.y) / Math.SQRT2,
			y: (vertex.x + vertex.y) / Math.SQRT2,
		}));
		expect(cross.vertices).toHaveLength(12);
		expect(vertexRadii(cross.vertices)).toEqual(
			vertexRadii(plus.vertices).map((radius) => expect.closeTo(radius, 6)),
		);
		expect(unitSilhouette(cross.vertices)).toEqual(unitSilhouette(rotated));
		expect(polygonArea(cross.vertices)).toBeCloseTo(polygonArea(plus.vertices), 6);
	});

	test("star traces ten corners alternating the outer radius with the 0.382 notch", () => {
		// The classic pentagram notch, the ratio d3's `symbolStar` uses. Opening
		// it blunts the points; closing it starves them under the surface ring.
		const recorder = trace("star");
		expect(recorder.vertices).toHaveLength(10);
		const radii = recorder.vertices.map((vertex) => Math.hypot(vertex.x, vertex.y));
		const outer = radii.filter((_radius, index) => index % 2 === 0);
		const inner = radii.filter((_radius, index) => index % 2 === 1);
		for (const radius of outer) {
			expect(radius).toBeCloseTo(outer[0] ?? 0, 6);
		}
		for (const radius of inner) {
			expect(radius).toBeCloseTo(inner[0] ?? 0, 6);
		}
		expect((inner[0] ?? 0) / (outer[0] ?? 1)).toBeCloseTo(0.382, 3);
		// Apex up: the first corner sits straight above the center.
		expect(recorder.vertices[0]?.x).toBeCloseTo(0, 6);
		expect(recorder.vertices[0]?.y).toBeLessThan(0);
	});

	test.each(ALL_SHAPES.filter((shape) => shape !== "circle"))(
		"%s fills the same area as the circle it replaces",
		(shape) => {
			// Equal ink per glyph is the whole point of the size constants: a shape
			// that paints heavier than its siblings reads as a bigger value.
			const radius = 4;
			const ratio = polygonArea(trace(shape, radius).vertices) / (Math.PI * radius * radius);
			expect(ratio).toBeGreaterThan(0.99);
			expect(ratio).toBeLessThan(1.01);
		},
	);

	test("every glyph traces its own path — no two shapes are the same drawing", () => {
		// A lookup table that points two entries at one tracer costs a series its
		// second identity channel while every other test stays green.
		const drawings = ALL_SHAPES.map((shape) =>
			trace(shape)
				.calls.map((call) => `${call.op}(${call.args.map((arg) => arg.toFixed(4)).join()})`)
				.join(" "),
		);
		expect(new Set(drawings).size).toBe(ALL_SHAPES.length);
	});
});

describe("point glyphs across the canvas and the CSS clip", () => {
	test("the clip-path table covers every glyph the canvas can trace", () => {
		expect(Object.keys(POINT_SHAPE_CLIP_PATHS).toSorted()).toEqual(ALL_SHAPES.toSorted());
	});

	test.each(POLYGON_SHAPES)("%s clips to the silhouette its canvas path traces", (shape) => {
		// The canvas paints the marks. The CSS clip cuts the hover dot and the
		// legend key. A reader compares them side by side, so a polygon that
		// drifts from its canvas twin labels one series two ways.
		const clipped = parseClipPolygon(POINT_SHAPE_CLIP_PATHS[shape]);
		const traced = trace(shape).vertices;
		expect(unitSilhouette(clipped)).toEqual(unitSilhouette(traced));
		// The corner sets are sorted, so they cannot see two corners swapped —
		// which clips a crossed, self-intersecting glyph out of the same corners.
		// Shoelace area on the same unit box does see it: a crossing changes the
		// area the outline encloses.
		expect(polygonArea(unitVertices(clipped))).toBeCloseTo(polygonArea(unitVertices(traced)), 3);
	});

	test("the circle and the square clip with the CSS basic shape each canvas path draws", () => {
		// The two glyphs CSS models directly: an arc pairs with `circle()`, an
		// axis-aligned box with `inset()`.
		expect(trace("circle").calls.map((call) => call.op)).toEqual(["arc"]);
		expect(POINT_SHAPE_CLIP_PATHS.circle).toMatch(/^circle\(/);
		expect(unitSilhouette(trace("square").vertices)).toEqual([
			"0.000,0.000",
			"0.000,1.000",
			"1.000,0.000",
			"1.000,1.000",
		]);
		expect(POINT_SHAPE_CLIP_PATHS.square).toMatch(/^inset\(/);
	});
});
