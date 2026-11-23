import { describe, expect, test } from "vitest";
import { computePlacement } from "./position.js";

const viewport = { width: 1000, height: 600 };
const size = { width: 200, height: 100 };

/** An anchor 60px wide and 20px tall with its top-left corner at (`left`, `top`). */
function anchorAt(left: number, top: number) {
	return { left, top, right: left + 60, bottom: top + 20, width: 60, height: 20 };
}

describe("computePlacement", () => {
	test("keeps the preferred side when it fits, centered on the anchor", () => {
		expect(
			computePlacement({
				anchor: anchorAt(400, 300),
				size,
				viewport,
				side: "bottom",
				align: "center",
				sideOffset: 4,
			}),
		).toEqual({ side: "bottom", x: 330, y: 324 });
	});

	test("flips to the opposite side when only that side fits", () => {
		expect(
			computePlacement({
				anchor: anchorAt(400, 560),
				size,
				viewport,
				side: "bottom",
				align: "center",
				sideOffset: 4,
			}),
		).toEqual({ side: "top", x: 330, y: 456 });
	});

	test("takes the side with more room when neither side fits", () => {
		const placement = (top: number) =>
			computePlacement({
				anchor: anchorAt(400, top),
				size: { width: 200, height: 580 },
				viewport,
				side: "bottom",
				align: "start",
				sideOffset: 4,
			}).side;
		expect(placement(400)).toBe("top");
		expect(placement(200)).toBe("bottom");
	});

	test("shifts along the side to stay 8px inside the viewport", () => {
		expect(
			computePlacement({
				anchor: anchorAt(2, 300),
				size,
				viewport,
				side: "bottom",
				align: "center",
				sideOffset: 4,
			}).x,
		).toBe(8);
		expect(
			computePlacement({
				anchor: anchorAt(930, 300),
				size,
				viewport,
				side: "top",
				align: "start",
				sideOffset: 4,
			}).x,
		).toBe(792);
	});

	test("aligns the end edges and flips across the inline axis", () => {
		expect(
			computePlacement({
				anchor: anchorAt(900, 300),
				size,
				viewport,
				side: "right",
				align: "end",
				sideOffset: 4,
			}),
		).toEqual({ side: "left", x: 696, y: 220 });
	});
});
