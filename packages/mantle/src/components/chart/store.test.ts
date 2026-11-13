import { describe, expect, test } from "vitest";
import type { SeriesSpec } from "./types.js";
import { ChartStore } from "./store.js";

const makeSeries = (dataKey: string, overrides: Partial<SeriesSpec> = {}): SeriesSpec => ({
	dataKey,
	label: dataKey,
	color: "blue",
	mark: "line",
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: "circle",
	texture: "solid",
	...overrides,
});

describe("ChartStore series presentation", () => {
	test("a series paints its color name's chart token, and any other color as written", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("requests", { color: "blue" }));
		store.registerSeries(makeSeries("errors", { color: "danger" }));
		store.registerSeries(makeSeries("brand", { color: "var(--color-brand)" }));
		expect(store.seriesMeta().map((series) => [series.color, series.colorInput])).toStrictEqual([
			["var(--color-chart-blue)", "blue"],
			["var(--color-chart-danger)", "danger"],
			["var(--color-brand)", "var(--color-brand)"],
		]);
	});

	test("removing a series leaves every other series its own color", () => {
		const store = new ChartStore();
		const unregisterRequests = store.registerSeries(makeSeries("requests", { color: "blue" }));
		store.registerSeries(makeSeries("errors", { color: "pink" }));
		unregisterRequests();
		expect(store.seriesMeta().map((series) => series.color)).toStrictEqual([
			"var(--color-chart-pink)",
		]);
	});

	test("leaving decorative restores each series' own color", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("requests", { color: "blue" }));
		store.registerSeries(makeSeries("errors", { color: "orange" }));
		store.setDecorative(true);
		store.setDecorative(false);
		expect(store.seriesMeta().map((series) => series.color)).toStrictEqual([
			"var(--color-chart-blue)",
			"var(--color-chart-orange)",
		]);
	});

	test("a non-series registration keeps the published series list", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("requests"));
		const series = store.getSnapshot().series;
		const specs = store.seriesSpecs();
		store.registerXAxis({ tickFormat: undefined, tickCount: 4 });
		store.registerGrid("horizontal");
		expect(store.getSnapshot().series).toBe(series);
		expect(store.seriesSpecs()).toBe(specs);
		store.registerSeries(makeSeries("errors"));
		expect(store.getSnapshot().series.map((meta) => meta.dataKey)).toStrictEqual([
			"requests",
			"errors",
		]);
		expect(store.seriesSpecs().map((spec) => spec.dataKey)).toStrictEqual(["requests", "errors"]);
	});

	test("a decorative chart paints every series with the neutral fill", () => {
		// The values are not information, so nothing about a mark may read as a
		// series, not even a color it asked for. Both
		// halves of the meta move: `color` is what the legend and tooltip paint,
		// `colorInput` is what the canvas resolves.
		const store = new ChartStore();
		store.registerSeries(makeSeries("requests"));
		store.registerSeries(makeSeries("brand", { color: "var(--color-brand)" }));
		store.registerSeries(makeSeries("p99", { color: "amber" }));
		store.setDecorative(true);
		expect(store.seriesMeta().map((series) => [series.color, series.colorInput])).toStrictEqual([
			["var(--color-chart-decorative)", "var(--color-chart-decorative)"],
			["var(--color-chart-decorative)", "var(--color-chart-decorative)"],
			["var(--color-chart-decorative)", "var(--color-chart-decorative)"],
		]);
	});

	test("flipping decorative re-ingests, because the engine's color cache keys on the theme", () => {
		// A presentation-only publish would repaint with the colors already resolved
		// for the old palette. Only the series hook invalidates them.
		const store = new ChartStore();
		let seriesChanges = 0;
		let presentationChanges = 0;
		store.onSeriesChange = () => {
			seriesChanges += 1;
		};
		store.onPresentationChange = () => {
			presentationChanges += 1;
		};
		store.setDecorative(true);
		expect(seriesChanges).toBe(1);
		expect(presentationChanges).toBe(0);
		// Idempotent: a re-render that passes the same value publishes nothing.
		store.setDecorative(true);
		expect(seriesChanges).toBe(1);
	});

	test("seriesShape follows a series that leaves", () => {
		// The snapshot must be current when the engine paints: if a removal does
		// not republish, the canvas keeps the old glyph.
		const store = new ChartStore();
		const unregisterErrors = store.registerSeries(makeSeries("errors", { shape: "square" }));
		expect(store.seriesShape("errors")).toBe("square");
		unregisterErrors();
		expect(store.seriesShape("errors")).toBe("circle");
	});

	test("seriesShape gives an unregistered key the circle", () => {
		const store = new ChartStore();
		// A glyph that differs from the fallback: a lookup that fell back to the
		// first registered series returns "star" here.
		store.registerSeries(makeSeries("requests", { shape: "star" }));
		expect(store.seriesShape("missing")).toBe("circle");
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

	// The axis and tooltip singletons share registerGrid's identity-compared
	// cleanup; each needs the same two guards or an equal-valued duplicate part
	// unmounting silently clears a live registration.
	const singletonRegistrations = [
		{
			name: "xAxis",
			register: (store: ChartStore, tickCount: number) =>
				store.registerXAxis({ tickCount, tickFormat: undefined }),
			read: (store: ChartStore) => store.getSnapshot().xAxis?.tickCount,
		},
		{
			name: "yAxis",
			register: (store: ChartStore, tickCount: number) =>
				store.registerYAxis({ tickCount, tickFormat: undefined }),
			read: (store: ChartStore) => store.getSnapshot().yAxis?.tickCount,
		},
		{
			name: "tooltip",
			register: (store: ChartStore, tickCount: number) =>
				store.registerTooltip({
					labelFormat: undefined,
					valueFormat: undefined,
					indicator: "line",
					footer: undefined,
					children: undefined,
					divProps: { id: `tooltip-${tickCount}` },
				}),
			read: (store: ChartStore) => {
				const id = store.getSnapshot().tooltip?.divProps.id;
				return id == null ? undefined : Number(id.replace("tooltip-", ""));
			},
		},
	] as const;

	for (const { name, register, read } of singletonRegistrations) {
		test(`${name}: the last registration wins and a superseded one cannot clear it`, () => {
			const store = new ChartStore();
			const unregisterFirst = register(store, 1);
			register(store, 2);
			expect(read(store)).toBe(2);
			unregisterFirst();
			expect(read(store)).toBe(2);
		});

		test(`${name}: an equal-valued duplicate unmounting does not clear the survivor`, () => {
			const store = new ChartStore();
			const unregisterFirst = register(store, 3);
			register(store, 3);
			unregisterFirst();
			expect(read(store)).toBe(3);
		});

		test(`${name}: the winner's own cleanup clears the registration`, () => {
			const store = new ChartStore();
			const unregisterOnly = register(store, 4);
			unregisterOnly();
			expect(read(store)).toBeUndefined();
		});
	}

	test("setOrientation publishes the bar direction, and repeating it notifies nobody", () => {
		// The snapshot's orientation drives the legend texture keys (the rungs must
		// run across the bars), so a guard that swallowed the real change would
		// leave every key drawn for the wrong axis.
		const store = new ChartStore();
		let notified = 0;
		store.subscribe(() => {
			notified += 1;
		});
		expect(store.getSnapshot().orientation).toBe("vertical");
		store.setOrientation("horizontal");
		expect(store.getSnapshot().orientation).toBe("horizontal");
		expect(notified).toBe(1);
		store.setOrientation("horizontal");
		expect(notified).toBe(1);
		store.setOrientation("vertical");
		expect(store.getSnapshot().orientation).toBe("vertical");
		expect(notified).toBe(2);
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

	test("re-publishing the identical snapshot emits nothing (a pointer move must not re-render)", () => {
		// The engine republishes on every pointer move within the same datum; the
		// identity guard is what keeps the tooltip subtree from re-rendering at
		// pointer rate.
		const store = new ChartStore();
		const snapshot = {
			index: 0,
			xValue: "January",
			datum: {},
			points: [],
			viaKeyboard: false,
		};
		let notified = 0;
		store.subscribe(() => {
			notified += 1;
		});
		store.publishHover(snapshot);
		expect(notified).toBe(1);
		store.publishHover(snapshot);
		expect(notified).toBe(1);
		store.publishHover(null);
		expect(notified).toBe(2);
		store.publishHover(null);
		expect(notified).toBe(2);
	});
});
