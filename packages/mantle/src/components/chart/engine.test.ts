import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createCanvasBackend } from "./canvas-backend.js";
import { createScatterView } from "./scatter-engine.js";
import { createColorResolver } from "./canvas-colors.js";
import { CHART_CHROME_CSS } from "./colors.js";
import { createSvgBackend } from "./svg-backend.js";
import type { EngineElements, HoverLayers } from "./engine.js";
import { ChartEngine } from "./engine.js";
import type { PaintBackendFactory } from "./paint-backend.js";
import { ChartStore } from "./store.js";
import { ChaseTween, PER_DATUM_TWEEN_LIMIT, ValueTween } from "./tween.js";
import type { ChartDatumEvent, ChartOptions, SeriesMark, SeriesSpec } from "./types.js";

// Why a spied module: happy-dom has no 2D context, so no paint reaches the
// canvas. `createColorResolver` runs once per color pass, and its call count is
// the one trace of when the engine resolves colors.
vi.mock("./canvas-colors.js", { spy: true });

/**
 * These tests drive `ChartEngine` directly, with a `ChartStore`, the canvas
 * backend, and hand-built overlay elements appended to the document, the way
 * the Root binding does. happy-dom returns no 2d context, so the canvas paint
 * path returns early;
 * ingest, tween retargeting, hover snapshots, and the DOM overlay still run.
 * A test that reads the painted marks mounts the SVG backend, which paints in
 * happy-dom.
 * A fake `ResizeObserver` gives the plot a size, because happy-dom's never
 * fires and a 0×0 plot projects every value onto one pixel.
 */

type PlotSize = { width: number; height: number };
type ResizeCallback = (entries: Array<{ target: Element; contentRect: PlotSize }>) => void;

/** The `ResizeObserver` callbacks the engine registers, keyed by the observed element. */
const resizeCallbacks = new Map<Element, ResizeCallback>();

class FakeResizeObserver {
	/** Observers built since the last reset; the engines of one document share one. */
	static constructed = 0;
	#callback: ResizeCallback;

	constructor(callback: ResizeCallback) {
		this.#callback = callback;
		FakeResizeObserver.constructed += 1;
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
	color: "blue",
	mark,
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: "circle",
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
	elements: ReturnType<typeof createElements>;
	/** The canvas the backend inserted into the plot. */
	canvas: HTMLCanvasElement;
	options: ChartOptions;
	/** Each registered series' unregister cleanup, by `dataKey`. */
	unregister: Map<string, () => void>;
};

const mounted: Mounted[] = [];

const createElements = (): EngineElements & { layers: HoverLayers } => {
	const document = window.document;
	const root = document.createElement("div");
	const plot = document.createElement("div");
	const crosshair = document.createElement("div");
	const band = document.createElement("div");
	const markers = document.createElement("div");
	const tooltip = document.createElement("div");
	plot.append(crosshair, band, markers, tooltip);
	root.append(plot);
	document.body.append(root);
	return { root, plot, tooltip, layers: { crosshair, band, markers } };
};

/** The hover layers of a mounted engine; every mount here is interactive. */
const hoverOf = (mount: Pick<Mounted, "elements">): HoverLayers => mount.elements.layers;

/**
 * Mount an engine the way one React commit does: series register first, then
 * options and rows land, the plot reports its size, and the Root flushes the
 * pending ingest.
 */
/** Deliver one plot size the way the resize observer does. */
const deliverResize = (mount: Pick<Mounted, "elements">, size: PlotSize): void => {
	const resize = resizeCallbacks.get(mount.elements.plot);
	if (resize == null) {
		throw new Error("expected the engine to observe the plot element");
	}
	resize([{ target: mount.elements.plot, contentRect: size }]);
};

const mountEngine = (config: {
	kind: SeriesMark;
	series: readonly SeriesSpec[];
	rows: readonly object[];
	options?: Partial<ChartOptions>;
	/** `null` leaves the plot unsized, as before the observer's first entry. */
	size?: PlotSize | null;
	/** The Root passes `false` and reports the real state through `setInView`. */
	inView?: boolean;
	/** The Root passes what its `visible` band knows and reports changes through `setOnScreen`. */
	onScreen?: boolean;
	/** The canvas backend paints nothing in happy-dom. Pass the SVG backend to read the painted marks. */
	backend?: PaintBackendFactory;
}): Mounted => {
	const store = new ChartStore();
	const elements = createElements();
	const engine = new ChartEngine({
		kind: config.kind,
		elements,
		store,
		backend: config.backend ?? createCanvasBackend,
		slotName: "chart",
		scatter: createScatterView,
		createHoverLayers: () => elements.layers,
		inView: config.inView,
		onScreen: config.onScreen,
	});
	const unregister = new Map(
		config.series.map((spec) => [spec.dataKey, store.registerSeries(spec)] as const),
	);
	const options: ChartOptions = { ...baseOptions, ...config.options };
	engine.setOptions(options);
	engine.setRows(config.rows);
	// oxlint-disable-next-line eqeqeq -- Why: `null` skips the resize; `undefined` takes the default size.
	if (config.size !== null) {
		deliverResize({ elements }, config.size ?? { width: 400, height: 200 });
	}
	engine.flushIngest();
	const result = {
		engine,
		store,
		elements,
		options,
		unregister,
		get canvas(): HTMLCanvasElement {
			const canvas = elements.plot.querySelector("canvas");
			if (canvas == null) {
				throw new Error("expected the canvas backend to insert its canvas");
			}
			return canvas;
		},
	};
	mounted.push(result);
	return result;
};

/**
 * Report a size for the tooltip the way the resize observer does. The engine
 * reads the tooltip's offset box, which happy-dom leaves at zero.
 */
const reportTooltipSize = (mount: Pick<Mounted, "elements">, size: PlotSize): void => {
	const { tooltip } = mount.elements;
	const resize = tooltip == null ? undefined : resizeCallbacks.get(tooltip);
	if (tooltip == null || resize == null) {
		throw new Error("expected the engine to observe the tooltip element");
	}
	vi.spyOn(tooltip, "offsetWidth", "get").mockReturnValue(size.width);
	vi.spyOn(tooltip, "offsetHeight", "get").mockReturnValue(size.height);
	resize([{ target: tooltip, contentRect: size }]);
};

/** One 60 Hz frame, in ms. */
const FRAME_MS = 16.67;

/**
 * Put the engine's clock and its animation frames under the test's control.
 * happy-dom runs a frame on a real timer, so a test that counts frames, or
 * that reads the first frame of a glide, steps them by hand. Call it before
 * the engine mounts.
 */
const installFrameClock = () => {
	let now = 1000;
	let nextHandle = 1;
	const requests = new Map<number, FrameRequestCallback>();
	vi.spyOn(performance, "now").mockImplementation(() => now);
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback): number => {
		const handle = nextHandle;
		nextHandle += 1;
		requests.set(handle, callback);
		return handle;
	});
	vi.stubGlobal("cancelAnimationFrame", (handle: number): void => {
		requests.delete(handle);
	});
	/** Advance one frame and run the callbacks it holds. */
	const step = (): void => {
		now += FRAME_MS;
		const callbacks = [...requests.values()];
		requests.clear();
		for (const callback of callbacks) {
			callback(now);
		}
	};
	return {
		step,
		/** Whether an engine asked for another frame. */
		pending: (): boolean => requests.size > 0,
		/** Run frames until no engine asks for another. Returns how many ran. */
		settle: (): number => {
			let frames = 0;
			while (requests.size > 0) {
				if (frames >= 500) {
					throw new Error("expected the engine to stop asking for frames");
				}
				step();
				frames += 1;
			}
			return frames;
		},
	};
};

/** The `d` of every path the SVG surface holds, in paint order. */
const paintedPaths = (mount: Pick<Mounted, "elements">): string[] =>
	[...mount.elements.plot.querySelectorAll("svg path")].map((path) => path.getAttribute("d") ?? "");

const firstRows = [
	{ x: "GET", a: 40 },
	{ x: "POST", a: 80 },
];
// A new tallest bar: the bar values and the value domain both have somewhere to go.
const nextRows = [
	{ x: "GET", a: 70 },
	{ x: "POST", a: 20 },
];

/**
 * A bar engine with motion on that shows `firstRows`, and the `nextRows` frame
 * it must reach. Both are at rest, so a later frame runs the engine alone.
 */
const mountBars = (config: { onScreen?: boolean } = {}) => {
	const frames = installFrameClock();
	const series = [makeSeries("a", "bar")];
	const mount = mountEngine({
		kind: "bar",
		backend: createSvgBackend,
		series,
		rows: firstRows,
		options: { xScale: "band", animate: true },
		onScreen: config.onScreen,
	});
	const settled = mountEngine({
		kind: "bar",
		backend: createSvgBackend,
		series,
		rows: nextRows,
		options: { xScale: "band" },
	});
	frames.settle();
	return { frames, engine: mount.engine, painted: () => paintedPaths(mount), settled };
};

/** Parse `translate(Xpx, Ypx)` off a marker dot into plot-space coordinates. */
const dotPosition = (dot: Element): { x: number; y: number } => {
	if (!(dot instanceof HTMLElement)) {
		throw new Error("expected a marker dot element");
	}
	const match = /^translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)$/.exec(dot.style.transform);
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
		const dots = [...hoverOf(mount).markers.children];
		expect(dots.length).toBeGreaterThan(0);
		for (const dot of dots) {
			expect(dot instanceof HTMLElement && dot.style.opacity).toBe("1");
		}
	});
	return [...hoverOf(mount).markers.children];
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
	FakeResizeObserver.constructed = 0;
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
	test("places stacked dots on their upper boundaries", async () => {
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
	});

	/** Every element the engine moves to the active datum. */
	type Placed = HoverLayers & Pick<EngineElements, "tooltip">;

	test.each([
		{
			name: "the band of a vertical bar chart",
			kind: "bar",
			orientation: "vertical",
			pick: (placed: Placed) => placed.band,
		},
		{
			name: "the band of a horizontal bar chart",
			kind: "bar",
			orientation: "horizontal",
			pick: (placed: Placed) => placed.band,
		},
		{
			name: "the crosshair of a line chart",
			kind: "line",
			orientation: "vertical",
			pick: (placed: Placed) => placed.crosshair,
		},
		{
			name: "a marker dot of a line chart",
			kind: "line",
			orientation: "vertical",
			pick: (placed: Placed) => placed.markers.firstElementChild,
		},
		{
			name: "the marker dot of a scatter plot",
			kind: "scatter",
			orientation: "vertical",
			pick: (placed: Placed) => placed.markers.firstElementChild,
		},
		{
			name: "the tooltip",
			kind: "line",
			orientation: "vertical",
			pick: (placed: Placed) => placed.tooltip,
		},
	] as const)("the engine moves $name with a 2D transform", ({ kind, orientation, pick }) => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind,
			series: [makeSeries("a", kind)],
			rows: kind === "bar" ? firstRows : flatRows,
			options: { xScale: kind === "bar" ? "band" : "linear", orientation },
		});
		mount.engine.handleKeyDown("Home");
		frames.settle();
		const element = pick({ ...hoverOf(mount), tooltip: mount.elements.tooltip });
		// Why the function name: a 3D transform gives each element a compositor
		// layer of its own, and the inline style is the one trace of that here.
		expect(element instanceof HTMLElement ? element.style.transform : "").toMatch(/^translate\(/);
	});
});

/**
 * The x of the first category label on the first paint of a horizontal bar
 * chart. The labels end at the right edge of the gutter.
 */
const firstPaintLabelX = (categories: readonly string[]): number => {
	const mount = mountEngine({
		kind: "bar",
		backend: createSvgBackend,
		series: [makeSeries("a", "bar")],
		rows: categories.map((x, index) => ({ x, a: index + 1 })),
		options: { xScale: "band", orientation: "horizontal" },
	});
	mount.store.registerXAxis({ tickFormat: undefined, tickCount: undefined });
	mount.engine.commitNow();
	const label = [...mount.elements.plot.querySelectorAll("svg text")].find(
		(text) => text.textContent === categories[0],
	);
	if (label == null) {
		throw new Error(`expected the "${categories[0]}" label to paint`);
	}
	return Number(label.getAttribute("x"));
};

test("the first layout of a horizontal bar chart sizes the gutter for its category names", () => {
	const short = firstPaintLabelX(["a", "b", "c"]);
	const long = firstPaintLabelX([
		"us-east-1-production",
		"us-west-2-production",
		"eu-west-1-production",
	]);
	// A gutter sized for the row indexes is the same for both charts, and it
	// clips the long names.
	expect(long).toBeGreaterThan(short);
});

describe("ChartEngine tooltip placement", () => {
	/** A readout too wide for the room to the right of the last band, so its size shows in where it sits. */
	const READOUT = { width: 120, height: 80 };
	/** The surface with no rows in it: its padding and its border. */
	const EMPTY_BOX = { width: 20, height: 14 };

	/** A bar engine with the keyboard cursor on its last band, at rest. */
	const mountOnLastBand = () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "bar",
			series: [makeSeries("a", "bar")],
			rows: firstRows,
			options: { xScale: "band" },
		});
		const { tooltip } = mount.elements;
		if (tooltip == null) {
			throw new Error("expected the mount to hold a tooltip element");
		}
		mount.engine.handleKeyDown("End");
		frames.settle();
		return { frames, mount, tooltip };
	};

	test("a new readout size moves the tooltip on the next frame, not inside the observer callback", () => {
		const { frames, mount, tooltip } = mountOnLastBand();
		const unsized = tooltip.style.transform;

		reportTooltipSize(mount, READOUT);

		// A move inside the callback can add a scrollbar to an ancestor. That
		// resizes an observed box in the same observer pass: a loop error.
		expect(tooltip.style.transform).toBe(unsized);
		frames.settle();
		expect(tooltip.style.transform).not.toBe(unsized);
	});

	test("the first frame of the first readout sits where the size of its surface puts it", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "bar",
			series: [makeSeries("a", "bar")],
			rows: firstRows,
			options: { xScale: "band" },
		});
		const { tooltip } = mount.elements;
		if (tooltip == null) {
			throw new Error("expected the mount to hold a tooltip element");
		}
		// The surface holds its rows before the observer reports their size.
		vi.spyOn(tooltip, "offsetWidth", "get").mockReturnValue(READOUT.width);
		vi.spyOn(tooltip, "offsetHeight", "get").mockReturnValue(READOUT.height);

		mount.engine.handleKeyDown("End");
		frames.step();
		const firstFrame = tooltip.style.transform;
		reportTooltipSize(mount, READOUT);
		frames.settle();

		expect(firstFrame).toMatch(/^translate\(/);
		expect(firstFrame).toBe(tooltip.style.transform);
	});

	test("the empty box of an idle tooltip does not replace the size of the last readout", () => {
		const { frames, mount, tooltip } = mountOnLastBand();
		reportTooltipSize(mount, READOUT);
		frames.settle();
		const placed = tooltip.style.transform;
		mount.engine.handleKeyDown("Escape");
		frames.settle();
		// With no active datum the surface holds no rows, and the observer reports that box.
		reportTooltipSize(mount, EMPTY_BOX);

		mount.engine.handleKeyDown("End");
		frames.step();

		// The first frame of the next readout sits where the last one sat.
		expect(tooltip.style.transform).toBe(placed);
	});
});

describe("ChartEngine keyboard", () => {
	// Twenty rows, so a Page key moves two of them.
	const weekRows = Array.from({ length: 20 }, (_, index) => ({ x: `Week ${index}`, a: index + 1 }));

	/** A laid-out bar engine over `weekRows`, with no active datum. */
	const mountWeeks = (orientation: ChartOptions["orientation"]): Mounted => {
		const mount = mountEngine({
			kind: "bar",
			series: [makeSeries("a", "bar")],
			rows: weekRows,
			options: { xScale: "band", orientation },
		});
		// Why a commit: until the first layout the plot has no width, and the
		// arrow stride is the whole set.
		mount.engine.commitNow();
		return mount;
	};

	/** Press `key`, and return the `data` index of the active datum after it. */
	const indexAfter = (mount: Mounted, key: string): number | null => {
		mount.engine.handleKeyDown(key);
		return mount.store.getSnapshot().hover?.index ?? null;
	};

	test("a horizontal bar chart moves down its categories with ArrowDown and Page Down, and up with ArrowUp and Page Up", () => {
		const mount = mountWeeks("horizontal");
		const keys = [
			"ArrowDown",
			"ArrowDown",
			"PageDown",
			"PageUp",
			"ArrowUp",
			"ArrowRight",
			"ArrowLeft",
		];
		// The categories run from the top down, so the first one is index 0.
		expect(keys.map((key) => indexAfter(mount, key))).toEqual([0, 1, 3, 1, 0, 1, 0]);
	});

	test("the arrow keys step a dense scatter plot one point at a time", () => {
		vi.stubGlobal("devicePixelRatio", 2);
		// 10,000 rows on a 600 px plot: a line this dense decimates, and its arrow keys stride 8 rows.
		const rows = Array.from({ length: 10_000 }, (_, index) => ({ x: index, a: index % 97 }));
		const mount = mountEngine({
			kind: "scatter",
			series: [makeSeries("a", "scatter")],
			rows,
			size: { width: 600, height: 300 },
		});
		mount.engine.commitNow();

		// A scatter plot paints every point, so the cursor must reach every point.
		expect([indexAfter(mount, "ArrowRight"), indexAfter(mount, "ArrowRight")]).toEqual([0, 1]);
	});

	test("a vertical chart leaves ArrowDown and ArrowUp to the page", () => {
		const mount = mountWeeks("vertical");
		expect(mount.engine.handleKeyDown("ArrowDown")).toBe(false);
		expect(mount.engine.handleKeyDown("ArrowUp")).toBe(false);
		expect(mount.store.getSnapshot().hover).toBeNull();
	});

	test("Escape with no active datum is not handled and asks for no frame", () => {
		const frames = installFrameClock();
		const mount = mountWeeks("vertical");
		frames.settle();

		expect(mount.engine.handleKeyDown("Escape")).toBe(false);

		// Nothing changed, so a frame for it syncs the same overlay again.
		expect(frames.pending()).toBe(false);
	});

	test("Space with no active datum is not handled", () => {
		const mount = mountWeeks("vertical");
		// A handled Space cannot scroll the page.
		expect(mount.engine.handleKeyDown(" ")).toBe(false);
	});

	test("a held Enter stays handled and activates the datum once", () => {
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		const mount = mountWeeks("vertical");
		mount.engine.setCallbacks({ onDatumActivate, onActiveIndexChange: null });
		mount.engine.handleKeyDown("Home");

		expect(mount.engine.handleKeyDown("Enter")).toBe(true);
		expect(mount.engine.handleKeyDown("Enter", { repeat: true })).toBe(true);

		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(expect.objectContaining({ index: 0 }));
	});
});

describe("ChartEngine pointer activation", () => {
	test("a press on a bar chart whose controlled index stays on another datum activates the bar under the pointer", () => {
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		const rows = [
			{ x: "GET", a: 40, b: 10 },
			{ x: "POST", a: 80, b: 20 },
			{ x: "PUT", a: 60, b: 30 },
		];
		const mount = mountEngine({
			kind: "bar",
			series: [makeSeries("a", "bar"), makeSeries("b", "bar")],
			rows,
			options: { xScale: "band" },
		});
		mount.engine.setCallbacks({ onDatumActivate, onActiveIndexChange: null });
		// The consumer holds the index and does not follow the pointer.
		mount.engine.setControlledActiveIndex(2);
		mount.engine.commitNow();

		// Three bands share the 400 px plot, so x = 100 is in the right half of
		// the first band, on its second bar.
		mount.engine.handlePointerDown(100, 100);
		mount.engine.handlePointerUp(100, 100);

		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, xValue: "GET", datum: rows[0], dataKey: "b" }),
		);
	});

	test("a press on a scatter plot whose controlled index stays on another datum activates the point under the pointer", () => {
		const frames = installFrameClock();
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		const rows = [
			{ x: 0, a: 10 },
			{ x: 1, a: 50 },
			{ x: 2, a: 90 },
		];
		const mount = mountEngine({ kind: "scatter", series: [makeSeries("a", "scatter")], rows });
		mount.engine.setCallbacks({ onDatumActivate, onActiveIndexChange: null });
		// The keyboard cursor puts the marker dot on the first point, which gives its pixel.
		mount.engine.handleKeyDown("Home");
		frames.settle();
		const [dot] = hoverOf(mount).markers.children;
		if (dot == null) {
			throw new Error("expected the marker dot of the first point");
		}
		const pixel = dotPosition(dot);
		mount.engine.setControlledActiveIndex(2);

		mount.engine.handlePointerDown(pixel.x, pixel.y);
		mount.engine.handlePointerUp(pixel.x, pixel.y);

		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, xValue: 0, datum: rows[0], dataKey: "a" }),
		);
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

describe("ChartEngine reveal on first sight", () => {
	const retarget = () => vi.spyOn(ValueTween.prototype, "retarget");
	/** Reveal plays: a one-element `[1]` target with a real duration; value tweens carry a `Float64Array`. */
	const revealPlays = (spy: ReturnType<typeof retarget>): number =>
		spy.mock.calls.filter(
			([target, options]) =>
				Array.isArray(target) && target.length === 1 && target[0] === 1 && options.duration > 0,
		).length;

	test("a dormant engine holds the enter reveal at zero until it is seen, then plays it once", async () => {
		const spy = retarget();
		const mount = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: flatRows,
			inView: false,
			options: { animate: true },
		});
		// A reveal that plays at ingest finishes before a reader scrolls here.
		expect(revealPlays(spy)).toBe(0);
		mount.engine.setInView(true);
		await afterNextCommit();
		// The near band paints the frame; a reveal armed on entry plays one viewport early.
		expect(revealPlays(spy)).toBe(0);
		mount.engine.markSeen();
		expect(revealPlays(spy)).toBe(1);
		mount.engine.markSeen();
		expect(revealPlays(spy)).toBe(1);
	});

	test("an engine in view from the start reveals through its first ingest", () => {
		const spy = retarget();
		mountEngine({ kind: "line", series: lineSeries, rows: flatRows, options: { animate: true } });
		// A bare engine has no observer to mark it seen.
		expect(revealPlays(spy)).toBe(1);
	});

	test("a print of an unseen chart snaps the reveal to full", () => {
		const spy = retarget();
		const mount = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: flatRows,
			inView: false,
			options: { animate: true },
		});
		mount.engine.paintForPrint();
		// A held reveal prints the axes and no marks.
		const snaps = spy.mock.calls.filter(
			([target, options]) =>
				Array.isArray(target) && target.length === 1 && target[0] === 1 && options.duration === 0,
		);
		expect(snaps).toHaveLength(1);
	});

	test("a dormant engine jumps its domain instead of gliding, and glides once in view", () => {
		const aim = vi.spyOn(ChaseTween.prototype, "aim");
		const mount = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: flatRows,
			inView: false,
			options: { animate: true },
		});
		mount.engine.setRows([
			{ x: 0, a: 10 },
			{ x: 1, a: 90 },
		]);
		mount.engine.flushIngest();
		// A glide aimed while dormant would start from the stale domain on entry.
		expect(aim).toHaveBeenCalledTimes(0);
		mount.engine.setInView(true);
		mount.engine.setRows([
			{ x: 0, a: 20 },
			{ x: 1, a: 80 },
		]);
		mount.engine.flushIngest();
		expect(aim).toHaveBeenCalledTimes(2);
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
			// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
			addListener: () => {},
			// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
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

/** Two flat samples: the first dot sits mid-plot, where a degenerate layout cannot put it. */
const flatRows = [
	{ x: 0, a: 50 },
	{ x: 1, a: 50 },
];
const lineSeries = [makeSeries("a", "line")];

describe("ChartEngine color resolution", () => {
	test("colors resolve once, on the first frame after the plot is sized", async () => {
		const resolves = vi.mocked(createColorResolver);
		const mount = mountEngine({ kind: "line", series: lineSeries, rows: flatRows, size: null });
		await afterNextCommit();
		// An unsized plot paints nothing, so a pass there is wasted work.
		expect(resolves).toHaveBeenCalledTimes(0);

		deliverResize(mount, { width: 400, height: 200 });
		await afterNextCommit();
		expect(resolves).toHaveBeenCalledTimes(1);

		// A later commit under the same theme, ratio, and orientation reuses the pass.
		mount.engine.setRows([...flatRows]);
		await afterNextCommit();
		expect(resolves).toHaveBeenCalledTimes(1);
	});

	test("an engine out of view resolves no colors and requests no context until it enters", async () => {
		const resolves = vi.mocked(createColorResolver);
		const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
		const mount = mountEngine({ kind: "line", series: lineSeries, rows: flatRows, inView: false });
		await afterNextCommit();
		expect(resolves).toHaveBeenCalledTimes(0);
		// A context created in the constructor would show up here.
		expect(getContext.mock.contexts).not.toContain(mount.canvas);

		mount.engine.setInView(true);
		await afterNextCommit();
		expect(resolves).toHaveBeenCalledTimes(1);
		expect(getContext.mock.contexts).toContain(mount.canvas);
	});

	test("releasing the backing stores clears the canvas and the next in-view frame paints again", async () => {
		const mount = mountEngine({ kind: "line", series: lineSeries, rows: flatRows });
		await afterNextCommit();
		// Why a tick spy: with no 2D context, the domain tweens' tick is the paint
		// branch's one observable call, and no other path ticks them.
		const tick = vi.spyOn(ChaseTween.prototype, "tick");
		mount.engine.setInView(false);
		// happy-dom never sizes the canvas, so a painted bitmap is set by hand.
		mount.canvas.width = 800;
		mount.canvas.height = 400;
		mount.engine.releaseBackingStores();
		expect(mount.canvas.width).toBe(0);
		expect(mount.canvas.height).toBe(0);

		// A release that forgets to mark the repaint leaves the entry with nothing to do.
		mount.engine.setInView(true);
		await afterNextCommit();
		expect(tick.mock.calls.length).toBeGreaterThan(0);
	});

	test("a dormant engine still positions the overlay for the keyboard cursor", async () => {
		const dormant = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: flatRows,
			inView: false,
			options: { yDomain: [0, 100] },
		});
		const reference = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: flatRows,
			options: { yDomain: [0, 100] },
		});
		const [dot] = await activateFirstDatum(dormant);
		const [expected] = await activateFirstDatum(reference);
		if (dot == null || expected == null) {
			throw new Error("expected one marker dot per chart");
		}
		// A dormant commit that skips layout projects onto a zero-height plot.
		expect(dotPosition(dot)).toEqual(dotPosition(expected));
		expect(hoverOf(dormant).crosshair.style.opacity).toBe("1");
	});
});

describe("ChartEngine resize observation", () => {
	test("every engine in a document reports through one observer, and each gets its own size", () => {
		// Why out of view: an engine in view also observes its tooltip, and that
		// observer is its own by design.
		const first = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: flatRows,
			size: null,
			inView: false,
		});
		const second = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: flatRows,
			size: null,
			inView: false,
		});
		// A per-engine observer would construct two.
		expect(FakeResizeObserver.constructed).toBe(1);
		const measureFirst = vi
			.spyOn(first.elements.plot, "getBoundingClientRect")
			.mockReturnValue(new DOMRect(0, 0, 400, 200));
		const measureSecond = vi
			.spyOn(second.elements.plot, "getBoundingClientRect")
			.mockReturnValue(new DOMRect(0, 0, 300, 150));
		deliverResize(second, { width: 300, height: 150 });
		// Only the second engine took the size, so a print measures the first
		// plot and not the second. A dispatch to every handler would size both.
		first.engine.paintForPrint();
		second.engine.paintForPrint();
		expect(measureFirst).toHaveBeenCalledTimes(1);
		expect(measureSecond).toHaveBeenCalledTimes(0);
	});
});

describe("ChartEngine printing", () => {
	test("a print paints a dormant chart synchronously and its end releases it", async () => {
		const resolves = vi.mocked(createColorResolver);
		const mount = mountEngine({ kind: "line", series: lineSeries, rows: flatRows, inView: false });
		await afterNextCommit();
		expect(resolves).toHaveBeenCalledTimes(0);

		mount.engine.paintForPrint();
		// No frame runs before the print snapshot, so a listener that only
		// schedules prints a blank chart.
		expect(resolves).toHaveBeenCalledTimes(1);

		mount.canvas.width = 800;
		mount.canvas.height = 400;
		mount.engine.afterPrint();
		expect(mount.canvas.width).toBe(0);
	});

	test("the end of a print keeps the canvas of a chart in view", () => {
		const mount = mountEngine({ kind: "line", series: lineSeries, rows: flatRows });
		mount.canvas.width = 800;
		mount.canvas.height = 400;
		mount.engine.paintForPrint();
		mount.engine.afterPrint();
		expect(mount.canvas.width).toBe(800);
	});

	test("a print before the first resize delivery resolves colors once", async () => {
		vi.stubGlobal("devicePixelRatio", 2);
		const resolves = vi.mocked(createColorResolver);
		const mount = mountEngine({ kind: "line", series: lineSeries, rows: flatRows, size: null });
		vi.spyOn(mount.elements.plot, "getBoundingClientRect").mockReturnValue(
			new DOMRect(0, 0, 400, 200),
		);
		mount.engine.paintForPrint();
		expect(resolves).toHaveBeenCalledTimes(1);

		// The observer's first entry carries the same size and ratio the print
		// used. An engine that seeds its ratio at 1 re-signs the cache here.
		deliverResize(mount, { width: 400, height: 200 });
		await afterNextCommit();
		expect(resolves).toHaveBeenCalledTimes(1);
	});

	test("a print of a chart that never painted draws its tick labels and gridlines at full alpha", () => {
		const mount = mountEngine({
			kind: "line",
			backend: createSvgBackend,
			series: lineSeries,
			rows: flatRows,
			inView: false,
			options: { animate: true },
		});
		mount.store.registerYAxis({ tickFormat: undefined, tickCount: undefined });
		mount.store.registerGrid(undefined);

		mount.engine.paintForPrint();

		const svg = mount.elements.plot.querySelector("svg");
		const labels = [...(svg?.querySelectorAll("text") ?? [])];
		const gridlines = [...(svg?.querySelectorAll("path") ?? [])].filter(
			(path) => path.style.getPropertyValue("stroke") === CHART_CHROME_CSS.grid,
		);
		expect(labels.length).toBeGreaterThan(0);
		expect(gridlines.length).toBeGreaterThan(0);
		// The SVG surface writes no opacity for an alpha of 1. A label that fades
		// in takes one 50 ms step before the snapshot and prints at 0.41.
		const alphas = [...labels, ...gridlines].map((mark) => {
			const opacity = mark.style.getPropertyValue("opacity");
			return opacity === "" ? 1 : Number(opacity);
		});
		expect([...new Set(alphas)]).toEqual([1]);
	});

	test("a print in the middle of a glide paints the frame the glide ends on", () => {
		const { frames, engine, painted, settled } = mountBars();
		engine.setRows(nextRows);
		engine.flushIngest();
		frames.step();

		engine.paintForPrint();

		// No frame runs before the print snapshot, so a glide left in flight prints mid-way.
		expect(painted()).toEqual(paintedPaths(settled));
	});
});

describe("ChartEngine device pixel ratio", () => {
	test("an SVG chart samples its marks at the new ratio after a zoom", async () => {
		// Why a fake query: happy-dom's `matchMedia` never fires `change`.
		const ratioListeners: Array<() => void> = [];
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: false,
			media: query,
			addEventListener: (_type: string, listener: () => void) => {
				ratioListeners.push(listener);
			},
			removeEventListener: () => {},
		}));
		vi.stubGlobal("devicePixelRatio", 1);
		const store = new ChartStore();
		const elements = createElements();
		const engine = new ChartEngine({
			kind: "line",
			elements,
			store,
			backend: createSvgBackend,
			slotName: "chart",
		});
		store.registerSeries(makeSeries("y", "line"));
		engine.setOptions({ ...baseOptions, xKey: "x" });
		engine.setRows(
			Array.from({ length: 4000 }, (_, index) => ({ x: index, y: 50 + 40 * Math.sin(index / 7) })),
		);
		deliverResize({ elements }, { width: 100, height: 100 });
		engine.flushIngest();
		engine.commitNow();
		const commands = (): number =>
			(elements.plot.querySelector("svg path[d]")?.getAttribute("d") ?? "").match(/[ML]/g)
				?.length ?? 0;
		const atOne = commands();
		expect(atOne).toBeGreaterThan(0);

		// A zoom changes the ratio and not the plot's CSS size, so no resize arrives.
		vi.stubGlobal("devicePixelRatio", 2);
		// Why splice: each listener re-arms the watch, which adds a listener.
		for (const listener of ratioListeners.splice(0)) {
			listener();
		}
		await afterNextCommit();
		expect(commands()).toBeGreaterThan(atOne);
		engine.destroy();
		elements.root.remove();
	});
});

describe("ChartEngine font loads", () => {
	/** happy-dom has no `FontFaceSet`. This one lets a test fire `loadingdone`. */
	const installFonts = (): EventTarget => {
		const fonts = new EventTarget();
		Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
		return fonts;
	};

	afterEach(() => {
		Reflect.deleteProperty(document, "fonts");
	});

	test("a chart that draws no text asks for no frame when a font loads", () => {
		const fonts = installFonts();
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "bar",
			series: [makeSeries("a", "bar")],
			rows: firstRows,
			options: { xScale: "band" },
		});
		// A reference line with no label draws a rule and no text.
		mount.store.registerReferenceLine("limit", { y: 60, label: undefined, color: undefined });
		frames.settle();

		fonts.dispatchEvent(new Event("loadingdone"));

		expect(frames.pending()).toBe(false);
	});

	test.each([
		{
			name: "an axis",
			kind: "bar",
			options: { xScale: "band" },
			compose: (store: ChartStore) => {
				store.registerYAxis({ tickFormat: undefined, tickCount: undefined });
			},
		},
		{
			name: "a reference line with a label",
			kind: "bar",
			options: { xScale: "band" },
			compose: (store: ChartStore) => {
				store.registerReferenceLine("limit", { y: 60, label: "Limit", color: undefined });
			},
		},
		{
			name: "a 3D frame",
			kind: "scatter",
			options: { xKey: "a", zKey: "a" },
			compose: () => {},
		},
	] as const)("a chart with $name repaints when a font loads", ({ kind, options, compose }) => {
		const fonts = installFonts();
		const frames = installFrameClock();
		const mount = mountEngine({ kind, series: [makeSeries("a", kind)], rows: firstRows, options });
		compose(mount.store);
		frames.settle();

		fonts.dispatchEvent(new Event("loadingdone"));

		// The widths it measured are stale, and a canvas holds the old glyphs.
		expect(frames.pending()).toBe(true);
	});
});

describe("ChartEngine on-screen motion", () => {
	test("an engine in view but off screen paints a data update settled, in one frame", () => {
		const { frames, engine, painted, settled } = mountBars({ onScreen: false });

		engine.setRows(nextRows);
		engine.flushIngest();
		frames.step();

		expect(painted()).toEqual(paintedPaths(settled));
		expect(frames.pending()).toBe(false);
	});

	test("an engine on screen glides to a data update", () => {
		const { frames, engine, painted, settled } = mountBars();

		engine.setRows(nextRows);
		engine.flushIngest();
		frames.step();

		expect(painted()).not.toEqual(paintedPaths(settled));
		expect(frames.pending()).toBe(true);
	});

	test("an engine that leaves the screen in the middle of a glide settles in one more frame", () => {
		const { frames, engine, painted, settled } = mountBars();
		engine.setRows(nextRows);
		engine.flushIngest();
		frames.step();

		engine.setOnScreen(false);
		frames.step();

		expect(painted()).toEqual(paintedPaths(settled));
		expect(frames.pending()).toBe(false);
	});

	test("an engine that leaves the screen before the first frame of a glide paints the settled frame", () => {
		const { frames, engine, painted, settled } = mountBars();
		engine.setRows(nextRows);
		engine.flushIngest();

		engine.setOnScreen(false);
		frames.step();

		expect(painted()).toEqual(paintedPaths(settled));
		expect(frames.pending()).toBe(false);
	});

	test("an engine at rest asks for no frame when it leaves the screen", () => {
		const { frames, engine } = mountBars();

		engine.setOnScreen(false);

		expect(frames.pending()).toBe(false);
	});

	test("an engine that comes back on screen glides to its next update", () => {
		const { frames, engine, painted, settled } = mountBars({ onScreen: false });

		engine.setOnScreen(true);
		engine.setRows(nextRows);
		engine.flushIngest();
		frames.step();

		expect(painted()).not.toEqual(paintedPaths(settled));
		expect(frames.pending()).toBe(true);
	});

	/** A bar engine with motion on, and the same chart at rest with no motion. */
	const mountPair = (config: {
		series: readonly SeriesSpec[];
		inView?: boolean;
		onScreen?: boolean;
	}) => {
		const frames = installFrameClock();
		const rows = [
			{ x: "GET", a: 40, b: 10 },
			{ x: "POST", a: 80, b: 30 },
		];
		const mount = mountEngine({
			kind: "bar",
			backend: createSvgBackend,
			series: config.series,
			rows,
			options: { xScale: "band", animate: true },
			inView: config.inView,
			onScreen: config.onScreen,
		});
		const atRest = mountEngine({
			kind: "bar",
			backend: createSvgBackend,
			series: [makeSeries("a", "bar"), makeSeries("b", "bar")],
			rows,
			options: { xScale: "band" },
		});
		return { frames, mount, atRest };
	};

	test("a series that registers while the engine is off screen appears settled, in one frame", () => {
		const { frames, mount, atRest } = mountPair({ series: [makeSeries("a", "bar")] });
		frames.settle();
		mount.engine.setOnScreen(false);

		// A top-N chart swaps in a series key.
		mount.store.registerSeries(makeSeries("b", "bar"));
		mount.engine.flushIngest();
		frames.step();

		expect(paintedPaths(mount)).toEqual(paintedPaths(atRest));
		expect(frames.pending()).toBe(false);
	});

	test("an engine that is marked seen while off screen shows its marks settled, in one frame", () => {
		const { frames, mount, atRest } = mountPair({
			series: [makeSeries("a", "bar"), makeSeries("b", "bar")],
			inView: false,
			onScreen: false,
		});
		mount.engine.setInView(true);
		frames.settle();

		// The Root marks a rebuilt engine seen when its chart was on screen before.
		mount.engine.markSeen();
		frames.step();

		expect(paintedPaths(mount)).toEqual(paintedPaths(atRest));
		expect(frames.pending()).toBe(false);
	});
});

describe("ChartEngine domain chase", () => {
	test.each([
		// Half a pixel of the 20 px axis is 2.5 units, more than the whole journey.
		{ orientation: "vertical", ratio: 1, frames: 1 },
		// Half a pixel of the 320 px axis is 0.16 units: 0.84^11 is the first power under it.
		{ orientation: "horizontal", ratio: 1, frames: 11 },
		// Half a device pixel is 0.08 units at a ratio of 2: 0.84^15 is the first power under it.
		{ orientation: "horizontal", ratio: 2, frames: 15 },
	] as const)(
		"a $orientation bar chart at a pixel ratio of $ratio ends a 1-unit value chase in $frames frames",
		({ orientation, ratio, frames: expected }) => {
			vi.stubGlobal("devicePixelRatio", ratio);
			const frames = installFrameClock();
			const mount = mountEngine({
				kind: "bar",
				series: [makeSeries("a", "bar")],
				rows: [
					{ x: "GET", a: 50 },
					{ x: "POST", a: 80 },
				],
				options: { xScale: "band", orientation, yDomain: [0, 100], animate: true },
				// The value axis is the 20 px height when vertical and the 320 px width when horizontal.
				size: { width: 320, height: 20 },
			});
			frames.settle();

			mount.engine.setOptions({ ...mount.options, yDomain: [0, 101] });

			// The journey's own threshold, 0.1% of it, needs 40 frames on every plot.
			expect(frames.settle()).toBe(expected);
		},
	);

	test("an x-domain chase under half a device pixel of the plot width settles in one frame", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: [
				{ x: 0, a: 50 },
				{ x: 100, a: 50 },
			],
			options: { animate: true },
		});
		frames.settle();

		// The last x moves by a thousandth of a unit: 0.004 px of the 384 px plot.
		mount.engine.setRows([
			{ x: 0, a: 50 },
			{ x: 100.001, a: 50 },
		]);
		mount.engine.flushIngest();

		expect(frames.settle()).toBe(1);
	});

	test("a bar chart that gains a category does not chase its x domain", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "bar",
			series: [makeSeries("a", "bar")],
			rows: [
				{ x: "GET", a: 80 },
				{ x: "POST", a: 50 },
			],
			options: { xScale: "band", animate: true },
		});
		frames.settle();

		// The tallest bar stays, so the value domain stays. The band layout
		// places every bar, so a chase of the x domain paints the same frame again.
		mount.engine.setRows([
			{ x: "GET", a: 80 },
			{ x: "POST", a: 50 },
			{ x: "PUT", a: 60 },
		]);
		mount.engine.flushIngest();

		expect(frames.settle()).toBe(1);
	});
});

describe("ChartEngine category changes", () => {
	const barSeries = [makeSeries("a", "bar")];
	// Why a fixed domain: only the bar values can move, so one frame shows whether they tween.
	const bandOptions: Partial<ChartOptions> = { xScale: "band", yDomain: [0, 100], animate: true };

	test("a window that slides by one category paints the settled bars on the first frame", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "bar",
			backend: createSvgBackend,
			series: barSeries,
			rows: [
				{ x: "09:00", a: 10 },
				{ x: "09:01", a: 40 },
				{ x: "09:02", a: 90 },
			],
			options: bandOptions,
		});
		frames.settle();
		const before = paintedPaths(mount);

		mount.engine.setRows([
			{ x: "09:01", a: 40 },
			{ x: "09:02", a: 90 },
			{ x: "09:03", a: 20 },
		]);
		mount.engine.flushIngest();
		frames.step();
		const firstFrame = paintedPaths(mount);
		frames.settle();

		expect(firstFrame).not.toEqual(before);
		// A tween by index paints each bar on its way to its neighbor's value.
		expect(firstFrame).toEqual(paintedPaths(mount));
	});

	test("a line on a point scale whose window slides by one category paints the settled line on the first frame", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "line",
			backend: createSvgBackend,
			series: [makeSeries("a", "line")],
			rows: [
				{ x: "09:00", a: 10 },
				{ x: "09:01", a: 40 },
				{ x: "09:02", a: 90 },
			],
			options: { xScale: "point", yDomain: [0, 100], animate: true },
		});
		frames.settle();
		const before = paintedPaths(mount);

		mount.engine.setRows([
			{ x: "09:01", a: 40 },
			{ x: "09:02", a: 90 },
			{ x: "09:03", a: 20 },
		]);
		mount.engine.flushIngest();
		frames.step();
		const firstFrame = paintedPaths(mount);
		frames.settle();

		expect(firstFrame).not.toEqual(before);
		expect(firstFrame).toEqual(paintedPaths(mount));
	});

	type Category = string | number | Date;

	test.each([
		{ name: "equal strings", category: (minute: number): Category => `09:0${minute}` },
		{
			name: "equal times on new Date objects",
			category: (minute: number): Category => new Date(Date.UTC(2026, 6, 18, 9, minute)),
		},
		// `NaN` is not equal to itself, and an invalid `Date` has a time of `NaN`.
		{
			name: "numbers with a NaN in them",
			category: (minute: number): Category => (minute === 1 ? Number.NaN : minute),
		},
		{
			name: "dates with an invalid Date in them",
			category: (minute: number): Category =>
				minute === 1 ? new Date("not a date") : new Date(Date.UTC(2026, 6, 18, 9, minute)),
		},
	])("the same categories as $name tween their bars to new values", ({ category }) => {
		const frames = installFrameClock();
		const rowsOf = (values: readonly number[]) =>
			values.map((a, minute) => ({ x: category(minute), a }));
		const mount = mountEngine({
			kind: "bar",
			backend: createSvgBackend,
			series: barSeries,
			rows: rowsOf([10, 40, 90]),
			options: bandOptions,
		});
		frames.settle();

		mount.engine.setRows(rowsOf([30, 60, 20]));
		mount.engine.flushIngest();
		frames.step();
		const firstFrame = paintedPaths(mount);
		frames.settle();

		expect(firstFrame).not.toEqual(paintedPaths(mount));
	});
});

describe("ChartEngine per-datum tweens", () => {
	/** `count` rows on a fixed x vector, with values that follow `phase`. */
	const waveRows = (count: number, phase: number) =>
		Array.from({ length: count }, (_, index) => ({
			x: index,
			a: 50 + 40 * Math.sin(index / 7 + phase),
		}));

	test.each([
		{ rows: PER_DATUM_TWEEN_LIMIT, copies: 1 },
		{ rows: PER_DATUM_TWEEN_LIMIT + 1, copies: 0 },
	])(
		"an ingest of $rows rows copies $copies series columns into a value tween",
		({ rows, copies }) => {
			// Why a spy: above the limit no paint reads a value tween, so its copies of
			// the column are memory with no other trace. A reveal retargets a plain array.
			const retarget = vi.spyOn(ValueTween.prototype, "retarget");
			mountEngine({ kind: "line", series: lineSeries, rows: waveRows(rows, 0) });
			const columnCopies = retarget.mock.calls.filter(([target]) => target instanceof Float64Array);
			expect(columnCopies).toHaveLength(copies);
		},
	);

	test("above the limit, an update on the same x vector paints the new columns in one frame", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "line",
			backend: createSvgBackend,
			series: lineSeries,
			rows: waveRows(PER_DATUM_TWEEN_LIMIT + 1, 0),
			options: { yDomain: [0, 100], animate: true },
			// Wide enough that the line does not decimate: under 3 rows per pixel column.
			size: { width: 1000, height: 200 },
		});
		frames.settle();
		const before = paintedPaths(mount);

		mount.engine.setRows(waveRows(PER_DATUM_TWEEN_LIMIT + 1, 1));
		mount.engine.flushIngest();
		frames.step();

		expect(paintedPaths(mount)).not.toEqual(before);
		expect(frames.pending()).toBe(false);
	});

	test("a dense scatter plot under the limit tweens its points after an update on the same x vector", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "scatter",
			series: [makeSeries("a", "scatter")],
			rows: waveRows(2000, 0),
			options: { yDomain: [0, 100], animate: true },
			// 24 rows per pixel column decimate a line. A scatter draws every point.
			size: { width: 100, height: 200 },
		});
		frames.settle();

		mount.engine.setRows(waveRows(2000, 1));
		mount.engine.flushIngest();
		frames.step();

		expect(frames.pending()).toBe(true);
	});

	test("a decimated chart under the limit asks for no tween frame after an update on the same x vector", () => {
		const frames = installFrameClock();
		const mount = mountEngine({
			kind: "line",
			series: lineSeries,
			rows: waveRows(2000, 0),
			options: { yDomain: [0, 100], animate: true },
			// 2,000 rows on an 84 px plot is 24 rows per pixel column, so the line decimates.
			size: { width: 100, height: 200 },
		});
		frames.settle();

		mount.engine.setRows(waveRows(2000, 1));
		mount.engine.flushIngest();
		frames.step();

		// The decimated paint reads the settled column, so a value tween only repeats that frame.
		expect(frames.pending()).toBe(false);
	});
});
