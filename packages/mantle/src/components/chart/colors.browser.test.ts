import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import type { ColorParseContext, ColorResolver } from "./colors.js";
import {
	canvasParses,
	colorParseContext,
	createColorResolver,
	resolveSeriesColor,
} from "./colors.js";
import { textureInkColor } from "./texture.js";

/**
 * Real-browser resolver tests: whether a color reaches the canvas through the
 * root's computed style or through the probe depends on Chromium's cascade and
 * its canvas color parser, neither of which happy-dom has.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

const hosts: HTMLElement[] = [];

afterEach(() => {
	for (const host of hosts) {
		host.remove();
	}
	hosts.length = 0;
});

const mountHost = (): HTMLElement => {
	const host = document.createElement("div");
	document.body.append(host);
	hosts.push(host);
	return host;
};

const parseContext = (): ColorParseContext => {
	const context = colorParseContext(document);
	if (context == null) {
		throw new Error("expected a 2D context in Chromium");
	}
	return context;
};

/** The resolver the engine builds for one pass over `host`. */
const resolverFor = (host: HTMLElement): ColorResolver =>
	createColorResolver(host, { computed: getComputedStyle(host), parseContext: parseContext() });

/**
 * The alpha a fresh canvas paints `color` with. A color the canvas rejects
 * leaves the default opaque black in place, so a rejected color reads 255 too.
 */
const fillAlpha = (color: string): number => {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("expected a 2D context in Chromium");
	}
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return context.getImageData(0, 0, 1, 1).data[3] ?? -1;
};

test("a chart token resolves from the root's cascade with no probe", () => {
	const host = mountHost();
	expect(resolveSeriesColor(resolverFor(host), "chart-1")).toBe("#3e6ff4");
	// A resolver that probes first leaves a span in the chart root.
	expect(host.childElementCount).toBe(0);
});

test("a light-dark() token resolves with no probe in the root's color-scheme, an island's included", () => {
	const host = mountHost();
	host.style.setProperty("--color-chart-1", "light-dark(rgb(1 2 3), rgb(4 5 6))");
	host.style.colorScheme = "light";
	expect(resolveSeriesColor(resolverFor(host), "chart-1")).toBe("rgb(1 2 3)");
	host.style.colorScheme = "dark";
	expect(resolveSeriesColor(resolverFor(host), "chart-1")).toBe("rgb(4 5 6)");

	// An island sets the scheme on an ancestor; the token inherits unresolved.
	const island = mountHost();
	island.style.setProperty("--color-chart-1", "light-dark(rgb(1 2 3), rgb(4 5 6))");
	island.style.colorScheme = "dark";
	const root = document.createElement("div");
	island.append(root);
	expect(resolveSeriesColor(resolverFor(root), "chart-1")).toBe("rgb(4 5 6)");
	expect(host.childElementCount + root.childElementCount).toBe(0);
});

test("a custom property set on the root wins over the document's", () => {
	const host = mountHost();
	host.style.setProperty("--color-chart-1", "rgb(1 2 3)");
	// A resolver that reads the documentElement's computed style gets the `:root` value.
	expect(resolveSeriesColor(resolverFor(host), "chart-1")).toBe("rgb(1 2 3)");
});

test("currentColor resolves to the root's computed color", () => {
	const host = mountHost();
	host.style.color = "rgb(9 8 7)";
	// The canvas parses `currentColor` as its own element's color, so a
	// resolver that hands the keyword through paints the wrong color.
	expect(resolverFor(host).resolve("currentColor")).toBe("rgb(9, 8, 7)");
});

test("a translucent color-mix() resolves to a color the canvas fills with its alpha", () => {
	const resolved = resolverFor(mountHost()).resolve(
		"color-mix(in oklab, oklch(0.145 0 0) 60%, transparent)",
	);
	const alpha = fillAlpha(resolved);
	expect(alpha).toBeGreaterThan(0);
	expect(alpha).toBeLessThan(255);
});

test("the texture ink's relative oklch() resolves with no probe", () => {
	const host = mountHost();
	const resolver = resolverFor(host);
	const ink = resolver.resolve(textureInkColor(resolveSeriesColor(resolver, "chart-1")));
	expect(canvasParses(parseContext(), ink)).toBe(true);
	expect(host.childElementCount).toBe(0);
});
