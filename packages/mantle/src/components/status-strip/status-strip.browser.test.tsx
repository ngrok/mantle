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
		// Why this file too: a test passes its own classes to a segment.
		await commands.tailwindCss(["./status-strip.tsx", "./status-strip.browser.test.tsx"], {
			theme: true,
		}),
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
			<StatusStrip.Segment value={1} data-testid="all" />
			<StatusStrip.Segment value={0.5} data-testid="some" />
			<StatusStrip.Segment value={0} data-testid="none" />
			<StatusStrip.Segment value={null} data-testid="no-data" />
		</StatusStrip.Root>,
	);
	return (id: string) => getComputedStyle(screen.getByTestId(id));
}

/** The color Chromium computes for `color-mix` of `fill` (blue by default) at `percent` over transparent. */
function mixedFill(percent: number, fill = "rgb(0, 0, 255)") {
	const reference = document.createElement("span");
	reference.style.forcedColorAdjust = "none";
	reference.style.backgroundColor = `color-mix(in oklab, ${fill} ${percent}%, transparent)`;
	document.body.append(reference);
	const color = getComputedStyle(reference).backgroundColor;
	reference.remove();
	return color;
}

describe("StatusStrip paint", () => {
	test("a full segment paints the fill, and a half segment paints it fainter", () => {
		const style = renderStrip();
		expect(style("all").backgroundColor).toBe(mixedFill(100));
		// 35% + 65% * 0.5 = 67.5% of the fill over transparent.
		expect(style("some").backgroundColor).toBe(mixedFill(67.5));
	});

	test("a segment at 0 fills with the track, and a segment with no data is empty between two lines in it", () => {
		const style = renderStrip();
		expect(style("none").backgroundColor).toBe("rgb(255, 0, 0)");
		expect(style("none").borderTopWidth).toBe("0px");
		expect(style("no-data").backgroundColor).toBe("rgba(0, 0, 0, 0)");
		expect(style("no-data").borderTopWidth).toBe("1px");
		expect(style("no-data").borderTopColor).toBe("rgb(255, 0, 0)");
	});

	test("a segment with no data stays empty when it is 2px wide, so it does not read as 0", () => {
		render(
			<StatusStrip.Root aria-hidden style={{ width: 359 }}>
				{Array.from({ length: 120 }, (_, index) => (
					<StatusStrip.Segment
						// oxlint-disable-next-line react/no-array-index-key -- Why: each segment is a fixed position in the strip.
						key={index}
						value={index % 2 === 0 ? 0 : null}
						data-testid={`segment-${index}`}
					/>
				))}
			</StatusStrip.Root>,
		);
		const noData = screen.getByTestId("segment-1");
		expect(noData.getBoundingClientRect().width).toBeLessThan(3);
		expect(noData.clientWidth).toBeGreaterThan(0);
	});

	test("fills the width of a flex row, so its segments do not collapse", () => {
		render(
			<div style={{ display: "flex", width: 320 }}>
				<StatusStrip.Root aria-hidden>
					<StatusStrip.Segment value={1} data-testid="first" />
					<StatusStrip.Segment value={0} />
				</StatusStrip.Root>
			</div>,
		);
		// 320px minus one 1px gap, in two segments.
		expect(screen.getByTestId("first").getBoundingClientRect().width).toBeCloseTo(159.5, 1);
	});

	test("a segment's own fill or class replaces the root's paint, so each segment can take a threshold color", () => {
		render(
			<StatusStrip.Root
				aria-hidden
				style={$cssProperties({ "--status-strip-fill": "rgb(0, 0, 255)" })}
			>
				<StatusStrip.Segment value={1} data-testid="default" />
				<StatusStrip.Segment
					value={1}
					data-testid="low"
					style={$cssProperties({ "--status-strip-fill": "rgb(255, 0, 0)" })}
				/>
				<StatusStrip.Segment value={1} data-testid="class" className="bg-[rgb(0,128,0)]" />
			</StatusStrip.Root>,
		);
		expect(getComputedStyle(screen.getByTestId("default")).backgroundColor).toBe(mixedFill(100));
		expect(getComputedStyle(screen.getByTestId("low")).backgroundColor).toBe(
			mixedFill(100, "rgb(255, 0, 0)"),
		);
		expect(getComputedStyle(screen.getByTestId("class")).backgroundColor).toBe("rgb(0, 128, 0)");
	});

	test("forced colors keep each share's paint", async () => {
		await commands.emulateMedia({ forcedColors: "active" });
		try {
			const style = renderStrip();
			expect(style("all").backgroundColor).toBe(mixedFill(100));
			expect(style("none").backgroundColor).toBe("rgb(255, 0, 0)");
		} finally {
			await commands.emulateMedia({ forcedColors: "none" });
		}
	});

	test("segments share the root's width equally", () => {
		renderStrip();
		const widths = ["all", "some", "none", "no-data"].map(
			(id) => screen.getByTestId(id).getBoundingClientRect().width,
		);
		// 400px minus three 1px gaps, in four segments.
		for (const width of widths) {
			expect(width).toBeCloseTo(99.25, 1);
		}
	});
});
