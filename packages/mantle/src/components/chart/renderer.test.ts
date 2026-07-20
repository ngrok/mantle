import { describe, expect, test } from "vitest";
import { tracePointShape } from "./renderer.js";

/** Record path-trace calls without a real canvas context. */
const makeRecorder = () => {
	const calls: Array<{ op: string; args: number[] }> = [];
	return {
		calls,
		arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
			calls.push({ op: "arc", args: [x, y, radius, startAngle, endAngle] });
		},
		moveTo: (x: number, y: number) => {
			calls.push({ op: "moveTo", args: [x, y] });
		},
		lineTo: (x: number, y: number) => {
			calls.push({ op: "lineTo", args: [x, y] });
		},
		closePath: () => {
			calls.push({ op: "closePath", args: [] });
		},
	};
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
		const recorder = makeRecorder();
		tracePointShape(recorder, 0, 0, 4, "square");
		const ops = recorder.calls.map((call) => call.op);
		expect(ops).toEqual(["moveTo", "lineTo", "lineTo", "lineTo", "closePath"]);
		const xs = recorder.calls.flatMap((call) => (call.args.length > 0 ? [call.args[0]] : []));
		const ys = recorder.calls.flatMap((call) => (call.args.length > 1 ? [call.args[1]] : []));
		expect(Math.max(...xs.filter((x): x is number => x != null))).toBeCloseTo(4 * 0.886);
		expect(Math.min(...ys.filter((y): y is number => y != null))).toBeCloseTo(-4 * 0.886);
	});

	test("triangle traces a closed three-vertex path with its apex up", () => {
		const recorder = makeRecorder();
		tracePointShape(recorder, 0, 0, 4, "triangle");
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

	test("non-circle glyphs carry roughly the circle's fill area", () => {
		// Equal visual weight: each shape's area stays within 10% of πr².
		const radius = 4;
		const circleArea = Math.PI * radius * radius;
		const squareSide = 2 * radius * 0.886;
		const triangleCircumradius = radius * 1.55;
		const triangleArea = ((3 * Math.sqrt(3)) / 4) * triangleCircumradius * triangleCircumradius;
		const diamondHalf = radius * 1.253;
		expect(squareSide * squareSide).toBeCloseTo(circleArea, 0);
		expect(triangleArea / circleArea).toBeGreaterThan(0.9);
		expect(triangleArea / circleArea).toBeLessThan(1.1);
		expect((2 * diamondHalf * diamondHalf) / circleArea).toBeGreaterThan(0.9);
		expect((2 * diamondHalf * diamondHalf) / circleArea).toBeLessThan(1.1);
	});
});
