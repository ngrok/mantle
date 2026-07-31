import twThemeCss from "tailwindcss/theme.css?raw";
import { describe, expect, test } from "vitest";
import darkHighContrastCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHighContrastCss from "../../mantle-light-high-contrast.css?raw";
import mantleCss from "../../mantle.css?raw";
import {
	extractTopLevelRules,
	parseDeclarationBlock,
	parseDeclarations,
} from "../../test-utils/parse-theme-css.js";

/**
 * Guard suite for the `invert-theme` strategy: an inverted island is styled
 * by the opposite theme's own declarations, applied via selector extensions
 * on the theme blocks plus the palette-alias re-resolution rule in mantle.css.
 * Each stylesheet encodes only its own theme's values — the light base
 * materializes its complete palette so islands on dark pages restore the
 * defaults from the light block itself. These tests keep the hand-written
 * pieces mechanically honest: if a theme block gains or loses a variable, or
 * Tailwind's palette changes, the corresponding invariant fails here instead
 * of silently breaking inverted islands. The browser sweep in
 * `invert-theme.browser.test.ts` proves the end-to-end computed behavior.
 */

/**
 * Light's own definitions, declared at `:root` and re-declared on islands.
 */
const lightPageBlock = parseDeclarationBlock(
	mantleCss,
	(selector) => selector.startsWith(":root,") && selector.includes(":root.light,"),
);
/**
 * Tailwind's unmodified default ramps, restated for islands only. Kept out of
 * the page-level block so they cannot override a consumer's `@theme` palette.
 */
const lightIslandBlock = parseDeclarationBlock(
	mantleCss,
	(selector) => selector.startsWith(":root:is(") && selector.endsWith(".invert-theme"),
);
/**
 * What an island on a dark page actually resolves: both rules match it, so the
 * completeness invariants below compare theme blocks against the union.
 */
const lightBlock = new Map([...lightIslandBlock, ...lightPageBlock]);
const darkBlock = parseDeclarationBlock(darkCss, (selector) => selector.includes(":root.dark"));
const lightHcBlock = parseDeclarationBlock(lightHighContrastCss, (selector) =>
	selector.includes(":root.light-high-contrast"),
);
const darkHcBlock = parseDeclarationBlock(darkHighContrastCss, (selector) =>
	selector.includes(":root.dark-high-contrast"),
);
const tailwindDefaults = parseDeclarationBlock(twThemeCss, (selector) =>
	selector.includes("@theme default"),
);
const mantleThemeBlock = parseDeclarationBlock(mantleCss, (selector) => selector === "@theme");

const invertThemeSelector = (selector: string) => selector.endsWith(".invert-theme");

describe("cardinality floors", () => {
	// Every other invariant in this suite is a set/equality comparison that a
	// parser regression could satisfy vacuously with empty maps. These floors
	// make degenerate parses fail loudly.
	test("the parsed blocks are non-degenerate", () => {
		expect(lightPageBlock.size).toBeGreaterThan(80);
		expect(lightIslandBlock.size).toBeGreaterThan(200);
		expect(lightBlock.size).toBeGreaterThan(250);
		expect(darkBlock.size).toBeGreaterThan(250);
		expect(lightHcBlock.size).toBeGreaterThan(240);
		expect(darkHcBlock.size).toBeGreaterThan(240);
		expect(tailwindDefaults.size).toBeGreaterThan(250);
		expect(mantleThemeBlock.size).toBeGreaterThan(60);
	});
});

/**
 * Normalize whitespace around parentheses so selector assertions survive
 * formatter reflows of long selector lists.
 */
const normalizeSelector = (selector: string | undefined) =>
	(selector ?? "").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");

describe("theme block selector extensions", () => {
	test("the light base block also targets .invert-theme on dark pages", () => {
		const rule = extractTopLevelRules(mantleCss).find(({ selector }) =>
			selector.startsWith(":root,"),
		);
		expect(normalizeSelector(rule?.selector)).toContain(
			':root:is(.dark, [data-theme="dark"]:not([data-applied-theme]), [data-applied-theme="dark"]) .invert-theme',
		);
	});

	test("the dark block also targets .invert-theme on light pages (no other theme active)", () => {
		const rule = extractTopLevelRules(darkCss).find(({ selector }) =>
			selector.includes(":root.dark"),
		);
		expect(rule?.selector).toContain(".invert-theme");
		// the guard must exclude every non-light theme so scopes stay mutually exclusive
		for (const theme of ["dark", "light-high-contrast", "dark-high-contrast"]) {
			expect(rule?.selector).toContain(`.${theme},`);
			expect(rule?.selector).toContain(`[data-theme="${theme}"]`);
			expect(rule?.selector).toContain(`[data-applied-theme="${theme}"]`);
		}
	});

	test("each high-contrast block also targets .invert-theme on its pair partner's pages", () => {
		const lightHcRule = extractTopLevelRules(lightHighContrastCss).find(({ selector }) =>
			selector.includes(":root.light-high-contrast"),
		);
		expect(normalizeSelector(lightHcRule?.selector)).toContain(
			':root:is(.dark-high-contrast, [data-theme="dark-high-contrast"]:not([data-applied-theme]), [data-applied-theme="dark-high-contrast"]) .invert-theme',
		);

		const darkHcRule = extractTopLevelRules(darkHighContrastCss).find(({ selector }) =>
			selector.includes(":root.dark-high-contrast"),
		);
		expect(normalizeSelector(darkHcRule?.selector)).toContain(
			':root:is(.light-high-contrast, [data-theme="light-high-contrast"]:not([data-applied-theme]), [data-applied-theme="light-high-contrast"]) .invert-theme',
		);
	});

	test("every data-theme selector is guarded against an applied theme", () => {
		// `data-theme` carries the stored *preference*, which `forceTheme` leaves
		// disagreeing with the theme actually applied. Pair loading then keeps the
		// partner stylesheet live, so a bare `[data-theme="dark"]` matches a
		// `forceTheme="light"` page and the later sheet wins the cascade — the page
		// paints dark. The guard is what makes the applied theme authoritative.
		// force-theme.browser.test.ts proves the computed outcome; this pins the
		// spelling in all four sheets so a new selector cannot reintroduce it.
		const sheets = {
			"mantle.css": mantleCss,
			"mantle-dark.css": darkCss,
			"mantle-light-high-contrast.css": lightHighContrastCss,
			"mantle-dark-high-contrast.css": darkHighContrastCss,
		};
		const unguarded: string[] = [];
		let guarded = 0;
		for (const [name, css] of Object.entries(sheets)) {
			for (const match of css.matchAll(
				/\[data-theme="[a-z-]+"\](:not\(\[data-applied-theme\]\))?/g,
			)) {
				if (match[1] == null) {
					unguarded.push(`${name}: ${match[0]}`);
				} else {
					guarded += 1;
				}
			}
		}
		expect(unguarded).toEqual([]);
		// a floor, so deleting the selectors entirely cannot pass this test
		expect(guarded).toBe(15);
	});
});

describe("theme block completeness", () => {
	// Every variable the light base declares must be declared by every theme
	// block. Because each block styles inverted islands on its pair partner's
	// pages, a missing variable would silently inherit the *page* theme's value
	// into the island (this is how the dark block came to declare the focus
	// ring and menu-item tokens, and light-high-contrast the checkbox glyphs).
	for (const [name, block] of [
		["dark", darkBlock],
		["light-high-contrast", lightHcBlock],
		["dark-high-contrast", darkHcBlock],
	] as const) {
		test(`the ${name} block declares every variable the light base declares`, () => {
			const missing = [...lightBlock.keys()].filter(
				(property) => !block.has(property) && !property.startsWith("--color-"),
			);
			expect(missing).toEqual([]);
		});
	}

	test("the light and dark blocks declare identical variable sets", () => {
		// each stylesheet encodes only its own theme's values, so the pair must
		// cover the same surface — a var one member declares and the other omits
		// would leak page-theme values into inverted islands
		expect([...lightBlock.keys()].toSorted()).toEqual([...darkBlock.keys()].toSorted());
	});

	test("no theme block declares a color the light base omits", () => {
		// The light base is what islands on every non-light page restore, so a ramp
		// or stop that only a *theme* block declares has no light counterpart: the
		// island would inherit the page theme's value for it through `:root`. The
		// light⇄dark equality below covers that pair; this covers the other two,
		// where the sets legitimately differ from light's.
		const lightColors = new Set(
			[...lightBlock.keys()].filter((property) => property.startsWith("--color-")),
		);
		const orphans = [darkBlock, lightHcBlock, darkHcBlock].flatMap((block) =>
			[...block.keys()].filter(
				(property) => property.startsWith("--color-") && !lightColors.has(property),
			),
		);
		expect([...new Set(orphans)]).toEqual([]);
	});

	test("each theme stylesheet holds nothing outside its theme-gated rule", () => {
		// Pair loading means a theme stylesheet is now applied (`media="all"`) on
		// its partner's pages, so any rule in these files that is NOT gated on a
		// `:root` theme match would leak globally — onto light pages, from the dark
		// sheet. Neither the browser sweep nor the rule-count check above can see
		// such a rule: the sweep re-serializes only `:root`-prefixed rules.
		for (const [name, css] of [
			["mantle-dark.css", darkCss],
			["mantle-light-high-contrast.css", lightHighContrastCss],
			["mantle-dark-high-contrast.css", darkHighContrastCss],
		] as const) {
			const rules = extractTopLevelRules(css);
			expect(rules.length, `${name} top-level rule count`).toBe(1);
			expect(rules[0]?.selector, `${name} selector`).toMatch(/^:root/);
		}
	});

	test("the high-contrast pair declares identical variable sets", () => {
		const lightHcKeys = [...lightHcBlock.keys()].toSorted();
		const darkHcKeys = [...darkHcBlock.keys()].toSorted();
		expect(lightHcKeys).toEqual(darkHcKeys);
	});

	test("light colors the high-contrast pair omits are omitted by both members", () => {
		// a ramp neither high-contrast theme overrides (slate/zinc/stone) falls
		// back to the light base at :root on both pages, so islands inherit the
		// correct value without re-declaration — but a ramp only ONE member
		// declares would leak page-theme values into the other's islands
		const lightColorKeys = [...lightBlock.keys()].filter((property) =>
			property.startsWith("--color-"),
		);
		const leaks = lightColorKeys.filter(
			(property) => lightHcBlock.has(property) !== darkHcBlock.has(property),
		);
		expect(leaks).toEqual([]);
	});

	test("the dark block's focus ring and menu tokens match the light base expressions", () => {
		const properties = [
			"--ring-color-focus-neutral",
			"--ring-color-focus-accent",
			"--ring-color-focus-danger",
			"--ring-color-focus-warning",
			"--ring-color-focus-success",
			"--color-active-menu-item",
			"--color-selected-menu-item",
			"--color-active-selected-menu-item",
		];
		const mismatches = properties.filter(
			(property) => darkBlock.get(property) !== lightBlock.get(property),
		);
		expect(mismatches).toEqual([]);
	});
});

describe("the materialized default palette (mantle.css light base)", () => {
	// Light materializes its complete palette so islands on dark pages restore it
	// from mantle.css itself — mantle-dark.css never encodes light values. The
	// verbatim Tailwind defaults live in the island-scoped restore rule and light's
	// own divergences in the page-level block; the union is what an island sees.
	// Custom stops that intentionally diverge are exempt from the verbatim check.
	const intentionalCustomStops = new Set(["--color-neutral-950", "--color-sky-600"]);

	test("the page-level light block restates no unmodified Tailwind default", () => {
		// This is the whole reason for the island-only scope: `@theme` variables are
		// emitted into `@layer theme` and unlayered author CSS beats every layer, so
		// a verbatim restatement at `:root` silently overrides a consumer's own
		// `@theme { --color-rose-500: … }` with mantle's stock value — for every ramp,
		// with no error anywhere.
		const restated = [...lightPageBlock]
			.filter(([property]) => property.startsWith("--color-"))
			.filter(([property, value]) => tailwindDefaults.get(property) === value)
			.map(([property]) => property);
		expect(restated).toEqual([]);
	});

	test("the palette restore covers exactly the islands the light block covers", () => {
		// Both rules must match the same islands. If the selectors drift, an island
		// gets one half of light's values and silently inherits the page theme's for
		// the other half.
		const pageRule = extractTopLevelRules(mantleCss).find(({ selector }) =>
			selector.startsWith(":root,"),
		);
		const restoreRule = extractTopLevelRules(mantleCss).find(
			({ selector }) => selector.startsWith(":root:is(") && selector.endsWith(".invert-theme"),
		);
		const restoreSelector = normalizeSelector(restoreRule?.selector);
		expect(restoreSelector).toBe(
			':root:is(.dark, [data-theme="dark"]:not([data-applied-theme]), [data-applied-theme="dark"]) .invert-theme',
		);
		expect(normalizeSelector(pageRule?.selector)).toContain(restoreSelector);
	});

	test("mantle-dark.css contains no light values (its only .invert-theme rule is the block extension)", () => {
		const invertRules = extractTopLevelRules(darkCss).filter(({ selector }) =>
			invertThemeSelector(selector),
		);
		expect(invertRules.length).toBe(1);
		expect(invertRules[0]?.selector).toContain(":root.dark");
	});

	test("every light color is a Tailwind default, a mantle @theme literal, an alias, or an intentional custom stop", () => {
		const mismatches = [...lightBlock]
			.filter(([property]) => property.startsWith("--color-"))
			.filter(([property, value]) => {
				if (intentionalCustomStops.has(property) || property.startsWith("--color-blue-")) {
					// the blue ramp and the custom stops are mantle's own light values
					return false;
				}
				if (value.includes("var(")) {
					// expressions over other theme vars (the gray aliases, --color-separator,
					// the menu-item tokens) re-resolve per element; covered by the browser sweep
					return false;
				}
				return value !== (mantleThemeBlock.get(property) ?? tailwindDefaults.get(property));
			})
			.map(([property]) => property);
		expect(mismatches).toEqual([]);
	});
});

describe("the palette-alias re-resolution rule (mantle.css)", () => {
	const aliasRule = extractTopLevelRules(mantleCss).find(
		({ selector }) => selector === ".invert-theme",
	);
	if (aliasRule == null) {
		throw new Error(".invert-theme alias rule not found in mantle.css");
	}
	const aliasDeclarations = parseDeclarations(aliasRule.body);

	test("matches the @theme palette aliases exactly", () => {
		const themeAliases = new Map(
			[...mantleThemeBlock].filter(
				([property, value]) => property.startsWith("--color-") && value.includes("var(--color-"),
			),
		);
		expect(aliasDeclarations.size).toBeGreaterThan(60);
		expect(Object.fromEntries(aliasDeclarations)).toEqual(Object.fromEntries(themeAliases));
	});
});

describe("the Shiki/code-block token rule (mantle.css)", () => {
	test("the Shiki tokens are declared on .invert-theme islands so they re-resolve against inverted ramps", () => {
		const shikiRule = extractTopLevelRules(mantleCss).find(
			({ selector }) => selector === ":root, .invert-theme",
		);
		expect(shikiRule).toBeDefined();
		const shikiDeclarations = parseDeclarations(shikiRule?.body ?? "");
		expect(
			[...shikiDeclarations.keys()].filter((key) => key.startsWith("--shiki-")).length,
		).toBeGreaterThan(10);
	});
});

describe("the @theme inline resolution premise", () => {
	// Inversion only works because utilities resolve semantic tokens at the
	// consuming element: every token the theme blocks re-declare must be
	// registered in @theme inline as a var() reference to a theme-declared
	// custom property (usually itself), never inlined as a literal value.
	test("every theme-block token registered in @theme inline is a var() reference to a theme-declared property", () => {
		const inlineBlock = parseDeclarationBlock(
			mantleCss,
			(selector) => selector === "@theme inline",
		);
		const themeDeclared = new Set([
			...lightBlock.keys(),
			...darkBlock.keys(),
			...lightHcBlock.keys(),
			...darkHcBlock.keys(),
		]);
		const covered = [...inlineBlock].filter(([property]) => themeDeclared.has(property));
		expect(covered.length).toBeGreaterThan(40);
		const offenders = covered
			.filter(([, value]) => {
				const target = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
				return target == null || !themeDeclared.has(target);
			})
			.map(([property]) => property);
		expect(offenders).toEqual([]);
	});
});
