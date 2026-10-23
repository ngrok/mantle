"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser tests for the legend's height bound. happy-dom does no layout,
 * so it cannot tell when the legend overflows.
 */
// Browser tests load no Tailwind build; mirror the legend's height bound.
const STYLE = `
[data-slot$="-legend"] {
	display: flex;
	flex-wrap: wrap;
	max-height: 4rem;
	overflow-y: auto;
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

const Chart = ({ seriesCount }: { seriesCount: number }) => {
	const keys = Array.from({ length: seriesCount }, (_, index) => `series${index}`);
	const data = [{ day: "Mon", ...Object.fromEntries(keys.map((key) => [key, 1])) }];
	return (
		<div style={{ width: 160 }}>
			<BarChart.Root data={data} xKey="day" animate={false} aria-label="Requests">
				{keys.map((key) => (
					<BarChart.Bar key={key} dataKey={key} label={`Series ${key}`} />
				))}
				<BarChart.Legend data-testid="legend" />
			</BarChart.Root>
		</div>
	);
};

describe("the legend", () => {
	test("is in the Tab order when it scrolls", async () => {
		render(<Chart seriesCount={20} />);
		const legend = await screen.findByRole("group", { name: "Legend" });
		expect(legend.tabIndex).toBe(0);
	});

	test("is not in the Tab order when it fits", async () => {
		render(<Chart seriesCount={2} />);
		const legend = await screen.findByTestId("legend");
		// Why the frame: the overflow read lands after layout.
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
		expect(legend.hasAttribute("tabindex")).toBe(false);
		expect(legend.hasAttribute("role")).toBe(false);
	});

	test("leaves the Tab order when it stops scrolling", async () => {
		const { rerender } = render(<Chart seriesCount={20} />);
		await screen.findByRole("group", { name: "Legend" });
		rerender(<Chart seriesCount={2} />);
		await waitFor(() => {
			expect(screen.getByTestId("legend").hasAttribute("tabindex")).toBe(false);
		});
	});
});
