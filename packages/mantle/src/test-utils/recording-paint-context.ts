import type { PaintContext } from "../components/chart/paint-backend.js";

/** One call on a paint context: the method name, then its arguments. */
type PaintCall = [method: string, ...args: unknown[]];

/**
 * A paint context that records each call it gets, for a test of a chart draw
 * routine. happy-dom has no 2D context, so the call list is the output that
 * such a test can read.
 *
 * @example
 * ```ts
 * const { context, calls } = recordingPaintContext();
 * drawScatterPoints(context, options);
 * expect(calls).toContainEqual(["arc", 10, 20, 4, 0, Math.PI * 2]);
 * ```
 */
const recordingPaintContext = (): { context: PaintContext; calls: PaintCall[] } => {
	const calls: PaintCall[] = [];
	const record =
		(method: string) =>
		(...args: unknown[]): void => {
			calls.push([method, ...args]);
		};
	const context: PaintContext = {
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 1,
		globalAlpha: 1,
		lineJoin: "miter",
		lineCap: "butt",
		font: "",
		textAlign: "start",
		textBaseline: "alphabetic",
		save: record("save"),
		restore: record("restore"),
		beginPath: record("beginPath"),
		closePath: record("closePath"),
		moveTo: record("moveTo"),
		lineTo: record("lineTo"),
		bezierCurveTo: record("bezierCurveTo"),
		rect: record("rect"),
		roundRect: record("roundRect"),
		arc: record("arc"),
		fill: record("fill"),
		stroke: record("stroke"),
		fillRect: record("fillRect"),
		clip: record("clip"),
		setLineDash: record("setLineDash"),
		fillText: record("fillText"),
		measureText: () => ({ width: 0 }),
	};
	return { context, calls };
};

export type { PaintCall };
export { recordingPaintContext };
