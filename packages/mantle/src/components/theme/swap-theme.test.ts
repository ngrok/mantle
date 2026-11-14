import { afterEach, describe, expect, test } from "vitest";
import { holdsManyTransitions, revealCircle } from "./swap-theme.js";

describe("revealCircle", () => {
	test("the circle grows from the center of the origin to the farthest viewport corner", () => {
		expect(
			revealCircle({ left: 0, top: 0, width: 20, height: 20 }, { width: 100, height: 100 }),
		).toEqual({ from: "circle(0px at 10px 10px)", to: "circle(127.28px at 10px 10px)" });
		expect(
			revealCircle({ left: 90, top: 40, width: 20, height: 20 }, { width: 200, height: 100 }),
		).toEqual({ from: "circle(0px at 100px 50px)", to: "circle(111.8px at 100px 50px)" });
	});
});

describe("holdsManyTransitions", () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	test("a repeated row that puts every transition off the sample stride still counts", () => {
		// Each row is a wrapper with no transition and four cells with one, so
		// 80% of about 5,000 elements hold a transition. The padding puts every
		// wrapper on an index that is a multiple of five, as is every multiple of
		// a stride of 20.
		const prefix = document.getElementsByTagName("*").length;
		const padding = Array.from({ length: (5 - (prefix % 5)) % 5 }, () =>
			document.createElement("div"),
		);
		const rows = Array.from({ length: 1024 }, () => {
			const row = document.createElement("div");
			row.style.transitionDuration = "0s";
			for (let cell = 0; cell < 4; cell++) {
				const child = document.createElement("span");
				child.style.transitionDuration = "0.2s";
				row.append(child);
			}
			return row;
		});
		document.body.replaceChildren(...padding, ...rows);
		expect(holdsManyTransitions()).toBe(true);
	});

	test("a page with few transitions does not count as many", () => {
		const rows = Array.from({ length: 1024 }, (_, index) => {
			const row = document.createElement("div");
			row.style.transitionDuration = index % 4 === 0 ? "0.2s" : "0s";
			return row;
		});
		document.body.replaceChildren(...rows);
		expect(holdsManyTransitions()).toBe(false);
	});
});
