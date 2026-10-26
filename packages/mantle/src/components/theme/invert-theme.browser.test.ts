import twThemeCss from "tailwindcss/theme.css?raw";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
import {
	extractTopLevelRules,
	parseDeclarations,
	readResolvedTokens,
	themeTestCss,
} from "../../test-utils/parse-theme-css.js";

/**
 * End-to-end proof of the `invert-theme` contract in a real browser: for
 * every theme token, the value an element paints with inside an
 * `.invert-theme` subtree under theme T equals the value on a plain page
 * under T's pair partner, in both directions (light ⇄ dark).
 *
 * The values are read through a color probe, because a custom property keeps
 * `light-dark()` unresolved: its computed text is the same in both themes.
 */

const THEME_CLASSES = ["light", "dark"] as const;
type ThemeClass = (typeof THEME_CLASSES)[number];

const OPPOSITE: Record<ThemeClass, ThemeClass> = {
	light: "dark",
	dark: "light",
};

/**
 * Every custom property mantle declares at `:root`, plus the `@theme` colors:
 * the palette, the semantic tokens, the non-color theme values, and the Shiki
 * tokens. The `@theme` shadows read `--alpha()` with a `var()` alpha, which
 * only a Tailwind build compiles.
 */
const sweepProperties = [
	...new Set(
		extractTopLevelRules(mantleCss).flatMap(({ selector, body }) => {
			const properties = [...parseDeclarations(body).keys()];
			if (selector === "@theme") {
				return properties.filter((property) => property.startsWith("--color-"));
			}
			return selector.startsWith(":root") ? properties : [];
		}),
	),
].filter((property) => property.startsWith("--"));

let styleElement: HTMLStyleElement;
let pageProbe: HTMLDivElement;
let islandProbe: HTMLDivElement;
let nestedIslandProbe: HTMLDivElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = themeTestCss({ mantleCss, tailwindThemeCss: twThemeCss });
	document.head.appendChild(styleElement);

	pageProbe = document.createElement("div");
	document.body.appendChild(pageProbe);

	const island = document.createElement("div");
	island.className = "invert-theme";
	islandProbe = document.createElement("div");
	island.appendChild(islandProbe);
	document.body.appendChild(island);

	const outerIsland = document.createElement("div");
	outerIsland.className = "invert-theme";
	const innerIsland = document.createElement("div");
	innerIsland.className = "invert-theme";
	nestedIslandProbe = document.createElement("div");
	innerIsland.appendChild(nestedIslandProbe);
	outerIsland.appendChild(innerIsland);
	document.body.appendChild(outerIsland);
});

afterAll(() => {
	styleElement.remove();
	// pageProbe sits directly under <body> — remove the probe itself, never its parent
	pageProbe.remove();
	islandProbe.parentElement?.remove();
	nestedIslandProbe.parentElement?.parentElement?.remove();
	applyTheme(null);
});

function applyTheme(theme: ThemeClass | null) {
	document.documentElement.classList.remove(...THEME_CLASSES);
	if (theme != null) {
		document.documentElement.classList.add(theme);
	}
}

describe("invert-theme renders the opposite theme's resolved values", () => {
	// Snapshot the plain-page values for each theme once, then compare each
	// theme's island against its pair partner's page.
	const pageValues = new Map<ThemeClass, Map<string, string>>();

	beforeAll(() => {
		for (const theme of THEME_CLASSES) {
			applyTheme(theme);
			pageValues.set(theme, readResolvedTokens(pageProbe, sweepProperties));
		}
	});

	test("the sweep surface is non-degenerate (a parser regression must fail loudly, not pass vacuously)", () => {
		expect(sweepProperties.length).toBeGreaterThan(350);
	});

	test("the page probes resolve non-empty values for the whole sweep surface", () => {
		for (const theme of THEME_CLASSES) {
			const values = pageValues.get(theme);
			for (const property of sweepProperties) {
				expect(values?.get(property), `${property} under ${theme}`).not.toMatch(/^(raw:)?$/);
			}
		}
	});

	test("the two themes resolve different surfaces, so the comparisons below can fail", () => {
		const surfaces = ["--background-color-card", "--color-neutral-50", "--text-color-body"];
		const same = surfaces.filter(
			(property) =>
				pageValues.get("light")?.get(property) === pageValues.get("dark")?.get(property),
		);
		expect(same).toEqual([]);
	});

	for (const theme of THEME_CLASSES) {
		test(`under ${theme}, an island resolves exactly the ${OPPOSITE[theme]} page values`, () => {
			applyTheme(theme);
			const islandValues = readResolvedTokens(islandProbe, sweepProperties);
			const expected = pageValues.get(OPPOSITE[theme]);
			for (const [property, value] of islandValues) {
				expect(value, `${property} inside .invert-theme under ${theme}`).toBe(
					expected?.get(property),
				);
			}
		});
	}

	test("a bare :root (no theme class) is treated as light: the island resolves dark values", () => {
		applyTheme(null);
		const islandValues = readResolvedTokens(islandProbe, sweepProperties);
		const expected = pageValues.get("dark");
		for (const [property, value] of islandValues) {
			expect(value, `${property} inside .invert-theme with no page theme`).toBe(
				expected?.get(property),
			);
		}
	});

	test("nesting invert-theme is idempotent: the inner island stays inverted, it does not revert", () => {
		applyTheme("dark");
		const nestedValues = readResolvedTokens(nestedIslandProbe, sweepProperties);
		const expected = pageValues.get("light");
		for (const [property, value] of nestedValues) {
			expect(value, `${property} inside nested .invert-theme under dark`).toBe(
				expected?.get(property),
			);
		}
	});
});
