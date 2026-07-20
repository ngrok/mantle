"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { ScatterPlot } from "./scatter-plot.js";

/**
 * Real-browser tests for the scatter plot's paint paths — the 3D projection
 * (depth-sorted, camera-rotated) especially needs a real 2d context and real
 * layout. Tokens and structural layout CSS are inlined so the test stays
 * hermetic (mirrors bar-chart.browser.test.tsx).
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-2: #008138;
	--color-chart-other: #737373;
	--border-color-card-muted: #e5e5e5;
	--border-color-card: #d4d4d4;
	--text-color-muted: #717171;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
	--background-color-popover: #ffffff;
	--border-color-popover: #d4d4d4;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
[data-slot="scatter-plot"] {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot="scatter-plot-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot="scatter-plot-plot"] > canvas,
[data-slot="scatter-plot-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
[data-slot="scatter-plot-tooltip"] {
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

const points3d = Array.from({ length: 60 }, (_, index) => ({
	x: Math.sin(index * 0.7) * 40 + 50,
	y: Math.cos(index * 1.3) * 30 + 50,
	depth: ((index * 37) % 100) + 1,
}));

const mustBeCanvas = (element: Element | null): HTMLCanvasElement => {
	if (element instanceof HTMLCanvasElement) {
		return element;
	}
	throw new Error("expected the chart canvas to render");
};

const countOpaquePixels = (canvas: HTMLCanvasElement): number => {
	const context = canvas.getContext("2d");
	if (context == null || canvas.width === 0 || canvas.height === 0) {
		return 0;
	}
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	let count = 0;
	for (let offset = 3; offset < image.data.length; offset += 4) {
		if ((image.data[offset] ?? 0) > 200) {
			count += 1;
		}
	}
	return count;
};

describe("ScatterPlot 3D painting", () => {
	test("paints a depth-sorted point cloud and cube frame", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 400 }}>
				<ScatterPlot.Root
					data={points3d}
					xKey="x"
					zKey="depth"
					animate={false}
					aria-label="3D cloud"
				>
					<ScatterPlot.Point dataKey="y" label="Cluster" />
				</ScatterPlot.Root>
			</div>,
		);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		await waitFor(() => {
			expect(countOpaquePixels(canvas)).toBeGreaterThan(500);
		});
	});

	test("dragging the overlay rotates the camera and repaints a different frame", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 400 }}>
				<ScatterPlot.Root
					data={points3d}
					xKey="x"
					zKey="depth"
					animate={false}
					aria-label="3D cloud"
				>
					<ScatterPlot.Point dataKey="y" label="Cluster" />
				</ScatterPlot.Root>
			</div>,
		);
		const canvas = mustBeCanvas(container.querySelector("canvas"));
		const overlay = container.querySelector('[role="application"]');
		if (!(overlay instanceof HTMLElement)) {
			throw new Error("expected the overlay to render");
		}
		await waitFor(() => {
			expect(countOpaquePixels(canvas)).toBeGreaterThan(500);
		});
		const context = canvas.getContext("2d");
		if (context == null) {
			throw new Error("expected a 2d context");
		}
		const before = context.getImageData(0, 0, canvas.width, canvas.height).data;
		const rect = overlay.getBoundingClientRect();
		const startX = rect.left + rect.width / 2;
		const startY = rect.top + rect.height / 2;
		overlay.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true, clientX: startX, clientY: startY }),
		);
		overlay.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: startX + 80,
				clientY: startY + 30,
			}),
		);
		overlay.dispatchEvent(
			new PointerEvent("pointerup", {
				bubbles: true,
				clientX: startX + 80,
				clientY: startY + 30,
			}),
		);
		await waitFor(() => {
			const after = context.getImageData(0, 0, canvas.width, canvas.height).data;
			let changed = 0;
			for (let offset = 0; offset < after.length; offset += 40) {
				if (after[offset] !== before[offset]) {
					changed += 1;
				}
			}
			expect(changed).toBeGreaterThan(100);
		});
	});
});
