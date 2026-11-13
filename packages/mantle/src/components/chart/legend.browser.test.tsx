"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser tests for the legend's height bound and its focus outline.
 * happy-dom does no layout, so it cannot tell when the legend overflows, and
 * it applies no media query.
 */

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, and these
// tests read the height bound and the outline that the legend's real classes
// compute. The Root's classes give the legend the width it wraps in.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		await commands.tailwindCss("./root.tsx"),
		await commands.tailwindCss("./legend.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

// Why after each test: the emulation belongs to the page, and the page outlives this file.
afterEach(async () => {
	await commands.emulateMedia({ forcedColors: "none" });
});

const Chart = ({ seriesCount }: { seriesCount: number }) => {
	const keys = Array.from({ length: seriesCount }, (_, index) => `series${index}`);
	const data = [{ day: "Mon", ...Object.fromEntries(keys.map((key) => [key, 1])) }];
	return (
		<div style={{ width: 160 }}>
			<BarChart.Root data={data} xKey="day" animate={false} aria-label="Requests">
				{keys.map((key) => (
					<BarChart.Bar key={key} dataKey={key} label={`Series ${key}`} color="blue" />
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

	test("shows an outline on focus under forced colors", async () => {
		await commands.emulateMedia({ forcedColors: "active" });
		render(<Chart seriesCount={20} />);
		const legend = await screen.findByRole("group", { name: "Legend" });
		// The chart's overlay takes the first Tab, and the legend takes the second.
		await userEvent.keyboard("{Tab}{Tab}");
		expect(legend).toHaveFocus();
		// The focus ring is a box shadow, which a forced colors mode drops.
		expect(getComputedStyle(legend).outlineStyle).toBe("solid");
	});
});
