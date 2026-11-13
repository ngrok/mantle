import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser tests of where the engine puts the tooltip. The engine learns
 * the readout's size from a resize observer, which the browser runs after
 * layout and before paint. Only a real frame shows what each frame paints,
 * and happy-dom has neither the layout nor the observer.
 */

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. The plot needs
// its real box, and the tooltip needs the padding and the border that an empty
// surface keeps.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		await commands.tailwindCss("./root.tsx"),
		await commands.tailwindCss("./tooltip.tsx"),
		await commands.tailwindCss("./a11y.tsx"),
	].join("\n");
	document.head.append(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const data = [
	{ month: "January", desktop: 186, mobile: 80 },
	{ month: "February", desktop: 305, mobile: 200 },
	{ month: "March", desktop: 237, mobile: 120 },
];

/** Render a chart, wait for its first paint, and return its overlay. */
const renderChart = async (): Promise<HTMLElement> => {
	const { container } = render(
		<div style={{ width: 480 }}>
			<BarChart.Root data={data} xKey="month" animate={false} aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
				<BarChart.Bar dataKey="mobile" label="Mobile" color="emerald" />
			</BarChart.Root>
		</div>,
	);
	// The engine paints once the plot has a size, and the hit test needs that size.
	await waitFor(() => {
		if (container.querySelector('[data-slot="bar-chart-svg"] path[d]') == null) {
			throw new Error("expected the chart to paint its bars");
		}
	});
	return screen.getByRole("application", { name: "Visitors by month" });
};

/** Move the pointer to the middle of the plot. */
const hoverCenter = (overlay: HTMLElement): void => {
	const rect = overlay.getBoundingClientRect();
	fireEvent.pointerMove(overlay, {
		clientX: rect.left + rect.width / 2,
		clientY: rect.top + rect.height / 2,
	});
};

/** The tooltip surface, which the Root mounts on the first hover. */
const tooltipOf = (overlay: HTMLElement): HTMLElement => {
	const tooltip = overlay.parentElement?.querySelector('[data-slot="bar-chart-tooltip"]');
	if (!(tooltip instanceof HTMLElement)) {
		throw new Error("expected the tooltip surface to render");
	}
	return tooltip;
};

/**
 * Resolve after the browser painted the next frame.
 *
 * Why a task: the resize observer runs after the frame's animation callbacks.
 * A task that one of those callbacks posts runs after both.
 */
const framePainted = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => {
			const channel = new MessageChannel();
			channel.port1.addEventListener(
				"message",
				() => {
					channel.port1.close();
					resolve();
				},
				{ once: true },
			);
			channel.port1.start();
			channel.port2.postMessage(null);
		});
	});

/** The tooltip's transform as each of the next three frames painted it. */
const paintedTransforms = async (tooltip: HTMLElement): Promise<string[]> => {
	const transforms: string[] = [];
	for (let frame = 0; frame < 3; frame += 1) {
		await framePainted();
		transforms.push(tooltip.style.transform);
	}
	return transforms;
};

describe("tooltip placement across frames", () => {
	test("the first readout of a chart paints at one position", async () => {
		const overlay = await renderChart();

		hoverCenter(overlay);
		const tooltip = tooltipOf(overlay);
		const painted = await paintedTransforms(tooltip);

		expect(tooltip).toHaveStyle({ opacity: "1" });
		const settled = painted.at(-1);
		expect(settled).toMatch(/^translate\(/);
		// A placement that waits a frame for the readout's size paints the first
		// frame at the pointer and the second one centered on it.
		expect(painted).toEqual([settled, settled, settled]);
	});

	test("a readout that shows again after the pointer left paints at one position", async () => {
		const overlay = await renderChart();
		hoverCenter(overlay);
		const tooltip = tooltipOf(overlay);
		// The observer reports the readout's size in the frame that shows it.
		await framePainted();
		fireEvent.pointerLeave(overlay);
		// The surface holds no rows now, and the observer reports that box.
		await framePainted();
		expect(tooltip).toHaveStyle({ opacity: "0" });

		hoverCenter(overlay);
		const painted = await paintedTransforms(tooltip);

		expect(tooltip).toHaveStyle({ opacity: "1" });
		const settled = painted.at(-1);
		expect(settled).toMatch(/^translate\(/);
		// A placement from the empty box paints the first frame too low.
		expect(painted).toEqual([settled, settled, settled]);
	});
});
