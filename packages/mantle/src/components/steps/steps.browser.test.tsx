import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import invariant from "tiny-invariant";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, page, server } from "vitest/browser";
import { $cssProperties } from "../../types/css-properties.js";
import * as Steps from "./steps-parts.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. The item's
// position picks the silhouette through Tailwind variants, so only the real
// utilities can show which shape paints. Why all of mantle.css: the number
// must resolve its own color token, or it paints black on the black fill.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		await commands.tailwindCss("./steps.tsx", { mantleCss: true }),
		// A test-only override: a marker with `data-probe` paints that literal digit.
		"[data-probe]::after { content: attr(data-probe) !important; }",
		// Why a system font: the full stylesheet sets Roobert, and a test sends no network request.
		'[data-slot~="steps"] { font-family: monospace; }',
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

describe("Steps position skips what takes no number (browser)", () => {
	test("a lone visible item between hidden items paints the only shape and no rail", () => {
		render(
			<Steps.Root>
				<Steps.Item hidden>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<Steps.Item data-testid="visible">
					<Steps.Title>Add your authtoken</Steps.Title>
				</Steps.Item>
				<Steps.Item hidden>
					<Steps.Title>Get a public URL for your app</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const visible = screen.getByTestId("visible");
		expect(paintedShapeIn(markerOf(visible))).toBe("only");
		expect(getComputedStyle(visible).borderInlineStartColor).toBe("rgba(0, 0, 0, 0)");
	});

	test("a script in the list after a lone item leaves it the only shape and no rail", () => {
		render(
			<Steps.Root>
				<Steps.Item data-testid="only">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<script type="application/json">{"{}"}</script>
			</Steps.Root>,
		);
		const only = screen.getByTestId("only");
		expect(paintedShapeIn(markerOf(only))).toBe("only");
		expect(getComputedStyle(only).borderInlineStartColor).toBe("rgba(0, 0, 0, 0)");
	});

	test("a server Suspense placeholder after the last item leaves it the last shape", () => {
		// Why a `<template>`: a pending `<Suspense>` renders one on the server
		// until its content streams in.
		render(
			<Steps.Root>
				<Steps.Item>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<Steps.Item data-testid="last">
					<Steps.Title>Add your authtoken</Steps.Title>
				</Steps.Item>
				<template />
			</Steps.Root>,
		);
		const last = screen.getByTestId("last");
		expect(paintedShapeIn(markerOf(last))).toBe("last");
		expect(getComputedStyle(last).borderInlineStartColor).toBe("rgba(0, 0, 0, 0)");
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

	test("a larger spacing scale grows the rail and the marker together", () => {
		render(
			<Steps.Root style={$cssProperties({ "--spacing": "0.5rem" })}>
				<Steps.Item data-testid="first">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<Steps.Item>
					<Steps.Title>Add your authtoken</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const item = screen.getByTestId("first");
		// The stub is a tenth of the marker's width, so the rail must be a tenth too.
		const marker = markerOf(item).getBoundingClientRect();
		expect(getComputedStyle(item).borderInlineStartWidth).toBe("8px");
		expect(marker.width).toBe(80);
	});

	test("a token override on the root reaches the rail, the blob, and the number", () => {
		render(
			<Steps.Root
				style={$cssProperties({
					"--color-steps-rail": "rgb(255, 0, 0)",
					"--color-steps-number": "rgb(0, 0, 255)",
				})}
			>
				<Steps.Item data-testid="first">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<Steps.Item>
					<Steps.Title>Add your authtoken</Steps.Title>
				</Steps.Item>
			</Steps.Root>,
		);
		const item = screen.getByTestId("first");
		const svg = item.querySelector("svg");
		invariant(svg != null, "the marker rendered no svg");
		expect(getComputedStyle(item).borderInlineStartColor).toBe("rgb(255, 0, 0)");
		expect(getComputedStyle(svg).fill).toBe("rgb(255, 0, 0)");
		expect(getComputedStyle(markerOf(item), "::after").color).toBe("rgb(0, 0, 255)");
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

/**
 * The pixels of a marker's circle interior, where the number paints: `x`
 * 8..32 and `y` 10..40 of the 40 by 50 box.
 */
const circlePixelsOf = async (marker: Element) => {
	const shot = await page.screenshot({ element: marker, save: false });
	const bitmap = await createImageBitmap(
		await (await fetch(`data:image/png;base64,${shot}`)).blob(),
	);
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const context = canvas.getContext("2d");
	invariant(context != null, "no 2D context to decode the screenshot");
	context.drawImage(bitmap, 0, 0);
	const scale = bitmap.width / 40;
	return context.getImageData(8 * scale, 10 * scale, 24 * scale, 30 * scale).data;
};

/**
 * Reports, for each step in DOM order, whether its marker paints the number
 * of its position.
 *
 * Why screenshots: the computed `content` of the marker is
 * `counter(mantle-steps)`, and no DOM API reads the counter's value. The
 * test paints each marker as is, then with the literal digit, and compares
 * the pixels inside the circle. The stubs overlap the step above, so their
 * edges can change between two shots.
 */
const numbersPaintedInOrder = async () => {
	const matches: boolean[] = [];
	for (const [index, item] of screen.getAllByRole("listitem").entries()) {
		const marker = markerOf(item);
		const painted = await circlePixelsOf(marker);
		marker.setAttribute("data-probe", String(index + 1));
		const literal = await circlePixelsOf(marker);
		marker.removeAttribute("data-probe");
		matches.push(painted.every((value, offset) => value === literal[offset]));
	}
	return matches;
};

const DomainStep = () => (
	<Steps.Item>
		<Steps.Title>Bring your own domain</Steps.Title>
	</Steps.Item>
);

const Guide = ({ needsTraffic }: { needsTraffic: boolean }) => (
	<Steps.Root>
		<>
			<Steps.Item>
				<Steps.Title>Install the ngrok agent</Steps.Title>
			</Steps.Item>
			<Steps.Item>
				<Steps.Title>Add your authtoken</Steps.Title>
			</Steps.Item>
		</>
		{needsTraffic && (
			<Steps.Item>
				<Steps.Title>Send traffic</Steps.Title>
			</Steps.Item>
		)}
		<DomainStep />
	</Steps.Root>
);

describe("Steps numbers (browser)", () => {
	test("a fragment, a false child, and a wrapper still number 1, 2, 3", async () => {
		render(<Guide needsTraffic={false} />);
		expect(await numbersPaintedInOrder()).toEqual([true, true, true]);
	});

	test("a step that renders later renumbers the steps after it", async () => {
		const { rerender } = render(<Guide needsTraffic={false} />);
		rerender(<Guide needsTraffic />);
		expect(await numbersPaintedInOrder()).toEqual([true, true, true, true]);
		rerender(<Guide needsTraffic={false} />);
		expect(await numbersPaintedInOrder()).toEqual([true, true, true]);
	});
});

/** The color that a forced colors palette gives a system color keyword. */
const systemColor = (keyword: "Canvas" | "CanvasText"): string => {
	const probe = document.createElement("span");
	probe.style.color = keyword;
	document.body.append(probe);
	const { color } = getComputedStyle(probe);
	probe.remove();
	return color;
};

const TwoSteps = ({ children }: PropsWithChildren) => (
	<Steps.Root>
		<Steps.Item data-testid="first">
			<Steps.Title>Install the ngrok agent</Steps.Title>
		</Steps.Item>
		<Steps.Item data-testid="last">
			<Steps.Title>Add your authtoken</Steps.Title>
			{children}
		</Steps.Item>
	</Steps.Root>
);

describe("Steps in forced colors (browser)", () => {
	// Why after each test: the emulation belongs to the page, and the page outlives this file.
	afterEach(async () => {
		await commands.emulateMedia({ forcedColors: "none", colorScheme: "light" });
	});

	// Why not WebKit: it matches `forced-colors: active` under emulation, but it
	// does not force a border color or report `forced-color-adjust`.
	test.skipIf(server.browser === "webkit")(
		"the last item draws no rail below its marker",
		async () => {
			await commands.emulateMedia({ forcedColors: "active" });
			render(<TwoSteps />);
			// Forced colors paint a transparent border in CanvasText, so the last rail
			// must name the page color itself.
			expect(getComputedStyle(screen.getByTestId("first")).borderInlineStartColor).toBe(
				systemColor("CanvasText"),
			);
			expect(getComputedStyle(screen.getByTestId("last")).borderInlineStartColor).toBe(
				systemColor("Canvas"),
			);
		},
	);

	test("a light forced colors palette paints a different glyph for 1 and 8", async () => {
		await commands.emulateMedia({ forcedColors: "active", colorScheme: "light" });
		render(<TwoSteps />);
		const list = screen.getByRole("list");
		const marker = markerOf(screen.getByTestId("first"));
		// Why pixels: a backplate in the color of the digit leaves the circle
		// one solid color, and no computed style shows it.
		list.style.counterReset = "mantle-steps 0";
		const one = await circlePixelsOf(marker);
		list.style.counterReset = "mantle-steps 7";
		const eight = await circlePixelsOf(marker);
		expect(one.some((value, offset) => value !== eight[offset])).toBe(true);
	});

	test.skipIf(server.browser === "webkit")(
		"the number keeps its Canvas color, with no backplate over the blob",
		async () => {
			await commands.emulateMedia({ forcedColors: "active" });
			render(<TwoSteps />);
			const number = getComputedStyle(markerOf(screen.getByTestId("first")), "::after");
			expect(number.color).toBe(systemColor("Canvas"));
			// Why the mechanism: no computed style shows the backplate, and
			// `forced-color-adjust: none` is what turns it off for this text.
			expect(number.forcedColorAdjust).toBe("none");
		},
	);
});
