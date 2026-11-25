import { describe, expect, test } from "vitest";
import { nearestItem, thumbOffset } from "./sliding-thumb.js";

describe("nearestItem", () => {
	const items = [
		{ start: 0, end: 100, disabled: false },
		{ start: 100, end: 200, disabled: true },
		{ start: 200, end: 300, disabled: false },
	];

	test("picks the item whose center is nearest", () => {
		expect(nearestItem(items, 90)).toBe(0);
	});

	test("skips a disabled item, even under the point", () => {
		expect(nearestItem(items, 160)).toBe(2);
	});

	test("returns -1 when every item is disabled", () => {
		expect(nearestItem([{ start: 0, end: 100, disabled: true }], 50)).toBe(-1);
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
