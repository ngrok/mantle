"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { findChartCanvas } from "../../test-utils/find-chart-canvas.js";
import { fitBounds, toScreen } from "../chart/geo.js";
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
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

type InkPredicate = (red: number, green: number, blue: number) => boolean;

const isLand: InkPredicate = (red, green, blue) =>
	Math.abs(red - 0xa0) < 3 && Math.abs(green - 0xa0) < 3 && Math.abs(blue - 0xa0) < 3;
const isOcean: InkPredicate = (red, green, blue) =>
	Math.abs(red - 0xf0) < 3 && Math.abs(green - 0xf0) < 3 && Math.abs(blue - 0xf0) < 3;
/** chart-1 (#3e6ff4) at any opacity over the gray land or ocean: blue well above red. */
const isChart1Tint: InkPredicate = (red, _green, blue) => blue > red + 40;

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

const first = [{ longitude: -100, latitude: 40 }];
const next = [...first, { longitude: 100, latitude: 40 }];

const pointMap = (data: typeof first, { animate }: { animate: boolean }) => (
	<WorldMap.Root data={data} longitudeKey="longitude" animate={animate} aria-label="Agents">
		<WorldMap.Point latitudeKey="latitude" color="blue" />
	</WorldMap.Root>
);

/**
 * Mounts a map with one western point. `pointAlone` is the ink the eastern
 * point paints with no ring, measured on a still map first; `addEastPoint`
 * adds that point to the mounted map.
 */
const mountWestPoint = async () => {
	const reference = render(pointMap(next, { animate: false }));
	const referenceCanvas = await findChartCanvas(reference.container);
	const east = () => countInk(referenceCanvas, isChart1Tint, { fromX: 400 });
	await waitFor(() => expect(east()).toBeGreaterThan(0));
	const pointAlone = east();
	reference.unmount();

	const { container, rerender } = render(pointMap(first, { animate: true }));
	const canvas = await findChartCanvas(container);
	await waitFor(() => expect(countInk(canvas, isChart1Tint)).toBeGreaterThan(0));
	return {
		canvas,
		pointAlone,
		addEastPoint: () => rerender(pointMap(next, { animate: true })),
	};
};

describe("WorldMap paint", () => {
	test("paints the land and the ocean inside the outline", async () => {
		const { container } = render(
			<WorldMap.Root<{ longitude: number; latitude: number }>
				data={[]}
				longitudeKey="longitude"
				aria-label="Empty map"
			>
				<WorldMap.Point latitudeKey="latitude" color="blue" />
			</WorldMap.Root>,
		);
		const canvas = await findChartCanvas(container);
		await waitFor(() => expect(countInk(canvas, isLand)).toBeGreaterThan(10_000));
		expect(countInk(canvas, isOcean)).toBeGreaterThan(countInk(canvas, isLand));
	});

	test("a point's area follows its size value", async () => {
		const { container } = render(
			<WorldMap.Root
				data={[
					{ longitude: -100, latitude: 40, agents: 1 },
					{ longitude: 100, latitude: 40, agents: 100 },
				]}
				longitudeKey="longitude"
				sizeKey="agents"
				animate={false}
				aria-label="Agents"
			>
				<WorldMap.Point latitudeKey="latitude" color="blue" />
			</WorldMap.Root>,
		);
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

describe("WorldMap regions, connectors, and callouts", () => {
	const client = { longitude: -87.63, latitude: 41.88 };
	const pop = { longitude: -82.99, latitude: 39.96 };
	const bounds = { west: -105, south: 30, east: -65, north: 50 };
	const isRed: InkPredicate = (red, green, blue) => red > 200 && green < 80 && blue < 80;

	test("bounds zoom the map to the region, and a callout sits above its point", async () => {
		const { container } = render(
			<WorldMap.Root
				data={[client]}
				longitudeKey="longitude"
				bounds={bounds}
				animate={false}
				aria-label="Client location"
			>
				<WorldMap.Point latitudeKey="latitude" color="blue" />
				<WorldMap.Callout {...client}>
					<div style={{ width: 100, height: 40 }} />
				</WorldMap.Callout>
			</WorldMap.Root>,
		);
		const canvas = await findChartCanvas(container);
		const plot = container.querySelector<HTMLElement>('[data-slot="world-map-plot"]');
		const callout = container.querySelector<HTMLElement>('[data-slot="world-map-callout"]');
		if (plot == null || callout == null) {
			throw new Error("The map rendered no plot or no callout.");
		}
		const plotBox = plot.getBoundingClientRect();
		const fit = fitBounds(
			{ left: 0, top: 0, width: plotBox.width, height: plotBox.height },
			bounds,
			{
				inset: 0,
			},
		);
		const [x, y] = toScreen(fit, client.longitude, client.latitude);
		await waitFor(() => expect(getComputedStyle(callout).visibility).toBe("visible"));
		// The point paints where the region's fit puts Chicago, not where the world fit would.
		expect(countInk(canvas, isChart1Tint, { fromX: x - 6, toX: x + 6 })).toBeGreaterThan(20);
		expect(countInk(canvas, isChart1Tint)).toBe(
			countInk(canvas, isChart1Tint, { fromX: x - 6, toX: x + 6 }),
		);
		const box = callout.getBoundingClientRect();
		expect(box.left + box.width / 2).toBeCloseTo(plotBox.left + x, 0);
		// The callout's bottom edge clears the point by its radius and the gap.
		expect(box.bottom).toBeCloseTo(plotBox.top + y - 12, 0);
	});

	test("a callout with no room above its point flips below it", async () => {
		const nearTop = { west: -100, south: 30, east: -75, north: 43 };
		const { container } = render(
			<WorldMap.Root data={[client]} longitudeKey="longitude" bounds={nearTop} aria-label="Client">
				<WorldMap.Point latitudeKey="latitude" color="blue" />
				<WorldMap.Callout {...client}>
					<div style={{ width: 100, height: 40 }} />
				</WorldMap.Callout>
			</WorldMap.Root>,
		);
		await findChartCanvas(container);
		const plot = container.querySelector<HTMLElement>('[data-slot="world-map-plot"]');
		const callout = container.querySelector<HTMLElement>('[data-slot="world-map-callout"]');
		if (plot == null || callout == null) {
			throw new Error("The map rendered no plot or no callout.");
		}
		const plotBox = plot.getBoundingClientRect();
		const fit = fitBounds(
			{ left: 0, top: 0, width: plotBox.width, height: plotBox.height },
			nearTop,
			{
				inset: 0,
			},
		);
		const [, y] = toScreen(fit, client.longitude, client.latitude);
		// Guards the setup: the point is too near the top for a 40px callout above it.
		expect(y).toBeLessThan(52);
		await waitFor(() => expect(getComputedStyle(callout).visibility).toBe("visible"));
		expect(callout.getBoundingClientRect().top).toBeCloseTo(plotBox.top + y + 12, 0);
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
		const plotBox = canvas.getBoundingClientRect();
		const fit = fitBounds(
			{ left: 0, top: 0, width: plotBox.width, height: plotBox.height },
			bounds,
			{
				inset: 0,
			},
		);
		const [fromX] = toScreen(fit, client.longitude, client.latitude);
		const [toX] = toScreen(fit, pop.longitude, pop.latitude);
		await waitFor(() =>
			expect(countInk(canvas, isRed, { fromX: fromX + 8, toX: toX - 2 })).toBeGreaterThan(20),
		);
		expect(countInk(canvas, isRed, { toX: fromX - 8 })).toBe(0);
		expect(countInk(canvas, isRed, { fromX: toX + 4 })).toBe(0);
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
		const plot = container.querySelector<HTMLElement>('[data-slot="world-map-plot"]');
		const overlay = container.querySelector<HTMLElement>('[role="application"]');
		if (plot == null || overlay == null) {
			throw new Error("The map rendered no plot or no overlay.");
		}
		overlay.focus();
		await userEvent.keyboard("{Home}");
		const tooltip = await waitFor(() => {
			const element = container.querySelector<HTMLElement>('[data-slot="world-map-tooltip"]');
			expect(element?.style.opacity).toBe("1");
			return element as HTMLElement;
		});
		const plotBox = plot.getBoundingClientRect();
		const box = tooltip.getBoundingClientRect();
		expect(box.left).toBeGreaterThanOrEqual(plotBox.left);
		expect(box.right).toBeLessThanOrEqual(plotBox.right + 0.5);
	});
});
