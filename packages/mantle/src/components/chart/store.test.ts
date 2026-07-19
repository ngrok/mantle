import { describe, expect, test } from "vitest";
import type { SeriesSpec } from "./types.js";
import { ChartStore, displayColor } from "./store.js";

const makeSeries = (dataKey: string, overrides: Partial<SeriesSpec> = {}): SeriesSpec => ({
	dataKey,
	label: dataKey,
	color: undefined,
	mark: "line",
	curve: "linear",
	markers: false,
	connectNulls: false,
	...overrides,
});

describe("displayColor", () => {
	test("token names become theme-reactive CSS variable references", () => {
		expect(displayColor("chart-3", "chart-1")).toBe("var(--color-chart-3)");
		expect(displayColor(undefined, "chart-2")).toBe("var(--color-chart-2)");
	});

	test("custom CSS colors pass through", () => {
		expect(displayColor("#e40014", "chart-1")).toBe("#e40014");
		expect(displayColor("var(--color-success-600)", "chart-1")).toBe("var(--color-success-600)");
	});
});

describe("ChartStore color slots", () => {
	test("assigns slots in registration order", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("a"));
		store.registerSeries(makeSeries("b"));
		const meta = store.seriesMeta();
		expect(meta[0]?.color).toBe("var(--color-chart-1)");
		expect(meta[1]?.color).toBe("var(--color-chart-2)");
	});

	test("slots are sticky: filtering a series out never recolors the survivors", () => {
		const store = new ChartStore();
		const unregisterA = store.registerSeries(makeSeries("a"));
		store.registerSeries(makeSeries("b"));
		unregisterA();
		// b keeps chart-2 even though it is now the only series.
		expect(store.seriesMeta()[0]?.color).toBe("var(--color-chart-2)");
		// a returning reclaims its original slot.
		store.registerSeries(makeSeries("a"));
		const meta = store.seriesMeta();
		expect(meta.find((series) => series.dataKey === "a")?.color).toBe("var(--color-chart-1)");
	});

	test("a returning series keeps its original paint position", () => {
		const store = new ChartStore();
		const unregisterA = store.registerSeries(makeSeries("a"));
		store.registerSeries(makeSeries("b"));
		unregisterA();
		store.registerSeries(makeSeries("a"));
		expect(store.seriesSpecs().map((spec) => spec.dataKey)).toEqual(["a", "b"]);
	});

	test("unpinned series past the eighth slot use chart-other, never a recycled hue", () => {
		const store = new ChartStore();
		for (let index = 0; index < 10; index++) {
			store.registerSeries(makeSeries(`series-${index}`));
		}
		const meta = store.seriesMeta();
		expect(meta[7]?.color).toBe("var(--color-chart-8)");
		expect(meta[8]?.color).toBe("var(--color-chart-other)");
		expect(meta[9]?.color).toBe("var(--color-chart-other)");
	});

	test("explicitly colored series do not consume slots", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("pinned", { color: "var(--color-success-600)" }));
		store.registerSeries(makeSeries("auto"));
		const meta = store.seriesMeta();
		expect(meta[0]?.color).toBe("var(--color-success-600)");
		expect(meta[1]?.color).toBe("var(--color-chart-1)");
	});

	test("a series pinning a chart token claims that slot — no unpinned duplicate", () => {
		// Regression: without the claim, the second series would auto-assign
		// chart-1 and duplicate the pinned color.
		const store = new ChartStore();
		store.registerSeries(makeSeries("pinned", { color: "chart-1" }));
		store.registerSeries(makeSeries("auto"));
		const meta = store.seriesMeta();
		expect(meta[0]?.color).toBe("var(--color-chart-1)");
		expect(meta[1]?.color).toBe("var(--color-chart-2)");
	});
});

describe("ChartStore registrations", () => {
	test("singleton parts follow last-registration-wins", () => {
		const store = new ChartStore();
		store.registerGrid("horizontal");
		store.registerGrid("both");
		expect(store.getSnapshot().grid?.lines).toBe("both");
	});

	test("unregistering a superseded singleton does not clear the winner", () => {
		const store = new ChartStore();
		const unregisterFirst = store.registerGrid("horizontal");
		store.registerGrid("both");
		unregisterFirst();
		expect(store.getSnapshot().grid?.lines).toBe("both");
	});

	test("an equal-valued duplicate grid unmounting does not clear the survivor", () => {
		// Regression: cleanup must compare registration identity, not value.
		const store = new ChartStore();
		const unregisterFirst = store.registerGrid("horizontal");
		store.registerGrid("horizontal");
		unregisterFirst();
		expect(store.getSnapshot().grid?.lines).toBe("horizontal");
	});

	test("reference lines accumulate in registration order", () => {
		const store = new ChartStore();
		store.registerReferenceLine("one", { y: 10, label: "a", color: undefined });
		store.registerReferenceLine("two", { y: 20, label: "b", color: undefined });
		expect(store.getSnapshot().referenceLines.map((line) => line.y)).toEqual([10, 20]);
	});

	test("a reference line re-registering with new props keeps its paint position", () => {
		// Regression: re-registration used to take a fresh sequence, so updating
		// one line's props reordered it behind lines registered after it.
		const store = new ChartStore();
		const unregisterOne = store.registerReferenceLine("one", {
			y: 10,
			label: "a",
			color: undefined,
		});
		store.registerReferenceLine("two", { y: 20, label: "b", color: undefined });
		// A prop change re-runs the layout effect: cleanup first, then re-register.
		unregisterOne();
		store.registerReferenceLine("one", { y: 15, label: "a", color: undefined });
		expect(store.getSnapshot().referenceLines.map((line) => line.y)).toEqual([15, 20]);
	});

	test("subscribers are notified and snapshots are immutable-by-replacement", () => {
		const store = new ChartStore();
		const before = store.getSnapshot();
		let notified = 0;
		store.subscribe(() => {
			notified += 1;
		});
		store.registerSeries(makeSeries("a"));
		expect(notified).toBe(1);
		expect(store.getSnapshot()).not.toBe(before);
	});

	test("series changes call onSeriesChange; presentation changes call onPresentationChange", () => {
		const store = new ChartStore();
		const calls: string[] = [];
		store.onSeriesChange = () => calls.push("series");
		store.onPresentationChange = () => calls.push("presentation");
		store.registerSeries(makeSeries("a"));
		store.registerGrid("horizontal");
		expect(calls).toEqual(["series", "presentation"]);
	});
});

describe("ChartStore hover", () => {
	test("publishes and clears hover snapshots", () => {
		const store = new ChartStore();
		const snapshot = {
			index: 1,
			xValue: "February",
			datum: {},
			points: [],
			viaKeyboard: false,
		};
		store.publishHover(snapshot);
		expect(store.getSnapshot().hover).toBe(snapshot);
		store.publishHover(null);
		expect(store.getSnapshot().hover).toBe(null);
	});
});
