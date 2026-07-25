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
	shape: "circle",
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

	test("a pin registering after its token was auto-claimed evicts the auto-assignment", () => {
		// Regression: "a" auto-claimed chart-1 first, so "b" pinning chart-1
		// painted both series the identical color — the pin must win its token
		// regardless of registration order.
		const store = new ChartStore();
		store.registerSeries(makeSeries("a"));
		store.registerSeries(makeSeries("b", { color: "chart-1" }));
		const meta = store.getSnapshot().series;
		expect(meta.find((series) => series.dataKey === "b")?.color).toBe("var(--color-chart-1)");
		expect(meta.find((series) => series.dataKey === "a")?.color).toBe("var(--color-chart-2)");
		expect(new Set(meta.map((series) => series.color)).size).toBe(meta.length);
	});

	test("re-registering the same pinned series does not churn the evicted slot", () => {
		// Effect re-runs re-register an equal spec (cleanup, then register);
		// eviction must be idempotent or the neighbor's color would keep
		// drifting one slot per render.
		const store = new ChartStore();
		store.registerSeries(makeSeries("a"));
		const unregisterB = store.registerSeries(makeSeries("b", { color: "chart-1" }));
		unregisterB();
		store.registerSeries(makeSeries("b", { color: "chart-1" }));
		const meta = store.seriesMeta();
		expect(meta.find((series) => series.dataKey === "a")?.color).toBe("var(--color-chart-2)");
		expect(meta.find((series) => series.dataKey === "b")?.color).toBe("var(--color-chart-1)");
	});

	test("a pin evicts a sticky auto slot even while its holder is unmounted", () => {
		// Slots survive unmount, so a returning "a" would otherwise come back
		// wearing the color "b" pinned in the meantime.
		const store = new ChartStore();
		const unregisterA = store.registerSeries(makeSeries("a"));
		unregisterA();
		store.registerSeries(makeSeries("b", { color: "chart-1" }));
		store.registerSeries(makeSeries("a"));
		const meta = store.seriesMeta();
		expect(meta.find((series) => series.dataKey === "a")?.color).toBe("var(--color-chart-2)");
		expect(meta.find((series) => series.dataKey === "b")?.color).toBe("var(--color-chart-1)");
	});

	test("two series explicitly pinning the same token are left alone", () => {
		// A pinned-vs-pinned collision is the consumer's explicit choice — the
		// store never second-guesses it.
		const store = new ChartStore();
		store.registerSeries(makeSeries("a", { color: "chart-1" }));
		store.registerSeries(makeSeries("b", { color: "chart-1" }));
		const meta = store.seriesMeta();
		expect(meta[0]?.color).toBe("var(--color-chart-1)");
		expect(meta[1]?.color).toBe("var(--color-chart-1)");
	});

	test("a pin never evicts a holder that itself pins the same token", () => {
		// "a" auto-claimed chart-1, then re-registered pinning it explicitly.
		// "b" pinning chart-1 is now pinned-vs-pinned: "a" must keep its slot,
		// and no eviction may burn the next free slot — "c" still gets chart-2.
		const store = new ChartStore();
		const unregisterA = store.registerSeries(makeSeries("a"));
		unregisterA();
		store.registerSeries(makeSeries("a", { color: "chart-1" }));
		store.registerSeries(makeSeries("b", { color: "chart-1" }));
		store.registerSeries(makeSeries("c"));
		const meta = store.seriesMeta();
		expect(meta.find((series) => series.dataKey === "a")?.color).toBe("var(--color-chart-1)");
		expect(meta.find((series) => series.dataKey === "b")?.color).toBe("var(--color-chart-1)");
		expect(meta.find((series) => series.dataKey === "c")?.color).toBe("var(--color-chart-2)");
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

	test("series meta carries the registered point shape through to DOM consumers", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("a", { mark: "scatter", shape: "triangle" }));
		store.registerSeries(makeSeries("b", { mark: "scatter" }));
		const meta = store.seriesMeta();
		expect(meta[0]?.shape).toBe("triangle");
		expect(meta[1]?.shape).toBe("circle");
	});

	test("series meta carries the registered bar texture through to DOM consumers", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("a", { mark: "bar" }));
		store.registerSeries(makeSeries("b", { mark: "bar", texture: "hatch" }));
		store.registerSeries(makeSeries("c", { mark: "bar", texture: "crosshatch" }));
		const meta = store.seriesMeta();
		expect(meta[0]?.texture).toBe("solid");
		expect(meta[1]?.texture).toBe("hatch");
		expect(meta[2]?.texture).toBe("crosshatch");
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
