import { afterEach, describe, expect, test, vi } from "vitest";
import type { ColorParseContext, ComputedColorSource } from "./colors.js";
import {
	canvasParses,
	chartTokenVariable,
	createColorResolver,
	isChartColorToken,
	observeThemeChanges,
	pickLightDark,
	resolveSeriesColor,
} from "./colors.js";

/**
 * A `fillStyle` that accepts a hex color and the listed strings and keeps its
 * previous value on anything else, the way a real canvas drops a color it
 * cannot parse.
 */
const createParseContext = (accepted: readonly string[]): ColorParseContext => {
	let fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
	return {
		get fillStyle() {
			return fillStyle;
		},
		set fillStyle(value) {
			if (typeof value !== "string" || /^#[0-9a-f]{6}$/i.test(value) || accepted.includes(value)) {
				fillStyle = value;
			}
		},
	};
};

/** The computed-style reads the resolver makes, with no cascade behind them. */
const createComputed = (
	source: {
		properties?: Record<string, string>;
		color?: string;
		colorScheme?: string;
		fontFamily?: string;
	} = {},
): ComputedColorSource => ({
	getPropertyValue: (name) => source.properties?.[name] ?? "",
	color: source.color ?? "rgb(0, 0, 0)",
	colorScheme: source.colorScheme ?? "light",
	fontFamily: source.fontFamily ?? "monospace",
});

/**
 * The color a chart root passes down. happy-dom computes no cascade beyond
 * inline styles and inheritance, so a read that returns this color can only
 * have come from a probe inside the host.
 */
const HOST_COLOR = "rgb(5, 5, 5)";

const mountHost = (): HTMLElement => {
	const host = document.createElement("div");
	host.style.color = HOST_COLOR;
	document.body.append(host);
	return host;
};

afterEach(() => {
	document.body.replaceChildren();
});

describe("createColorResolver", () => {
	test("a chart token resolves from the root's computed custom property with no probe", () => {
		const host = mountHost();
		const resolver = createColorResolver(host, {
			computed: createComputed({ properties: { "--color-chart-1": "#3e6ff4" } }),
			parseContext: createParseContext([]),
		});
		expect(resolveSeriesColor(resolver, "chart-1")).toBe("#3e6ff4");
		// A resolver that probes first appends a span and reads the inherited color.
		expect(host.childElementCount).toBe(0);
	});

	test("one pass reads a custom property once for every series that paints it", () => {
		const computed = createComputed({ properties: { "--color-chart-1": "#3e6ff4" } });
		const reads = vi.spyOn(computed, "getPropertyValue");
		const resolver = createColorResolver(mountHost(), {
			computed,
			parseContext: createParseContext([]),
		});
		resolveSeriesColor(resolver, "chart-1");
		resolveSeriesColor(resolver, "chart-1");
		expect(reads).toHaveBeenCalledTimes(1);
	});

	test("a color the canvas rejects resolves through one hidden probe", () => {
		const host = mountHost();
		const resolver = createColorResolver(host, {
			computed: createComputed(),
			parseContext: createParseContext([]),
		});
		// happy-dom rejects `oklch()` inline, so the probe computes the color it
		// inherits from the host. A resolver that hands the string through
		// returns the input instead.
		expect(resolver.resolve("oklch(0.62 0.2 259)")).toBe(HOST_COLOR);
		expect(host.childElementCount).toBe(1);
		const probe = host.querySelector("span");
		expect(probe).toHaveAttribute("aria-hidden", "true");
		expect(probe).not.toBeVisible();
	});

	test("two colors the canvas rejects share the probe", () => {
		const host = mountHost();
		const resolver = createColorResolver(host, {
			computed: createComputed(),
			parseContext: createParseContext([]),
		});
		resolver.resolve("oklch(0.62 0.2 259)");
		resolver.resolve("oklch(0.47 0.1 160)");
		expect(host.querySelectorAll("span")).toHaveLength(1);
	});

	test("with no parse context an empty custom property still resolves through the probe", () => {
		const host = mountHost();
		const resolver = createColorResolver(host, { computed: createComputed(), parseContext: null });
		// The probe inherits the host's color for a `var()` with no value. A
		// resolver that treats "" as a color returns "".
		expect(resolver.resolve("var(--color-chart-9)")).toBe(HOST_COLOR);
		expect(host.childElementCount).toBe(1);
	});

	test("currentColor resolves from the root's computed color", () => {
		const host = mountHost();
		const resolver = createColorResolver(host, {
			computed: createComputed({ color: "rgb(9, 8, 7)" }),
			parseContext: createParseContext(["rgb(9, 8, 7)"]),
		});
		// A resolver that reads `getPropertyValue("currentcolor")` gets "" and
		// probes, and one that compares case-sensitively probes too.
		expect(resolver.resolve("currentColor")).toBe("rgb(9, 8, 7)");
		expect(host.childElementCount).toBe(0);
	});

	test("a light-dark() token resolves to the root's color-scheme argument with no probe", () => {
		const host = mountHost();
		const properties = { "--color-chart-1": "light-dark(#2d81fe, #5492fa)" };
		const light = createColorResolver(host, {
			computed: createComputed({ properties, colorScheme: "light" }),
			parseContext: createParseContext([]),
		});
		const dark = createColorResolver(host, {
			computed: createComputed({ properties, colorScheme: "dark" }),
			parseContext: createParseContext([]),
		});
		expect(resolveSeriesColor(light, "chart-1")).toBe("#2d81fe");
		expect(resolveSeriesColor(dark, "chart-1")).toBe("#5492fa");
		expect(host.childElementCount).toBe(0);
	});

	test("a light-dark() token under a scheme the browser picks resolves through the probe", () => {
		const host = mountHost();
		const resolver = createColorResolver(host, {
			computed: createComputed({
				properties: { "--color-chart-1": "light-dark(#2d81fe, #5492fa)" },
				colorScheme: "light dark",
			}),
			parseContext: createParseContext([]),
		});
		// A resolver that guesses an argument returns one of the two hex colors.
		expect(resolveSeriesColor(resolver, "chart-1")).toBe(HOST_COLOR);
		expect(host.childElementCount).toBe(1);
	});

	test("an empty computed font family falls back to sans-serif", () => {
		const resolver = createColorResolver(mountHost(), {
			computed: createComputed({ fontFamily: "" }),
			parseContext: null,
		});
		expect(resolver.fontFamily).toBe("sans-serif");
	});
});

describe("pickLightDark", () => {
	test("picks the argument for the scheme", () => {
		const value = "light-dark(oklch(1 0 0), oklch(0 0 0))";
		expect(pickLightDark(value, "light")).toBe("oklch(1 0 0)");
		expect(pickLightDark(value, "dark")).toBe("oklch(0 0 0)");
	});

	test("picks inside other functions and inside a picked argument", () => {
		const value =
			"color-mix(in oklab, light-dark(light-dark(#111111, #222222), #333333) 50%, light-dark(#444444, #555555))";
		expect(pickLightDark(value, "light")).toBe("color-mix(in oklab, #111111 50%, #444444)");
		expect(pickLightDark(value, "dark")).toBe("color-mix(in oklab, #333333 50%, #555555)");
	});

	test("a comma inside an argument does not split it", () => {
		expect(pickLightDark("light-dark(rgb(1, 2, 3), rgb(4, 5, 6))", "dark")).toBe("rgb(4, 5, 6)");
	});

	test("a value with no light-dark() or a malformed one stays as it is", () => {
		expect(pickLightDark("#3e6ff4", "dark")).toBe("#3e6ff4");
		expect(pickLightDark("light-dark(#3e6ff4)", "dark")).toBe("light-dark(#3e6ff4)");
		expect(pickLightDark("light-dark(#3e6ff4, #000000", "dark")).toBe(
			"light-dark(#3e6ff4, #000000",
		);
	});
});

describe("canvasParses", () => {
	test("a color equal to the first sentinel is checked against the second", () => {
		// `#010203` is the first sentinel. A check with one sentinel reads it
		// back unchanged and reports a parse failure.
		expect(canvasParses(createParseContext([]), "#010203")).toBe(true);
	});

	test("a color the canvas drops leaves the sentinel in place", () => {
		expect(canvasParses(createParseContext([]), "var(--color-chart-1)")).toBe(false);
	});
});

describe("observeThemeChanges", () => {
	const root = document.documentElement;

	afterEach(() => {
		root.removeAttribute("class");
		root.removeAttribute("data-applied-theme");
		root.removeAttribute("data-theme");
	});

	/**
	 * Resolves once the next attribute mutation on `element` reaches an observer
	 * registered after the theme watch, so the watch has seen it too.
	 */
	const nextMutationDelivered = (element: Element): Promise<void> =>
		new Promise((resolve) => {
			const observer = new MutationObserver(() => {
				observer.disconnect();
				resolve();
			});
			observer.observe(element, { attributes: true });
		});

	test("a rewrite that keeps the signature notifies nobody; a change notifies every listener once", async () => {
		const first = vi.fn<() => void>();
		const second = vi.fn<() => void>();
		const stopFirst = observeThemeChanges(root, first);
		const stopSecond = observeThemeChanges(root, second);

		// An absent attribute and an empty one sign the same.
		let delivered = nextMutationDelivered(root);
		root.setAttribute("data-theme", "");
		await delivered;
		expect(first).toHaveBeenCalledTimes(0);
		expect(second).toHaveBeenCalledTimes(0);

		delivered = nextMutationDelivered(root);
		root.setAttribute("data-theme", "dark");
		await delivered;
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);

		stopFirst();
		stopSecond();
	});

	// The other two attributes the ThemeProvider writes; `data-theme` is above.
	test.each(["class", "data-applied-theme"])("a change to %s notifies", async (attribute) => {
		const listener = vi.fn<() => void>();
		const stop = observeThemeChanges(root, listener);
		const delivered = nextMutationDelivered(root);
		root.setAttribute(attribute, "dark");
		await delivered;
		expect(listener).toHaveBeenCalledTimes(1);
		stop();
	});

	test("listeners share one observer, which disconnects with the last of them", () => {
		const observe = vi.spyOn(MutationObserver.prototype, "observe");
		const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
		const stopFirst = observeThemeChanges(root, () => {});
		const stopSecond = observeThemeChanges(root, () => {});
		expect(observe).toHaveBeenCalledTimes(1);
		stopFirst();
		expect(disconnect).toHaveBeenCalledTimes(0);
		stopSecond();
		expect(disconnect).toHaveBeenCalledTimes(1);
		// The watch is gone, so the next listener observes anew.
		const stopThird = observeThemeChanges(root, () => {});
		expect(observe).toHaveBeenCalledTimes(2);
		stopThird();
	});
});

describe("isChartColorToken", () => {
	test("accepts the chart token vocabulary", () => {
		expect(isChartColorToken("chart-1")).toBe(true);
		expect(isChartColorToken("chart-8")).toBe(true);
		expect(isChartColorToken("chart-other")).toBe(true);
	});

	test("rejects out-of-vocabulary strings", () => {
		expect(isChartColorToken("chart-9")).toBe(false);
		expect(isChartColorToken("#ff0000")).toBe(false);
		expect(isChartColorToken("chart-1 ")).toBe(false);
	});
});

test("chartTokenVariable maps a token to its CSS custom property", () => {
	expect(chartTokenVariable("chart-3")).toBe("--color-chart-3");
});
