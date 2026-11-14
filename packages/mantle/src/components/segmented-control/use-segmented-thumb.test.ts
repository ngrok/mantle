import { describe, expect, test } from "vitest";
import { nearestSegment, thumbOffset } from "./use-segmented-thumb.js";

describe("nearestSegment", () => {
	const segments = [
		{ left: 0, right: 100, disabled: false },
		{ left: 100, right: 200, disabled: true },
		{ left: 200, right: 300, disabled: false },
	];

	test("picks the segment whose center is nearest", () => {
		expect(nearestSegment(segments, 90)).toBe(0);
	});

	test("skips a disabled segment, even under the point", () => {
		expect(nearestSegment(segments, 160)).toBe(2);
	});

	test("returns -1 when every segment is disabled", () => {
		expect(nearestSegment([{ left: 0, right: 100, disabled: true }], 50)).toBe(-1);
	});
});

describe("thumbOffset", () => {
	test("follows the pointer one to one inside the range", () => {
		expect(thumbOffset({ travel: -40, min: -200, max: 0, give: 4 })).toBe(-40);
	});

	test("gives less than the give past the far end, however far the pointer goes", () => {
		const offset = thumbOffset({ travel: 500, min: -200, max: 0, give: 4 });
		expect(offset).toBeGreaterThan(0);
		expect(offset).toBeLessThan(4);
	});

	test("gives less than the give past the near end", () => {
		const offset = thumbOffset({ travel: -700, min: -200, max: 0, give: 4 });
		expect(offset).toBeLessThan(-200);
		expect(offset).toBeGreaterThan(-204);
	});
});
