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

	test("a custom-colored series spends a slot, so the next unpinned series skips it", () => {
		// One series is one identity, so it spends one of the eight slots even when
		// it paints a color the consumer chose. Without this the palette hands out
		// all eight while three series already wear brand colors, and a chart of
		// five series can be handed a ninth identity.
		const store = new ChartStore();
		store.registerSeries(makeSeries("pinned", { color: "var(--color-success-600)" }));
		store.registerSeries(makeSeries("auto"));
		const meta = store.seriesMeta();
		expect(meta[0]?.color).toBe("var(--color-success-600)");
		expect(meta[1]?.color).toBe("var(--color-chart-2)");
	});

	test("a custom color spends its slot in registration order", () => {
		// The slot a custom color spends is positional, never measured against the
		// color itself: mantle cannot know a brand hex resembles chart-5 without
		// running color math whose answer differs per theme.
		const store = new ChartStore();
		for (const key of ["openai", "claude", "gemini"]) {
			store.registerSeries(makeSeries(key, { color: `var(--provider-${key})` }));
		}
		store.registerSeries(makeSeries("byo-one"));
		store.registerSeries(makeSeries("byo-two"));
		const meta = store.seriesMeta();
		expect(meta.map((series) => series.color)).toStrictEqual([
			"var(--provider-openai)",
			"var(--provider-claude)",
			"var(--provider-gemini)",
			"var(--color-chart-4)",
			"var(--color-chart-5)",
		]);
	});

	test("pinning chart-other spends nothing — the overflow gray is shared", () => {
		const store = new ChartStore();
		store.registerSeries(makeSeries("tail", { color: "chart-other" }));
		store.registerSeries(makeSeries("auto"));
		const meta = store.seriesMeta();
		expect(meta[0]?.color).toBe("var(--color-chart-other)");
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

describe("ChartStore slot reclaim", () => {
	/** Register one series per key, then unmount every one. */
	const cycleThrough = (store: ChartStore, keys: readonly string[]): void => {
		const unregisters = keys.map((key) => store.registerSeries(makeSeries(key)));
		for (const unregister of unregisters) {
			unregister();
		}
	};

	test("a Root that swaps its series vocabulary keeps painting real colors", () => {
		// The reported symptom: a monthly chart grouped by provider, regrouped by
		// access key. Eight provider keys register and leave, so the cursor has no
		// never-used slot left — and the four keys on screen used to paint the
		// overflow gray, all four identical.
		const store = new ChartStore();
		cycleThrough(store, ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"]);
		for (const key of ["k0", "k1", "k2", "k3"]) {
			store.registerSeries(makeSeries(key));
		}
		expect(store.seriesMeta().map((series) => series.color)).toEqual([
			"var(--color-chart-1)",
			"var(--color-chart-2)",
			"var(--color-chart-3)",
			"var(--color-chart-4)",
		]);
	});

	test("a mounted series never gives up its slot", () => {
		// The guarantee the reclaim must not break. Eight mounted holders leave no
		// candidate, so the ninth series takes the documented overflow instead.
		const store = new ChartStore();
		for (let index = 0; index < 8; index++) {
			store.registerSeries(makeSeries(`held-${index}`));
		}
		const before = store.seriesMeta().map((series) => series.color);
		store.registerSeries(makeSeries("ninth"));
		const after = store.seriesMeta();
		expect(after.slice(0, 8).map((series) => series.color)).toEqual(before);
		expect(after[8]?.color).toBe("var(--color-chart-other)");
	});

	test("the longest-registered unmounted holder gives its slot up first", () => {
		// Oldest-first comes from the sequence numbers that already outlive
		// unmount, so the answer cannot depend on the order the holders left.
		const store = new ChartStore();
		const unregisters = ["a", "b", "c", "d", "e", "f", "g", "h"].map((key) =>
			store.registerSeries(makeSeries(key)),
		);
		// Unmount "c" (chart-3) and "a" (chart-1), in that order.
		unregisters[2]?.();
		unregisters[0]?.();
		store.registerSeries(makeSeries("newcomer"));
		expect(store.seriesMeta().find((series) => series.dataKey === "newcomer")?.color).toBe(
			"var(--color-chart-1)",
		);
	});

	test("a reclaimed dataKey does not come back to its original slot", () => {
		// The cost of the reclaim, pinned so it cannot change silently: stickiness
		// holds while the palette has room, and the eight-slot budget is the limit.
		const store = new ChartStore();
		cycleThrough(store, ["a", "b", "c", "d", "e", "f", "g", "h"]);
		store.registerSeries(makeSeries("newcomer"));
		store.registerSeries(makeSeries("a"));
		const meta = store.seriesMeta();
		expect(meta.find((series) => series.dataKey === "newcomer")?.color).toBe(
			"var(--color-chart-1)",
		);
		expect(meta.find((series) => series.dataKey === "a")?.color).toBe("var(--color-chart-2)");
	});

	test("a token an unmounted series pinned is reclaimed rather than retired", () => {
		// A pinned token that stayed reserved forever starved the palette: a
		// dashboard pinning eight providers and regrouping by API key painted every
		// series the overflow gray, which is the exhaustion bug the reclaim exists
		// to prevent. Seven mounted holders take the rest, and the newcomer gets the
		// pinned series' token because that series is off screen.
		const store = new ChartStore();
		const unregisterPinned = store.registerSeries(makeSeries("pinned", { color: "chart-1" }));
		unregisterPinned();
		for (let index = 0; index < 7; index++) {
			store.registerSeries(makeSeries(`held-${index}`));
		}
		store.registerSeries(makeSeries("newcomer"));
		expect(store.seriesMeta().find((series) => series.dataKey === "newcomer")?.color).toBe(
			"var(--color-chart-1)",
		);
	});

	test("eight pinned providers unmount, then a regroup paints real colors", () => {
		// The reported shape: group by provider, then regroup by API key. Every
		// provider pinned a token and left, so without reclaiming pinned slots the
		// four keys on screen all painted chart-other.
		const store = new ChartStore();
		const unregisters = Array.from({ length: 8 }, (_, index) =>
			store.registerSeries(makeSeries(`provider-${index}`, { color: `chart-${index + 1}` })),
		);
		for (const unregister of unregisters) {
			unregister();
		}
		for (let index = 0; index < 4; index++) {
			store.registerSeries(makeSeries(`api-key-${index}`));
		}
		expect(store.seriesMeta().map((series) => series.color)).toStrictEqual([
			"var(--color-chart-1)",
			"var(--color-chart-2)",
			"var(--color-chart-3)",
			"var(--color-chart-4)",
		]);
	});

	test("a remounting pin takes its token back from the series that reclaimed it", () => {
		// The reclaim's counterpart: the pin is authoritative, so a returning
		// pinned series evicts the holder instead of painting a duplicate.
		const store = new ChartStore();
		const unregisterPinned = store.registerSeries(makeSeries("openai", { color: "chart-1" }));
		unregisterPinned();
		for (let index = 0; index < 8; index++) {
			store.registerSeries(makeSeries(`api-key-${index}`));
		}
		const reclaimer = store
			.seriesMeta()
			.find((series) => series.color === "var(--color-chart-1)")?.dataKey;
		expect(reclaimer).toBe("api-key-7");
		store.registerSeries(makeSeries("openai", { color: "chart-1" }));
		const meta = store.seriesMeta();
		expect(meta.find((series) => series.dataKey === "openai")?.color).toBe("var(--color-chart-1)");
		expect(meta.find((series) => series.dataKey === "api-key-7")?.color).toBe(
			"var(--color-chart-other)",
		);
	});

	test("reclaim never hands two mounted series the same color", () => {
		// Twelve keys cycle through, then eight mount at once: the reclaim walks
		// distinct holders, so the eight on screen must wear eight distinct slots.
		const store = new ChartStore();
		cycleThrough(
			store,
			Array.from({ length: 12 }, (_, index) => `gone-${index}`),
		);
		for (let index = 0; index < 8; index++) {
			store.registerSeries(makeSeries(`live-${index}`));
		}
		const colors = store.seriesMeta().map((series) => series.color);
		expect(new Set(colors).size).toBe(8);
		expect(colors).not.toContain("var(--color-chart-other)");
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
});
