import twThemeCss from "tailwindcss/theme.css?raw";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import darkHcCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHcCss from "../../mantle-light-high-contrast.css?raw";
import mantleCss from "../../mantle.css?raw";
import {
	extractTopLevelRules,
	parseDeclarationBlock,
	parseDeclarations,
} from "../../test-utils/parse-theme-css.js";

/**
 * End-to-end proof of the `invert-theme` contract in a real browser: for
 * every theme-controlled custom property, its computed value inside an
 * `.invert-theme` subtree under theme T equals its computed value on a plain
 * page under T's pair partner — in all four directions (light ⇄ dark,
 * light-high-contrast ⇄ dark-high-contrast).
 *
 * The real stylesheets are injected with two mechanical normalizations that
 * the consumer build pipeline performs (Tailwind's `--alpha()` compiled to
 * `color-mix()`, and Tailwind's default `@theme` palette emitted at `:root`),
 * so the assertions run against the shipped selectors and declarations.
 */

const THEME_CLASSES = ["light", "dark", "light-high-contrast", "dark-high-contrast"] as const;
type ThemeClass = (typeof THEME_CLASSES)[number];

const OPPOSITE: Record<ThemeClass, ThemeClass> = {
	light: "dark",
	dark: "light",
	"light-high-contrast": "dark-high-contrast",
	"dark-high-contrast": "light-high-contrast",
};

function serializeRule(selector: string, declarations: Map<string, string>): string {
	const body = [...declarations].map(([property, value]) => `${property}: ${value};`).join("\n");
	return `${selector} {\n${body}\n}`;
}

/**
 * Re-serialize a file's `:root`-selector rules (the theme blocks, including
 * their `.invert-theme` selector extensions) with normalized declarations.
 */
function serializeThemeRules(css: string): string {
	return extractTopLevelRules(css)
		.filter(({ selector }) => selector.startsWith(":root"))
		.map(({ selector, body }) => serializeRule(selector, parseDeclarations(body)))
		.join("\n");
}

const lightBlock = parseDeclarationBlock(
	mantleCss,
	(selector) => selector.startsWith(":root,") && selector.includes(":root.light,"),
);
const darkBlock = parseDeclarationBlock(darkCss, (selector) => selector.includes(":root.dark"));
const lightHcBlock = parseDeclarationBlock(lightHcCss, (selector) =>
	selector.includes(":root.light-high-contrast"),
);
const darkHcBlock = parseDeclarationBlock(darkHcCss, (selector) =>
	selector.includes(":root.dark-high-contrast"),
);
const mantleThemeBlock = parseDeclarationBlock(mantleCss, (selector) => selector === "@theme");
// the Shiki/code-block tokens are declared on `:root, .invert-theme` so their
// theme-dependent var() references re-resolve inside islands
const shikiBlock = parseDeclarationBlock(
	mantleCss,
	(selector) => selector === ":root, .invert-theme",
);
const tailwindDefaults = parseDeclarationBlock(twThemeCss, (selector) =>
	selector.includes("@theme default"),
);

/**
 * Every custom property any theme block declares, plus the palette aliases
 * and the Shiki/code-block tokens — the full inversion surface under test.
 */
const sweepProperties = [
	...new Set(
		[lightBlock, darkBlock, lightHcBlock, darkHcBlock, shikiBlock]
			.flatMap((block) => [...block.keys()])
			.concat([...mantleThemeBlock.keys()].filter((property) => property.startsWith("--color-"))),
	),
].filter((property) => property.startsWith("--"));

let styleElement: HTMLStyleElement;
let pageProbe: HTMLDivElement;
let islandProbe: HTMLDivElement;
let nestedIslandProbe: HTMLDivElement;

beforeAll(() => {
	// Tailwind emits its default palette and mantle's @theme colors at :root;
	// the consumer's build does this, so the test reproduces it.
	const rootColorVariables = new Map(
		[...tailwindDefaults, ...mantleThemeBlock].filter(([property]) =>
			property.startsWith("--color-"),
		),
	);
	styleElement = document.createElement("style");
	styleElement.textContent = [
		serializeRule(":root", rootColorVariables),
		// the light base block (with its dark-page island selector extension)
		serializeThemeRules(mantleCss),
		// the palette-alias re-resolution rule
		serializeRule(
			".invert-theme",
			parseDeclarations(
				extractTopLevelRules(mantleCss).find(({ selector }) => selector === ".invert-theme")
					?.body ?? "",
			),
		),
		serializeThemeRules(darkCss),
		serializeThemeRules(lightHcCss),
		serializeThemeRules(darkHcCss),
	].join("\n");
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

function readProperties(element: Element): Map<string, string> {
	const style = getComputedStyle(element);
	const values = new Map<string, string>();
	for (const property of sweepProperties) {
		values.set(property, style.getPropertyValue(property).trim());
	}
	values.set("color-scheme", style.colorScheme);
	return values;
}

describe("invert-theme renders the opposite theme's computed values", () => {
	// Snapshot the plain-page values for each theme once, then compare each
	// theme's island against its pair partner's page.
	const pageValues = new Map<ThemeClass, Map<string, string>>();

	beforeAll(() => {
		for (const theme of THEME_CLASSES) {
			applyTheme(theme);
			pageValues.set(theme, readProperties(pageProbe));
		}
	});

	test("the sweep surface is non-degenerate (a parser regression must fail loudly, not pass vacuously)", () => {
		expect(sweepProperties.length).toBeGreaterThan(350);
	});

	test("the page probes resolve non-empty values for the whole sweep surface", () => {
		for (const theme of THEME_CLASSES) {
			const values = pageValues.get(theme);
			for (const property of sweepProperties) {
				expect(values?.get(property), `${property} under ${theme}`).not.toBe("");
			}
		}
	});

	for (const theme of THEME_CLASSES) {
		test(`under ${theme}, an island computes exactly the ${OPPOSITE[theme]} page values`, () => {
			applyTheme(theme);
			const islandValues = readProperties(islandProbe);
			const expected = pageValues.get(OPPOSITE[theme]);
			for (const [property, value] of islandValues) {
				expect(value, `${property} inside .invert-theme under ${theme}`).toBe(
					expected?.get(property),
				);
			}
		});
	}

	test("a bare :root (no theme class) is treated as light: the island computes dark values", () => {
		applyTheme(null);
		const islandValues = readProperties(islandProbe);
		const expected = pageValues.get("dark");
		for (const [property, value] of islandValues) {
			expect(value, `${property} inside .invert-theme with no page theme`).toBe(
				expected?.get(property),
			);
		}
	});

	test("nesting invert-theme is idempotent: the inner island stays inverted, it does not revert", () => {
		applyTheme("dark");
		const nestedValues = readProperties(nestedIslandProbe);
		const expected = pageValues.get("light");
		for (const [property, value] of nestedValues) {
			expect(value, `${property} inside nested .invert-theme under dark`).toBe(
				expected?.get(property),
			);
		}
	});
});
