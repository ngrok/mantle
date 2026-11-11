import { render, screen, within } from "@testing-library/react";
import { createPortal } from "react-dom";
import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { Dialog } from "../dialog/index.js";
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

test("stamps data-truncated in the same frame as the resize, before paint", async () => {
	const { container, root } = renderValue({ width: 600 });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(false);

	container.style.width = "240px";
	// Why an observer created after the component's: its callback runs after the
	// component's in the same frame, so it sees what that frame paints.
	const painted = await new Promise<boolean>((resolve) => {
		const observer = new ResizeObserver(() => {
			observer.disconnect();
			resolve(root.hasAttribute("data-truncated"));
		});
		observer.observe(container);
	});

	expect(painted).toBe(true);
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
		// Why the width check: WebKit reports a glyph that an ellipsis hides as a
		// rect of zero width. Why 1 px: WebKit snaps a glyph's rect to whole pixels.
		if (rect.width > 0 && rect.left >= box.left - 1 && rect.right <= box.right + 1) {
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
	// Why the optional "o": Chromium reports the glyph the ellipsis paints over,
	// and WebKit does not. Both keep the end.
	expect(visibleGlyphs(tail)).toMatch(/^o?k:v3$/);
});

const memberId = "mem_21h80N9qQuAmhSB8nlTA8KImPbQ";

test("with `head`, shows the lead, one ellipsis, and the tail while the container holds more", async () => {
	const { root, head, tail, ch } = renderValue({ width: 600, head: 4, value: memberId });
	await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);

	// Four lead cells and one ellipsis cell, and no sixth cell. Why a range and
	// not an exact width: WebKit snaps a range over part of a text node to whole
	// pixels, so its head can hold up to a pixel more than five cells.
	expect(head.getBoundingClientRect().width).toBeGreaterThanOrEqual(5 * ch);
	expect(head.getBoundingClientRect().width).toBeLessThan(6 * ch);
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
	// Why this long: the line count depends on the platform's fonts, and this
	// value wraps in all of them.
	const { content, inset, lines } = await openTooltip(
		"https://example.ngrok.app/api/items?filter=%7B%22name%22%3A%22x%22%7D&limit=200",
	);

	expect(lines.length).toBeGreaterThan(1);
	// Balanced lines have near-equal length.
	expect(Math.max(...lines) - Math.min(...lines)).toBeLessThan(20);
	// The box hugs the longer line, not the `max-width`.
	expect(content.getBoundingClientRect().width).toBeLessThanOrEqual(Math.max(...lines) + inset + 1);
});

/**
 * The space between the ellipsis the head draws and the tail, in CSS pixels.
 * The head draws the longest prefix whose width plus the ellipsis fits its box.
 */
function ellipsisGap(head: HTMLElement, tail: HTMLElement): number {
	const text = head.firstChild;
	if (!(text instanceof Text)) {
		throw new Error("The head holds no text node.");
	}
	const ellipsis = document.createElement("span");
	ellipsis.textContent = "…";
	head.after(ellipsis);
	const ellipsisWidth = ellipsis.getBoundingClientRect().width;
	ellipsis.remove();
	const box = head.getBoundingClientRect();
	const prefix = document.createRange();
	prefix.setStart(text, 0);
	let drawn = 0;
	for (let end = 1; end <= text.length; end++) {
		prefix.setEnd(text, end);
		const width = prefix.getBoundingClientRect().width;
		if (width + ellipsisWidth > box.width) {
			break;
		}
		drawn = width;
	}
	return tail.getBoundingClientRect().left - (box.left + drawn + ellipsisWidth);
}

test("keeps the ellipsis flush against the tail in a proportional font while the container resizes", async () => {
	const { container, root, head, tail } = renderValue({ width: 300, fontFamily: "sans-serif" });
	const errors: string[] = [];
	const onError = (event: ErrorEvent) => errors.push(event.message);
	window.addEventListener("error", onError);

	try {
		// Why these widths: each one leaves the head a different part of a glyph.
		for (const width of [300, 283, 271, 262, 254, 247, 300]) {
			container.style.width = `${width}px`;
			await expect.poll(() => root.getBoundingClientRect().width).toBeCloseTo(width, 0);
			await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);
			// Why 0.5: the head keeps half a pixel of slack, so WebKit never clips a
			// value that fits exactly.
			await expect.poll(() => ellipsisGap(head, tail)).toBeLessThanOrEqual(0.5 + 1 / 64);
		}
	} finally {
		window.removeEventListener("error", onError);
	}

	// Why: a write that resizes an observed element inside the observer callback
	// reports a loop error to `window`.
	expect(errors).toEqual([]);
});

/** Waits for the next animation frame. */
function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => resolve());
	});
}

/** The attributes that the batch writes on a root and its segments. */
const batchAttributes = ["style", "data-truncated", "tabindex"];

/**
 * Waits until no instance writes a style, `data-truncated`, or `tabindex` for
 * 10 frames in a row. Gives up after 120 frames, because an instance that
 * writes in every frame never goes quiet.
 */
async function settled(): Promise<void> {
	let writes = 0;
	const observer = new MutationObserver((records) => {
		writes += records.length;
	});
	observer.observe(document.body, { subtree: true, attributeFilter: batchAttributes });
	try {
		for (let frame = 0, quiet = 0; quiet < 10 && frame < 120; frame++) {
			const before = writes;
			await nextFrame();
			writes += observer.takeRecords().length;
			quiet = writes === before ? quiet + 1 : 0;
		}
	} finally {
		observer.disconnect();
	}
}

/**
 * Waits until the generic `monospace` family draws a monospace font.
 *
 * Why: a new Firefox profile can draw it with a proportional fallback for a
 * few seconds, and the switch measures every instance once more.
 */
async function monospaceLoaded(): Promise<void> {
	const probe = document.createElement("span");
	probe.style.cssText = "font: 13px monospace; white-space: pre;";
	document.body.append(probe);
	const width = (text: string) => {
		probe.textContent = text;
		return probe.getBoundingClientRect().width;
	};
	try {
		await expect.poll(() => width("iiii") === width("WWWW"), { timeout: 20_000 }).toBe(true);
	} finally {
		probe.remove();
	}
}

test("writes nothing to the roots while the page is idle", async () => {
	await monospaceLoaded();
	// Why many widths: Firefox reads a text range about 1e-5 px apart after the
	// text moves, and only some widths put a clipped tail on a rounding edge.
	const widths = Array.from({ length: 133 }, (_, index) => 18 + index);
	render(
		<TooltipProvider delayDuration={0}>
			{(["monospace", "sans-serif"] as const).flatMap((fontFamily) =>
				widths.map((width) => (
					<div
						key={`${fontFamily} ${width}`}
						style={{ width, fontFamily, fontSize: "13px", lineHeight: "20px" }}
					>
						<TruncatedText data-testid={`${fontFamily} ${width}px`} value={url} />
					</div>
				)),
			)}
		</TooltipProvider>,
	);
	await settled();

	const writes: Record<string, number> = {};
	const count = (records: MutationRecord[]) => {
		for (const { target } of records) {
			// Why the closest test ID: the batch writes the widths on the head and the tail.
			const name =
				target instanceof Element
					? (target.closest<HTMLElement>("[data-testid]")?.dataset.testid ?? "")
					: "";
			writes[name] = (writes[name] ?? 0) + 1;
		}
	};
	const observer = new MutationObserver(count);
	observer.observe(document.body, { subtree: true, attributeFilter: batchAttributes });
	try {
		for (let frame = 0; frame < 60; frame++) {
			await nextFrame();
		}
		count(observer.takeRecords());
	} finally {
		observer.disconnect();
	}

	// The narrowest container clips the tail, where a write can move it.
	expect(screen.getByTestId("monospace 18px")).toHaveAttribute("data-truncated", "");
	expect(writes).toEqual({});
}, 60_000);

/** The width of `value` on one line in a 13 px font, with no clip. */
function lineWidth(value: string, fontFamily: "monospace" | "sans-serif"): number {
	const probe = document.createElement("span");
	probe.style.cssText = `font: 13px ${fontFamily}; font-variant-ligatures: none; white-space: nowrap;`;
	probe.textContent = value;
	document.body.append(probe);
	const width = probe.getBoundingClientRect().width;
	probe.remove();
	return width;
}

/**
 * Renders the value in a sans-serif container that holds `room` times its
 * width, under an ancestor at `scale`. Once the measurement settles, the scale
 * ends with no resize, as a zoom-in does. Returns the errors that reach `window`.
 */
async function renderScaled({ room, scale }: { room: number; scale: number }) {
	const errors: string[] = [];
	const onError = (event: ErrorEvent) => errors.push(event.message);
	window.addEventListener("error", onError);
	try {
		const rendered = renderValue({
			width: lineWidth(url, "sans-serif") * room,
			fontFamily: "sans-serif",
		});
		// Why before the first await: the batch after mount runs in a microtask, so
		// it measures under the scale.
		rendered.container.style.transform = `scale(${scale})`;
		await settled();
		rendered.container.style.transform = "";
		await settled();
		return { ...rendered, errors };
	} finally {
		window.removeEventListener("error", onError);
	}
}

test("clips a value that overflows under a scaled ancestor, also once the scale ends", async () => {
	// The value overflows by 3%, and at 0.95 its text reads 2% narrower than the container.
	const { container, root, head, tail, errors } = await renderScaled({
		room: 1 / 1.03,
		scale: 0.95,
	});

	expect(root).toHaveAttribute("data-truncated", "");
	expect(root).toHaveAttribute("tabindex", "0");
	expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
	// Why 1/40: the batch read each width under the scale, which rounds it once more.
	expect(ellipsisGap(head, tail)).toBeLessThanOrEqual(0.5 + 1 / 64 + 1 / 40);
	expect(errors).toEqual([]);
});

test("renders a value that fits under a scaled ancestor plain, also once the scale ends", async () => {
	// The value fits by 3%, and at 1.05 its text reads 2% wider than the container.
	const { root, head, tail, errors } = await renderScaled({ room: 1.03, scale: 1.05 });

	expect(root).not.toHaveAttribute("data-truncated");
	expect(root).not.toHaveAttribute("tabindex");
	expect(head.scrollWidth).toBeLessThanOrEqual(head.clientWidth);
	// The tail reserves its text's width, so the root ends where the value ends.
	expect(tail.getBoundingClientRect().width).toBeCloseTo(textWidth(tail), 0);
	expect(errors).toEqual([]);
});

test("clips a value inside a Dialog that opens with a zoom, also once the zoom ends", async () => {
	// Why a copy of the zoom: the `tailwindCss` command compiles no
	// `tw-animate-css`, which draws the content's `zoom-in-95`.
	const zoom = document.createElement("style");
	zoom.textContent = `
		@keyframes zoom-in { from { transform: scale(0.95); } }
		[data-slot~="dialog-content"][data-state~="open"] { animation: zoom-in 200ms ease-out; }
	`;
	document.head.append(zoom);
	const errors: string[] = [];
	const onError = (event: ErrorEvent) => errors.push(event.message);
	window.addEventListener("error", onError);
	try {
		render(
			<TooltipProvider delayDuration={0}>
				<Dialog.Root open>
					<Dialog.Content aria-describedby={undefined}>
						<Dialog.Title>Endpoint</Dialog.Title>
						<div
							data-testid="container"
							style={{
								width: lineWidth(url, "sans-serif") / 1.03,
								fontFamily: "sans-serif",
								fontSize: "13px",
								lineHeight: "20px",
							}}
						>
							<TruncatedText data-testid="value" value={url} />
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</TooltipProvider>,
		);
		// Why the name: a focus ring on the content can add transitions of its own.
		const zooms = screen
			.getByRole("dialog")
			.getAnimations()
			.filter(
				(animation) => animation instanceof CSSAnimation && animation.animationName === "zoom-in",
			);
		expect(zooms).toHaveLength(1);
		await Promise.all(zooms.map((animation) => animation.finished));
		await settled();
	} finally {
		window.removeEventListener("error", onError);
		zoom.remove();
	}

	const container = screen.getByTestId("container");
	const root = screen.getByTestId("value");
	const head = root.querySelector('[data-slot="truncated-text-head"]');
	const tail = root.querySelector('[data-slot="truncated-text-tail"]');
	if (!(head instanceof HTMLElement) || !(tail instanceof HTMLElement)) {
		throw new Error("TruncatedText rendered without its head and tail slots.");
	}
	expect(root).toHaveAttribute("data-truncated", "");
	expect(root).toHaveAttribute("tabindex", "0");
	expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
	// Why 1/40: the batch read each width under the zoom, which rounds it once more.
	expect(ellipsisGap(head, tail)).toBeLessThanOrEqual(0.5 + 1 / 64 + 1 / 40);
	expect(errors).toEqual([]);
});

/** The head segment of a root, in any document. */
function headOf(root: Element): Element {
	const head = root.querySelector('[data-slot="truncated-text-head"]');
	if (head == null) {
		throw new Error("TruncatedText rendered without its head slot.");
	}
	return head;
}

test("measures a value that React renders into a same-origin frame", async () => {
	const frame = document.createElement("iframe");
	frame.srcdoc = "<!doctype html><title>Frame</title>";
	frame.style.cssText = "width: 600px; height: 120px; border: 0;";
	const loaded = new Promise((resolve) => {
		frame.addEventListener("load", resolve, { once: true });
	});
	document.body.append(frame);
	await loaded;
	const frameDocument = frame.contentDocument;
	if (frameDocument == null) {
		throw new Error("The frame has no document.");
	}
	const frameStyle = frameDocument.createElement("style");
	frameStyle.textContent = styleElement.textContent;
	frameDocument.head.append(frameStyle);
	const style = { width: 120, fontFamily: "sans-serif", fontSize: "13px", lineHeight: "20px" };
	const values = (
		<>
			<div style={style}>
				<TruncatedText data-testid="fit" value={url} />
			</div>
			<div style={style}>
				<TruncatedText data-testid="lead" head={4} value={memberId} />
			</div>
		</>
	);
	// Why one tree: React in the page renders into the frame, so the frame's text
	// nodes come from another window.
	const { unmount } = render(
		<TooltipProvider delayDuration={0}>
			{values}
			{createPortal(values, frameDocument.body)}
		</TooltipProvider>,
	);
	try {
		const frameValues = within(frameDocument.body);
		for (const testId of ["fit", "lead"]) {
			const root = screen.getByTestId(testId);
			const frameRoot = frameValues.getByTestId(testId);
			await expect.poll(() => root.hasAttribute("data-truncated")).toBe(true);
			await expect.poll(() => frameRoot.hasAttribute("data-truncated")).toBe(true);
			// Why the head's box: in a proportional font, the measured fit and the
			// lead's cap set its width. Without them it falls back to whole `ch` cells.
			await expect
				.poll(() => headOf(frameRoot).getBoundingClientRect().width)
				.toBeCloseTo(headOf(root).getBoundingClientRect().width, 1);
		}
	} finally {
		unmount();
		frame.remove();
	}
});
