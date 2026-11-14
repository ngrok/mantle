import { expect, test } from "vitest";
import { cssSeriesColor } from "./colors.js";

test("cssSeriesColor reads a color name's chart token and keeps any other color as written", () => {
	expect(cssSeriesColor("emerald")).toBe("var(--color-chart-emerald)");
	expect(cssSeriesColor("danger")).toBe("var(--color-chart-danger)");
	expect(cssSeriesColor("neutral")).toBe("var(--color-chart-neutral)");
	expect(cssSeriesColor("#e40014")).toBe("#e40014");
	expect(cssSeriesColor("var(--color-brand)")).toBe("var(--color-brand)");
});
