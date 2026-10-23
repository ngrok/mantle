import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { MantleStyleSheets, mantleStyleSheetUrls } from "./mantle-style-sheets.js";

/**
 * Parses server HTML into an inert `<template>` fragment.
 * Why a template: happy-dom fetches the stylesheet of every connected `<link>`,
 * and template content is never connected.
 */
function parseServerHtml(html: string): DocumentFragment {
	const template = document.createElement("template");
	template.innerHTML = html;
	return template.content;
}

describe("MantleStyleSheets", () => {
	test("renders one applied dark stylesheet and nothing else", () => {
		const fragment = parseServerHtml(
			renderToString(<MantleStyleSheets {...mantleStyleSheetUrls({ darkCssUrl: "/dark.css" })} />),
		);

		const links = fragment.querySelectorAll("link");
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAttribute("rel", "stylesheet");
		expect(links[0]).toHaveAttribute("href", "/dark.css");
		// Why no media gate: light pages need the dark sheet for `invert-theme` subtrees.
		expect(links[0]).not.toHaveAttribute("media");
		expect(fragment.querySelector("script")).toBeNull();
	});
});
