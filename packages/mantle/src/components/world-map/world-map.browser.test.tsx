"use client";

import { render, waitFor } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { findChartCanvas } from "../../test-utils/find-chart-canvas.js";
import { fitBounds, toScreen, WORLD_BOUNDS } from "../chart/geo.js";
import type { GeoBounds } from "./world-map.js";
import { WorldMap } from "./world-map.js";

/**
 * Real-browser tests for the world map's paint path: the land, the sized
 * points, and the arrival pulse need a real 2d context and real layout.
 * Tokens and structural layout CSS are inlined so the test stays hermetic.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-blue: #3e6ff4;
	--color-chart-other: #737373;
	--border-color-card-muted: #e5e5e5;
	--border-color-card: #d4d4d4;
	--text-color-muted: #717171;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
	--world-map-land-color: #a0a0a0;
	--world-map-ocean-color: #f0f0f0;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
[data-slot="world-map"] {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 800px;
	height: 400px;
}
[data-slot="world-map-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot="world-map-plot"] > canvas,
[data-slot="world-map-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.invisible {
	visibility: hidden;
}
[data-slot="world-map-callout"],
[data-slot="world-map-tooltip"] {
	position: absolute;
	left: 0;
	top: 0;
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference", forcedColors: "none" });
});

type InkPredicate = (red: number, green: number, blue: number) => boolean;

const isLand: InkPredicate = (red, green, blue) =>
	Math.abs(red - 0xa0) < 3 && Math.abs(green - 0xa0) < 3 && Math.abs(blue - 0xa0) < 3;
const isOcean: InkPredicate = (red, green, blue) =>
	Math.abs(red - 0xf0) < 3 && Math.abs(green - 0xf0) < 3 && Math.abs(blue - 0xf0) < 3;
/** The grid color (#e5e5e5) over the ocean, where a 1px line covers a third of the pixel or more. */
const isGridTint: InkPredicate = (red, green, blue) =>
	red === green && green === blue && red > 0xe5 - 3 && red < 0xf0 - 2;
/** chart-1 (#3e6ff4) at any opacity over the gray land or ocean: blue well above red. */
const isChart1Tint: InkPredicate = (red, _green, blue) => blue > red + 40;
const isRed: InkPredicate = (red, green, blue) => red > 200 && green < 80 && blue < 80;

/** Counts the pixels that match, in CSS-pixel columns `[fromX, toX)`. */
const countInk = (
	canvas: HTMLCanvasElement,
	predicate: InkPredicate,
	{ fromX = 0, toX = Number.POSITIVE_INFINITY }: { fromX?: number; toX?: number } = {},
): number => {
	const context = canvas.getContext("2d");
	if (context == null || canvas.width === 0) {
		return 0;
	}
	const devicePerCss = canvas.width / canvas.getBoundingClientRect().width;
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	let count = 0;
	for (let offset = 0; offset < image.data.length; offset += 4) {
		const x = ((offset / 4) % canvas.width) / devicePerCss;
		if (x < fromX || x >= toX) {
			continue;
		}
		if (
			predicate(image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0)
		) {
			count += 1;
		}
	}
	return count;
};

/**
 * Names the ink of the one canvas pixel at a plot position: `"land"`,
 * `"ocean"`, `"grid"`, or the pixel's color when it is none of them.
 */
const inkAt = (canvas: HTMLCanvasElement, [x, y]: readonly [number, number]): string => {
	const devicePerCss = canvas.width / canvas.getBoundingClientRect().width;
	const [red = 0, green = 0, blue = 0] =
		canvas
			.getContext("2d")
			?.getImageData(Math.floor(x * devicePerCss), Math.floor(y * devicePerCss), 1, 1).data ?? [];
	if (isLand(red, green, blue)) {
		return "land";
	}
	if (isOcean(red, green, blue)) {
		return "ocean";
	}
	return isGridTint(red, green, blue) ? "grid" : `rgb(${red}, ${green}, ${blue})`;
};

const first = [{ longitude: -100, latitude: 40, agents: 1 }];
const next = [...first, { longitude: 100, latitude: 40, agents: 100 }];

/** A map with one point series. `sizeKey` sizes the points, and `children` adds more parts. */
const pointMap = (
	data: typeof first,
	{
		animate,
		sizeKey,
		bounds,
		children,
	}: { animate: boolean; sizeKey?: "agents"; bounds?: GeoBounds; children?: ReactNode },
) => (
	<WorldMap.Root
		data={data}
		longitudeKey="longitude"
		sizeKey={sizeKey}
		bounds={bounds}
		animate={animate}
		aria-label="Agents"
	>
		{children}
		<WorldMap.Point latitudeKey="latitude" color="blue" />
	</WorldMap.Root>
);

/**
 * Mounts a map with one western point. `pointAlone` is the ink the eastern
 * point paints with no ring, measured on a still map first; `addEastPoint`
 * adds that point to the mounted map. With a `sizeKey`, the eastern point is
 * the largest, at 16px.
 */
const mountWestPoint = async ({ sizeKey }: { sizeKey?: "agents" } = {}) => {
	const reference = render(pointMap(next, { animate: false, sizeKey }));
	const referenceCanvas = await findChartCanvas(reference.container);
	const east = () => countInk(referenceCanvas, isChart1Tint, { fromX: 400 });
	await waitFor(() => expect(east()).toBeGreaterThan(0));
	const pointAlone = east();
	reference.unmount();

	const { container, rerender } = render(pointMap(first, { animate: true, sizeKey }));
	const canvas = await findChartCanvas(container);
	await waitFor(() => expect(countInk(canvas, isChart1Tint)).toBeGreaterThan(0));
	return {
		canvas,
		pointAlone,
		addEastPoint: () => rerender(pointMap(next, { animate: true, sizeKey })),
		stopMotion: () => rerender(pointMap(next, { animate: false, sizeKey })),
	};
};

/** The plot's box and the fit that places a region in it; without `bounds`, the whole world. */
const plotFit = (container: HTMLElement, bounds?: GeoBounds) => {
	const plot = container.querySelector<HTMLElement>('[data-slot="world-map-plot"]');
	if (plot == null) {
		throw new Error("The map rendered no plot.");
	}
	const plotBox = plot.getBoundingClientRect();
	const fit = fitBounds(
		{ left: 0, top: 0, width: plotBox.width, height: plotBox.height },
		bounds ?? WORLD_BOUNDS,
		{ inset: bounds == null ? 0.5 : 0 },
	);
	return { plotBox, fit };
};

/** The tooltip while it shows. It throws while the tooltip is hidden, so a `waitFor` tries again. */
const shownTooltip = (container: HTMLElement): HTMLElement => {
	const tooltip = container.querySelector<HTMLElement>('[data-slot="world-map-tooltip"]');
	if (tooltip?.style.opacity !== "1") {
		throw new Error("The map shows no tooltip.");
	}
	return tooltip;
};

/** Moves the pointer to a plot position, and returns the tooltip once it shows. */
const hoverAt = async (
	container: HTMLElement,
	{ plotBox, x, y }: { plotBox: DOMRect; x: number; y: number },
) =>
	waitFor(() => {
		container.querySelector('[role="application"]')?.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: plotBox.left + x,
				clientY: plotBox.top + y,
			}),
		);
		return shownTooltip(container);
	});

describe("WorldMap paint", () => {
	test("paints the land and the ocean inside the outline", async () => {
		const { container } = render(pointMap([], { animate: false }));
		const canvas = await findChartCanvas(container);
		await waitFor(() => expect(countInk(canvas, isLand)).toBeGreaterThan(10_000));
		expect(countInk(canvas, isOcean)).toBeGreaterThan(countInk(canvas, isLand));
	});

	test("in forced colors mode, the land and the ocean keep their two colors", async () => {
		await commands.emulateMedia({ forcedColors: "active" });
		const { container } = render(pointMap([], { animate: false }));
		const canvas = await findChartCanvas(container);
		await waitFor(() => expect(countInk(canvas, isLand)).toBeGreaterThan(10_000));
		expect(countInk(canvas, isOcean)).toBeGreaterThan(countInk(canvas, isLand));
	});

	test("the land paints at its place: Australia is land, and the mid Atlantic is ocean", async () => {
		const { container } = render(pointMap([], { animate: false }));
		const canvas = await findChartCanvas(container);
		const { fit } = plotFit(container);
		await waitFor(() => expect(inkAt(canvas, toScreen(fit, 134, -25))).toBe("land"));
		expect(inkAt(canvas, toScreen(fit, -35, 25))).toBe("ocean");
	});

	test("Wrangel Island is land at 179.4° E, beside the antimeridian", async () => {
		const arctic = { west: 170, south: 65, east: 180, north: 75 };
		const { container } = render(pointMap([], { animate: false, bounds: arctic }));
		const canvas = await findChartCanvas(container);
		const { fit } = plotFit(container, arctic);
		await waitFor(() => expect(inkAt(canvas, toScreen(fit, 179.4, 71.2))).toBe("land"));
	});

	test("the graticule paints only while its part is composed", async () => {
		const { container, rerender } = render(
			pointMap([], { animate: false, children: <WorldMap.Graticule /> }),
		);
		const canvas = await findChartCanvas(container);
		// The equator at 25° W: open ocean under one parallel of the graticule.
		const place = toScreen(plotFit(container).fit, -25, 0);
		await waitFor(() => expect(inkAt(canvas, place)).toBe("grid"));
		rerender(pointMap([], { animate: false }));
		await waitFor(() => expect(inkAt(canvas, place)).toBe("ocean"));
	});

	test("a point's area follows its size value", async () => {
		const { container } = render(pointMap(next, { animate: false, sizeKey: "agents" }));
		const canvas = await findChartCanvas(container);
		await waitFor(() => expect(countInk(canvas, isChart1Tint, { fromX: 400 })).toBeGreaterThan(0));
		const small = countInk(canvas, isChart1Tint, { toX: 400 });
		const large = countInk(canvas, isChart1Tint, { fromX: 400 });
		// 4px against 16px: sixteen times the area, less the surface rings.
		expect(large).toBeGreaterThan(small * 8);
	});

	test("a point at a new place pulses once, then the ring clears", async () => {
		const { canvas, pointAlone, addEastPoint } = await mountWestPoint();
		addEastPoint();
		const sampleEast = () => countInk(canvas, isChart1Tint, { fromX: 400 });
		await expect
			.poll(sampleEast, { interval: 16, timeout: 2000 })
			.toBeGreaterThan(pointAlone * 1.3);
		await expect.poll(sampleEast, { interval: 50, timeout: 3000 }).toBe(pointAlone);
	});

	test("the ring of a sized arrival shows outside its point", async () => {
		const { canvas, pointAlone, addEastPoint } = await mountWestPoint({ sizeKey: "agents" });
		addEastPoint();
		// The ring starts at the edge of the 16px point, where it adds a quarter of the point's ink.
		await expect
			.poll(() => countInk(canvas, isChart1Tint, { fromX: 400 }), { interval: 16, timeout: 2000 })
			.toBeGreaterThan(pointAlone * 1.2);
	});

	test("the first rows after an empty map play no ring", async () => {
		const { container, rerender } = render(pointMap([], { animate: true }));
		const canvas = await findChartCanvas(container);
		const [x] = toScreen(plotFit(container).fit, 100, 40);
		rerender(pointMap(next, { animate: true }));
		// Why 7px east of the point: its surface ring ends at 5px, and a pulse ring grows to 18px.
		const ringInk = () => countInk(canvas, isChart1Tint, { fromX: x + 7 });
		// Sample every frame for longer than a ring stays visible.
		const samples: number[] = [];
		await expect
			.poll(() => samples.push(ringInk()), { interval: 16, timeout: 2000 })
			.toBeGreaterThanOrEqual(30);
		expect(Math.max(...samples)).toBe(0);
		// Guards the samples: the point did paint beside the columns they read.
		expect(countInk(canvas, isChart1Tint, { fromX: 400 })).toBeGreaterThan(0);
	});

	test("turning animate off clears a running pulse", async () => {
		const { canvas, pointAlone, addEastPoint, stopMotion } = await mountWestPoint();
		// The new point starts its pulse in this commit, and the next commit turns motion off.
		addEastPoint();
		stopMotion();
		// Sample every frame while the ring would still be at its strongest.
		const samples: number[] = [];
		await expect
			.poll(() => samples.push(countInk(canvas, isChart1Tint, { fromX: 400 })), {
				interval: 16,
				timeout: 2000,
			})
			.toBeGreaterThanOrEqual(15);
		expect(Math.max(...samples)).toBe(pointAlone);
	});

	test("a new land color on the Root repaints the land", async () => {
		const isGreen: InkPredicate = (red, green, blue) => green > 200 && red < 60 && blue < 60;
		const landMap = (land: string) => (
			<WorldMap.Root
				data={first}
				longitudeKey="longitude"
				animate={false}
				aria-label="Agents"
				style={{ ["--world-map-land-color" as string]: land }}
			>
				<WorldMap.Point latitudeKey="latitude" color="blue" />
			</WorldMap.Root>
		);
		const { container, rerender } = render(landMap("#a0a0a0"));
		const canvas = await findChartCanvas(container);
		await waitFor(() => expect(countInk(canvas, isLand)).toBeGreaterThan(1000));
		rerender(landMap("#00ff00"));
		await waitFor(() => expect(countInk(canvas, isGreen)).toBeGreaterThan(1000));
		expect(countInk(canvas, isLand)).toBe(0);
	});

	test("reduced motion plays no pulse", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		const { canvas, pointAlone, addEastPoint } = await mountWestPoint();
		addEastPoint();
		// Sample every frame for longer than the ring stays visible.
		const samples: number[] = [];
		await expect
			.poll(() => samples.push(countInk(canvas, isChart1Tint, { fromX: 400 })), {
				interval: 16,
				timeout: 2000,
			})
			.toBeGreaterThanOrEqual(30);
		expect(Math.max(...samples)).toBe(pointAlone);
	});
});

describe("WorldMap overlapping points", () => {
	const place = { longitude: 10, latitude: 20 };

	const overlapMap = (sizeKey: "count" | undefined, online: number, offline: number) => (
		<div style={{ ["--test-red" as string]: "#ff0000" }}>
			<WorldMap.Root
				data={[
					{ longitude: place.longitude, online: place.latitude, offline: null, count: online },
					{ longitude: place.longitude, online: null, offline: place.latitude, count: offline },
				]}
				longitudeKey="longitude"
				sizeKey={sizeKey}
				animate={false}
				aria-label="Agents"
			>
				<WorldMap.Point latitudeKey="online" color="var(--test-red)" label="Online" />
				<WorldMap.Point latitudeKey="offline" color="blue" label="Offline" />
				<WorldMap.Tooltip />
			</WorldMap.Root>
		</div>
	);

	test("a small point of an earlier series paints and hovers above a large point of a later one", async () => {
		const { container } = render(overlapMap("count", 1, 100));
		const canvas = await findChartCanvas(container);
		const { plotBox, fit } = plotFit(container);
		const [x, y] = toScreen(fit, place.longitude, place.latitude);
		await waitFor(() => expect(countInk(canvas, isChart1Tint)).toBeGreaterThan(0));
		expect(countInk(canvas, isRed, { fromX: x - 2, toX: x + 2 })).toBeGreaterThan(0);
		const tooltip = await hoverAt(container, { plotBox, x, y });
		expect(tooltip.textContent).toContain("Online");
		expect(tooltip.textContent).not.toContain("Offline");
	});

	test("of two equal points at one place, the pointer finds the later series, which paints on top", async () => {
		const { container } = render(overlapMap(undefined, 1, 1));
		const canvas = await findChartCanvas(container);
		const { plotBox, fit } = plotFit(container);
		const [x, y] = toScreen(fit, place.longitude, place.latitude);
		await waitFor(() => expect(countInk(canvas, isChart1Tint)).toBeGreaterThan(0));
		expect(countInk(canvas, isRed)).toBe(0);
		const tooltip = await hoverAt(container, { plotBox, x, y });
		expect(tooltip.textContent).toContain("Offline");
		expect(tooltip.textContent).not.toContain("Online");
	});
});

describe("WorldMap sized point hover", () => {
	// A 16px point, and a 4px neighbor 20px east: 9.15° of longitude on the equator of the 800px map.
	const neighbors = [
		{ longitude: 0, latitude: 0, agents: 100 },
		{ longitude: 9.15, latitude: 0, agents: 1 },
	];

	test("the hover dot covers a 16px point, and the tooltip clears the dot", async () => {
		const { container } = render(pointMap(neighbors, { animate: false, sizeKey: "agents" }));
		await findChartCanvas(container);
		const { plotBox, fit } = plotFit(container);
		const [x, y] = toScreen(fit, 0, 0);
		const tooltip = await hoverAt(container, { plotBox, x, y });
		const dot = container.querySelector('[data-slot="chart-active-point"]');
		// The point's 16px radius and the dot's 2px ring, on each side.
		expect(dot?.getBoundingClientRect().width).toBe(36);
		// The point's 16px radius and the 8px gap.
		expect(tooltip.getBoundingClientRect().left).toBeGreaterThanOrEqual(plotBox.left + x + 24);
	});

	test("a pointer on a large point finds it, not a small neighbor with a nearer center", async () => {
		const { container } = render(pointMap(neighbors, { animate: false, sizeKey: "agents" }));
		await findChartCanvas(container);
		const { plotBox, fit } = plotFit(container);
		const [x, y] = toScreen(fit, 0, 0);
		// Guards the setup: 12px east of the large point is on its disc, and 8px from the neighbor's center.
		expect(toScreen(fit, 9.15, 0)[0] - x).toBeCloseTo(20, 0);
		const tooltip = await hoverAt(container, { plotBox, x: x + 12, y });
		expect(tooltip.textContent).toContain("agents: 100");
	});
});

describe("WorldMap regions, connectors, and callouts", () => {
	const client = { longitude: -87.63, latitude: 41.88 };
	const pop = { longitude: -82.99, latitude: 39.96 };
	const bounds = { west: -105, south: 30, east: -65, north: 50 };
	/** The client as the largest point, at 16px, beside a 4px point. */
	const sizedRows = [
		{ ...client, count: 100 },
		{ ...pop, count: 1 },
	];

	type CalloutMapOptions = {
		data?: { longitude: number; latitude: number; count?: number }[];
		sizeKey?: "count";
		region?: GeoBounds;
		side?: "top" | "bottom";
		style?: CSSProperties;
	};

	/** A map of a region with a 100×40 callout over the client. `sizeKey` sizes the points. */
	const calloutMap = ({
		data = [client],
		sizeKey,
		region = bounds,
		side,
		style,
	}: CalloutMapOptions = {}) => (
		<WorldMap.Root
			data={data}
			longitudeKey="longitude"
			sizeKey={sizeKey}
			bounds={region}
			animate={false}
			aria-label="Client location"
			style={style}
		>
			<WorldMap.Point latitudeKey="latitude" color="blue" />
			<WorldMap.Callout {...client} side={side}>
				<div style={{ width: 100, height: 40 }} />
			</WorldMap.Callout>
		</WorldMap.Root>
	);

	/**
	 * Mounts {@link calloutMap}, and resolves once the map has placed the
	 * callout. `x` and `y` are the client's place in the plot.
	 */
	const mountCallout = async (options: CalloutMapOptions = {}) => {
		const { container, rerender } = render(calloutMap(options));
		const canvas = await findChartCanvas(container);
		const callout = container.querySelector<HTMLElement>('[data-slot="world-map-callout"]');
		if (callout == null) {
			throw new Error("The map rendered no callout.");
		}
		await waitFor(() => expect(getComputedStyle(callout).visibility).toBe("visible"));
		const { plotBox, fit } = plotFit(container, options.region ?? bounds);
		const [x, y] = toScreen(fit, client.longitude, client.latitude);
		return { canvas, callout, plotBox, x, y, rerender };
	};

	const narrow = { west: -10, south: -10, east: 10, north: 10 };

	/** A point at the middle of the narrow region, and a second point on the equator at `longitude`. */
	const clippedMap = (longitude: number) => (
		<WorldMap.Root
			data={[
				{ name: "Inside", longitude: 0, latitude: 0 },
				{ name: "Clipped", longitude, latitude: 0 },
			]}
			longitudeKey="longitude"
			labelKey="name"
			bounds={narrow}
			animate={false}
			aria-label="Agents"
		>
			<WorldMap.Point latitudeKey="latitude" color="blue" />
			<WorldMap.Tooltip />
		</WorldMap.Root>
	);

	test("bounds zoom the map to the region, and a callout sits above its point", async () => {
		const { canvas, callout, plotBox, x, y } = await mountCallout();
		// The point paints where the region's fit puts Chicago, not where the world fit would.
		expect(countInk(canvas, isChart1Tint, { fromX: x - 6, toX: x + 6 })).toBeGreaterThan(20);
		expect(countInk(canvas, isChart1Tint)).toBe(
			countInk(canvas, isChart1Tint, { fromX: x - 6, toX: x + 6 }),
		);
		const box = callout.getBoundingClientRect();
		expect(box.left + box.width / 2).toBeCloseTo(plotBox.left + x, 0);
		// The callout's bottom edge clears the point by its radius and the gap.
		expect(box.bottom).toBeCloseTo(plotBox.top + y - 12, 0);
		expect(callout).toHaveAttribute("data-side", "top");
	});

	test("a callout clears a large sized point", async () => {
		const { callout, plotBox, y } = await mountCallout({ data: sizedRows, sizeKey: "count" });
		// The largest point's 16px radius and the 8px gap.
		expect(callout.getBoundingClientRect().bottom).toBeCloseTo(plotBox.top + y - 24, 0);
	});

	test("a callout moves clear of the point that new rows put under it", async () => {
		const { callout, plotBox, y, rerender } = await mountCallout({ data: [], sizeKey: "count" });
		rerender(calloutMap({ data: sizedRows, sizeKey: "count" }));
		// The largest point's 16px radius and the 8px gap.
		await waitFor(() =>
			expect(callout.getBoundingClientRect().bottom).toBeCloseTo(plotBox.top + y - 24, 0),
		);
	});

	test("a callout stays over its place when its content grows", async () => {
		const { callout, plotBox, x } = await mountCallout();
		// Why a DOM write: no render follows it, so only the callout's own size report can place it again.
		callout.querySelector("div")?.style.setProperty("width", "200px");
		await waitFor(() => {
			const box = callout.getBoundingClientRect();
			expect(box.width).toBe(200);
			expect(box.left + box.width / 2).toBeCloseTo(plotBox.left + x, 0);
		});
	});

	test("a callout stays over its place when only its padding grows", async () => {
		const { callout, plotBox, x } = await mountCallout();
		// Why padding: the content box stays 100px wide, so only a report of the border box can place the callout again.
		callout.style.setProperty("padding", "0 30px");
		await waitFor(() => {
			const box = callout.getBoundingClientRect();
			expect(box.width).toBe(160);
			expect(box.left + box.width / 2).toBeCloseTo(plotBox.left + x, 0);
		});
	});

	test("a callout below its place on a Root with padding sits at the plot's offset", async () => {
		const { callout, plotBox, x, y } = await mountCallout({
			side: "bottom",
			style: { padding: 20 },
		});
		const box = callout.getBoundingClientRect();
		expect(box.left + box.width / 2).toBeCloseTo(plotBox.left + x, 0);
		// The callout's top edge clears the point by its 4px radius and the 8px gap.
		expect(box.top).toBeCloseTo(plotBox.top + y + 12, 0);
	});

	test("a callout moves to the other side of its place in the frame after `side` changes", async () => {
		const { callout, plotBox, y, rerender } = await mountCallout();
		rerender(calloutMap({ side: "bottom" }));
		// Why one frame: the part registers the callout again with the size it has, so the
		// map need not wait for a new size report, which comes a frame later.
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});
		expect(callout.getBoundingClientRect().top).toBeCloseTo(plotBox.top + y + 12, 0);
	});

	test("the pointer finds no point that the region clips", async () => {
		const { container, rerender } = render(clippedMap(0));
		await findChartCanvas(container);
		const { plotBox, fit } = plotFit(container, narrow);
		// The first longitude east of the region whose whole 4px point is past the plot's right edge.
		let longitude = narrow.east;
		while (toScreen(fit, longitude, 0)[0] <= plotBox.width + 5) {
			longitude += 0.05;
		}
		const [x, y] = toScreen(fit, longitude, 0);
		// Guards the setup: the pointer at the edge is within the 24px hit radius of the clipped point.
		expect(x - (plotBox.width - 1)).toBeLessThan(24);
		rerender(clippedMap(longitude));
		const [centerX, centerY] = toScreen(fit, 0, 0);
		// Proves the pointer reaches the map before the edge probe.
		const tooltip = await hoverAt(container, { plotBox, x: centerX, y: centerY });
		container.querySelector('[role="application"]')?.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: plotBox.left + plotBox.width - 1,
				clientY: plotBox.top + y,
			}),
		);
		await waitFor(() => expect(tooltip.style.opacity).toBe("0"));
	});

	test("the keyboard stops on no point that the region clips", async () => {
		const { container } = render(clippedMap(60));
		await findChartCanvas(container);
		// Why dispatched key events and no focus: browser test files share one page, and another file can take focus.
		// Why this order: End aims at the clipped last row and must come back, and the last ArrowRight must not step onto that row.
		for (const key of ["ArrowRight", "End", "ArrowRight"]) {
			container
				.querySelector('[role="application"]')
				?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
		}
		const tooltip = await waitFor(() => shownTooltip(container));
		expect(tooltip.textContent).toContain("Inside");
	});

	test("the hover marker follows its point to a new region", async () => {
		const place = { longitude: 80, latitude: 40 };
		// Why one array: new rows would drop the hover, and the test must move it with the region alone.
		const data = [place];
		const region = { west: 70, south: 30, east: 90, north: 50 };
		const regionMap = (zoomed: boolean) => (
			<WorldMap.Root
				data={data}
				longitudeKey="longitude"
				bounds={zoomed ? region : undefined}
				animate={false}
				aria-label="Agents"
			>
				<WorldMap.Point latitudeKey="latitude" color="blue" />
				<WorldMap.Tooltip />
			</WorldMap.Root>
		);
		const { container, rerender } = render(regionMap(false));
		await findChartCanvas(container);
		const world = plotFit(container);
		const [worldX, worldY] = toScreen(world.fit, place.longitude, place.latitude);
		await hoverAt(container, { plotBox: world.plotBox, x: worldX, y: worldY });
		rerender(regionMap(true));
		const { fit } = plotFit(container, region);
		const [x, y] = toScreen(fit, place.longitude, place.latitude);
		const marker = container.querySelector<HTMLElement>('[data-slot="chart-active-point"]');
		await waitFor(() => {
			const [markerX, markerY] = (marker?.style.transform.match(/-?[\d.]+/g) ?? []).map(Number);
			expect(markerX).toBeCloseTo(x, 1);
			expect(markerY).toBeCloseTo(y, 1);
		});
	});

	test("a callout with no room above its point flips below it", async () => {
		const { callout, plotBox, y } = await mountCallout({
			region: { west: -100, south: 30, east: -75, north: 43 },
		});
		// Guards the setup: the point is too near the top for a 40px callout above it.
		expect(y).toBeLessThan(52);
		expect(callout.getBoundingClientRect().top).toBeCloseTo(plotBox.top + y + 12, 0);
		expect(callout).toHaveAttribute("data-side", "bottom");
	});

	test("a callout whose place is outside the region hides", async () => {
		const { container } = render(
			<WorldMap.Root data={[client]} longitudeKey="longitude" bounds={bounds} aria-label="Client">
				<WorldMap.Point latitudeKey="latitude" color="blue" />
				<WorldMap.Callout longitude={13.4} latitude={52.5}>
					Berlin
				</WorldMap.Callout>
			</WorldMap.Root>,
		);
		await findChartCanvas(container);
		const callout = container.querySelector<HTMLElement>('[data-slot="world-map-callout"]');
		await waitFor(() => expect(callout?.style.visibility).toBe("hidden"));
	});

	test("a connector paints a line between its two places", async () => {
		const { container } = render(
			<div style={{ ["--test-connector" as string]: "#ff0000" }}>
				<WorldMap.Root
					data={[client]}
					longitudeKey="longitude"
					bounds={bounds}
					animate={false}
					aria-label="Client location"
				>
					<WorldMap.Point latitudeKey="latitude" color="blue" />
					<WorldMap.Connector
						from={client}
						to={pop}
						color="var(--test-connector)"
						lineStyle="solid"
					/>
				</WorldMap.Root>
			</div>,
		);
		const canvas = await findChartCanvas(container);
		const { fit } = plotFit(container, bounds);
		const [fromX] = toScreen(fit, client.longitude, client.latitude);
		const [toX] = toScreen(fit, pop.longitude, pop.latitude);
		await waitFor(() =>
			expect(countInk(canvas, isRed, { fromX: fromX + 8, toX: toX - 2 })).toBeGreaterThan(20),
		);
		expect(countInk(canvas, isRed, { toX: fromX - 8 })).toBe(0);
		expect(countInk(canvas, isRed, { fromX: toX + 4 })).toBe(0);
	});

	test("a connector that crosses the antimeridian runs to the edge of the map", async () => {
		const pacific = { west: 140, south: -45, east: 180, north: -5 };
		const auckland = { longitude: 174.76, latitude: -36.85 };
		const honolulu = { longitude: -157.86, latitude: 21.31 };
		const { container } = render(
			pointMap([], {
				animate: false,
				bounds: pacific,
				children: (
					<WorldMap.Connector from={auckland} to={honolulu} color="#ff0000" lineStyle="solid" />
				),
			}),
		);
		const canvas = await findChartCanvas(container);
		// The great circle from Auckland to Honolulu crosses the antimeridian at 28.2° S.
		const [edgeX] = toScreen(plotFit(container, pacific).fit, 180, -28.2);
		await waitFor(() =>
			expect(countInk(canvas, isRed, { fromX: edgeX - 4, toX: edgeX })).toBeGreaterThan(0),
		);
	});

	test("a tooltip with no room on either side of its point stays inside a narrow plot", async () => {
		const { container } = render(
			<WorldMap.Root
				data={[client]}
				longitudeKey="longitude"
				bounds={bounds}
				animate={false}
				aria-label="Client location"
				style={{ width: 240, height: 120 }}
			>
				<WorldMap.Point latitudeKey="latitude" color="blue" />
				<WorldMap.Tooltip>{() => <div style={{ width: 200, height: 40 }} />}</WorldMap.Tooltip>
			</WorldMap.Root>,
		);
		await findChartCanvas(container);
		const { plotBox, fit } = plotFit(container, bounds);
		const [x, y] = toScreen(fit, client.longitude, client.latitude);
		const tooltip = await hoverAt(container, { plotBox, x, y });
		const box = tooltip.getBoundingClientRect();
		expect(box.left).toBeGreaterThanOrEqual(plotBox.left);
		expect(box.right).toBeLessThanOrEqual(plotBox.right + 0.5);
	});
});
