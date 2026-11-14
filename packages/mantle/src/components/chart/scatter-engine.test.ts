import { afterEach, describe, expect, test, vi } from "vitest";
import { ChartEngine } from "./engine.js";
import type { PaintBackend, PaintContext, ResolvedPaint } from "./paint-backend.js";
import type { ScatterHit, ScatterHost } from "./scatter-engine.js";
import { createScatterView } from "./scatter-engine.js";
import { ChartStore } from "./store.js";
import type { ChartDatumEvent, SeriesSpec } from "./types.js";

/**
 * The 3D loading tests each import a fresh `scatter-engine.js`, so the lazy 3D
 * module starts unloaded, and most of them drive a 3D `ChartEngine`. The 2D
 * tests call a `ScatterView` over a hand-built host. happy-dom has no 2D
 * context, so a recording context or backend stands in for the canvas.
 */

type Mounted = { engine: ChartEngine; root: HTMLElement; marks: () => number };

const mountedEngines: Mounted[] = [];

afterEach(() => {
	for (const mount of mountedEngines) {
		mount.engine.destroy();
		mount.root.remove();
	}
	mountedEngines.length = 0;
	vi.doUnmock("./scatter-3d.js");
	vi.useRealTimers();
});

/** A fresh copy of the scatter module, with no 3D code loaded yet. */
const freshScatterModule = async () => {
	vi.resetModules();
	return import("./scatter-engine.js");
};

type ScatterModule = Awaited<ReturnType<typeof freshScatterModule>>;

const colors: ResolvedPaint = {
	signature: "test",
	series: new Map([["y", "#f00"]]),
	inputs: new Map(),
	barFills: new Map(),
	chrome: { grid: "#aaa", baseline: "#888", surface: "#fff", tickText: "#222", reference: "#888" },
	fontFamily: () => "sans-serif",
	resolve: () => "#f00",
};

const seriesSpec = (dataKey: string): SeriesSpec => ({
	dataKey,
	label: dataKey,
	color: "blue",
	mark: "scatter",
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: "circle",
	texture: "solid",
});

/** A paint context that records the name of each call it gets. */
const recordingContext = (): { context: PaintContext; calls: string[] } => {
	const calls: string[] = [];
	const record = (name: string) => (): void => {
		calls.push(name);
	};
	const context: PaintContext = {
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 1,
		globalAlpha: 1,
		lineJoin: "miter",
		lineCap: "butt",
		font: "",
		textAlign: "start",
		textBaseline: "alphabetic",
		save: record("save"),
		restore: record("restore"),
		beginPath: record("beginPath"),
		closePath: record("closePath"),
		moveTo: record("moveTo"),
		lineTo: record("lineTo"),
		bezierCurveTo: record("bezierCurveTo"),
		rect: record("rect"),
		roundRect: record("roundRect"),
		arc: record("arc"),
		fill: record("fill"),
		stroke: record("stroke"),
		fillRect: record("fillRect"),
		clip: record("clip"),
		setLineDash: record("setLineDash"),
		fillText: record("fillText"),
		measureText: () => ({ width: 10 }),
	};
	return { context, calls };
};

/** The columns and scales of one scatter chart, the way the engine holds them after an ingest. */
type Cloud = {
	/** The x positions, ascending. */
	xs: Float64Array;
	/** One column per series, in paint order. `NaN` is a gap. */
	columns: ReadonlyArray<{ dataKey: string; values: Float64Array }>;
	/** The x scale: `pixel = value * k + b`. */
	x: { k: number; b: number };
	/** The y scale: `pixel = value * k + b`. */
	y: { k: number; b: number };
};

/** One CSS pixel per data unit, from the origin. */
const UNIT_SCALE = { k: 1, b: 0 };

/** A 2D scatter host over `cloud`. `overrides` replace single members. */
const hostOf = (cloud: Cloud, overrides: Partial<ScatterHost> = {}): ScatterHost => {
	const specs = cloud.columns.map((column) => seriesSpec(column.dataKey));
	const columns = cloud.columns.map((column) => column.values);
	return {
		plot: () => ({ left: 0, top: 0, width: 400, height: 200 }),
		colors: () => colors,
		specs: () => specs,
		rowCount: () => cloud.xs.length,
		xs: () => cloud.xs,
		zs: () => new Float64Array(cloud.xs.length),
		columns: () => columns,
		columnOf: (dataKey) => cloud.columns.find((column) => column.dataKey === dataKey)?.values,
		paintedValues: (_spec, seriesIndex) => columns[seriesIndex] ?? new Float64Array(0),
		definedIndexes: (values) => [...values.keys()].filter((index) => !Number.isNaN(values[index])),
		reveal: () => 1,
		shape: () => "circle",
		xCoefficients: () => cloud.x,
		yCoefficients: () => cloud.y,
		domains: () => ({ x: [0, 1], y: [0, 1], z: [0, 1] }),
		xKey: () => "x",
		zKey: () => null,
		is3d: () => false,
		requestPaint: () => {},
		...overrides,
	};
};

const mount3d = (scatter: ScatterModule, options: { inView: boolean }): Mounted => {
	let arcs = 0;
	const context = new Proxy(
		{ globalAlpha: 1, measureText: () => ({ width: 10 }) },
		{
			get(target, key) {
				if (key in target) {
					return Reflect.get(target, key);
				}
				return () => {
					if (key === "arc") {
						arcs += 1;
					}
				};
			},
		},
	) as unknown as PaintContext;
	const backend = (): PaintBackend => ({
		kind: "canvas",
		element: document.createElement("canvas"),
		paintSignature: () => "test",
		resolvePaint: () => colors,
		measureContext: () => context,
		begin: () => context,
		composite: (_context, layers) => {
			layers.underlay();
			layers.marks();
		},
		end: () => {},
		release: () => {},
		destroy: () => {},
	});
	const root = document.createElement("div");
	const plot = document.createElement("div");
	root.append(plot);
	document.body.append(root);
	const store = new ChartStore();
	store.registerSeries(seriesSpec("y"));
	const engine = new ChartEngine({
		kind: "scatter",
		store,
		backend,
		scatter: scatter.createScatterView,
		slotName: "scatter-plot",
		elements: { root, plot, tooltip: null },
		inView: options.inView,
		size: { width: 400, height: 200 },
	});
	engine.setOptions({
		xKey: "x",
		xScale: "linear",
		yDomain: ["auto", "auto"],
		orientation: "vertical",
		zKey: "z",
		dimensions: 3,
		stacked: false,
		animate: false,
	});
	engine.setRows([{ x: 1, y: 2, z: 3 }]);
	engine.flushIngest();
	const mount = { engine, root, marks: () => arcs };
	mountedEngines.push(mount);
	return mount;
};

/** Make each load of the 3D code fail. Returns the stub that takes the error reports. */
const failScatter3dLoads = () => {
	const reportError = vi.fn<(error: unknown) => void>();
	vi.stubGlobal("reportError", reportError);
	vi.doMock("./scatter-3d.js", () => {
		throw new Error("chunk failed");
	});
	return reportError;
};

/**
 * Wait for the 3D load in flight to fail. Every caller of `preloadScatter3d`
 * shares one promise, so this call joins the load a paint or a press started.
 */
const loadFails = async (scatter: ScatterModule): Promise<void> => {
	await expect(scatter.preloadScatter3d()).rejects.toBeInstanceOf(Error);
};

/**
 * A 3D view whose code fails to load, over a host that counts the repaints the
 * view asks for. No engine repaints here, so a test paints for it.
 */
const mountFailingView = async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	failScatter3dLoads();
	const scatter = await freshScatterModule();
	const requestPaint = vi.fn<() => void>();
	const cloud: Cloud = {
		xs: Float64Array.from([1]),
		columns: [{ dataKey: "y", values: Float64Array.from([2]) }],
		x: UNIT_SCALE,
		y: UNIT_SCALE,
	};
	const view = scatter.createScatterView(hostOf(cloud, { is3d: () => true, requestPaint }));
	const { context } = recordingContext();
	/** Paint, which starts a load, and wait for that load to fail. */
	const paintAndFail = async (): Promise<void> => {
		view.paint(context);
		await loadFails(scatter);
	};
	/** Fail the first load and its three retries, so the view asks for no more repaints. */
	const exhaustRetries = async (): Promise<void> => {
		for (const wait of [1_000, 4_000, 16_000, 0]) {
			await paintAndFail();
			await vi.advanceTimersByTimeAsync(wait);
		}
	};
	return { scatter, view, requestPaint, paintAndFail, exhaustRetries };
};

describe("ScatterView 3D loading", () => {
	test("a dormant 3D chart prints its points when the 3D code loaded before activation", async () => {
		const scatter = await freshScatterModule();
		await scatter.preloadScatter3d();
		const mount = mount3d(scatter, { inView: false });

		mount.engine.paintForPrint();

		expect(mount.marks()).toBeGreaterThan(0);
	});

	test("a drag that starts while the 3D code loads rotates and does not activate a datum", async () => {
		const scatter = await freshScatterModule();
		const mount = mount3d(scatter, { inView: true });
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		mount.engine.setCallbacks({ onDatumActivate, onActiveIndexChange: null });
		mount.engine.commitNow();

		mount.engine.handlePointerDown(10, 10);
		await scatter.preloadScatter3d();
		mount.engine.commitNow();
		mount.engine.handlePointerMove(200, 100);
		mount.engine.handlePointerUp(200, 100);

		expect(onDatumActivate).not.toHaveBeenCalled();
	});

	test("a drag that passes the threshold while the 3D code loads still ends as a rotation", async () => {
		const scatter = await freshScatterModule();
		const cloud: Cloud = {
			xs: Float64Array.from([1]),
			columns: [{ dataKey: "y", values: Float64Array.from([2]) }],
			x: UNIT_SCALE,
			y: UNIT_SCALE,
		};
		const view = scatter.createScatterView(hostOf(cloud, { is3d: () => true }));

		view.pressAt(10, 10);
		view.dragTo(200, 100);
		await scatter.preloadScatter3d();
		// The paint creates the 3D state, which takes over the held press.
		view.paint(recordingContext().context);

		expect(view.release()).toBe("rotated");
	});

	test("a failed load reports the error, and the next paint loads the code again", async () => {
		const reportError = vi.fn<(error: unknown) => void>();
		vi.stubGlobal("reportError", reportError);
		vi.doMock("./scatter-3d.js", () => {
			throw new Error("chunk failed");
		});
		const scatter = await freshScatterModule();
		const mount = mount3d(scatter, { inView: true });

		mount.engine.commitNow();
		await vi.waitFor(() => {
			expect(reportError).toHaveBeenCalledTimes(1);
		});
		expect(mount.marks()).toBe(0);

		vi.doUnmock("./scatter-3d.js");
		mount.engine.setRows([{ x: 1, y: 2, z: 3 }]);
		mount.engine.flushIngest();
		mount.engine.commitNow();
		await vi.waitFor(() => {
			mount.engine.commitNow();
			expect(mount.marks()).toBeGreaterThan(0);
		});
	});

	test("two 3D charts send one report for one failed load", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const reportError = failScatter3dLoads();
		const scatter = await freshScatterModule();
		const first = mount3d(scatter, { inView: true });
		const second = mount3d(scatter, { inView: true });

		first.engine.commitNow();
		second.engine.commitNow();
		// Both paints join one load. Its rejection is the error the page must see.
		const failure: unknown = await scatter.preloadScatter3d().catch((error: unknown) => error);

		expect(reportError).toHaveBeenCalledTimes(1);
		expect(reportError).toHaveBeenLastCalledWith(failure);
	});

	test("an idle 3D chart loads the code again 1 s after a failed load", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		failScatter3dLoads();
		const scatter = await freshScatterModule();
		const mount = mount3d(scatter, { inView: true });
		mount.engine.commitNow();
		await loadFails(scatter);

		vi.doUnmock("./scatter-3d.js");
		await vi.advanceTimersByTimeAsync(1_000);

		await vi.waitFor(() => {
			expect(mount.marks()).toBeGreaterThan(0);
		});
	});

	test("a load that keeps failing asks for a repaint after 1 s, 4 s, and 16 s, then stops", async () => {
		const { requestPaint, paintAndFail } = await mountFailingView();

		// The first load fails: one repaint, 1 s later.
		await paintAndFail();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(requestPaint).toHaveBeenCalledTimes(1);

		// That repaint's load fails: no repaint at 1 s, one by 4 s.
		await paintAndFail();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(requestPaint).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(3_000);
		expect(requestPaint).toHaveBeenCalledTimes(2);

		// The third load fails: no repaint at 4 s, one by 16 s.
		await paintAndFail();
		await vi.advanceTimersByTimeAsync(4_000);
		expect(requestPaint).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(12_000);
		expect(requestPaint).toHaveBeenCalledTimes(3);

		// The fourth load fails: no repaint after it.
		await paintAndFail();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(requestPaint).toHaveBeenCalledTimes(3);
	});

	test("a paint that fails while a retry waits asks for no second repaint", async () => {
		const { requestPaint, paintAndFail } = await mountFailingView();
		await paintAndFail();
		await paintAndFail();

		await vi.advanceTimersByTimeAsync(60_000);

		expect(requestPaint).toHaveBeenCalledTimes(1);
	});

	test("a press starts the retries again after they stop", async () => {
		const { scatter, view, requestPaint, exhaustRetries } = await mountFailingView();
		await exhaustRetries();
		requestPaint.mockClear();

		view.pressAt(10, 10);
		await loadFails(scatter);
		await vi.advanceTimersByTimeAsync(1_000);

		expect(requestPaint).toHaveBeenCalledTimes(1);
	});

	test("new data starts the retries again after they stop", async () => {
		const { view, requestPaint, paintAndFail, exhaustRetries } = await mountFailingView();
		await exhaustRetries();
		requestPaint.mockClear();

		// The engine calls `resetProjection` at each ingest, then paints.
		view.resetProjection();
		await paintAndFail();
		await vi.advanceTimersByTimeAsync(1_000);

		expect(requestPaint).toHaveBeenCalledTimes(1);
	});
});

/** A seeded generator of numbers in `[0, 1)`, so a failure reproduces. */
const seededRandom = (seed: number): (() => number) => {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
};

/**
 * A random cloud of one to three series with gaps. A cloud on the grid holds
 * whole pixels, so it makes exact ties and points at exactly the hit radius.
 * A cloud off the grid holds fractions, so its pixels round.
 */
const randomCloud = (
	random: () => number,
	options: { onGrid: boolean; rowCount: number },
): Cloud => {
	const { onGrid, rowCount } = options;
	const coordinate = (span: number): number =>
		onGrid ? Math.floor(random() * span) : random() * span;
	const slopes = onGrid ? [0, 1, 3, 12, -3] : [0, 0.37, 7.25, 31.4, -2.6];
	const seriesCount = 1 + Math.floor(random() * 3);
	return {
		xs: Float64Array.from({ length: rowCount }, () => coordinate(40)).toSorted(),
		columns: Array.from({ length: seriesCount }, (_unused, seriesIndex) => ({
			dataKey: `series-${seriesIndex}`,
			values: Float64Array.from({ length: rowCount }, () =>
				random() < 0.2 ? Number.NaN : coordinate(20),
			),
		})),
		x: { k: slopes[Math.floor(random() * slopes.length)] ?? 1, b: coordinate(50) },
		y: { k: onGrid ? -4 : -3.3, b: 200 },
	};
};

/** A pointer position in CSS pixels. */
type Pointer = { cssX: number; cssY: number };

/** A pointer up to 30 px from a random point of `cloud`, on or off the pixel grid. */
const randomPointer = (
	random: () => number,
	options: { cloud: Cloud; onGrid: boolean },
): Pointer => {
	const { cloud, onGrid } = options;
	const offset = (): number => (onGrid ? Math.floor(random() * 61) - 30 : random() * 60 - 30);
	const row = Math.floor(random() * cloud.xs.length);
	const column = cloud.columns[Math.floor(random() * cloud.columns.length)];
	const value = column?.values[row] ?? Number.NaN;
	return {
		cssX: (cloud.xs[row] ?? 0) * cloud.x.k + cloud.x.b + offset(),
		cssY: (Number.isNaN(value) ? 10 : value) * cloud.y.k + cloud.y.b + offset(),
	};
};

/** The hit tolerance in CSS pixels that the ScatterPlot docs state. */
const HIT_RADIUS = 24;

/**
 * The reference hit test: every series times every row. The first series,
 * then the lowest row, wins a tie.
 */
const fullScanHit = (cloud: Cloud, pointer: Pointer): ScatterHit | null => {
	const { cssX, cssY } = pointer;
	let best: ScatterHit | null = null;
	let bestDistance = HIT_RADIUS * HIT_RADIUS;
	for (const { dataKey, values } of cloud.columns) {
		for (let index = 0; index < cloud.xs.length; index++) {
			const value = values[index] ?? Number.NaN;
			if (Number.isNaN(value)) {
				continue;
			}
			const screenX = (cloud.xs[index] ?? 0) * cloud.x.k + cloud.x.b;
			const screenY = value * cloud.y.k + cloud.y.b;
			const deltaX = screenX - cssX;
			const deltaY = screenY - cssY;
			const distance = deltaX * deltaX + deltaY * deltaY;
			if (distance < bestDistance) {
				bestDistance = distance;
				best = { seriesKey: dataKey, index, screenX, screenY };
			}
		}
	}
	return best;
};

describe("ScatterView 2D hit test", () => {
	test.each([
		{
			winner: "the lowest row of one series",
			columns: [{ dataKey: "a", values: Float64Array.from([5, 5]) }],
			expected: { seriesKey: "a", index: 0 },
		},
		{
			winner: "the first series over a lower row of a later series",
			columns: [
				{ dataKey: "a", values: Float64Array.from([Number.NaN, 5]) },
				{ dataKey: "b", values: Float64Array.from([5, Number.NaN]) },
			],
			expected: { seriesKey: "a", index: 1 },
		},
	])("a tie goes to $winner", ({ columns, expected }) => {
		const view = createScatterView(
			hostOf({ xs: Float64Array.from([10, 10]), columns, x: UNIT_SCALE, y: UNIT_SCALE }),
		);

		expect(view.hitAt(12, 5)).toMatchObject(expected);
	});

	test("reads no row past the hit radius in x", () => {
		const read: number[] = [];
		// Why a Proxy: the rows a hit test reads are the one trace of how far it scans.
		const values = new Proxy(new Float64Array(1000).fill(50), {
			get(target, key) {
				if (typeof key === "string" && /^\d+$/.test(key)) {
					read.push(Number(key));
				}
				return Reflect.get(target, key);
			},
		});
		// One row per pixel, so row 500 is under the pointer.
		const xs = Float64Array.from({ length: 1000 }, (_unused, index) => index);
		const view = createScatterView(
			hostOf({ xs, columns: [{ dataKey: "y", values }], x: UNIT_SCALE, y: UNIT_SCALE }),
		);

		expect(view.hitAt(500, 50)).toMatchObject({ seriesKey: "y", index: 500 });
		expect(read.filter((index) => Math.abs(index - 500) >= HIT_RADIUS)).toEqual([]);
	});

	test("with an x coefficient of 0, a hit comes from any row", () => {
		const view = createScatterView(
			hostOf({
				xs: Float64Array.from([0, 500, 1000]),
				columns: [{ dataKey: "y", values: Float64Array.from([10, 50, 90]) }],
				x: { k: 0, b: 100 },
				y: UNIT_SCALE,
			}),
		);

		expect(view.hitAt(100, 88)).toEqual({ seriesKey: "y", index: 2, screenX: 100, screenY: 90 });
	});

	test("returns the hit of a full scan for seeded random clouds and pointers", () => {
		const random = seededRandom(20261113);
		const expected: Array<Pointer & { cloud: number; hit: ScatterHit | null }> = [];
		const actual: typeof expected = [];
		for (let cloudIndex = 0; cloudIndex < 400; cloudIndex++) {
			const onGrid = cloudIndex % 2 === 0;
			// Every tenth cloud is large, so the search runs more than a few steps.
			const rowCount = cloudIndex % 10 === 9 ? 1500 : Math.floor(random() * 60);
			const cloud = randomCloud(random, { onGrid, rowCount });
			const view = createScatterView(hostOf(cloud));
			for (let probe = 0; probe < 40; probe++) {
				const pointer = randomPointer(random, { cloud, onGrid });
				expected.push({ cloud: cloudIndex, ...pointer, hit: fullScanHit(cloud, pointer) });
				actual.push({
					cloud: cloudIndex,
					...pointer,
					hit: view.hitAt(pointer.cssX, pointer.cssY),
				});
			}
		}

		expect(actual).toEqual(expected);
	});
});

describe("ScatterView 2D paint", () => {
	const cloud: Cloud = {
		xs: Float64Array.from([0, 1, 2]),
		columns: [{ dataKey: "y", values: Float64Array.from([1, 2, 3]) }],
		x: { k: 100, b: 0 },
		y: { k: -50, b: 200 },
	};

	/** The calls one paint of `cloud` makes at `reveal`, without the state calls around them. */
	const drawCallsAt = (reveal: number): string[] => {
		const { context, calls } = recordingContext();
		createScatterView(hostOf(cloud, { reveal: () => reveal })).paint(context);
		return calls.filter((name) => name !== "save" && name !== "restore");
	};

	// Why the call list: an alpha under half of one 8-bit step changes no pixel,
	// so the calls a paint makes are the one trace of the work it skips.
	test.each([
		{ at: "0", reveal: 0 },
		{ at: "0.001 (a moment after the reveal starts)", reveal: 0.001 },
	])("a series makes no draw call at a reveal of $at", ({ reveal }) => {
		expect(drawCallsAt(reveal)).toEqual([]);
	});

	test.each([
		{ at: "1/510 (half of one 8-bit alpha step)", reveal: 1 / 510 },
		{ at: "1", reveal: 1 },
	])("a series traces one arc for each point at a reveal of $at", ({ reveal }) => {
		expect(drawCallsAt(reveal).filter((name) => name === "arc")).toHaveLength(3);
	});
});
