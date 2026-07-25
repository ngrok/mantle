import { render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { MantleStyleSheets, fixMediaScriptContent } from "./mantle-style-sheets.js";

// Spelling pins: these ids and media strings are restated by `fixMediaAttributes` (the
// function stringified into the inline script) independently of the component's own
// copies, so the tests hold both spellings to the same values.
const DARK_LINK_ID = "mantle-dark-styles";
const LIGHT_HC_LINK_ID = "mantle-light-high-contrast-styles";
const DARK_HC_LINK_ID = "mantle-dark-high-contrast-styles";

const MEDIA_DARK = "(prefers-color-scheme: dark)";
const MEDIA_LIGHT_HC = "(prefers-contrast: more) and (prefers-color-scheme: light)";
const MEDIA_DARK_HC = "(prefers-contrast: more) and (prefers-color-scheme: dark)";

/**
 * Distinguishable per-theme URLs so a link wired to the wrong prop is visible.
 * `data:` URLs keep happy-dom's stylesheet loader from trying to fetch them.
 */
const TEST_URLS = {
	darkCssUrl: "data:text/css,#mantle-test-dark{}",
	lightHighContrastCssUrl: "data:text/css,#mantle-test-light-high-contrast{}",
	darkHighContrastCssUrl: "data:text/css,#mantle-test-dark-high-contrast{}",
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
 * Parse the markup an SSR host sends to the browser. No effect and no MutationObserver
 * runs, so this observes the render path — all a user sees before hydration — rather
 * than the client-side correction of it.
 */
function renderServerMarkup(element: ReactElement): DocumentFragment {
	const template = document.createElement("template");
	template.innerHTML = renderToString(element);
	return template.content;
}

/**
 * The `media` attribute each `<link>` is shipped with in the SSR HTML, keyed by theme.
 * `undefined` means the component omitted that link entirely.
 */
function serverMediaValues(element: ReactElement) {
	const markup = renderServerMarkup(element);
	const mediaFor = (id: string) =>
		markup.querySelector(`#${id}`)?.getAttribute("media") ?? undefined;

	return {
		dark: mediaFor(DARK_LINK_ID),
		lightHighContrast: mediaFor(LIGHT_HC_LINK_ID),
		darkHighContrast: mediaFor(DARK_HC_LINK_ID),
	};
}

const serverMarkupHosts: HTMLElement[] = [];

/**
 * Adopt the component's SSR markup into the live document without React mounting it,
 * mirroring the non-React hosts `fixMediaScriptContent` is exported for. Nothing else
 * can then correct the `media` attributes, so the inline script's own work is observable.
 */
function mountServerMarkup(element: ReactElement) {
	const host = document.createElement("div");
	host.append(renderServerMarkup(element));
	document.head.append(host);
	serverMarkupHosts.push(host);
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

	for (const host of serverMarkupHosts.splice(0)) {
		host.remove();
	}
});

describe("MantleStyleSheets — link element rendering", () => {
	test("renders one <link> per lazy theme stylesheet, each wired to its own URL", () => {
		render(<MantleStyleSheets {...TEST_URLS} />);

		expect(getDarkLink().getAttribute("href")).toBe(TEST_URLS.darkCssUrl);
		expect(getLightHcLink().getAttribute("href")).toBe(TEST_URLS.lightHighContrastCssUrl);
		expect(getDarkHcLink().getAttribute("href")).toBe(TEST_URLS.darkHighContrastCssUrl);
	});

	test("all three <link> elements have rel=stylesheet", () => {
		render(<MantleStyleSheets {...TEST_URLS} />);

		expect(getDarkLink().rel).toBe("stylesheet");
		expect(getLightHcLink().rel).toBe("stylesheet");
		expect(getDarkHcLink().rel).toBe("stylesheet");
	});

	test("renders exactly one inline fix <script> when no ssrCookie and no forceTheme", () => {
		const { container } = render(<MantleStyleSheets {...TEST_URLS} />);

		const scripts = container.querySelectorAll("script");
		expect(scripts).toHaveLength(1);
		// The inlined script must be the one the public generator produces, with forceTheme
		// threaded through — an empty or half-built string is a silent no-op in production.
		expect(scripts[0]?.textContent).toBe(fixMediaScriptContent(undefined));
	});

	test("omits the inline fix <script> when ssrCookie provides a non-system theme", () => {
		const { container } = render(
			<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark" />,
		);
		expect(container.querySelectorAll("script")).toHaveLength(0);
	});

	test("omits the inline fix <script> when forceTheme is set", () => {
		const { container } = render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark" />);
		expect(container.querySelectorAll("script")).toHaveLength(0);
	});

	test("renders the inline fix <script> when ssrCookie has system theme", () => {
		const { container } = render(
			<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=system" />,
		);
		expect(container.querySelectorAll("script")).toHaveLength(1);
	});
});

describe("MantleStyleSheets — forceTheme omits unused link tags", () => {
	test('forceTheme="dark" renders only the dark link', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark" />);
		expect(getDarkLink().getAttribute("href")).toBe(TEST_URLS.darkCssUrl);
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeNull();
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeNull();
	});

	test('forceTheme="light-high-contrast" renders only the light-HC link', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="light-high-contrast" />);
		expect(document.getElementById(DARK_LINK_ID)).toBeNull();
		expect(getLightHcLink().getAttribute("href")).toBe(TEST_URLS.lightHighContrastCssUrl);
		expect(document.getElementById(DARK_HC_LINK_ID)).toBeNull();
	});

	test('forceTheme="dark-high-contrast" renders only the dark-HC link', () => {
		render(<MantleStyleSheets {...TEST_URLS} forceTheme="dark-high-contrast" />);
		expect(document.getElementById(DARK_LINK_ID)).toBeNull();
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeNull();
		expect(getDarkHcLink().getAttribute("href")).toBe(TEST_URLS.darkHighContrastCssUrl);
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
});

describe("MantleStyleSheets — server-rendered markup", () => {
	/**
	 * `ssrCookie` exists so the SSR HTML itself carries the right `media` values: when it
	 * resolves to a non-system theme the inline fix script is dropped, so nothing corrects
	 * that markup until React hydrates. These assertions therefore run against
	 * `renderToString` output, where no effect can mask a broken render path. Each case
	 * pre-sets a *conflicting* `html[data-applied-theme]` to prove the resolution comes
	 * from the cookie rather than from the DOM.
	 */
	test('ssrCookie with a stored dark theme ships the dark link as media="all"', () => {
		document.documentElement.dataset.appliedTheme = "light";

		expect(
			serverMediaValues(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark" />),
		).toEqual({
			dark: "all",
			lightHighContrast: MEDIA_LIGHT_HC,
			darkHighContrast: MEDIA_DARK_HC,
		});
	});

	test('ssrCookie with a stored light-high-contrast theme ships the light-HC link as media="all"', () => {
		document.documentElement.dataset.appliedTheme = "dark";

		expect(
			serverMediaValues(
				<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=light-high-contrast" />,
			),
		).toEqual({
			dark: MEDIA_DARK,
			lightHighContrast: "all",
			darkHighContrast: MEDIA_DARK_HC,
		});
	});

	test('ssrCookie with a stored dark-high-contrast theme ships the dark-HC link as media="all"', () => {
		document.documentElement.dataset.appliedTheme = "light";

		expect(
			serverMediaValues(
				<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark-high-contrast" />,
			),
		).toEqual({
			dark: MEDIA_DARK,
			lightHighContrast: MEDIA_LIGHT_HC,
			darkHighContrast: "all",
		});
	});

	test("ssrCookie with a stored light theme ships OS media queries (light needs no stylesheet)", () => {
		expect(
			serverMediaValues(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=light" />),
		).toEqual({
			dark: MEDIA_DARK,
			lightHighContrast: MEDIA_LIGHT_HC,
			darkHighContrast: MEDIA_DARK_HC,
		});
	});

	test("ssrCookie with a stored system theme ships OS media queries", () => {
		expect(
			serverMediaValues(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=system" />),
		).toEqual({
			dark: MEDIA_DARK,
			lightHighContrast: MEDIA_LIGHT_HC,
			darkHighContrast: MEDIA_DARK_HC,
		});
	});

	test("ssrCookie without a theme cookie ships OS media queries", () => {
		expect(
			serverMediaValues(
				<MantleStyleSheets {...TEST_URLS} ssrCookie="session=abc123; other=value" />,
			),
		).toEqual({
			dark: MEDIA_DARK,
			lightHighContrast: MEDIA_LIGHT_HC,
			darkHighContrast: MEDIA_DARK_HC,
		});
	});

	test("forceTheme takes precedence over ssrCookie", () => {
		expect(
			serverMediaValues(
				<MantleStyleSheets
					{...TEST_URLS}
					ssrCookie="mantle-ui-theme=light-high-contrast"
					forceTheme="dark"
				/>,
			),
		).toEqual({
			dark: "all",
			lightHighContrast: undefined,
			darkHighContrast: undefined,
		});
	});

	test("forwards the CSP nonce to the inline fix <script>", () => {
		const markup = renderServerMarkup(<MantleStyleSheets {...TEST_URLS} nonce="test-nonce" />);

		const script = markup.querySelector("script");
		expect(script?.getAttribute("nonce")).toBe("test-nonce");
		expect(script?.textContent).toBe(fixMediaScriptContent(undefined));
	});
});

describe("MantleStyleSheets — mount effect", () => {
	test("corrects the SSR media values when the applied theme diverges from ssrCookie", async () => {
		// PreventWrongThemeFlashScript writes the real applied theme before hydration. If the
		// user switched themes after the cookie was issued, the DOM wins over `ssrCookie`.
		document.documentElement.dataset.appliedTheme = "light-high-contrast";

		render(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark" />);

		await waitFor(() => {
			expect(getLightHcLink().media).toBe("all");
		});
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test("forceTheme wins over both ssrCookie and the applied theme", async () => {
		document.documentElement.dataset.appliedTheme = "light-high-contrast";

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
		expect(document.getElementById(LIGHT_HC_LINK_ID)).toBeNull();
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

describe("fixMediaScriptContent — inline script for non-React hosts", () => {
	test("flips the applied theme's stylesheet to media=all and leaves the others on their OS query", () => {
		mountServerMarkup(<MantleStyleSheets {...TEST_URLS} />);
		document.documentElement.dataset.appliedTheme = "dark-high-contrast";

		new Function(fixMediaScriptContent())();

		expect(getDarkHcLink().media).toBe("all");
		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
	});

	test("restores OS media queries when the applied theme is light", () => {
		mountServerMarkup(<MantleStyleSheets {...TEST_URLS} />);
		// Pretend a previous run left every stylesheet render-blocking.
		getDarkLink().media = "all";
		getLightHcLink().media = "all";
		getDarkHcLink().media = "all";
		document.documentElement.dataset.appliedTheme = "light";

		new Function(fixMediaScriptContent())();

		expect(getDarkLink().media).toBe(MEDIA_DARK);
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});

	test("a forceTheme argument overrides html[data-applied-theme]", () => {
		mountServerMarkup(<MantleStyleSheets {...TEST_URLS} />);
		document.documentElement.dataset.appliedTheme = "light";

		new Function(fixMediaScriptContent("dark"))();

		expect(getDarkLink().media).toBe("all");
		expect(getLightHcLink().media).toBe(MEDIA_LIGHT_HC);
		expect(getDarkHcLink().media).toBe(MEDIA_DARK_HC);
	});
});
