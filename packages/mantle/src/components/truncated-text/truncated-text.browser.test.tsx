import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { TooltipProvider } from "../tooltip/index.js";
import { TruncatedText } from "./truncated-text.js";

const headBefore = "before:content-['\\200B']";
const headMaxWidth = "max-w-[calc(100%_-_var(--_tail-width)_+_0.5px)]";
const headTruncatedMaxWidth =
	"[[data-truncated]>&]:max-w-[max(1ch_+_0.5px,calc(round(down,100%_-_var(--_tail-width),1ch)_+_0.5px))]";
const tailMinWidth = "min-w-(--_tail-width)";
const tailTruncatedMinWidth = "[[data-truncated]>&]:min-w-0";
const tailTruncatedMaxWidth =
	"[[data-truncated]>&]:max-w-[calc(round(down,100%_-_1ch_-_var(--_tail-width),1ch)_+_var(--_tail-width))]";
const tailHeadlessMaxWidth =
	"[[data-truncated]>:empty+&]:max-w-[calc(round(down,100%_-_var(--_tail-width),1ch)_+_var(--_tail-width)_+_0.5px)]";
const tailHeadlessEllipsis = "[[data-truncated]>:empty+&]:text-ellipsis";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities the component composes.
 * The browser project loads no stylesheet, so without it the segments lay out
 * as plain inline text and every geometry assertion passes for the wrong
 * reason. The arbitrary classes match the component's spelling, so a change
 * there fails here.
 */
const LAYOUT_STYLE = `
@layer utilities {
	.inline-block { display: inline-block; }
	.min-w-0 { min-width: 0px; }
	.max-w-full { max-width: 100%; }
	.whitespace-nowrap { white-space: nowrap; }
	.select-all { -webkit-user-select: all; user-select: all; }
	.select-none { -webkit-user-select: none; user-select: none; }
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
	.overflow-hidden { overflow: hidden; }
	.text-ellipsis { text-overflow: ellipsis; }
	.text-left { text-align: left; }
	.align-bottom { vertical-align: bottom; }
	.${CSS.escape(headBefore)}::before { content: "\\200B"; }
	.${CSS.escape(headMaxWidth)} { max-width: calc(100% - var(--_tail-width) + 0.5px); }
	[data-truncated] > .${CSS.escape(headTruncatedMaxWidth)} {
		max-width: max(1ch + 0.5px, calc(round(down, 100% - var(--_tail-width), 1ch) + 0.5px));
	}
	.${CSS.escape(tailMinWidth)} { min-width: var(--_tail-width); }
	[data-truncated] > .${CSS.escape(tailTruncatedMinWidth)} { min-width: 0px; }
	[data-truncated] > .${CSS.escape(tailTruncatedMaxWidth)} {
		max-width: calc(round(down, 100% - 1ch - var(--_tail-width), 1ch) + var(--_tail-width));
	}
	[data-truncated] > :empty + .${CSS.escape(tailHeadlessMaxWidth)} {
		max-width: calc(round(down, 100% - var(--_tail-width), 1ch) + var(--_tail-width) + 0.5px);
	}
	[data-truncated] > :empty + .${CSS.escape(tailHeadlessEllipsis)} { text-overflow: ellipsis; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = LAYOUT_STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const url = "https://example.ngrok.app/api/items?filter=abc&limit=200";

type RenderOptions = {
	/** The container's width in CSS pixels. */
	width: number;
	fontFamily?: "monospace" | "sans-serif";
	value?: string;
};

/**
 * Renders the value inside a fixed-width container, with a probe that measures
 * `1ch` in the same font.
 */
function renderValue({ width, fontFamily = "monospace", value = url }: RenderOptions) {
	render(
		<TooltipProvider>
			<div
				data-testid="container"
				style={{ width, fontFamily, fontSize: "13px", lineHeight: "20px" }}
			>
				<TruncatedText data-testid="value" value={value} />
				<span data-testid="probe">0</span>
			</div>
		</TooltipProvider>,
	);
	const root = screen.getByTestId("value");
	const head = root.querySelector('[data-slot="truncated-text-head"]');
	const tail = root.querySelector('[data-slot="truncated-text-tail"]');
	if (!(head instanceof HTMLElement) || !(tail instanceof HTMLElement)) {
		throw new Error("TruncatedText rendered without its head and tail slots.");
	}
	return {
		container: screen.getByTestId("container"),
		root,
		head,
		tail,
		ch: screen.getByTestId("probe").getBoundingClientRect().width,
	};
}

/** The width of an element's text, including the part an overflow clip hides. */
function textWidth(element: HTMLElement): number {
	const range = document.createRange();
	range.selectNodeContents(element);
	return range.getBoundingClientRect().width;
}

test("clips the head, keeps the tail whole, and stamps data-truncated when the value overflows", async () => {
	const { root, head, tail } = renderValue({ width: 240 });

	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	// Why computed style: `scrollWidth` exceeds `clientWidth` for an unclipped
	// box too, so only the clip proves the ellipsis.
	expect(getComputedStyle(head).overflowX).toBe("hidden");
	expect(getComputedStyle(head).textOverflow).toBe("ellipsis");
	expect(head.scrollWidth).toBeGreaterThan(head.clientWidth);
	expect(tail.getBoundingClientRect().width).toBeCloseTo(textWidth(tail), 0);
	expect(tail.getBoundingClientRect().right).toBeLessThanOrEqual(
		root.getBoundingClientRect().right + 0.5,
	);
});

test("renders the whole value plain while it fits", () => {
	const { root, head } = renderValue({ width: 600 });

	expect(root).not.toHaveAttribute("data-truncated");
	expect(head.scrollWidth).toBeLessThanOrEqual(head.clientWidth);
});

test("measures again when the container shrinks", async () => {
	const { container, root } = renderValue({ width: 600 });
	expect(root).not.toHaveAttribute("data-truncated");

	container.style.width = "240px";

	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);
});

test("the server markup keeps a fitting value unclipped before hydration", () => {
	const container = document.createElement("div");
	container.style.cssText =
		"width: 600px; font-family: sans-serif; font-size: 13px; line-height: 20px;";
	container.innerHTML = renderToString(
		<TooltipProvider>
			<TruncatedText value={url} />
		</TooltipProvider>,
	);
	document.body.appendChild(container);
	try {
		const head = container.querySelector('[data-slot="truncated-text-head"]');
		const tail = container.querySelector('[data-slot="truncated-text-tail"]');
		if (!(head instanceof HTMLElement) || !(tail instanceof HTMLElement)) {
			throw new Error("The server markup lacks the head and tail slots.");
		}
		// No hydration ran, so the reserve is still the `ch` estimate, which is
		// wider than these narrow glyphs. The tail holds it, so the head keeps
		// its full width.
		expect(tail.getBoundingClientRect().width).toBeGreaterThan(textWidth(tail) + 1);
		expect(head.scrollWidth).toBeLessThanOrEqual(head.clientWidth);
	} finally {
		container.remove();
	}
});

test("measures again when the tail's text changes width", async () => {
	const { container, root, tail } = renderValue({ width: 240 });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	// The line height stays fixed, so only the tail's width changes and only
	// its observer can fire.
	container.style.fontSize = "20px";

	await expect
		.poll(() => tail.getBoundingClientRect().right <= root.getBoundingClientRect().right + 0.5)
		.toBe(true);
	expect(tail.getBoundingClientRect().width).toBeCloseTo(textWidth(tail), 0);
});

test("a selection of the value reads as one line with no ellipsis", async () => {
	const { root, head, tail } = renderValue({ width: 240 });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	// Why display: a class this file does not mirror falls back to inline,
	// which copies as one line too, so the layout has to be the one under test.
	expect(getComputedStyle(root).display).toBe("inline-block");
	expect(getComputedStyle(head).display).toBe("inline-block");
	expect(getComputedStyle(tail).display).toBe("inline-block");

	const range = document.createRange();
	range.selectNodeContents(root);
	const selection = window.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);

	// Why one line: Chromium and WebKit put a newline between two block
	// segments, so a block layout for the segments fails here.
	expect(selection?.toString()).toBe(url);
});

test("one click selects the whole value across both segments", async () => {
	const { root } = renderValue({ width: 240 });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	await userEvent.click(root);

	// The hidden copy for assistive technology carries `user-select: none`, so
	// the value appears once.
	expect(window.getSelection()?.toString()).toBe(url);
});

test("rounds the clipped head down to whole ch cells in a monospace font", async () => {
	const { container, root, head, ch } = renderValue({ width: 600 });
	// A width of 30.5 cells leaves the unrounded head half a cell off a whole
	// number, so the rounding is the only way to a whole number of cells.
	container.style.width = `${Math.round(30.5 * ch)}px`;
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	expect(head.getBoundingClientRect().width).toBeLessThan(textWidth(head));
	// The box is a whole number of cells plus the half pixel of slack, so the
	// clipped glyphs and the ellipsis fill it and the tail follows flush.
	const cells = (head.getBoundingClientRect().width - 0.5) / ch;
	expect(Math.abs(cells - Math.round(cells))).toBeLessThan(0.1);
});

test("reserves the tail's measured width in a proportional font", async () => {
	const { root, tail, ch } = renderValue({ width: 240, fontFamily: "sans-serif" });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	// The `ch` estimate over-reserves for these narrow glyphs; the measured
	// width replaces it, so the tail's box shrinks to its text.
	expect(tail.getBoundingClientRect().width).toBeCloseTo(textWidth(tail), 0);
	expect(tail.getBoundingClientRect().width).toBeLessThan(8 * ch);
});

/**
 * The glyphs of `element`'s text that lie inside its border box, in visual
 * order from left to right.
 */
function visibleGlyphs(element: HTMLElement): string {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const textNode = walker.nextNode();
	if (!(textNode instanceof Text)) {
		throw new Error("The element holds no text node.");
	}
	const box = element.getBoundingClientRect();
	const glyphs: Array<{ left: number; glyph: string }> = [];
	for (let index = 0; index < textNode.length; index++) {
		const range = document.createRange();
		range.setStart(textNode, index);
		range.setEnd(textNode, index + 1);
		const rect = range.getBoundingClientRect();
		if (rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5) {
			glyphs.push({ left: rect.left, glyph: textNode.data[index] ?? "" });
		}
	}
	return glyphs
		.sort((a, b) => a.left - b.left)
		.map(({ glyph }) => glyph)
		.join("");
}

test("keeps one cell for the ellipsis when the container holds the tail and one cell", async () => {
	const { container, root, head, tail, ch } = renderValue({ width: 600 });
	container.style.width = `${Math.round(9.4 * ch)}px`;
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	// Why the pseudo-element: the ellipsis is paint only, so the zero-width
	// space that makes Chromium draw it in place of the first glyph is the
	// observable.
	expect(getComputedStyle(head, "::before").content).toBe('"​"');
	expect(head.getBoundingClientRect().width).toBeCloseTo(ch + 0.5, 0);
	expect(tail.getBoundingClientRect().width).toBeCloseTo(textWidth(tail), 0);
	expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
});

test("clips the tail at its start and keeps its end when the container is narrower than the tail", async () => {
	const { container, root, head, tail, ch } = renderValue({ width: 600 });
	container.style.width = `${Math.round(5.4 * ch)}px`;
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
	expect(head.getBoundingClientRect().width).toBeCloseTo(ch + 0.5, 0);
	// Four cells remain after the head's one, so the tail shows its last four
	// glyphs, in reading order.
	expect(visibleGlyphs(tail)).toBe("=200");
	// The head's ellipsis is the only one.
	expect(getComputedStyle(tail).textOverflow).toBe("clip");
});

test("one click still copies the whole value while the container is narrower than the tail", async () => {
	const { container, root, ch } = renderValue({ width: 600 });
	container.style.width = `${Math.round(5.4 * ch)}px`;
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	await userEvent.click(root);

	// Why: Chromium drops a box of zero width from a selection, so a head
	// clipped to nothing copies as the tail alone.
	expect(window.getSelection()?.toString()).toBe(url);
});

test("a value no longer than its tail draws the ellipsis itself and keeps its end", async () => {
	const { container, root, head, tail, ch } = renderValue({ width: 600, value: "ngrok:v3" });
	container.style.width = `${Math.round(5.4 * ch)}px`;
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	expect(head).toBeEmptyDOMElement();
	expect(getComputedStyle(tail).textOverflow).toBe("ellipsis");
	expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
	// The tail takes all five cells; the ellipsis paints over the first of them.
	expect(tail.getBoundingClientRect().width).toBeCloseTo(5 * ch + 0.5, 0);
	expect(visibleGlyphs(tail)).toBe("ok:v3");
});
