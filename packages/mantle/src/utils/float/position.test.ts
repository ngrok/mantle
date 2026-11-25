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

	test("with overlapAnchor, moves over the anchor to stay inside the viewport when neither side fits", () => {
		const placement = (left: number) =>
			computePlacement({
				anchor: { left, top: 300, right: left + 290, bottom: 320, width: 290, height: 20 },
				size: { width: 100, height: 100 },
				viewport: { width: 375, height: 600 },
				side: "right",
				align: "start",
				sideOffset: 4,
				overlapAnchor: true,
			});
		// More room on the right: the float stays right and ends 8px from the right edge.
		expect(placement(40)).toEqual({ side: "right", x: 267, y: 300 });
		// More room on the left: the float flips left and starts 8px from the left edge.
		expect(placement(50)).toEqual({ side: "left", x: 8, y: 300 });
		// An anchor scrolled off the screen keeps its float beside it.
		expect(placement(-400)).toEqual({ side: "right", x: -106, y: 300 });
		// So does an anchor scrolled above the screen.
		expect(
			computePlacement({
				anchor: { left: 40, top: -40, right: 330, bottom: -20, width: 290, height: 20 },
				size: { width: 100, height: 100 },
				viewport: { width: 375, height: 600 },
				side: "right",
				align: "start",
				sideOffset: 4,
				overlapAnchor: true,
			}).x,
		).toBe(334);
		// Without the option, as for a tooltip, the float never covers its anchor.
		expect(
			computePlacement({
				anchor: { left: 40, top: 300, right: 330, bottom: 320, width: 290, height: 20 },
				size: { width: 100, height: 100 },
				viewport: { width: 375, height: 600 },
				side: "right",
				align: "start",
				sideOffset: 4,
			}).x,
		).toBe(334);
	});
});
