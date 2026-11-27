import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { $cssProperties } from "../../types/css-properties.js";
import * as StatusStrip from "./status-strip-parts.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, and the
// contract is the color each share paints.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; margin: 0; border: 0 solid; }",
		await commands.tailwindCss("./status-strip.tsx", { theme: true }),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

function renderStrip() {
	render(
		<StatusStrip.Root
			aria-label="Strip"
			style={$cssProperties({
				width: 400,
				"--status-strip-fill": "rgb(0, 0, 255)",
				"--status-strip-track": "rgb(255, 0, 0)",
			})}
		>
			<StatusStrip.Cell value={1} data-testid="all" />
			<StatusStrip.Cell value={0.5} data-testid="some" />
			<StatusStrip.Cell value={0} data-testid="none" />
			<StatusStrip.Cell value={null} data-testid="no-data" />
		</StatusStrip.Root>,
	);
	return (id: string) => getComputedStyle(screen.getByTestId(id));
}

describe("StatusStrip paint", () => {
	test("a full cell paints the fill, and a half cell paints it fainter", () => {
		const style = renderStrip();
		expect(style("all").backgroundColor).toMatch(
			/^(rgb\(0, 0, 255\)|color\(srgb 0 0 1\)|oklab\(.*\))$/,
		);
		expect(style("all").backgroundColor).not.toMatch(/\/ 0\.\d/);
		// 35% + 65% * 0.5 = 67.5% of the fill over transparent.
		expect(style("some").backgroundColor).toMatch(/\/ 0\.675\)$/);
	});

	test("a cell at 0 fills with the track, and a cell with no data is only an outline in it", () => {
		const style = renderStrip();
		expect(style("none").backgroundColor).toBe("rgb(255, 0, 0)");
		expect(style("none").borderTopWidth).toBe("0px");
		expect(style("no-data").backgroundColor).toBe("rgba(0, 0, 0, 0)");
		expect(style("no-data").borderTopWidth).toBe("1px");
		expect(style("no-data").borderTopColor).toBe("rgb(255, 0, 0)");
	});

	test("cells share the root's width equally", () => {
		renderStrip();
		const widths = ["all", "some", "none", "no-data"].map(
			(id) => screen.getByTestId(id).getBoundingClientRect().width,
		);
		// 400px minus three 1px gaps, in four cells.
		for (const width of widths) {
			expect(width).toBeCloseTo(99.25, 1);
		}
	});
});
