import { describe, expect, it } from "vitest";

import { prodReadyComponentRouteLookup } from "~/components/navigation-data";
import { legacyPreviewRedirectFor, legacyRedirectFor } from "./legacy-redirects";

describe("legacyRedirectFor", () => {
	it("redirects legacy component paths to their categorized homes", () => {
		expect(legacyRedirectFor("/components/button")).toBe("/components/actions/button");
		expect(legacyRedirectFor("/components/alert-dialog")).toBe("/components/overlays/alert-dialog");
		expect(legacyRedirectFor("/components/theme")).toBe("/components/primitives/theme");
		expect(legacyRedirectFor("/components/data-table")).toBe("/components/data-display/data-table");
	});

	// The derivation destructures exactly four segments out of each route, so an
	// entry of any other shape silently loses its legacy URL. Driving the whole
	// lookup makes that visible the day someone adds a 3- or 5-segment entry.
	it("covers every categorized component, including multi-segment leaves", () => {
		const routes = Object.values(prodReadyComponentRouteLookup);
		expect(routes.length).toBeGreaterThan(0);

		for (const route of routes) {
			const segments = route.split("/");
			expect(segments).toHaveLength(4);
			expect(legacyRedirectFor(`/components/${segments[3]}`)).toBe(route);
			expect(legacyRedirectFor(`/components/${segments[3]}.md`)).toBe(`${route}.md`);
		}
	});

	it("redirects Chip's preview URL to the Forms category", () => {
		expect(legacyRedirectFor("/components/preview/chip")).toBe("/components/forms/chip");
		expect(legacyRedirectFor("/components/preview/chip.md")).toBe("/components/forms/chip.md");
	});

	it("redirects Panel's preview URL to the Structure category", () => {
		expect(legacyRedirectFor("/components/preview/panel")).toBe("/components/structure/panel");
		expect(legacyRedirectFor("/components/preview/panel.md")).toBe(
			"/components/structure/panel.md",
		);
	});

	it("redirects the AI chat parts' preview URLs to the AI category", () => {
		expect(legacyRedirectFor("/components/preview/prompt-input")).toBe(
			"/components/ai/prompt-input",
		);
		expect(legacyRedirectFor("/components/preview/tool-call.md")).toBe(
			"/components/ai/tool-call.md",
		);
		expect(legacyRedirectFor("/components/preview/calendar")).toBeNull();
	});

	it("preserves the .md suffix so raw-markdown URLs keep serving markdown", () => {
		expect(legacyRedirectFor("/components/button.md")).toBe("/components/actions/button.md");
		expect(legacyRedirectFor("/blocks/sheet-async.md")).toBe("/recipes/overlay-async.md");
	});

	it("drops the .mdx suffix, matching the sitewide .mdx → canonical redirect", () => {
		expect(legacyRedirectFor("/components/button.mdx")).toBe("/components/actions/button");
		expect(legacyRedirectFor("/blocks/sheet-async.mdx")).toBe("/recipes/overlay-async");
	});

	it("redirects the code-block sub-page", () => {
		expect(legacyRedirectFor("/components/code-block/folding-by-language")).toBe(
			"/components/data-display/code-block/folding-by-language",
		);
	});

	it("redirects the renamed blocks section to recipes", () => {
		expect(legacyRedirectFor("/blocks")).toBe("/recipes");
		expect(legacyRedirectFor("/blocks/sheet-async")).toBe("/recipes/overlay-async");
	});

	it("redirects the generalized sheet-async recipe to overlay-async", () => {
		expect(legacyRedirectFor("/recipes/sheet-async")).toBe("/recipes/overlay-async");
		expect(legacyRedirectFor("/recipes/sheet-async.md")).toBe("/recipes/overlay-async.md");
	});

	it("redirects the unnumbered migration guide URLs to their numbered homes", () => {
		expect(legacyRedirectFor("/migrations/code-block-migration")).toBe(
			"/migrations/0001-code-block-migration",
		);
		expect(legacyRedirectFor("/migrations/data-table-tanstack-v9-migration.md")).toBe(
			"/migrations/0006-data-table-tanstack-v9-migration.md",
		);
		expect(legacyRedirectFor("/migrations/0006-data-table-tanstack-v9-migration")).toBeNull();
	});

	it("returns null for canonical, unknown, and preview paths", () => {
		expect(legacyRedirectFor("/components/actions/button")).toBeNull();
		expect(legacyRedirectFor("/components/preview/calendar")).toBeNull();
		expect(legacyRedirectFor("/components/does-not-exist")).toBeNull();
		expect(legacyRedirectFor("/definitely/not/a/page")).toBeNull();
		expect(legacyRedirectFor("/")).toBeNull();
	});
});

describe("legacyPreviewRedirectFor", () => {
	it("moves a frame key whose page moved, and keeps the example name", () => {
		expect(legacyPreviewRedirectFor("components/preview/panel/overview")).toBe(
			"/preview/components/structure/panel/overview",
		);
		expect(legacyPreviewRedirectFor("components/preview/chip/removable")).toBe(
			"/preview/components/forms/chip/removable",
		);
	});

	it("leaves a current frame key and a shell demo name alone", () => {
		expect(legacyPreviewRedirectFor("components/structure/panel/overview")).toBeNull();
		expect(legacyPreviewRedirectFor("chat-panel")).toBeNull();
	});
});
