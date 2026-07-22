import { describe, expect, test } from "vitest";
import { textureInkColor, TEXTURE_TILE_SIZE, traceDiagonalLines } from "./texture.js";

/** Record traced line segments without a real canvas context. */
const makeRecorder = () => {
	const segments: Array<{ from: [number, number]; to: [number, number] }> = [];
	let current: [number, number] | null = null;
	return {
		segments,
		moveTo: (x: number, y: number) => {
			current = [x, y];
		},
		lineTo: (x: number, y: number) => {
			if (current != null) {
				segments.push({ from: current, to: [x, y] });
			}
			current = [x, y];
		},
	};
};

describe("traceDiagonalLines", () => {
	test('the "up" family is three parallel 45° segments (slope -1, rendering like /)', () => {
		const recorder = makeRecorder();
		traceDiagonalLines(recorder, TEXTURE_TILE_SIZE, "up");
		expect(recorder.segments).toHaveLength(3);
		for (const segment of recorder.segments) {
			const dx = segment.to[0] - segment.from[0];
			const dy = segment.to[1] - segment.from[1];
			expect(dy / dx).toBeCloseTo(-1);
		}
	});

	test('the "down" family is three parallel 135° segments (slope +1, rendering like \\)', () => {
		const recorder = makeRecorder();
		traceDiagonalLines(recorder, TEXTURE_TILE_SIZE, "down");
		expect(recorder.segments).toHaveLength(3);
		for (const segment of recorder.segments) {
			const dx = segment.to[0] - segment.from[0];
			const dy = segment.to[1] - segment.from[1];
			expect(dy / dx).toBeCloseTo(1);
		}
	});

	test("the family tiles seamlessly: every line sits on the tile-period lattice", () => {
		// A 45° line is x + y = c (its 135° mirror x - y = c). Repeating the tile
		// shifts c by the tile size, so a seamless family needs every traced line
		// on a multiple of the period — otherwise stripes jump at tile seams.
		const size = TEXTURE_TILE_SIZE;
		const up = makeRecorder();
		traceDiagonalLines(up, size, "up");
		for (const segment of up.segments) {
			const offset = segment.from[0] + segment.from[1];
			expect(segment.to[0] + segment.to[1]).toBeCloseTo(offset);
			expect(Math.abs(offset % size)).toBeCloseTo(0);
		}
		const down = makeRecorder();
		traceDiagonalLines(down, size, "down");
		for (const segment of down.segments) {
			const offset = segment.from[0] - segment.from[1];
			expect(segment.to[0] - segment.to[1]).toBeCloseTo(offset);
			expect(Math.abs(offset % size)).toBeCloseTo(0);
		}
	});
});

describe("textureInkColor", () => {
	test("steps the series' own fill down a fixed perceptual amount", () => {
		// A fixed OKLCH lightness step, not a proportional mix — proportional
		// darkening goes near-invisible on the already-dark fills of the light
		// high-contrast theme.
		expect(textureInkColor("oklch(0.623 0.188 259.813)")).toBe(
			"oklch(from oklch(0.623 0.188 259.813) calc(l - 0.18) c h)",
		);
	});
});
