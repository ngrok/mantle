import { describe, expect, it } from "vitest";

import { brokenLinks, extractLinks, headingAnchors } from "./check-doc-links.ts";

/** A `readFile` over an in-memory tree. A path with no entry does not exist; `""` stands for a directory. */
function treeReader(tree: Record<string, string>) {
	return (file: string) => tree[file] ?? null;
}

describe("extractLinks", () => {
	it("reads inline links, images, angle-bracket targets, and reference definitions", () => {
		const markdown = '[a](./a.md) ![b](b.png)\n[c](<./c d.md> "title")\n\n[ref]: ./ref.md';

		expect(extractLinks(markdown)).toEqual([
			{ target: "./a.md", line: 1 },
			{ target: "b.png", line: 1 },
			{ target: "./c d.md", line: 2 },
			{ target: "./ref.md", line: 4 },
		]);
	});

	it("skips links in code blocks and inline code", () => {
		const markdown = "````md\n[a](./a.md)\n```\n[b](./b.md)\n````\n`[c](./c.md)` [d](./d.md)";

		expect(extractLinks(markdown)).toEqual([{ target: "./d.md", line: 6 }]);
	});
});

it("headingAnchors slugs headings as GitHub does, inline code and repeats included", () => {
	const markdown =
		"# Read Me\n## Read me\n### 3.2. `data-slot` on every part\n## Amendment, 2026-08-04: `display: contents`";

	expect([...headingAnchors(markdown)]).toEqual([
		"read-me",
		"read-me-1",
		"32-data-slot-on-every-part",
		"amendment-2026-08-04-display-contents",
	]);
});

describe("brokenLinks", () => {
	it("passes a link to a file, a directory, a heading, and a URL", () => {
		const readFile = treeReader({
			"docs/guide.md":
				"[spec](../SPEC.md#scope) [dir](./principles) [self](#usage) [site](/components/button) [web](https://ngrok.com)\n## Usage",
			"SPEC.md": "## Scope",
			"docs/principles": "",
		});

		expect(brokenLinks({ file: "docs/guide.md", readFile })).toEqual([]);
	});

	it("reports a missing file and an anchor that no heading writes", () => {
		const readFile = treeReader({
			"AGENTS.md": "[gone](./GONE.md)\n[stale](./SPEC.md#old-name)",
			"SPEC.md": "## New name",
		});

		expect(brokenLinks({ file: "AGENTS.md", readFile })).toEqual([
			"AGENTS.md:1: ./GONE.md does not exist",
			"AGENTS.md:2: ./SPEC.md#old-name names no heading in SPEC.md",
		]);
	});
});
