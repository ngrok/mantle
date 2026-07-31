import { describe, expect, test } from "vitest";
import {
	aliasOf,
	collectDeclarations,
	contrastRatio,
	deltaE,
	hexFromOklch,
	layer,
	lowChromaSlots,
	lowContrastSlots,
	offBandSlots,
	oklchOf,
	parseOklch,
	resolveProperty,
	simulateCvd,
	worstCvdPair,
	worstNormalPair,
} from "./palette-gates.js";

/**
 * Known-answer tests for the math `tokens.test.ts` runs the palette through.
 *
 * Without these the whole palette suite can pass because a conversion is wrong
 * in a direction that happens to inflate every distance. Every anchor below is
 * externally sourced — a hex Tailwind publishes for its own ramp step, a ratio
 * WCAG documents, or a pair whose collapse under deuteranopia is the textbook
 * example — so none of them is this module's arithmetic agreeing with itself.
 */

describe("hexFromOklch", () => {
	// Tailwind publishes these hexes for the same ramp steps it authors in
	// oklch(), so a matching output pins the whole OKLCH -> sRGB path.
	test.each([
		["oklch(52.7% 0.154 150.069)", "#008236", "green-700"],
		["oklch(65.6% 0.241 354.308)", "#f6339a", "pink-500"],
		["oklch(57.7% 0.245 27.325)", "#e7000b", "red-600"],
		["oklch(60.6% 0.25 292.717)", "#8e51ff", "violet-500"],
	])("%s is %s (Tailwind's published %s)", (literal, hex) => {
		expect(hexFromOklch(literal)).toBe(hex);
	});

	test("an achromatic step written with a `none` hue still resolves", () => {
		// Tailwind writes `oklch(55.6% 0 none)` for neutral-500. Treating `none` as
		// a parse failure would drop the overflow slot out of every gate.
		expect(hexFromOklch("oklch(55.6% 0 none)")).toBe("#737373");
	});

	test("a lightness written without a percent sign is read as a fraction", () => {
		expect(hexFromOklch("oklch(1 0 0)")).toBe("#ffffff");
	});

	test.each([
		["oklch(52.7%, 0.154, 150)", "comma syntax"],
		["#008236", "a hex literal"],
		["color-mix(in oklab, red, blue)", "a color function"],
		["", "an empty value"],
	])("throws on %s (%s)", (literal) => {
		expect(() => hexFromOklch(literal)).toThrow(/unparseable oklch/);
	});
});

describe("parseOklch", () => {
	test("percent and fractional lightness agree", () => {
		expect(parseOklch("oklch(52.7% 0.154 150.069)")).toEqual([0.527, 0.154, 150.069]);
		expect(parseOklch("oklch(0.527 0.154 150.069)")).toEqual([0.527, 0.154, 150.069]);
	});
});

describe("contrastRatio", () => {
	test("white against black is the 21:1 maximum", () => {
		expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 4);
	});

	test("WCAG's documented 4.5:1 boundary gray reproduces", () => {
		expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.5422, 3);
	});

	test("the ratio does not depend on argument order", () => {
		expect(contrastRatio("#3e6ff4", "#ffffff")).toBeCloseTo(
			contrastRatio("#ffffff", "#3e6ff4"),
			10,
		);
	});
});

describe("oklchOf", () => {
	test("a neutral gray has zero chroma", () => {
		const { chroma } = oklchOf("#737373");
		expect(chroma).toBeCloseTo(0, 4);
	});

	test("lightness round-trips through the hex quantization", () => {
		// oklch() in, hex out, OKLCH back: 8-bit rounding is the only loss.
		expect(oklchOf(hexFromOklch("oklch(52.7% 0.154 150.069)")).lightness).toBeCloseTo(0.527, 2);
	});
});

describe("simulateCvd", () => {
	test("pure red under protanopia loses its red channel to a dark yellow", () => {
		// The matrices must be applied in LINEAR sRGB. Run them on gamma-encoded
		// channels and the same input lands on #271d00 instead — a different
		// question, answered with the same numbers.
		const simulated = simulateCvd("#ff0000", "protan");
		const asHex = simulated
			.map((channel) => {
				const gamma = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
				return Math.round(gamma * 255)
					.toString(16)
					.padStart(2, "0");
			})
			.join("");
		expect(`#${asHex}`).toBe("#6d5f00");
	});

	test("a gray is unchanged by every simulation", () => {
		for (const kind of ["protan", "deutan", "tritan"] as const) {
			const [red, green, blue] = simulateCvd("#737373", kind);
			expect(red).toBeCloseTo(green, 2);
			expect(green).toBeCloseTo(blue, 2);
		}
	});
});

describe("deltaE", () => {
	test("red against green collapses under deuteranopia", () => {
		// The textbook pair: obvious to a full-color reader, nearly one color to a
		// deuteranope. A transposed matrix row breaks this ordering.
		expect(deltaE("#ff0000", "#00ff00")).toBeCloseTo(51.98, 1);
		expect(deltaE("#ff0000", "#00ff00", "deutan")).toBeCloseTo(22.22, 1);
	});

	test("a color against itself is zero under every model", () => {
		expect(deltaE("#3e6ff4", "#3e6ff4")).toBeCloseTo(0, 10);
		expect(deltaE("#3e6ff4", "#3e6ff4", "protan")).toBeCloseTo(0, 10);
	});
});

describe("the gates", () => {
	test("offBandSlots reports the slot number and its lightness", () => {
		// #ffffff is L 1.0, well above the light ceiling of 0.77.
		expect(offBandSlots(["#3e6ff4", "#ffffff"], "light")).toEqual([
			{ slot: 2, hex: "#ffffff", lightness: expect.closeTo(1, 2) },
		]);
	});

	test("the dark band is narrower than the light band", () => {
		// L 0.716 clears the light ceiling and misses the dark one.
		const bright = hexFromOklch("oklch(71.6% 0.15 250)");
		expect(offBandSlots([bright], "light")).toEqual([]);
		expect(offBandSlots([bright], "dark")).toHaveLength(1);
	});

	test("lowChromaSlots catches a hue that reads as gray", () => {
		expect(lowChromaSlots(["#3e6ff4", "#737373"]).map(({ slot }) => slot)).toEqual([2]);
	});

	test("lowContrastSlots measures against the surface it is given", () => {
		// The same mark passes on white and fails on a mid gray.
		expect(lowContrastSlots(["#8e51ff"], "#ffffff")).toEqual([]);
		expect(lowContrastSlots(["#8e51ff"], "#767676")).toHaveLength(1);
	});

	test("worstCvdPair picks the closest pair and names the deficiency", () => {
		const worst = worstCvdPair(["#009689", "#e7000b"], "adjacent");
		expect(worst.deltaE).toBeCloseTo(14.11, 1);
		expect(worst.kind).toBe("deutan");
		expect([worst.first.slot, worst.second.slot]).toEqual([1, 2]);
	});

	test("worstNormalPair reports unsimulated distance", () => {
		expect(worstNormalPair(["#e7000b", "#f6339a"], "adjacent").deltaE).toBeCloseTo(15.84, 1);
	});

	test("all-pairs is a strictly harder test than adjacent", () => {
		// Slots 1 and 3 never touch on a stack, so adjacent scope cannot see them.
		const palette = ["#3e6ff4", "#f54900", "#4a6bf0"];
		expect(worstNormalPair(palette, "adjacent").deltaE).toBeGreaterThan(
			worstNormalPair(palette, "all").deltaE,
		);
		expect([
			worstNormalPair(palette, "all").first.slot,
			worstNormalPair(palette, "all").second.slot,
		]).toEqual([1, 3]);
	});
});

describe("collectDeclarations", () => {
	test("the last declaration of a name wins", () => {
		const declarations = collectDeclarations(":root { --a: red; } :root { --a: blue; }");
		expect(declarations.get("--a")).toBe("blue");
	});

	test("a custom property named inside a comment declares nothing", () => {
		// Regression: a theme file documents a property in prose. Left in, the
		// comment invents a declaration AND swallows the real one below it, because
		// the value match runs to the first semicolon.
		const declarations = collectDeclarations(
			":root {\n/* sets --fake: black; for the fade */\n--real: var(--other);\n}",
		);
		expect(declarations.has("--fake")).toBe(false);
		expect(declarations.get("--real")).toBe("var(--other)");
	});

	test("a multi-line value is collected whole", () => {
		const declarations = collectDeclarations("--mix: color-mix(in oklab,\n red,\n blue);");
		expect(declarations.get("--mix")).toBe("color-mix(in oklab, red, blue)");
	});
});

describe("resolveProperty", () => {
	const chain = [
		layer("theme.css", ":root { --color-chart-1: var(--color-blue-500); }"),
		layer(
			"base.css",
			":root { --color-blue-500: oklch(58.4% 0.2069 265.3); --loop: var(--loop); }",
		),
	];

	test("follows an alias chain and reports the file the literal came from", () => {
		expect(resolveProperty(chain, "--color-chart-1")).toEqual({
			name: "--color-blue-500",
			literal: "oklch(58.4% 0.2069 265.3)",
			source: "base.css",
		});
	});

	test("an earlier layer outranks a later one", () => {
		const overridden = [layer("theme.css", "--color-blue-500: oklch(1 0 0);"), ...chain];
		expect(resolveProperty(overridden, "--color-chart-1").source).toBe("theme.css");
	});

	test("throws on a missing property rather than falling back", () => {
		expect(() => resolveProperty(chain, "--color-chart-9")).toThrow(/unresolved custom property/);
	});

	test("throws on a resolution cycle rather than hanging", () => {
		expect(() => resolveProperty(chain, "--loop")).toThrow(/cycle resolving/);
	});

	test("throws on a var() carrying a fallback", () => {
		const withFallback = [layer("a.css", "--x: var(--missing, red);")];
		expect(() => resolveProperty(withFallback, "--x")).toThrow(
			/neither a plain alias nor a literal/,
		);
	});
});

describe("aliasOf", () => {
	test("reports the single alias step and the declaring file", () => {
		const chain = [layer("theme.css", "--color-chart-1: var(--color-blue-500);")];
		expect(aliasOf(chain, "--color-chart-1")).toEqual({
			alias: "--color-blue-500",
			declaredIn: "theme.css",
		});
	});

	test("throws when a slot is written as a literal instead of an alias", () => {
		const chain = [layer("theme.css", "--color-chart-1: oklch(58.4% 0.2069 265.3);")];
		expect(() => aliasOf(chain, "--color-chart-1")).toThrow(/not a single var\(\) alias/);
	});
});
