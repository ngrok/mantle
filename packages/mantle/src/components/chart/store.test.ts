import { describe, expect, test } from "vitest";
import type { SeriesSpec } from "./types.js";
import { assignSeriesSlots, ChartStore, displayColor, displayShape } from "./store.js";

const makeSeries = (dataKey: string, overrides: Partial<SeriesSpec> = {}): SeriesSpec => ({
	dataKey,
	label: dataKey,
	seriesSlot: undefined,
	color: undefined,
	mark: "line",
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: undefined,
	texture: "solid",
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

describe("displayShape", () => {
	// The table pins each documented color-and-shape pairing. A shifted lookup
	// would still return eight distinct glyphs and pass an exhaustiveness test.
	test.each([
		["chart-1", "circle"],
		["chart-2", "square"],
		["chart-3", "triangle"],
		["chart-4", "diamond"],
		["chart-5", "triangle-down"],
		["chart-6", "plus"],
		["chart-7", "cross"],
		["chart-8", "star"],
	] as const)("slot %s pairs with the %s", (slot, shape) => {
		expect(displayShape(undefined, slot)).toBe(shape);
	});

	test("the shared other treatment uses the circle", () => {
		expect(displayShape(undefined, "chart-other")).toBe("circle");
	});

	test("an explicit shape overrides the slot pairing", () => {
		expect(displayShape("star", "chart-1")).toBe("star");
		expect(displayShape("circle", "chart-8")).toBe("circle");
	});
});

describe("assignSeriesSlots", () => {
	test("automatic series take slots in registration order", () => {
		const specs = Array.from({ length: 10 }, (_, index) => makeSeries(`series-${index}`));
		expect([...assignSeriesSlots(specs).values()]).toStrictEqual([
			"chart-1",
			"chart-2",
			"chart-3",
			"chart-4",
			"chart-5",
			"chart-6",
			"chart-7",
			"chart-8",
			"chart-other",
			"chart-other",
		]);
	});

	test("automatic assignment skips fixed slots", () => {
		const specs = [
			makeSeries("requests"),
			makeSeries("errors", { seriesSlot: 4 }),
			makeSeries("latency"),
			makeSeries("saturation", { seriesSlot: 1 }),
		];
		expect([...assignSeriesSlots(specs).values()]).toStrictEqual([
			"chart-2",
			"chart-4",
			"chart-3",
			"chart-1",
		]);
	});

	test("related series may reserve one shared slot", () => {
		const specs = [
			makeSeries("us-east-1a", { seriesSlot: 1 }),
			makeSeries("us-east-1b", { seriesSlot: 1 }),
			makeSeries("eu-west-1"),
		];
		expect([...assignSeriesSlots(specs).values()]).toStrictEqual(["chart-1", "chart-1", "chart-2"]);
	});

	test("the other treatment reserves no categorical slot", () => {
		const specs = [makeSeries("tail", { seriesSlot: "other" }), makeSeries("requests")];
		expect([...assignSeriesSlots(specs).values()]).toStrictEqual(["chart-other", "chart-1"]);
	});

	test("color and shape overrides never change slot assignment", () => {
		const specs = [
			makeSeries("brand", { color: "chart-8", shape: "star" }),
			makeSeries("requests", { color: "var(--color-brand)" }),
			makeSeries("errors"),
		];
		expect([...assignSeriesSlots(specs).values()]).toStrictEqual(["chart-1", "chart-2", "chart-3"]);
	});
});

describe("ChartStore series presentation", () => {
	test("removing an automatic series closes the gap in the current assignments", () => {
		const store = new ChartStore();
		const unregisterRequests = store.registerSeries(makeSeries("requests"));
		store.registerSeries(makeSeries("errors"));
		store.registerSeries(makeSeries("latency"));
		unregisterRequests();
		expect(store.seriesMeta().map((series) => [series.dataKey, series.color])).toStrictEqual([
			["errors", "var(--color-chart-1)"],
			["latency", "var(--color-chart-2)"],
		]);
	});

	test("a fixed series returns to its selected slot", () => {
		const store = new ChartStore();
		const unregisterErrors = store.registerSeries(makeSeries("errors", { seriesSlot: 4 }));
		for (const key of ["requests", "latency", "saturation", "throughput"]) {
			store.registerSeries(makeSeries(key));
		}
		unregisterErrors();
		expect(store.seriesMeta().at(-1)?.color).toBe("var(--color-chart-4)");
		store.registerSeries(makeSeries("errors", { seriesSlot: 4 }));
		const meta = store.seriesMeta();
		expect(meta.find((series) => series.dataKey === "errors")?.color).toBe("var(--color-chart-4)");
		expect(meta.find((series) => series.dataKey === "throughput")?.color).toBe(
			"var(--color-chart-5)",
		);
	});

	test("a custom color changes paint without changing its automatic identity", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("brand", { color: "var(--color-brand)" }));
		store.registerSeries(makeSeries("requests"));
		expect(store.seriesMeta().map((series) => [series.color, series.shape])).toStrictEqual([
			["var(--color-brand)", "circle"],
			["var(--color-chart-2)", "square"],
		]);
	});

	test("a chart-token color changes paint without reserving that token", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("brand", { color: "chart-8" }));
		store.registerSeries(makeSeries("requests"));
		expect(store.seriesMeta().map((series) => [series.color, series.shape])).toStrictEqual([
			["var(--color-chart-8)", "circle"],
			["var(--color-chart-2)", "square"],
		]);
	});

	test("a fixed slot selects its default color and point shape", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("p99", { seriesSlot: 8 }));
		store.registerSeries(makeSeries("tail", { seriesSlot: "other" }));
		expect(store.seriesMeta().map((series) => [series.color, series.shape])).toStrictEqual([
			["var(--color-chart-8)", "star"],
			["var(--color-chart-other)", "circle"],
		]);
	});

	test("an explicit shape changes no sibling identity", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("p50", { shape: "star" }));
		store.registerSeries(makeSeries("p99"));
		expect(store.seriesMeta().map((series) => series.shape)).toStrictEqual(["star", "square"]);
	});

	test("seriesShape gives the canvas the shape published to DOM consumers", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("automatic"));
		store.registerSeries(makeSeries("fixed", { seriesSlot: 6 }));
		store.registerSeries(makeSeries("explicit", { shape: "star" }));
		const meta = store.seriesMeta();
		expect(meta.map((series) => store.seriesShape(series.dataKey))).toStrictEqual(
			meta.map((series) => series.shape),
		);
	});

	test("a new series vocabulary starts at the first slot", () => {
		const store = new ChartStore();
		const unregisters = Array.from({ length: 8 }, (_, index) =>
			store.registerSeries(makeSeries(`provider-${index}`)),
		);
		for (const unregister of unregisters) {
			unregister();
		}
		for (const key of ["access-key-a", "access-key-b", "access-key-c"]) {
			store.registerSeries(makeSeries(key));
		}
		expect(store.seriesMeta().map((series) => series.color)).toStrictEqual([
			"var(--color-chart-1)",
			"var(--color-chart-2)",
			"var(--color-chart-3)",
		]);
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
		const store = new ChartStore();
		const unregisterOne = store.registerReferenceLine("one", {
			y: 10,
			label: "a",
			color: undefined,
		});
		store.registerReferenceLine("two", { y: 20, label: "b", color: undefined });
		unregisterOne();
		store.registerReferenceLine("one", { y: 15, label: "a", color: undefined });
		expect(store.getSnapshot().referenceLines.map((line) => line.y)).toEqual([15, 20]);
	});

	test("series meta carries bar textures to DOM consumers", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("a", { mark: "bar" }));
		store.registerSeries(makeSeries("b", { mark: "bar", texture: "hatch" }));
		store.registerSeries(makeSeries("c", { mark: "bar", texture: "crosshatch" }));
		expect(store.seriesMeta().map((series) => series.texture)).toStrictEqual([
			"solid",
			"hatch",
			"crosshatch",
		]);
	});

	test("subscribers receive immutable replacement snapshots", () => {
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

	test("series and presentation changes call their matching engine hooks", () => {
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
