import { describe, expect, test } from "vitest";
import { revealCircle } from "./swap-theme.js";

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
