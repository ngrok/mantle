import twThemeCss from "tailwindcss/theme.css?raw";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
import { readResolvedTokens, themeTestCss } from "../../test-utils/parse-theme-css.js";

/**
 * Regression proof for a forced page whose stored preference disagrees with it.
 *
 * `forceTheme` pins the class and `data-applied-theme` to the forced theme while
 * `data-theme` keeps the stored preference, so a theme switcher still works. The
 * dark color-scheme rule is in the same stylesheet as the light one. Those two
 * facts together used to hand the page to the preference: every theme rule
 * listed a bare `[data-theme="…"]`, so `:root[data-theme="dark"]` matched a
 * `forceTheme="light"` page and the later rule won the cascade at equal
 * specificity — a light-locked page painted fully dark, from the first byte.
 *
 * The guard is `[data-theme="…"]:not([data-applied-theme])`: the preference
 * selects a theme only when nothing has applied one. Only a computed style can
 * see this, so it has to run in a real browser — happy-dom resolves no cascade,
 * and asserting the class and the data attributes (which are correct either way)
 * is exactly what missed it.
 */

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const OPPOSITE: Record<Theme, Theme> = {
	light: "dark",
	dark: "light",
};

/** The token that decides the surface, and so the whole ramp behind it. */
const PROBE_PROPERTY = "--color-neutral-50";

let styleElement: HTMLStyleElement;
let pageProbe: HTMLDivElement;
let islandProbe: HTMLDivElement;

beforeAll(() => {
	// One stylesheet holds both themes, as on every real page. The bug needs the
	// dark rule live to appear at all.
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

/** The exact `<html>` state the three forced writers produce. */
function applyForced({ forced, preference }: { forced: Theme; preference: Theme }) {
	resetHtml();
	const html = document.documentElement;
	html.setAttribute("class", forced);
	html.setAttribute("data-applied-theme", forced);
	html.setAttribute("data-theme", preference);
}

function read(element: HTMLElement): string {
	return readResolvedTokens(element, [PROBE_PROPERTY]).get(PROBE_PROPERTY) ?? "";
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

	test("light and dark surfaces differ, so the assertions below can fail", () => {
		const values = THEMES.map((theme) => expected.get(theme));
		expect(values.every((value) => value != null && value !== "")).toBe(true);
		// light vs dark must differ, else a wrong-theme page would assert clean
		expect(expected.get("light")).not.toBe(expected.get("dark"));
	});

	// every forced theme against every preference that disagrees with it
	const cases = THEMES.flatMap((forced) =>
		THEMES.filter((preference) => preference !== forced).map((preference) => ({
			forced,
			preference,
		})),
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
