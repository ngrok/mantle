// @vitest-environment happy-dom
import { expect, test } from "vitest";
import { tocFromMatches } from "./page-layout";

const philosophyToc = [{ id: "philosophy", text: "Philosophy", level: 1 }];
const accessibilityToc = [{ id: "accessibility", text: "Accessibility", level: 1 }];

test("returns the toc from the deepest match that carries one", () => {
	const toc = tocFromMatches([
		{ handle: undefined },
		{ handle: { frontmatter: {}, toc: philosophyToc } },
		{ handle: { frontmatter: {}, toc: accessibilityToc } },
	]);

	expect(toc).toEqual(accessibilityToc);
});

test("skips deeper matches without a toc-shaped handle", () => {
	const toc = tocFromMatches([
		{ handle: { frontmatter: {}, toc: philosophyToc } },
		{ handle: { breadcrumb: "Endpoints" } },
		{ handle: undefined },
	]);

	expect(toc).toEqual(philosophyToc);
});

test("returns an empty toc when no match carries one", () => {
	expect(tocFromMatches([{ handle: undefined }, undefined])).toEqual([]);
	expect(tocFromMatches([])).toEqual([]);
});
