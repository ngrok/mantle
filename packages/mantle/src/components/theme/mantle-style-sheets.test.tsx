"use client";

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { MantleStyleSheets } from "./mantle-style-sheets.js";

const DARK_LINK_ID = "mantle-dark-styles";
const LIGHT_HC_LINK_ID = "mantle-light-high-contrast-styles";
const DARK_HC_LINK_ID = "mantle-dark-high-contrast-styles";

const MEDIA_DARK = "(prefers-color-scheme: dark)";
const MEDIA_LIGHT_HC = "(prefers-contrast: more) and (prefers-color-scheme: light)";
const MEDIA_DARK_HC = "(prefers-contrast: more) and (prefers-color-scheme: dark)";

const TEST_URLS = {
	darkCssUrl: "/dark.css",
	lightHighContrastCssUrl: "/light-hc.css",
	darkHighContrastCssUrl: "/dark-hc.css",
};

function getDarkLink(): HTMLLinkElement {
	const element = document.getElementById(DARK_LINK_ID);
	if (!(element instanceof HTMLLinkElement)) {
		throw new Error(`#${DARK_LINK_ID} link not found`);
	}
	return element;
}

function getLightHcLink(): HTMLLinkElement {
	const element = document.getElementById(LIGHT_HC_LINK_ID);
	if (!(element instanceof HTMLLinkElement)) {
		throw new Error(`#${LIGHT_HC_LINK_ID} link not found`);
	}
	return element;
}

function getDarkHcLink(): HTMLLinkElement {
	const element = document.getElementById(DARK_HC_LINK_ID);
	if (!(element instanceof HTMLLinkElement)) {
		throw new Error(`#${DARK_HC_LINK_ID} link not found`);
	}
	return element;
}

/**
 * Remove any applied-theme data attribute left over between tests so MutationObserver
 * and the inline script always start from a clean state.
 */
beforeEach(() => {
	delete document.documentElement.dataset.appliedTheme;
});

afterEach(() => {
	delete document.documentElement.dataset.appliedTheme;
});

describe("MantleStyleSheets — link element rendering", () => {
	test("renders three <link> elements with the expected stable IDs", () => {
		render(<MantleStyleSheets {...TEST_URLS} />);

		expect(document.getElementById(DARK_LINK_ID)).toBeInstanceOf(HTMLLinkElement);
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeInstanceOf(HTMLLinkElement);
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeInstanceOf(HTMLLinkElement);
	});

	test("all three <link> elements have rel=stylesheet", () => {
		render(<MantleStyleSheets {...TEST_URLS} />);

		expect(getDarkLink().rel).toBe("stylesheet");
		expect(getLightHcLink().rel).toBe("stylesheet");
		expect(getDarkHcLink().rel).toBe("stylesheet");
	});

	test("renders an inline fix <script> when no ssrCookie and no forceTheme", () => {
		const { container } = render(<MantleStyleSheets {...TEST_URLS} />);
		const scripts = container.querySelectorAll("script");
		expect(scripts.length).toBeGreaterThanOrEqual(1);
	});

	test("omits the inline fix <script> when ssrCookie provides a non-system theme", () => {
		const { container } = render(
			<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark" />,
		);
		expect(container.querySelectorAll("script").length).toBe(0);
	});

	test("omits the inline fix <script> when forceTheme is set", () => {
		const { container } = render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark" />);
		expect(container.querySelectorAll("script").length).toBe(0);
	});

	test("renders the inline fix <script> when ssrCookie has system theme", () => {
		const { container } = render(
			<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=system" />,
		);
		const scripts = container.querySelectorAll("script");
		expect(scripts.length).toBeGreaterThanOrEqual(1);
	});
});

describe("MantleStyleSheets — forceTheme omits unused link tags", () => {
	test('forceTheme="dark" renders only the dark link', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark" />);
		expect(document.getElementById(DARK_LINK_ID)).toBeInstanceOf(HTMLLinkElement);
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeNull();
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeNull();
	});

	test('forceTheme="light-high-contrast" renders only the light-HC link', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="light-high-contrast" />);
		expect(document.getElementById(DARK_LINK_ID)).toBeNull();
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeInstanceOf(HTMLLinkElement);
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeNull();
	});

	test('forceTheme="dark-high-contrast" renders only the dark-HC link', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark-high-contrast" />);
		expect(document.getElementById(DARK_LINK_ID)).toBeNull();
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeNull();
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeInstanceOf(HTMLLinkElement);
	});

	test('forceTheme="light" renders no link tags (light is the base theme, no dedicated stylesheet)', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="light" />);
		expect(document.getElementById(DARK_LINK_ID)).toBeNull();
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeNull();
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeNull();
	});
});

describe("MantleStyleSheets — default media attributes (no forceTheme, no ssrCookie)", () => {
	test("dark link uses OS dark media query", () => {
		render(<MantleStyleSheets {...TEST_URLS} />);
		expect(getDarkLink().media).toBe(MEDIA_DARK);
	});

	test("light-high-contrast link uses OS light+high-contrast media query", () => {
		render(<MantleStyleSheets {...TEST_URLS} />);
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
	});

	test("dark-high-contrast link uses OS dark+high-contrast media query", () => {
		render(<MantleStyleSheets {...TEST_URLS} />);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});
});

describe("MantleStyleSheets — forceTheme media attributes", () => {
	test('forceTheme="dark" sets dark link to media="all"', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark" />);
		expect(getDarkLink().media).toBe("all");
	});

	test('forceTheme="light-high-contrast" sets light-HC link to media="all"', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="light-high-contrast" />);
		expect(getLightHcLink().media).toBe("all");
	});

	test('forceTheme="dark-high-contrast" sets dark-HC link to media="all"', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark-high-contrast" />);
		expect(getDarkHcLink().media).toBe("all");
	});

	test('forceTheme="light" renders no link tags (light is the base theme, no dedicated stylesheet)', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="light" />);
		expect(document.getElementById(DARK_LINK_ID)).toBeNull();
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeNull();
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeNull();
	});
});

describe("MantleStyleSheets — ssrCookie prop", () => {
	/**
	 * In real SSR usage, `PreventWrongThemeFlashScript` always runs before React hydration
	 * and sets `html[data-applied-theme]` to match the stored theme. The ssrCookie prop is an
	 * optimisation that renders the correct `media` attribute in the SSR HTML so the correct
	 * stylesheet is active before JS runs. After hydration, the `useEffect` reads
	 * `data-applied-theme` (the source of truth on the client) and keeps the media in sync.
	 *
	 * These tests simulate that full flow by pre-setting `data-applied-theme` to match the
	 * cookie value, mirroring what `PreventWrongThemeFlashScript` would have written.
	 */

	test('ssrCookie with stored dark theme renders dark link as media="all"', async () => {
		// Simulate PreventWrongThemeFlashScript having run
		document.documentElement.dataset.appliedTheme = "dark";
		render(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark" />);

		await waitFor(() => {
			expect(getDarkLink().media).toBe("all");
		});
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test('ssrCookie with stored light-high-contrast theme renders light-HC link as media="all"', async () => {
		document.documentElement.dataset.appliedTheme = "light-high-contrast";
		render(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=light-high-contrast" />);

		await waitFor(() => {
			expect(getLightHcLink().media).toBe("all");
		});
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test('ssrCookie with stored dark-high-contrast theme renders dark-HC link as media="all"', async () => {
		document.documentElement.dataset.appliedTheme = "dark-high-contrast";
		render(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark-high-contrast" />);

		await waitFor(() => {
			expect(getDarkHcLink().media).toBe("all");
		});
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
	});

	test("ssrCookie with stored light theme uses OS media queries for all links", async () => {
		document.documentElement.dataset.appliedTheme = "light";
		render(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=light" />);

		await waitFor(() => {
			// The useEffect should have run; light theme → all links keep OS media queries
			expect(getDarkLink().media).toBe(MEDIA_DARK);
		});
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test("ssrCookie with stored system theme falls back to OS media queries", () => {
		// system theme is resolved at runtime via OS media queries; no data-applied-theme pre-set
		render(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=system" />);
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test("ssrCookie with no theme cookie falls back to OS media queries", () => {
		render(<MantleStyleSheets {...TEST_URLS} ssrCookie="session=abc123; other=value" />);
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test("forceTheme takes precedence over ssrCookie", async () => {
		document.documentElement.dataset.appliedTheme = "dark";
		render(
			<MantleStyleSheets
				{...TEST_URLS}
				ssrCookie="mantle-ui-theme=light-high-contrast"
				forceTheme="dark"
			/>,
		);

		await waitFor(() => {
			expect(getDarkLink().media).toBe("all");
		});
	});
});

describe("MantleStyleSheets — MutationObserver: runtime theme changes", () => {
	test('setting html[data-applied-theme="dark"] updates dark link to media="all"', async () => {
		render(<MantleStyleSheets {...TEST_URLS} />);

		expect(getDarkLink().media).toBe(MEDIA_DARK);

		document.documentElement.dataset.appliedTheme = "dark";

		await waitFor(() => {
			expect(getDarkLink().media).toBe("all");
		});
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test('setting html[data-applied-theme="light-high-contrast"] updates light-HC link to media="all"', async () => {
		render(<MantleStyleSheets {...TEST_URLS} />);

		document.documentElement.dataset.appliedTheme = "light-high-contrast";

		await waitFor(() => {
			expect(getLightHcLink().media).toBe("all");
		});
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test('setting html[data-applied-theme="dark-high-contrast"] updates dark-HC link to media="all"', async () => {
		render(<MantleStyleSheets {...TEST_URLS} />);

		document.documentElement.dataset.appliedTheme = "dark-high-contrast";

		await waitFor(() => {
			expect(getDarkHcLink().media).toBe("all");
		});
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
	});

	test('setting html[data-applied-theme="light"] restores all links to OS media queries', async () => {
		// Start with dark applied
		document.documentElement.dataset.appliedTheme = "dark";
		render(<MantleStyleSheets {...TEST_URLS} />);

		await waitFor(() => {
			expect(getDarkLink().media).toBe("all");
		});

		// Switch back to light
		document.documentElement.dataset.appliedTheme = "light";

		await waitFor(() => {
			expect(getDarkLink().media).toBe(MEDIA_DARK);
		});
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test("switching from dark to light-high-contrast updates media attributes correctly", async () => {
		document.documentElement.dataset.appliedTheme = "dark";
		render(<MantleStyleSheets {...TEST_URLS} />);

		await waitFor(() => {
			expect(getDarkLink().media).toBe("all");
		});

		document.documentElement.dataset.appliedTheme = "light-high-contrast";

		await waitFor(() => {
			expect(getLightHcLink().media).toBe("all");
		});
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test("forceTheme overrides MutationObserver — applied-theme change does not affect media", async () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark" />);

		expect(getDarkLink().media).toBe("all");

		// Simulate OS user also having dark; applied-theme changes shouldn't flip dark off
		document.documentElement.dataset.appliedTheme = "light";

		// The observer runs but forceTheme="dark" keeps dark at "all"
		await waitFor(() => {
			expect(getDarkLink().media).toBe("all");
		});
	});
});
