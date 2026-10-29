import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { TooltipProvider } from "../tooltip/index.js";
import { TruncatedText } from "./truncated-text.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. Without the
// component's real utilities, the segments lay out as plain inline text.
beforeAll(async () => {
	styleElement = document.createElement("style");
	// Why border-box: Tailwind's preflight sets it, and the tooltip's `max-width`
	// holds its padding only under it.
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; }",
		await commands.tailwindCss("./truncated-text.tsx"),
		await commands.tailwindCss("../tooltip/tooltip.tsx"),
	].join("\n");
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
	head?: number;
	value?: string;
};

/**
 * Renders the value inside a fixed-width container, with a probe that measures
 * `1ch` in the same font.
 */
function renderValue({
	width,
	fontFamily = "monospace",
	head: headCount,
	value = url,
}: RenderOptions) {
	render(
		<TooltipProvider delayDuration={0}>
			<div
				data-testid="container"
				style={{ width, fontFamily, fontSize: "13px", lineHeight: "20px" }}
			>
				<TruncatedText data-testid="value" head={headCount} value={value} />
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
	// Why computed style: the ellipsis is paint only. A ligature such as `//`
	// is one glyph, so with ligatures on, a clip inside it empties a cell.
	expect(getComputedStyle(head).fontVariantLigatures).toBe("none");
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
		.toSorted((a, b) => a.left - b.left)
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

const memberId = "mem_21h80N9qQuAmhSB8nlTA8KImPbQ";

test("with `head`, shows the lead, one ellipsis, and the tail while the container holds more", async () => {
	const { root, head, tail, ch } = renderValue({ width: 600, head: 4, value: memberId });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	// Four lead cells and one ellipsis cell, plus the half pixel of slack.
	expect(head.getBoundingClientRect().width).toBeCloseTo(5 * ch + 0.5, 0);
	expect(tail.getBoundingClientRect().width).toBeCloseTo(textWidth(tail), 0);
	// The root shrinks to the two segments, so nothing follows the tail.
	expect(root.getBoundingClientRect().right).toBeCloseTo(tail.getBoundingClientRect().right, 0);
});

test("with `head`, the server markup already shows the lead shape before hydration", () => {
	const container = document.createElement("div");
	container.style.cssText =
		"width: 600px; font-family: monospace; font-size: 13px; line-height: 20px;";
	container.innerHTML = renderToString(
		<TooltipProvider>
			<TruncatedText head={4} value={memberId} />
		</TooltipProvider>,
	);
	const probe = document.createElement("span");
	probe.textContent = "0";
	container.append(probe);
	document.body.appendChild(container);
	try {
		const head = container.querySelector('[data-slot="truncated-text-head"]');
		if (!(head instanceof HTMLElement)) {
			throw new Error("The server markup lacks the head slot.");
		}
		const ch = probe.getBoundingClientRect().width;
		expect(head.getBoundingClientRect().width).toBeCloseTo(5 * ch + 0.5, 0);
	} finally {
		container.remove();
	}
});

test("with `head`, a proportional font shows the whole lead and the ellipsis", async () => {
	const { root, head, ch } = renderValue({
		width: 600,
		fontFamily: "sans-serif",
		head: 4,
		value: memberId,
	});
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	const text = head.firstChild;
	if (!(text instanceof Text)) {
		throw new Error("The head holds no text node.");
	}
	const lead = document.createRange();
	lead.setStart(text, 0);
	lead.setEnd(text, 4);
	const ellipsis = document.createElement("span");
	ellipsis.textContent = "…";
	root.parentElement?.append(ellipsis);
	const needed = lead.getBoundingClientRect().width + ellipsis.getBoundingClientRect().width;
	ellipsis.remove();

	// The head rounds up to whole `ch`, so it never drops a lead glyph and
	// adds less than one cell.
	expect(head.getBoundingClientRect().width).toBeGreaterThanOrEqual(needed);
	expect(head.getBoundingClientRect().width).toBeLessThan(needed + ch + 0.5);
});

test("with `head`, a narrower container clips the head further", async () => {
	const { container, root, head, ch } = renderValue({ width: 600, head: 4, value: memberId });
	container.style.width = `${Math.round(10.4 * ch)}px`;
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
	// Ten cells hold the eight-cell tail and two head cells.
	expect(head.getBoundingClientRect().width).toBeCloseTo(2 * ch + 0.5, 0);
});

test("with `head`, a value no longer than head plus tail renders whole", () => {
	const { root, head } = renderValue({ width: 600, head: 4, value: "mem_A8KImPbQ" });

	expect(root).not.toHaveAttribute("data-truncated");
	expect(head.scrollWidth).toBeLessThanOrEqual(head.clientWidth);
});

/**
 * Hovers a clipped value, waits for its tooltip to settle, and reads the
 * widths of the tooltip's lines.
 */
async function openTooltip(value: string) {
	const { root } = renderValue({ width: 160, value });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	await userEvent.hover(root);
	await expect.poll(() => document.querySelector('[data-slot~="tooltip-content"]')).not.toBeNull();
	const content = document.querySelector('[data-slot~="tooltip-content"]');
	const label = content?.querySelector('[data-slot="tooltip-label"] > span');
	if (!(content instanceof HTMLElement) || !(label instanceof HTMLElement)) {
		throw new Error("The tooltip did not open.");
	}
	await Promise.all(content.getAnimations().map((animation) => animation.finished));

	const range = document.createRange();
	range.selectNodeContents(label);
	const style = getComputedStyle(content);
	return {
		content,
		inset: Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight),
		lines: Array.from(range.getClientRects(), (rect) => rect.width),
	};
}

test("the tooltip shows a resource ID on one line", async () => {
	const { lines } = await openTooltip(memberId);

	expect(lines).toHaveLength(1);
});

test("the tooltip keeps a one-line value on one line when its width has a fraction", async () => {
	// Why the search: `offsetWidth` rounds a width such as 167.36px down to 167px,
	// and a box that narrow wraps the line. Pick an ID whose width in the
	// tooltip's font has a fraction under one half, so a rounded width is too narrow.
	const probe = document.createElement("span");
	probe.className = "font-sans text-sm";
	document.body.append(probe);
	const id = Array.from("0123456789abcdefghij", (glyph) => `ep_2abcdEFGhijKL12345${glyph}`).find(
		(candidate) => {
			probe.textContent = candidate;
			const fraction = probe.getBoundingClientRect().width % 1;
			return fraction > 0.05 && fraction < 0.45;
		},
	);
	probe.remove();
	if (id == null) {
		throw new Error("No candidate ID has a width with a small fraction in this font.");
	}

	const { lines } = await openTooltip(id);

	expect(lines).toHaveLength(1);
});

test("the tooltip balances a longer value and shrinks to its longest line", async () => {
	const { content, inset, lines } = await openTooltip(url);

	// The value is a little wider than the tooltip's `max-width`, so it wraps
	// onto two lines of near-equal length.
	expect(lines).toHaveLength(2);
	expect(Math.abs((lines[0] ?? 0) - (lines[1] ?? 0))).toBeLessThan(20);
	// The box hugs the longer line, not the `max-width`.
	expect(content.getBoundingClientRect().width).toBeLessThanOrEqual(Math.max(...lines) + inset + 1);
});
