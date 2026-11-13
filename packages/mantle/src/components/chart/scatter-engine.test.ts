import { afterEach, describe, expect, test, vi } from "vitest";
import { ChartEngine } from "./engine.js";
import type { PaintBackend, PaintContext, ResolvedPaint } from "./paint-backend.js";
import { ChartStore } from "./store.js";
import type { ChartDatumEvent } from "./types.js";

/**
 * These tests drive a 3D `ChartEngine` through the scatter view's lazy 3D
 * module. Each test imports a fresh `scatter-engine.js`, so the module starts
 * unloaded. happy-dom has no 2D context, so a recording backend counts the
 * `arc` calls each point paints.
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
});

/** A fresh copy of the scatter module, with no 3D code loaded yet. */
const freshScatterModule = async () => {
	vi.resetModules();
	return import("./scatter-engine.js");
};

const colors: ResolvedPaint = {
	signature: "test",
	series: new Map([["y", "#f00"]]),
	inputs: new Map(),
	barFills: new Map(),
	chrome: { grid: "#aaa", baseline: "#888", surface: "#fff", tickText: "#222", reference: "#888" },
	fontFamily: () => "sans-serif",
	resolve: () => "#f00",
};

const mount3d = (
	scatter: Awaited<ReturnType<typeof freshScatterModule>>,
	options: { inView: boolean },
): Mounted => {
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
	store.registerSeries({
		dataKey: "y",
		label: "Y",
		color: "blue",
		mark: "scatter",
		curve: "linear",
		markers: false,
		connectNulls: false,
		shape: "circle",
		texture: "solid",
	});
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
});
