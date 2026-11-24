import { describe, expect, test } from "vitest";
import { outlinePlace } from "./outline-place.js";

const viewport = { top: 100, bottom: 500 };

describe("outlinePlace", () => {
	test("the current message is the first in view, not the last", () => {
		const place = outlinePlace(
			[
				{ top: -300, bottom: -200 },
				{ top: 80, bottom: 120 },
				{ top: 300, bottom: 340 },
				{ top: 700, bottom: 740 },
			],
			viewport,
		);

		expect(place).toEqual({ inView: [false, true, true, false], current: 1 });
	});

	test("with no message in view, the current message is the last above the view", () => {
		const place = outlinePlace(
			[
				{ top: -300, bottom: -200 },
				{ top: 0, bottom: 100 },
				{ top: 600, bottom: 640 },
			],
			viewport,
		);

		// Why bottom 100: a message that ends at the view's top edge shows none of itself.
		expect(place).toEqual({ inView: [false, false, false], current: 1 });
	});

	test("a missing message is never current, and every message below the view leaves none current", () => {
		expect(outlinePlace([null, { top: 600, bottom: 640 }], viewport)).toEqual({
			inView: [false, false],
			current: -1,
		});
		expect(outlinePlace([{ top: -50, bottom: 0 }, null], viewport).current).toBe(0);
	});
});
