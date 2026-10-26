import twThemeCss from "tailwindcss/theme.css?raw";
import { describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
import {
	extractTopLevelRules,
	parseDeclarationBlock,
	parseDeclarations,
} from "../../test-utils/parse-theme-css.js";

/**
 * Guard suite for the theme strategy: every color token is one `light-dark()`
 * declaration, and two `color-scheme` rules select the theme for the page and
 * for `.invert-theme` islands. These tests keep the pieces honest: a palette
 * stop that loses its pair, a theme value an island cannot re-declare, or a
 * Tailwind palette change fails here instead of a page silently painting the
 * wrong theme. The browser sweep in `invert-theme.browser.test.ts` proves the
 * end-to-end resolved values.
 */

const mantleThemeBlock = parseDeclarationBlock(mantleCss, (selector) => selector === "@theme");
const tailwindDefaults = parseDeclarationBlock(twThemeCss, (selector) =>
	selector.includes("@theme default"),
);
const lightSchemeRule = extractTopLevelRules(mantleCss).find(({ selector }) =>
	selector.startsWith(":root, :root.light,"),
);
const darkSchemeRule = extractTopLevelRules(mantleCss).find(({ selector }) =>
	selector.startsWith(":root.dark,"),
);
if (lightSchemeRule == null || darkSchemeRule == null) {
	throw new Error("the color-scheme rules are not in mantle.css");
}
const lightScheme = parseDeclarations(lightSchemeRule.body);
const darkScheme = parseDeclarations(darkSchemeRule.body);
const semanticBlock = parseDeclarationBlock(mantleCss, (selector) => selector === ":root");

const stops = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const RAMP_STOP = /^--color-([a-z]+)-(50|[1-9]00|950)$/;

/** The two arguments of a `light-dark()` value, or `undefined`. */
const lightDarkArguments = (value: string) => {
	const match = /^light-dark\(\s*(oklch\([^()]*\)),\s*(oklch\([^()]*\))\s*\)$/.exec(value);
	return match?.[1] == null || match[2] == null ? undefined : { light: match[1], dark: match[2] };
};

/** `none` and `0` are the same hue for an achromatic color. */
const sameColor = (first: string | undefined, second: string | undefined) =>
	first?.replace(/ none\)$/, " 0)") === second?.replace(/ none\)$/, " 0)");

/**
 * Normalize whitespace around parentheses so selector assertions survive
 * formatter reflows of long selector lists.
 */
const normalizeSelector = (selector: string) =>
	selector.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");

describe("cardinality floors", () => {
	// Every other invariant in this suite is a set/equality comparison that a
	// parser regression could satisfy vacuously with empty maps. These floors
	// make degenerate parses fail loudly.
	test("the parsed blocks are non-degenerate", () => {
		expect(mantleThemeBlock.size).toBeGreaterThan(300);
		expect(tailwindDefaults.size).toBeGreaterThan(250);
		expect(semanticBlock.size).toBeGreaterThan(60);
		expect(lightScheme.size).toBeGreaterThan(3);
	});
});

describe("the color-scheme rules", () => {
	test("the light rule also targets .invert-theme on dark pages", () => {
		expect(normalizeSelector(lightSchemeRule.selector)).toContain(
			':root:is(.dark, [data-theme="dark"]:not([data-applied-theme]), [data-applied-theme="dark"]) .invert-theme',
		);
		expect(lightScheme.get("color-scheme")).toBe("light");
	});

	test("the dark rule also targets .invert-theme on light pages (any page that is not dark)", () => {
		expect(normalizeSelector(darkSchemeRule.selector)).toContain(
			':root:not(.dark, [data-theme="dark"]:not([data-applied-theme]), [data-applied-theme="dark"]) .invert-theme',
		);
		expect(darkScheme.get("color-scheme")).toBe("dark");
	});

	test("both rules declare the same properties", () => {
		// An island takes its non-color theme values from one of these rules. A
		// property one rule declares and the other omits would leak the page
		// theme's value into the island.
		expect([...lightScheme.keys()].toSorted()).toEqual([...darkScheme.keys()].toSorted());
	});

	test("the rules declare no color: colors are light-dark() tokens", () => {
		const colors = [...lightScheme.keys()].filter((property) => property.startsWith("--color-"));
		expect(colors).toEqual([]);
	});

	test("no other rule targets .invert-theme", () => {
		// An island is the color-scheme flip and nothing else. A rule that copies
		// tokens onto islands would bring back a second source for each value.
		const others = extractTopLevelRules(mantleCss)
			.map(({ selector }) => selector)
			.filter((selector) => selector.includes(".invert-theme"))
			.filter(
				(selector) => selector !== lightSchemeRule.selector && selector !== darkSchemeRule.selector,
			);
		expect(others).toEqual([]);
	});

	test("every data-theme selector is guarded against an applied theme", () => {
		// `data-theme` carries the stored *preference*, which `forceTheme` leaves
		// disagreeing with the theme actually applied. Both rules are in one
		// stylesheet, so a bare `[data-theme="dark"]` matches a
		// `forceTheme="light"` page and the later rule wins the cascade — the page
		// paints dark. The guard is what makes the applied theme authoritative.
		// force-theme.browser.test.ts proves the computed outcome; this pins the
		// spelling so a new selector cannot reintroduce it.
		const unguarded: string[] = [];
		let guarded = 0;
		for (const match of mantleCss.matchAll(
			/\[data-theme="[a-z-]+"\](:not\(\[data-applied-theme\]\))?/g,
		)) {
			if (match[1] == null) {
				unguarded.push(match[0]);
			} else {
				guarded += 1;
			}
		}
		expect(unguarded).toEqual([]);
		// a floor, so deleting the selectors entirely cannot pass this test
		expect(guarded).toBeGreaterThan(0);
	});
});

describe("the light-dark() palette (mantle.css @theme)", () => {
	const palette = [...mantleThemeBlock].filter(([property]) => RAMP_STOP.test(property));

	test("every Tailwind default ramp stop has a mantle light-dark() pair or a var() alias", () => {
		// A stop mantle does not declare falls through to Tailwind's light value,
		// and a dark page paints it light. Four newer Tailwind ramps have no dark
		// values yet. A ramp a later Tailwind adds fails here, so someone
		// decides its dark values.
		const notInverted = new Set(["mauve", "mist", "olive", "taupe"]);
		const missing = [...tailwindDefaults.keys()]
			.filter((property) => !notInverted.has(RAMP_STOP.exec(property)?.[1] ?? ""))
			.filter((property) => RAMP_STOP.test(property))
			.filter((property) => {
				const value = mantleThemeBlock.get(property);
				return value == null || (lightDarkArguments(value) == null && !value.startsWith("var("));
			});
		expect(missing).toEqual([]);
	});

	test("every light argument is the Tailwind default, the blue ramp, or an intentional custom stop", () => {
		const intentionalCustomStops = new Set(["--color-neutral-950", "--color-sky-600"]);
		const mismatches = palette
			.filter(([property]) => !intentionalCustomStops.has(property))
			.filter(([property]) => !property.startsWith("--color-blue-"))
			.filter(([, value]) => !value.startsWith("var("))
			.filter(
				([property, value]) =>
					!sameColor(lightDarkArguments(value)?.light, tailwindDefaults.get(property)),
			)
			.map(([property]) => property);
		expect(mismatches).toEqual([]);
	});

	test("every dark argument is the light argument of the mirror stop", () => {
		// The dark ramps are the light ramps in reverse: dark 50 is light 950,
		// and so on. `sky-400` keeps Tailwind's stock `sky-600` in dark, not
		// mantle's custom light `sky-600`.
		const exceptions = new Map([["--color-sky-400", "oklch(58.8% 0.158 241.966)"]]);
		const mismatches = palette
			.filter(([, value]) => !value.startsWith("var("))
			.filter(([property, value]) => {
				const [, ramp, stop] = RAMP_STOP.exec(property) ?? [];
				const mirror = `--color-${ramp}-${stops[stops.length - 1 - stops.indexOf(stop ?? "")]}`;
				const expected =
					exceptions.get(property) ?? lightDarkArguments(mantleThemeBlock.get(mirror) ?? "")?.light;
				return !sameColor(lightDarkArguments(value)?.dark, expected);
			})
			.map(([property]) => property);
		expect(mismatches).toEqual([]);
	});
});

describe("the @theme inline resolution premise", () => {
	// Utilities resolve semantic tokens at the consuming element: every
	// semantic token registered in @theme inline must be a var() reference to a
	// property the semantic block declares (usually itself), never an inlined
	// value. An inlined value would carry no light-dark() to resolve.
	test("every semantic token registered in @theme inline is a var() reference to a declared property", () => {
		const inlineBlock = parseDeclarationBlock(
			mantleCss,
			(selector) => selector === "@theme inline",
		);
		const covered = [...inlineBlock].filter(([property]) => semanticBlock.has(property));
		expect(covered.length).toBeGreaterThan(40);
		const offenders = covered
			.filter(([, value]) => {
				const target = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
				return target == null || !semanticBlock.has(target);
			})
			.map(([property]) => property);
		expect(offenders).toEqual([]);
	});
});
