"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { findChartCanvas } from "../../test-utils/find-chart-canvas.js";
import { WorldMap } from "./world-map.js";

/**
 * Real-browser tests for the world map's paint path: the land, the sized
 * points, and the arrival pulse need a real 2d context and real layout.
 * Tokens and structural layout CSS are inlined so the test stays hermetic.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
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
		<WorldMap.Point latitudeKey="latitude" />
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
				<WorldMap.Point latitudeKey="latitude" />
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
				<WorldMap.Point latitudeKey="latitude" />
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
