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
 * Regression proof for a forced page whose stored preference disagrees with it.
 *
 * `forceTheme` pins the class and `data-applied-theme` to the forced theme while
 * `data-theme` keeps the stored preference, so a theme switcher still works. Pair
 * loading then applies the partner stylesheet with `media="all"`. Those two facts
 * together used to hand the page to the preference: every theme block listed a
 * bare `[data-theme="…"]`, so `:root[data-theme="dark"]` matched a
 * `forceTheme="light"` page and the later sheet won the cascade at equal
 * specificity — a light-locked page painted fully dark, from the first byte.
 *
 * The guard is `[data-theme="…"]:not([data-applied-theme])`: the preference
 * selects a theme only when nothing has applied one. Only a computed style can
 * see this, so it has to run in a real browser — happy-dom resolves no cascade,
 * and asserting the class and the data attributes (which are correct either way)
 * is exactly what missed it.
 */

const THEMES = ["light", "dark", "light-high-contrast", "dark-high-contrast"] as const;
type Theme = (typeof THEMES)[number];

const OPPOSITE: Record<Theme, Theme> = {
	light: "dark",
	dark: "light",
	"light-high-contrast": "dark-high-contrast",
	"dark-high-contrast": "light-high-contrast",
};

function serializeRule(selector: string, declarations: Map<string, string>): string {
	const body = [...declarations].map(([property, value]) => `${property}: ${value};`).join("\n");
	return `${selector} {\n${body}\n}`;
}

function serializeThemeRules(css: string): string {
	return extractTopLevelRules(css)
		.filter(({ selector }) => selector.startsWith(":root"))
		.map(({ selector, body }) => serializeRule(selector, parseDeclarations(body)))
		.join("\n");
}

const mantleThemeBlock = parseDeclarationBlock(mantleCss, (selector) => selector === "@theme");
const tailwindDefaults = parseDeclarationBlock(twThemeCss, (selector) =>
	selector.includes("@theme default"),
);

/** The token that decides the surface, and so the whole ramp behind it. */
const PROBE_PROPERTY = "--color-neutral-50";

let styleElement: HTMLStyleElement;
let pageProbe: HTMLDivElement;
let islandProbe: HTMLDivElement;

beforeAll(() => {
	const rootColorVariables = new Map(
		[...tailwindDefaults, ...mantleThemeBlock].filter(([property]) =>
			property.startsWith("--color-"),
		),
	);
	// Every sheet applied at once — that is what pair loading produces, and the
	// bug needs the partner sheet live to appear at all.
	styleElement = document.createElement("style");
	styleElement.textContent = [
		serializeRule(":root", rootColorVariables),
		serializeThemeRules(mantleCss),
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
});

afterAll(() => {
	styleElement.remove();
	pageProbe.remove();
	islandProbe.parentElement?.remove();
	resetHtml();
});

function resetHtml() {
	const html = document.documentElement;
	html.removeAttribute("class");
	html.removeAttribute("data-theme");
	html.removeAttribute("data-applied-theme");
}

/** The exact `<html>` state the four forced writers produce. */
function applyForced({ forced, preference }: { forced: Theme; preference: Theme | "system" }) {
	resetHtml();
	const html = document.documentElement;
	html.setAttribute("class", forced);
	html.setAttribute("data-applied-theme", forced);
	html.setAttribute("data-theme", preference);
}

function read(element: Element): string {
	return getComputedStyle(element).getPropertyValue(PROBE_PROPERTY).trim();
}

/** What each theme computes to on a plain, unforced page. */
const expected = new Map<Theme, string>();

describe("forceTheme wins over a disagreeing stored preference", () => {
	beforeAll(() => {
		for (const theme of THEMES) {
			resetHtml();
			document.documentElement.setAttribute("class", theme);
			expected.set(theme, read(pageProbe));
		}
		resetHtml();
	});

	test("the four themes compute four distinct surfaces, so the assertions below can fail", () => {
		const values = THEMES.map((theme) => expected.get(theme));
		expect(values.every((value) => value != null && value !== "")).toBe(true);
		// light vs dark must differ, else a wrong-theme page would assert clean
		expect(expected.get("light")).not.toBe(expected.get("dark"));
		expect(expected.get("light-high-contrast")).not.toBe(expected.get("dark-high-contrast"));
	});

	// every forced theme against every preference that disagrees with it
	const cases = THEMES.flatMap((forced) =>
		([...THEMES, "system"] as const).map((preference) => ({ forced, preference })),
	);

	test.for(cases)(
		"forced $forced with a stored $preference preference paints $forced",
		({ forced, preference }) => {
			applyForced({ forced, preference });
			expect(read(pageProbe)).toBe(expected.get(forced));
		},
	);

	test.for(cases)(
		"an island on a forced $forced page with a stored $preference preference inverts",
		({ forced, preference }) => {
			applyForced({ forced, preference });
			expect(read(islandProbe)).toBe(expected.get(OPPOSITE[forced]));
		},
	);

	test("the stored preference still selects a theme when nothing has applied one", () => {
		// the unforced, no-provider path: `data-theme` alone must keep working, which
		// is what `:not([data-applied-theme])` is careful to preserve
		resetHtml();
		document.documentElement.setAttribute("data-theme", "dark");
		expect(read(pageProbe)).toBe(expected.get("dark"));
	});
});
