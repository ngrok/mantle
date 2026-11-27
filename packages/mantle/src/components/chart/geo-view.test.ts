import { describe, expect, test, vi } from "vitest";
import { WORLD_LAND } from "../world-map/world-land.js";
import type { GeoBounds, GeoPlace } from "./geo.js";
import { fitBounds, toScreen } from "./geo.js";
import { GeoScene } from "./geo-view.js";
import type { ResolvedPaint } from "./paint-backend.js";
import type { ScatterHost } from "./scatter-engine.js";
import { recordingPaintContext } from "../../test-utils/recording-paint-context.js";
import type { SeriesSpec } from "./types.js";

/**
 * These tests drive the world map's view over a hand-built host, the way the
 * engine drives it: new rows, then `resetProjection`. happy-dom has no
 * `Path2D`, so one test stubs it to paint. Each other test reads what the view
 * tells the engine or what it writes on a callout.
 */

/** One row of a map with one series: a place, and its size value on a sized map. */
type Place = { longitude: number; latitude: number | null; sessions?: number };

/** The plot of each map here. A whole world puts 0° E on the equator at its center, (400, 200). */
const PLOT = { left: 0, top: 0, width: 800, height: 400 };

/** The one series of each map here. It reads each row's `latitude`. */
const SERIES: SeriesSpec = {
	dataKey: "latitude",
	label: "Agents",
	color: "blue",
	mark: "scatter",
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: "circle",
	texture: "solid",
	yAxis: "left",
};

/**
 * A view over a host that holds its rows the way the engine does after an
 * ingest. `ingest` swaps the rows, then tells the view, as the engine does.
 * Pass the rows from west to east: the engine sorts them so.
 * `requestPaint` records each paint the view asks the host for.
 */
const mountMap = (
	config: {
		bounds?: GeoBounds;
		sizeKey?: "sessions";
		animates?: boolean;
		/** The colors of a map that paints. When omitted, a paint returns before it draws. */
		colors?: ResolvedPaint;
	} = {},
) => {
	let rows: readonly Place[] = [];
	let longitudes = new Float64Array(0);
	let latitudes = new Float64Array(0);
	let columns: readonly Float64Array[] = [latitudes];
	let animates = config.animates ?? true;
	const requestPaint = vi.fn<ScatterHost["requestPaint"]>();
	const host: ScatterHost = {
		plot: () => PLOT,
		colors: () => config.colors ?? null,
		specs: () => [SERIES],
		rowCount: () => rows.length,
		xs: () => longitudes,
		zs: () => new Float64Array(rows.length),
		columns: () => columns,
		columnOf: () => latitudes,
		paintedValues: () => latitudes,
		definedIndexes: (values) => [...values.keys()].filter((index) => !Number.isNaN(values[index])),
		reveal: () => 1,
		shape: () => "circle",
		xCoefficients: () => ({ k: 1, b: 0 }),
		yCoefficients: () => ({ k: 1, b: 0 }),
		domains: () => ({ x: [-180, 180], y: [-90, 90], z: [0, 1] }),
		xKey: () => "longitude",
		zKey: () => null,
		sizeKey: () => config.sizeKey ?? null,
		is3d: () => false,
		requestPaint,
		sourceRow: (index) => rows[index],
		animates: () => animates,
		grid: () => false,
		plotOffset: () => ({ left: 0, top: 0 }),
	};
	const scene = new GeoScene(WORLD_LAND, config.bounds ?? null);
	const view = scene.createView(host);
	return {
		scene,
		view,
		requestPaint,
		ingest: (next: readonly Place[]): void => {
			rows = next;
			longitudes = Float64Array.from(next, (row) => row.longitude);
			latitudes = Float64Array.from(next, (row) => row.latitude ?? Number.NaN);
			columns = [latitudes];
			view.resetProjection();
		},
		setAnimates: (next: boolean): void => {
			animates = next;
		},
	};
};

const lisbon = { longitude: -9.14, latitude: 38.72 };
const tokyo = { longitude: 139.69, latitude: 35.69 };

describe("GeoView arrival pulses", () => {
	/** `count` places on the equator, 1° apart from 0° E. */
	const equator = (count: number): Place[] =>
		Array.from({ length: count }, (_unused, index) => ({ longitude: index, latitude: 0 }));

	test("a pulse ends by time on a map that never paints", () => {
		const map = mountMap();
		map.ingest([lisbon]);
		map.ingest([lisbon, tokyo]);
		const now = performance.now();
		expect(map.view.tick(now)).toBe(true);
		expect(map.view.tick(now + 1000)).toBe(false);
	});

	test("a ring that no longer changes a pixel ends before the 900 ms of the pulse", () => {
		// Why a fixed clock: the ring starts at 0 ms, so each `tick` reads an exact age.
		vi.spyOn(performance, "now").mockReturnValue(0);
		const map = mountMap();
		map.ingest([lisbon]);
		map.ingest([lisbon, tokyo]);
		// The alpha of the ring is `0.6 * (1 - easeCubicOut(age / 900))`.
		// From 767 ms it is under 1/510, which is half of one 8-bit step.
		expect(map.view.tick(700)).toBe(true);
		expect(map.view.tick(800)).toBe(false);
	});

	test("the first rows after an empty map start no pulse", () => {
		const map = mountMap();
		map.ingest([]);
		map.ingest([lisbon, tokyo]);
		expect(map.view.tick(performance.now())).toBe(false);
	});

	test("rows that arrive after a map with rows went empty start a pulse", () => {
		const map = mountMap();
		map.ingest([lisbon]);
		map.ingest([]);
		map.ingest([tokyo]);
		// Why a ring here: the series reveal played for the first rows, and it does not play again.
		expect(map.view.tick(performance.now())).toBe(true);
	});

	test.each([
		{ adds: "48 places", added: equator(48), pulses: true },
		{ adds: "49 places", added: equator(49), pulses: false },
		// Two rows share the place at 47° E, and one place starts one ring.
		{
			adds: "49 rows at 48 places",
			added: [...equator(48), { longitude: 47, latitude: 0 }],
			pulses: true,
		},
	])("after an update that adds $adds, a ring grows: $pulses", ({ added, pulses }) => {
		const map = mountMap();
		map.ingest([lisbon]);
		map.ingest([lisbon, ...added]);
		expect(map.view.tick(performance.now())).toBe(pulses);
	});

	test("rows that arrive while the map cannot animate start no pulse", () => {
		const map = mountMap({ animates: false });
		map.ingest([lisbon]);
		map.ingest([lisbon, tokyo]);
		// Why motion back on: while it is off, `tick` drops each ring, so its result
		// cannot show that none started.
		map.setAnimates(true);
		expect(map.view.tick(performance.now())).toBe(false);
	});
});

describe("GeoView keyboard stops", () => {
	test.each([
		{ row: "a row whose place is outside the region", index: 0, stop: false },
		{ row: "a row whose place is inside the region", index: 1, stop: true },
		{ row: "a row with no latitude", index: 2, stop: false },
	])("$row is a keyboard stop: $stop", ({ index, stop }) => {
		const map = mountMap({ bounds: { west: -105, south: 30, east: -65, north: 50 } });
		map.ingest([
			// San Francisco, then Chicago.
			{ longitude: -122.42, latitude: 37.77 },
			{ longitude: -87.63, latitude: 41.88 },
			{ longitude: -80, latitude: null },
		]);
		expect(map.view.plots?.(index)).toBe(stop);
	});
});

describe("GeoView keyboard stops on the edge of a region", () => {
	test("a point on the edge of a region that is the extent of the rows is a keyboard stop", () => {
		const rows = [
			{ longitude: -43.74, latitude: -14 },
			{ longitude: 1.23, latitude: -2.73 },
			{ longitude: 47.05, latitude: 49.29 },
		];
		const bounds = { west: -43.74, south: -14, east: 47.05, north: 49.29 };
		// Guards the setup: rounding puts the northern point a fraction of a pixel above the plot.
		expect(toScreen(fitBounds(PLOT, bounds, { inset: 0 }), 47.05, 49.29)[1]).toBeLessThan(0);
		const map = mountMap({ bounds });
		map.ingest(rows);
		expect(map.view.plots?.(2)).toBe(true);
	});
});

describe("GeoView point sizes", () => {
	test("the row with the largest size value gets a radius of 16px", () => {
		const map = mountMap({ sizeKey: "sessions" });
		map.ingest([
			{ longitude: 0, latitude: 0, sessions: 12 },
			{ longitude: 10, latitude: 0, sessions: 30 },
			{ longitude: 20, latitude: 0, sessions: 4 },
		]);
		expect(map.view.radiusAt?.(1)).toBe(16);
	});
});

describe("GeoView hit test", () => {
	// The point at 0° E is at (400, 200), and the point at 9° E is about 20px east of it.
	const large = { longitude: 0, latitude: 0, sessions: 16 };
	const small = { longitude: 9, latitude: 0, sessions: 1 };

	test("on a sized map, a pointer on a large point's disc names it over a small neighbor with a nearer center", () => {
		const map = mountMap({ sizeKey: "sessions" });
		map.ingest([large, small]);
		// 12px from the center of the 16px point, and about 8px from the center of the 4px point.
		expect(map.view.hitAt(412, 200)).toMatchObject({ seriesKey: "latitude", index: 0 });
	});

	test("on a map with no size key, the nearest center wins", () => {
		const map = mountMap();
		map.ingest([large, small]);
		expect(map.view.hitAt(412, 200)).toMatchObject({ seriesKey: "latitude", index: 1 });
	});

	test("on a sized map, the top of two points whose discs both hold the pointer wins", () => {
		const map = mountMap({ sizeKey: "sessions" });
		// Two 16px points paint in row order, so the point at 9° E is on top.
		map.ingest([large, { ...small, sessions: 16 }]);
		// 8px from the center of the bottom point, and about 12px from the center of the top point.
		expect(map.view.hitAt(408, 200)).toMatchObject({ seriesKey: "latitude", index: 1 });
	});
});

describe("GeoView callouts", () => {
	/**
	 * A detached top callout over `place`, in the scene's callouts as
	 * `WorldMap.Callout` puts one after a size report of `size`. Pass `null` for
	 * a callout that has no report yet.
	 */
	const addCallout = (
		scene: GeoScene,
		{ place, size }: { place: GeoPlace; size: { width: number; height: number } | null },
	): HTMLElement => {
		const element = document.createElement("div");
		scene.callouts.set("callout", { element, place, side: "top", size });
		return element;
	};

	/** The `translate` the view wrote on a callout, in CSS pixels. */
	const translateOf = (callout: HTMLElement): { x: number; y: number } => {
		const match = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\)$/.exec(callout.style.transform);
		if (match?.[1] == null || match[2] == null) {
			throw new Error(`expected a placed callout, got transform "${callout.style.transform}"`);
		}
		return { x: Number(match[1]), y: Number(match[2]) };
	};

	/**
	 * A top callout over a point at 60° N, about 53px under the plot's top edge.
	 * The 50px callout and the 12px from its edge to the point's center need 62px.
	 */
	const mountNorthCallout = () => {
		const map = mountMap();
		const place = { longitude: 0, latitude: 60 };
		const callout = addCallout(map.scene, { place, size: { width: 100, height: 50 } });
		map.ingest([place]);
		// Why read the point: the first read of a position fits the map, as the first
		// paint does, and the fit places the callout.
		const point = map.view.screenFor(0, null);
		return { callout, pointY: point?.y ?? Number.NaN };
	};

	test("a callout stays 8px clear of its point when new rows grow the point", () => {
		const map = mountMap({ sizeKey: "sessions" });
		const center = { longitude: 0, latitude: 0 };
		const callout = addCallout(map.scene, { place: center, size: { width: 100, height: 20 } });
		map.ingest([
			{ ...center, sessions: 1 },
			{ longitude: 90, latitude: 0, sessions: 16 },
		]);
		// Why read the point: the first read of a position fits the map, as the first
		// paint does, and the fit places the callout.
		expect(map.view.screenFor(0, null)).toEqual({ x: 400, y: 200 });
		// The 100×20 callout is centered over the 4px point, with its bottom edge 8px above the point.
		expect(translateOf(callout)).toEqual({ x: 350, y: 168 });
		expect(callout.dataset.side).toBe("top");
		// Why the inline style: a cross-file pin. This write is what overrides the
		// `invisible` class that `WorldMap.Callout` renders with.
		expect(callout.style.visibility).toBe("visible");

		map.ingest([
			{ ...center, sessions: 16 },
			{ longitude: 90, latitude: 0, sessions: 1 },
		]);
		// The point is 16px now, so the callout sits 12px higher.
		expect(translateOf(callout)).toEqual({ x: 350, y: 156 });
	});

	test("a top callout with no room above its point flips below it", () => {
		const { callout, pointY } = mountNorthCallout();
		expect(callout.dataset.side).toBe("bottom");
		// The callout starts 12px under the point's center: its 4px radius and the 8px gap.
		// The whole-pixel translate moves that by up to half a pixel.
		expect(translateOf(callout).y - pointY).toBeCloseTo(12, 0);
	});

	test("a callout over a place between two pixels sits on whole pixels", () => {
		const { callout, pointY } = mountNorthCallout();
		// Guards the assertion below: a place on a whole pixel would pass with no rounding.
		expect(Number.isInteger(pointY)).toBe(false);
		expect(callout.style.transform).toMatch(/^translate\(\d+px, \d+px\)$/);
	});

	test("a callout report asks the host for one paint, and moves no callout inside the call", () => {
		const map = mountMap();
		const center = { longitude: 0, latitude: 0 };
		const callout = addCallout(map.scene, { place: center, size: { width: 100, height: 20 } });
		map.ingest([center]);
		// The first read of a position fits the map. The fit places the callout.
		map.view.screenFor(0, null);
		// The 100px callout is centered over the point at x = 400.
		expect(translateOf(callout).x).toBe(350);

		// The content grows. `WorldMap.Callout` records the new size in its `ResizeObserver` callback, then reports.
		map.scene.callouts.set("callout", {
			element: callout,
			place: center,
			side: "top",
			size: { width: 200, height: 20 },
		});
		map.scene.calloutsChanged();

		// A move inside the callback can resize an observed box in the same observer pass: a loop error.
		expect(translateOf(callout).x).toBe(350);
		// Why a count: no test here paints, so the request is the one trace of the frame that moves the callout.
		expect(map.requestPaint).toHaveBeenCalledTimes(1);
	});

	test("a placement takes the size from the callout's report and reads no callout size", () => {
		const map = mountMap();
		const center = { longitude: 0, latitude: 0 };
		const callout = addCallout(map.scene, { place: center, size: { width: 100, height: 20 } });
		const readWidth = vi.spyOn(callout, "offsetWidth", "get");
		const readHeight = vi.spyOn(callout, "offsetHeight", "get");
		map.ingest([center]);
		// The first read of a position fits the map. The fit places the callout.
		map.view.screenFor(0, null);

		// The 100px callout is centered over the point at x = 400.
		expect(translateOf(callout).x).toBe(350);
		// Why a count: happy-dom lays out nothing, so a read of the size is the one trace of a forced layout.
		expect(readWidth).toHaveBeenCalledTimes(0);
		expect(readHeight).toHaveBeenCalledTimes(0);
	});

	test("a callout report places the callouts in the next paint, and in no paint after it", () => {
		// Why a stub: happy-dom has no `Path2D`, which the map builds its layers from.
		vi.stubGlobal(
			"Path2D",
			class {
				addPath(): void {}
				moveTo(): void {}
				lineTo(): void {}
				closePath(): void {}
			},
		);
		const colors: ResolvedPaint = {
			signature: "test",
			series: new Map(),
			inputs: new Map(),
			barFills: new Map(),
			chrome: {
				grid: "gray",
				baseline: "gray",
				tickText: "gray",
				reference: "gray",
				surface: "white",
			},
			fontFamily: () => "sans-serif",
			resolve: () => "gray",
		};
		const map = mountMap({ colors });
		const center = { longitude: 0, latitude: 0 };
		const callout = addCallout(map.scene, { place: center, size: { width: 100, height: 20 } });
		const record = (width: number): void => {
			map.scene.callouts.set("callout", {
				element: callout,
				place: center,
				side: "top",
				size: { width, height: 20 },
			});
		};
		// `isPointInPath` marks the context as a canvas for the view.
		const canvas = { ...recordingPaintContext().context, isPointInPath: () => false };
		// The first paint fits the map, and the fit places the 100px callout over x = 400.
		map.view.paint(canvas);
		expect(translateOf(callout).x).toBe(350);

		record(200);
		map.scene.calloutsChanged();
		map.view.paint(canvas);
		expect(translateOf(callout).x).toBe(300);

		// A new size with no report: the next paint leaves the callout where it is.
		record(300);
		map.view.paint(canvas);
		expect(translateOf(callout).x).toBe(300);
	});

	test("a callout with no size report yet stays unplaced", () => {
		const map = mountMap();
		const center = { longitude: 0, latitude: 0 };
		const callout = addCallout(map.scene, { place: center, size: null });
		map.ingest([center]);
		map.view.screenFor(0, null);

		// The callout keeps the `invisible` class of `WorldMap.Callout`: the view wrote no style.
		expect(callout.style.visibility).toBe("");
		expect(callout.style.transform).toBe("");
	});
});
