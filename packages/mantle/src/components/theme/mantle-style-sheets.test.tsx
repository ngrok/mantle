import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { fixMediaScriptContent, MantleStyleSheets } from "./mantle-style-sheets.js";

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

/**
 * Parses server HTML into an inert `<template>` fragment. Nothing mounts, so the
 * mount effect cannot overwrite the `media` values the render path computed. The
 * post-mount assertions in the browser test can never observe those values.
 * Why a template: happy-dom fetches the stylesheet of every connected `<link>`,
 * and template content is never connected.
 */
function parseServerHtml(html: string): DocumentFragment {
	const template = document.createElement("template");
	template.innerHTML = html;
	return template.content;
}

function linkOf(fragment: DocumentFragment, id: string): Element | null {
	return fragment.querySelector(`link#${id}`);
}

function mediaOf(fragment: DocumentFragment, id: string): string | null {
	const link = linkOf(fragment, id);
	return link == null ? null : link.getAttribute("media");
}

describe("MantleStyleSheets server render", () => {
	test("wires each link to its own stylesheet URL", () => {
		const fragment = parseServerHtml(renderToString(<MantleStyleSheets {...TEST_URLS} />));

		expect(linkOf(fragment, DARK_LINK_ID)).toHaveAttribute("href", TEST_URLS.darkCssUrl);
		expect(linkOf(fragment, LIGHT_HC_LINK_ID)).toHaveAttribute(
			"href",
			TEST_URLS.lightHighContrastCssUrl,
		);
		expect(linkOf(fragment, DARK_HC_LINK_ID)).toHaveAttribute(
			"href",
			TEST_URLS.darkHighContrastCssUrl,
		);
	});

	test("ssrCookie=dark applies the dark sheet and omits the fix script", () => {
		const fragment = parseServerHtml(
			renderToString(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=dark" />),
		);

		expect(mediaOf(fragment, DARK_LINK_ID)).toBe("all");
		expect(mediaOf(fragment, LIGHT_HC_LINK_ID)).toBe(MEDIA_LIGHT_HC);
		expect(mediaOf(fragment, DARK_HC_LINK_ID)).toBe(MEDIA_DARK_HC);
		expect(fragment.querySelector("script")).toBeNull();
	});

	test("ssrCookie=light-high-contrast applies the high-contrast pair", () => {
		const fragment = parseServerHtml(
			renderToString(
				<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=light-high-contrast" />,
			),
		);

		expect(mediaOf(fragment, DARK_LINK_ID)).toBe(MEDIA_DARK);
		expect(mediaOf(fragment, LIGHT_HC_LINK_ID)).toBe("all");
		expect(mediaOf(fragment, DARK_HC_LINK_ID)).toBe("all");
		expect(fragment.querySelector("script")).toBeNull();
	});

	test("ssrCookie=system keeps the OS media queries and renders the fix script", () => {
		const fragment = parseServerHtml(
			renderToString(<MantleStyleSheets {...TEST_URLS} ssrCookie="mantle-ui-theme=system" />),
		);

		expect(mediaOf(fragment, DARK_LINK_ID)).toBe(MEDIA_DARK);
		expect(mediaOf(fragment, LIGHT_HC_LINK_ID)).toBe(MEDIA_LIGHT_HC);
		expect(mediaOf(fragment, DARK_HC_LINK_ID)).toBe(MEDIA_DARK_HC);
		expect(fragment.querySelector("script")).not.toBeNull();
	});

	test("without ssrCookie, the fix script carries the CSP nonce and the links keep the OS media queries", () => {
		const html = renderToString(<MantleStyleSheets {...TEST_URLS} nonce="n1" />);
		const fragment = parseServerHtml(html);

		expect(html).toContain('<script nonce="n1">');
		// Why the generator: an empty or half-built inline script is a silent no-op in production.
		expect(fragment.querySelector("script")?.textContent).toBe(fixMediaScriptContent());
		expect(mediaOf(fragment, DARK_LINK_ID)).toBe(MEDIA_DARK);
		expect(mediaOf(fragment, LIGHT_HC_LINK_ID)).toBe(MEDIA_LIGHT_HC);
		expect(mediaOf(fragment, DARK_HC_LINK_ID)).toBe(MEDIA_DARK_HC);
	});

	test("forceTheme=light-high-contrast renders only the high-contrast pair, applied", () => {
		const fragment = parseServerHtml(
			renderToString(<MantleStyleSheets {...TEST_URLS} forceTheme="light-high-contrast" />),
		);

		expect(linkOf(fragment, DARK_LINK_ID)).toBeNull();
		expect(mediaOf(fragment, LIGHT_HC_LINK_ID)).toBe("all");
		expect(mediaOf(fragment, DARK_HC_LINK_ID)).toBe("all");
		expect(fragment.querySelector("script")).toBeNull();
	});

	test("forceTheme wins over a conflicting ssrCookie", () => {
		const fragment = parseServerHtml(
			renderToString(
				<MantleStyleSheets
					{...TEST_URLS}
					forceTheme="dark"
					ssrCookie="mantle-ui-theme=light-high-contrast"
				/>,
			),
		);

		expect(mediaOf(fragment, DARK_LINK_ID)).toBe("all");
		expect(linkOf(fragment, LIGHT_HC_LINK_ID)).toBeNull();
		expect(linkOf(fragment, DARK_HC_LINK_ID)).toBeNull();
	});
});
