import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { BarChart } from "../bar-chart/index.js";
import { LineChart } from "../line-chart/index.js";

/**
 * Real-browser tests of how the Root's focus ring and cursor layers show in a
 * forced colors mode. That mode drops a box shadow and replaces an author
 * background color with a system color, so each of them needs another form
 * there. happy-dom applies no media query and computes no style from a class.
 */

/** The color the `blue` series paints in these tests, as a computed style reports it. */
const SERIES_COLOR = "rgb(62, 111, 244)";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, and these
// tests read the styles that the chart's real classes compute.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		`:root { --color-chart-blue: ${SERIES_COLOR}; }`,
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
	{ month: "January", visits: 186 },
	{ month: "February", visits: 305 },
	{ month: "March", visits: 237 },
];

type Family = "bar" | "line";

const chart = (family: Family) =>
	family === "bar" ? (
		<BarChart.Root data={data} xKey="month" animate={false} aria-label="Visits by month">
			<BarChart.Bar dataKey="visits" label="Visits" color="blue" />
		</BarChart.Root>
	) : (
		<LineChart.Root data={data} xKey="month" animate={false} aria-label="Visits by month">
			<LineChart.Line dataKey="visits" label="Visits" color="blue" />
		</LineChart.Root>
	);

/**
 * Render a chart, move focus to it with the keyboard, and step the cursor to
 * the first datum. Resolves with the plot once `slot` shows.
 */
const renderWithCursor = async (family: Family, slot: string) => {
	render(<div style={{ width: 480 }}>{chart(family)}</div>);
	const overlay = screen.getByRole("application", { name: "Visits by month" });
	const plot = overlay.parentElement;
	if (plot == null) {
		throw new Error("expected the overlay to sit in the plot");
	}
	await userEvent.keyboard("{Tab}{ArrowRight}");
	// The engine makes the layers and shows them on its next frame.
	const layer = await waitFor(() => {
		const element = plot.querySelector(`[data-slot="${slot}"]`);
		if (!(element instanceof HTMLElement)) {
			throw new Error(`expected the ${slot} layer to render`);
		}
		expect(element).toHaveStyle({ opacity: "1" });
		return element;
	});
	return { overlay, plot, layer };
};

/** The color a computed style reports for one CSS system color. */
const systemColor = (keyword: "Highlight"): string => {
	const probe = document.createElement("span");
	probe.style.color = keyword;
	document.body.append(probe);
	const { color } = getComputedStyle(probe);
	probe.remove();
	return color;
};

describe("forced colors", () => {
	beforeEach(async () => {
		await commands.emulateMedia({ forcedColors: "active" });
	});

	// Why after each test: the emulation belongs to the page, and the page outlives this file.
	afterEach(async () => {
		await commands.emulateMedia({ forcedColors: "none" });
	});

	test("the focused overlay shows an outline", async () => {
		const { overlay } = await renderWithCursor("bar", "bar-chart-hover-band");
		expect(overlay).toHaveFocus();
		// The ring is a box shadow, which this mode drops.
		expect(getComputedStyle(overlay).outlineStyle).toBe("solid");
	});

	test("the band of the active category shows an outline in the highlight color", async () => {
		const { layer: band } = await renderWithCursor("bar", "bar-chart-hover-band");
		const style = getComputedStyle(band);
		// The band's tint is a background color, which this mode replaces.
		expect(style.outlineStyle).toBe("solid");
		expect(style.outlineWidth).toBe("1px");
		expect(style.outlineColor).toBe(systemColor("Highlight"));
	});

	test("the crosshair paints the highlight color", async () => {
		const { layer: crosshair } = await renderWithCursor("line", "line-chart-crosshair");
		expect(getComputedStyle(crosshair).backgroundColor).toBe(systemColor("Highlight"));
	});

	test("a hover dot keeps the color of its series", async () => {
		const { plot } = await renderWithCursor("line", "line-chart-markers");
		const fill = plot.querySelector('[data-slot="chart-active-point"]')?.lastElementChild;
		if (fill == null) {
			throw new Error("expected the hover dot to hold its fill layer");
		}
		expect(getComputedStyle(fill).backgroundColor).toBe(SERIES_COLOR);
	});

	test("the tooltip's series indicator keeps the color of its series", async () => {
		const { plot } = await renderWithCursor("line", "line-chart-crosshair");
		const indicator = plot.querySelector('[data-slot="line-chart-tooltip"] span[aria-hidden]');
		if (indicator == null) {
			throw new Error("expected the readout to hold a series indicator");
		}
		expect(getComputedStyle(indicator).backgroundColor).toBe(SERIES_COLOR);
	});
});

test("without forced colors, the focused overlay and the active band show no outline", async () => {
	const { overlay, layer: band } = await renderWithCursor("bar", "bar-chart-hover-band");
	expect(getComputedStyle(overlay).outlineStyle).toBe("none");
	expect(getComputedStyle(band).outlineStyle).toBe("none");
});
