import { render, screen } from "@testing-library/react";
import invariant from "tiny-invariant";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Steps from "./steps-parts.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. The item's
// position picks the silhouette through Tailwind variants, so only the real
// utilities can show which shape paints.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; border: 0 solid; }",
		await commands.tailwindCss("./steps.tsx", { theme: true }),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const markerOf = (item: HTMLElement) => {
	const marker = item.querySelector('[data-slot="steps-marker"]');
	invariant(marker != null, "the item rendered no marker");
	return marker;
};

/**
 * Names the one shape that paints in a marker, by the geometry it draws. A
 * silhouette with a top stub starts on the top edge at `x=18`, and one with a
 * bottom stub runs down to `y=50`. The plain circle has no path.
 */
const paintedShapeIn = (marker: Element) => {
	const painted = Array.from(marker.querySelectorAll("svg > *")).filter(
		(shape) => getComputedStyle(shape).display !== "none",
	);
	invariant(painted.length === 1, `${painted.length} silhouettes paint at once`);
	const [shape] = painted;
	invariant(shape != null, "no silhouette paints");
	const path = shape.getAttribute("d");
	if (path == null) {
		return "only";
	}
	const hasTopStub = path.startsWith("M18 ");
	const hasBottomStub = path.includes("V50h-4");
	if (hasTopStub && hasBottomStub) {
		return "middle";
	}
	return hasTopStub ? "last" : "first";
};

describe("Steps marker (browser)", () => {
	test.each([
		[1, ["only"]],
		[2, ["first", "last"]],
		[3, ["first", "middle", "last"]],
		[4, ["first", "middle", "middle", "last"]],
	])("a %i-step guide paints the silhouettes %j, in that order", (length, expected) => {
		render(
			<Steps.Root>
				{Array.from({ length }, (_unused, index) => (
					<Steps.Item key={index}>
						<Steps.Title>Step {index + 1}</Steps.Title>
					</Steps.Item>
				))}
			</Steps.Root>,
		);
		// Which shape paints, not only that one paints: two swapped conditions
		// still paint one shape per step, with a stub that runs into nothing.
		expect(screen.getAllByRole("listitem").map((item) => paintedShapeIn(markerOf(item)))).toEqual(
			expected,
		);
	});

	test("a guide nested inside a step reads its own position, not the outer step's", () => {
		render(
			<Steps.Root>
				<Steps.Item data-testid="outer-first">
					<Steps.Title>Outer one</Steps.Title>
					<Steps.Root>
						<Steps.Item data-testid="inner-first">
							<Steps.Title>Inner one</Steps.Title>
						</Steps.Item>
						<Steps.Item data-testid="inner-middle">
							<Steps.Title>Inner two</Steps.Title>
						</Steps.Item>
						<Steps.Item data-testid="inner-last">
							<Steps.Title>Inner three</Steps.Title>
						</Steps.Item>
					</Steps.Root>
				</Steps.Item>
				<Steps.Item data-testid="outer-last">
					<Steps.Title>Outer two</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		// Custom properties inherit, so an inner item that set no value of its own
		// would paint the outer item's shape as well as its own.
		expect(
			["outer-first", "inner-first", "inner-middle", "inner-last", "outer-last"].map((testId) =>
				paintedShapeIn(markerOf(screen.getByTestId(testId))),
			),
		).toEqual(["first", "first", "middle", "last", "last"]);
	});
});

describe("Steps rail (browser)", () => {
	test("each item draws a 4px rail, and the last item keeps the width with no color", () => {
		render(
			<Steps.Root>
				<Steps.Item data-testid="first">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<Steps.Item data-testid="last">
					<Steps.Title>Add your authtoken</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const first = getComputedStyle(screen.getByTestId("first"));
		const last = getComputedStyle(screen.getByTestId("last"));
		expect(first.borderInlineStartWidth).toBe("4px");
		expect(last.borderInlineStartWidth).toBe("4px");
		expect(first.borderInlineStartColor).not.toBe("rgba(0, 0, 0, 0)");
		expect(last.borderInlineStartColor).toBe("rgba(0, 0, 0, 0)");
	});

	test("the label slot adds no box, so the step's children lay out in the item", () => {
		render(
			<Steps.Root>
				<Steps.Item data-testid="step">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const label = screen.getByTestId("step").querySelector('[data-slot="steps-item-label"]');
		invariant(label != null, "the item rendered no label slot");
		expect(getComputedStyle(label).display).toBe("contents");
	});
});
