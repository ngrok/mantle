"use client";

import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as BarChart from "../bar-chart/bar-chart-parts.js";
import * as LineChart from "../line-chart/line-chart-parts.js";

/**
 * Real-browser tests for where the Root's grid puts each axis title. happy-dom
 * does no layout, so it cannot tell a title's cell from its source order.
 */

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, and the grid
// lives in the title's classes. Why the title last: one Tailwind build sorts a
// variant rule after a plain utility such as the Root's `flex`, and three
// builds keep that order only in this order.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		await commands.tailwindCss("./root.tsx"),
		await commands.tailwindCss("./legend.tsx"),
		await commands.tailwindCss("./axis-title.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const rows = [
	{ day: "Mon", requests: 42, errors: 3 },
	{ day: "Tue", requests: 61, errors: 5 },
	{ day: "Wed", requests: 55, errors: 2 },
];

const rect = (container: HTMLElement, selector: string): DOMRect => {
	const element = container.querySelector(selector);
	if (element == null) {
		throw new Error(`No element matches ${selector}`);
	}
	return element.getBoundingClientRect();
};

describe("an axis title", () => {
	// Why the titles last, after the legend: the grid places each title in its
	// own cell, so the source order must not move it.
	test("takes its cell beside or under the plot in any source order", () => {
		const { container } = render(
			<div style={{ width: 480 }}>
				<LineChart.Root data={rows} xKey="day" animate={false} aria-label="Requests">
					<LineChart.Line dataKey="requests" label="Requests" color="blue" />
					<LineChart.Line dataKey="errors" label="Errors" color="red" yAxis="right" />
					<LineChart.Legend />
					<LineChart.YAxis side="right">
						<LineChart.AxisTitle data-testid="right">Errors</LineChart.AxisTitle>
					</LineChart.YAxis>
					<LineChart.XAxis>
						<LineChart.AxisTitle data-testid="x">Day of the week</LineChart.AxisTitle>
					</LineChart.XAxis>
					<LineChart.YAxis>
						<LineChart.AxisTitle data-testid="left">Requests</LineChart.AxisTitle>
					</LineChart.YAxis>
				</LineChart.Root>
			</div>,
		);
		const plot = rect(container, '[data-slot="line-chart-plot"]');
		const x = rect(container, '[data-testid="x"]');
		const left = rect(container, '[data-testid="left"]');
		const right = rect(container, '[data-testid="right"]');
		const legend = rect(container, '[data-slot="line-chart-legend"]');
		// The x title sits under the plot, as wide as it, and above the legend.
		expect([x.left, x.width, x.top]).toEqual([plot.left, plot.width, plot.bottom]);
		expect(legend.top).toBeGreaterThanOrEqual(x.bottom);
		// Each y title spans the inner plot: below the 8px top padding and
		// above the 24px tick band.
		expect([left.right, left.top, left.bottom]).toEqual([
			plot.left,
			plot.top + 8,
			plot.bottom - 24,
		]);
		expect([right.left, right.top, right.bottom]).toEqual([
			plot.right,
			plot.top + 8,
			plot.bottom - 24,
		]);
		// The side titles stand upright: one line wide, taller than wide.
		expect(left.height).toBeGreaterThan(left.width);
		expect(right.height).toBeGreaterThan(right.width);
	});

	test("follows its axis to the other edge on horizontal bars", () => {
		const { container } = render(
			<div style={{ width: 480 }}>
				<BarChart.Root
					data={rows}
					xKey="day"
					orientation="horizontal"
					animate={false}
					aria-label="Requests"
				>
					<BarChart.Bar dataKey="requests" label="Requests" color="blue" />
					<BarChart.XAxis>
						<BarChart.AxisTitle data-testid="x">Day</BarChart.AxisTitle>
					</BarChart.XAxis>
					<BarChart.YAxis>
						<BarChart.AxisTitle data-testid="y">Requests</BarChart.AxisTitle>
					</BarChart.YAxis>
				</BarChart.Root>
			</div>,
		);
		const plot = rect(container, '[data-slot="bar-chart-plot"]');
		const x = rect(container, '[data-testid="x"]');
		const y = rect(container, '[data-testid="y"]');
		expect(x.right).toBe(plot.left);
		expect(y.top).toBe(plot.bottom);
	});

	test("truncates a long title to one line, and the chart keeps its size", () => {
		const long = "a title much longer than the chart is wide or tall ".repeat(8);
		const chart = (title: string) => (
			<div style={{ width: 320 }}>
				<LineChart.Root data={rows} xKey="day" animate={false} aria-label="Requests">
					<LineChart.Line dataKey="requests" label="Requests" color="blue" />
					<LineChart.XAxis>
						<LineChart.AxisTitle data-testid="x">{title}</LineChart.AxisTitle>
					</LineChart.XAxis>
					<LineChart.YAxis>
						<LineChart.AxisTitle data-testid="y">{title}</LineChart.AxisTitle>
					</LineChart.YAxis>
				</LineChart.Root>
			</div>
		);
		const { container, rerender } = render(chart("Day"));
		const short = rect(container, '[data-slot="line-chart"]');
		const shortX = rect(container, '[data-testid="x"]');
		const shortY = rect(container, '[data-testid="y"]');
		rerender(chart(long));
		const root = rect(container, '[data-slot="line-chart"]');
		expect([root.width, root.height]).toEqual([short.width, short.height]);
		expect(rect(container, '[data-testid="x"]').height).toBe(shortX.height);
		expect(rect(container, '[data-testid="y"]').width).toBe(shortY.width);
	});

	test("a chart with no title keeps its flex column", () => {
		const { container } = render(
			<LineChart.Root data={rows} xKey="day" animate={false} aria-label="Requests">
				<LineChart.Line dataKey="requests" label="Requests" color="blue" />
				<LineChart.XAxis />
			</LineChart.Root>,
		);
		const root = container.querySelector<HTMLElement>('[data-slot="line-chart"]');
		expect(root == null ? null : getComputedStyle(root).display).toBe("flex");
	});
});
