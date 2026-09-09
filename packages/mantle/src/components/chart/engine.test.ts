import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { EngineElements } from "./engine.js";
import { ChartEngine } from "./engine.js";
import { ChartStore } from "./store.js";
import { ValueTween } from "./tween.js";
import type { ChartDatumEvent, ChartOptions, SeriesMark, SeriesSpec } from "./types.js";

/**
 * These tests drive `ChartEngine` directly, with a `ChartStore` and hand-built
 * overlay elements appended to the document, the way the Root binding does.
 * happy-dom returns no 2d context, so the canvas paint path returns early;
 * ingest, tween retargeting, hover snapshots, and the DOM overlay still run.
 * A fake `ResizeObserver` gives the plot a size, because happy-dom's never
 * fires and a 0×0 plot projects every value onto one pixel.
 */

type PlotSize = { width: number; height: number };
type ResizeCallback = (entries: Array<{ contentRect: PlotSize }>) => void;

/** The `ResizeObserver` callbacks the engine registers, keyed by the observed element. */
const resizeCallbacks = new Map<Element, ResizeCallback>();

class FakeResizeObserver {
	#callback: ResizeCallback;

	constructor(callback: ResizeCallback) {
		this.#callback = callback;
	}

	observe(target: Element): void {
		resizeCallbacks.set(target, this.#callback);
	}

	unobserve(): void {}

	disconnect(): void {}
}

const makeSeries = (
	dataKey: string,
	mark: SeriesMark,
	overrides: Partial<SeriesSpec> = {},
): SeriesSpec => ({
	dataKey,
	label: dataKey,
	seriesSlot: undefined,
	color: undefined,
	mark,
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: undefined,
	texture: "solid",
	...overrides,
});

const baseOptions: ChartOptions = {
	xKey: "x",
	xScale: "linear",
	yDomain: ["auto", "auto"],
	orientation: "vertical",
	zKey: null,
	dimensions: 3,
	stacked: false,
	animate: false,
};

type Mounted = {
	engine: ChartEngine;
	store: ChartStore;
	elements: EngineElements;
	options: ChartOptions;
	/** Each registered series' unregister cleanup, by `dataKey`. */
	unregister: Map<string, () => void>;
};

const mounted: Mounted[] = [];

const createElements = (): EngineElements => {
	const document = window.document;
	const root = document.createElement("div");
	const plot = document.createElement("div");
	const canvas = document.createElement("canvas");
	const crosshair = document.createElement("div");
	const band = document.createElement("div");
	const markers = document.createElement("div");
	const tooltip = document.createElement("div");
	plot.append(canvas, crosshair, band, markers, tooltip);
	root.append(plot);
	document.body.append(root);
	return { root, canvas, plot, crosshair, band, markers, tooltip };
};

/**
 * Mount an engine the way one React commit does: series register first, then
 * options and rows land, the plot reports its size, and the Root flushes the
 * pending ingest.
 */
const mountEngine = (config: {
	kind: SeriesMark;
	series: readonly SeriesSpec[];
	rows: readonly object[];
	options?: Partial<ChartOptions>;
	size?: PlotSize;
}): Mounted => {
	const store = new ChartStore();
	const elements = createElements();
	const engine = new ChartEngine({ kind: config.kind, elements, store });
	const unregister = new Map(
		config.series.map((spec) => [spec.dataKey, store.registerSeries(spec)] as const),
	);
	const options: ChartOptions = { ...baseOptions, ...config.options };
	engine.setOptions(options);
	engine.setRows(config.rows);
	const resize = resizeCallbacks.get(elements.plot);
	if (resize == null) {
		throw new Error("expected the engine to observe the plot element");
	}
	resize([{ contentRect: config.size ?? { width: 400, height: 200 } }]);
	engine.flushIngest();
	const result = { engine, store, elements, options, unregister };
	mounted.push(result);
	return result;
};

/** Parse `translate3d(Xpx, Ypx, 0)` off a marker dot into plot-space coordinates. */
const dotPosition = (dot: Element): { x: number; y: number } => {
	if (!(dot instanceof HTMLElement)) {
		throw new Error("expected a marker dot element");
	}
	const match = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(dot.style.transform);
	if (match?.[1] == null || match[2] == null) {
		throw new Error(`expected a positioned dot, got transform "${dot.style.transform}"`);
	}
	return { x: Number(match[1]), y: Number(match[2]) };
};

/**
 * Step the keyboard cursor onto the first datum and wait for the overlay
 * commit to place every marker dot. Returns the dots in series paint order;
 * the same elements keep their identity across later commits.
 */
const activateFirstDatum = async (mount: Mounted): Promise<Element[]> => {
	mount.engine.handleKeyDown("Home");
	await vi.waitFor(() => {
		const dots = [...mount.elements.markers.children];
		expect(dots.length).toBeGreaterThan(0);
		for (const dot of dots) {
			expect(dot instanceof HTMLElement && dot.style.opacity).toBe("1");
		}
	});
	return [...mount.elements.markers.children];
};

/**
 * Resolve after the next engine commit. The engine registers its frame before
 * this one, so exactly one commit runs in between: the assertion that follows
 * reads the first frame after a change, which a settled glide would hide.
 */
const afterNextCommit = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => resolve());
	});

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

beforeEach(() => {
	vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

afterEach(() => {
	for (const mount of mounted) {
		mount.engine.destroy();
		mount.elements.root.remove();
	}
	mounted.length = 0;
	resizeCallbacks.clear();
});

describe("ChartEngine yDomain changes", () => {
	test("a yDomain change re-aims the value axis without re-reading the rows", () => {
		let reads = 0;
		const rows = Array.from(
			{ length: 50 },
			(_, index) =>
				new Proxy(
					{ x: index, a: index * 2 },
					{
						get(target, key, receiver) {
							reads += 1;
							return Reflect.get(target, key, receiver);
						},
					},
				),
		);
		const mount = mountEngine({ kind: "line", series: [makeSeries("a", "line")], rows });
		const readsAfterIngest = reads;
		expect(readsAfterIngest).toBeGreaterThan(0);

		mount.engine.setOptions({ ...mount.options, yDomain: [0, 1000] });
		mount.engine.flushIngest();

		expect(reads).toBe(readsAfterIngest);
	});

	test("a yDomain change moves the hover marker to the new projection", async () => {
		const rows = [
			{ x: 0, a: 50 },
			{ x: 1, a: 50 },
			{ x: 2, a: 50 },
		];
		const series = [makeSeries("a", "line")];
		const mount = mountEngine({ kind: "line", series, rows, options: { yDomain: [0, 100] } });
		const reference = mountEngine({ kind: "line", series, rows, options: { yDomain: [0, 200] } });
		const [dot] = await activateFirstDatum(mount);
		const [expected] = await activateFirstDatum(reference);
		if (dot == null || expected == null) {
			throw new Error("expected one marker dot per chart");
		}
		const beforeY = dotPosition(dot).y;
		expect(beforeY).not.toBe(dotPosition(expected).y);

		mount.engine.setOptions({ ...mount.options, yDomain: [0, 200] });

		await vi.waitFor(() => {
			expect(dotPosition(dot).y).toBe(dotPosition(expected).y);
		});
	});

	test("a yDomain change drops the cached scatter hover pixel", async () => {
		const rows = [
			{ x: 0, a: 50 },
			{ x: 1, a: 50 },
			{ x: 2, a: 50 },
		];
		const series = [makeSeries("a", "scatter")];
		const mount = mountEngine({ kind: "scatter", series, rows, options: { yDomain: [0, 100] } });
		const reference = mountEngine({
			kind: "scatter",
			series,
			rows,
			options: { yDomain: [0, 200] },
		});
		const [dot] = await activateFirstDatum(mount);
		const [expected] = await activateFirstDatum(reference);
		if (dot == null || expected == null) {
			throw new Error("expected one marker dot per chart");
		}
		// A pointer hit caches the point's pixel; the keyboard path does not.
		const pixel = dotPosition(dot);
		mount.engine.handlePointerLeave();
		mount.engine.handlePointerMove(pixel.x, pixel.y);
		await vi.waitFor(() => {
			expect(mount.store.getSnapshot().hover?.index).toBe(0);
			expect(dotPosition(dot)).toEqual(pixel);
		});

		mount.engine.setOptions({ ...mount.options, yDomain: [0, 200] });

		await vi.waitFor(() => {
			expect(dotPosition(dot).y).toBe(dotPosition(expected).y);
		});
		expect(dotPosition(dot).y).not.toBe(pixel.y);
	});
});

describe("ChartEngine hover sync", () => {
	test("reads the cached series list and places stacked dots on their upper boundaries", async () => {
		// Above `PER_DATUM_TWEEN_LIMIT`, painted values come from the stack, not a tween.
		const rows = Array.from({ length: 3000 }, (_, index) => ({ x: index, a: 10, b: 20, c: 30 }));
		const series = ["a", "b", "c"].map((key) => makeSeries(key, "area"));
		const mount = mountEngine({
			kind: "area",
			series,
			rows,
			options: { stacked: true, yDomain: [0, 100] },
		});
		// The same three heights as unstacked values: 10, 10 + 20, 10 + 20 + 30.
		const reference = mountEngine({
			kind: "area",
			series: ["low", "mid", "high"].map((key) => makeSeries(key, "area")),
			rows: [
				{ x: 0, low: 10, mid: 30, high: 60 },
				{ x: 1, low: 10, mid: 30, high: 60 },
			],
			options: { yDomain: [0, 100] },
		});
		const dots = await activateFirstDatum(mount);
		const expected = await activateFirstDatum(reference);
		expect(dots.map((dot) => dotPosition(dot).y)).toEqual(
			expected.map((dot) => dotPosition(dot).y),
		);
		const firstX = dots.map((dot) => dotPosition(dot).x);

		const seriesSpecs = vi.spyOn(ChartStore.prototype, "seriesSpecs");
		const seriesMeta = vi.spyOn(ChartStore.prototype, "seriesMeta");
		mount.engine.handleKeyDown("End");
		await vi.waitFor(() => {
			expect(mount.store.getSnapshot().hover?.index).toBe(rows.length - 1);
			expect(dots.map((dot) => dotPosition(dot).x)).not.toEqual(firstX);
		});

		// The snapshot and the overlay sync read `getSnapshot().series`, which
		// the store rebuilds per registration change, and index the stack by
		// paint position instead of searching the re-sorted spec list.
		expect(seriesSpecs).toHaveBeenCalledTimes(0);
		expect(seriesMeta).toHaveBeenCalledTimes(0);
	});
});

describe("ChartEngine enter reveals", () => {
	test("a series that unregisters drops its reveal and plays it again when it registers again", () => {
		// The reveal is canvas alpha, invisible without a 2d context. Its start,
		// `retarget([0], …)` on a plain one-element array, is the one call shape
		// no value tween (a `Float64Array` per row) makes.
		const retarget = vi.spyOn(ValueTween.prototype, "retarget");
		const revealStarts = (): number =>
			retarget.mock.calls.filter(
				([target]) => Array.isArray(target) && target.length === 1 && target[0] === 0,
			).length;
		const rows = [
			{ x: 0, a: 1, b: 2 },
			{ x: 1, a: 3, b: 4 },
		];
		const mount = mountEngine({
			kind: "line",
			series: [makeSeries("a", "line"), makeSeries("b", "line")],
			rows,
		});
		expect(revealStarts()).toBe(2);

		// A prop change re-registers inside one commit, before the flush.
		mount.unregister.get("a")?.();
		mount.unregister.set(
			"a",
			mount.store.registerSeries(makeSeries("a", "line", { markers: true })),
		);
		mount.engine.flushIngest();
		expect(revealStarts()).toBe(2);

		// An unmount reaches the flush without the key.
		mount.unregister.get("a")?.();
		mount.engine.flushIngest();
		expect(revealStarts()).toBe(2);

		// A later mount enters again.
		mount.unregister.set("a", mount.store.registerSeries(makeSeries("a", "line")));
		mount.engine.flushIngest();
		expect(revealStarts()).toBe(3);
	});
});

describe("ChartEngine reduced motion", () => {
	test("creates the media query once per engine and reads the live preference", async () => {
		const preference = { reduced: false };
		// `matches` is a live getter, as it is on a real `MediaQueryList`.
		const matchMedia = vi.fn<(query: string) => MediaQueryList>((query) => ({
			get matches() {
				return query === REDUCED_MOTION_QUERY && preference.reduced;
			},
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}));
		vi.stubGlobal("matchMedia", matchMedia);
		const reducedMotionQueries = (): number =>
			matchMedia.mock.calls.filter(([query]) => query === REDUCED_MOTION_QUERY).length;

		const rows = [
			{ x: 0, a: 50 },
			{ x: 1, a: 50 },
		];
		const series = [makeSeries("a", "line")];
		const mount = mountEngine({
			kind: "line",
			series,
			rows,
			options: { yDomain: [0, 100], animate: true },
		});
		const glideTarget = mountEngine({ kind: "line", series, rows, options: { yDomain: [0, 200] } });
		const snapTarget = mountEngine({ kind: "line", series, rows, options: { yDomain: [0, 300] } });
		const [dot] = await activateFirstDatum(mount);
		const [glideDot] = await activateFirstDatum(glideTarget);
		const [snapDot] = await activateFirstDatum(snapTarget);
		if (dot == null || glideDot == null || snapDot == null) {
			throw new Error("expected one marker dot per chart");
		}

		// Motion on: the axis glides, so the first frame is short of the target.
		mount.engine.setOptions({ ...mount.options, yDomain: [0, 200] });
		await afterNextCommit();
		expect(dotPosition(dot).y).not.toBe(dotPosition(glideDot).y);

		// The preference flips on the cached list: the next change snaps.
		preference.reduced = true;
		mount.engine.setOptions({ ...mount.options, yDomain: [0, 300] });
		await afterNextCommit();
		expect(dotPosition(dot).y).toBe(dotPosition(snapDot).y);

		// Only `mount` animates. `#tweenDuration` returns 0 on `animate: false`
		// before it asks for the query, so the two reference engines create none.
		expect(reducedMotionQueries()).toBe(1);
	});
});

describe("ChartEngine x values", () => {
	test("a time scale publishes a Date per read, so a mutated event value never reaches the next snapshot", () => {
		const firstTime = new Date("2026-07-18T10:00:00Z");
		const firstEpoch = firstTime.getTime();
		const rows = [
			{ t: firstTime, a: 1 },
			{ t: new Date("2026-07-18T10:01:00Z"), a: 2 },
		];
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		const mount = mountEngine({
			kind: "line",
			series: [makeSeries("a", "line")],
			rows,
			options: { xKey: "t", xScale: "time" },
		});
		mount.engine.setCallbacks({ onDatumActivate, onActiveIndexChange: null });

		mount.engine.handleKeyDown("Home");
		expect(mount.store.getSnapshot().hover?.xValue).toEqual(firstTime);

		mount.engine.handleActivate(null, null);
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, xValue: firstTime, dataKey: null }),
		);
		const activated = onDatumActivate.mock.calls[0]?.[0]?.xValue;
		if (!(activated instanceof Date)) {
			throw new Error("expected a Date xValue on a time scale");
		}

		activated.setTime(0);
		mount.engine.handleKeyDown("End");
		mount.engine.handleKeyDown("Home");
		// Compare against the captured instant, not the row's own `Date`: an
		// engine that hands out the row's `Date` by reference would rewrite
		// `firstTime` too, and `toEqual(firstTime)` would pass on the epoch.
		expect(mount.store.getSnapshot().hover?.xValue).toEqual(new Date(firstEpoch));
		expect(firstTime.getTime()).toBe(firstEpoch);
	});

	test("a linear scale publishes the number and a band scale the raw category", () => {
		const linear = mountEngine({
			kind: "line",
			series: [makeSeries("a", "line")],
			rows: [
				{ x: 7, a: 1 },
				{ x: 9, a: 2 },
			],
		});
		linear.engine.handleKeyDown("End");
		expect(linear.store.getSnapshot().hover?.xValue).toBe(9);

		const band = mountEngine({
			kind: "bar",
			series: [makeSeries("a", "bar")],
			rows: [
				{ x: "GET", a: 1 },
				{ x: "POST", a: 2 },
			],
			options: { xScale: "band" },
		});
		band.engine.handleKeyDown("End");
		expect(band.store.getSnapshot().hover?.xValue).toBe("POST");
	});
});
