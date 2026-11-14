import { describe, expect, it } from "vitest";

import {
	layoutPages,
	previewComponentCategoryLookup,
	previewComponents,
	prodReadyComponents,
} from "~/components/navigation-data";
import { canonicalHref } from "~/utilities/canonical-origin";
import { buildSiteAgentManifest } from "./agent-manifest.server";
import { findRecords, recordsOf } from "./mcp/tools";
import { buildSearchEntries } from "./search-index.server";

describe("the site's agent manifest", () => {
	// The shared builder takes the origin as an input. Wiring the package's
	// public origin in by mistake would point a preview deploy's URLs at prod.
	it("builds every URL on the canonical origin", async () => {
		const manifest = await buildSiteAgentManifest();
		const button = manifest.components.find((component) => component.name === "Button");
		const useBreakpoint = manifest.hooks.find((hook) => hook.name === "useBreakpoint");
		const cx = manifest.utilities.find((utility) => utility.name === "cx");

		expect(button).toMatchObject({
			docsUrl: canonicalHref("/components/actions/button"),
			markdownUrl: canonicalHref("/components/actions/button.md"),
		});
		expect(useBreakpoint?.docsUrl).toBe(canonicalHref("/hooks"));
		expect(cx?.markdownUrl).toBe(canonicalHref("/utils/cx.md"));
	});

	// The manifest reads the docs tree; the sidebar lists pages by hand. A page
	// with no sidebar entry, a sidebar entry with no page, or a frontmatter
	// title that drifts from its sidebar label shows up here.
	it("lists the same components as the docs sidebar, under the same names", async () => {
		const manifest = await buildSiteAgentManifest();
		const sidebar = [...prodReadyComponents, ...previewComponents, ...layoutPages].toSorted();
		const listed = manifest.components.map((component) => component.name).toSorted();

		expect(listed).toEqual(sidebar);
	});

	// A preview page's URL carries no category, so the page declares one in its
	// frontmatter. The sidebar declares it a second time; the two must agree.
	it("gives a preview component the category the sidebar declares", async () => {
		const manifest = await buildSiteAgentManifest();

		for (const name of previewComponents) {
			const entry = manifest.components.find((component) => component.name === name);
			expect(entry?.status).toBe("preview");
			expect(entry?.category).toBe(previewComponentCategoryLookup[name]);
		}
	});

	// The site feeds the builder its bundled raw source. A glob that stops
	// matching a directory leaves components with no JSDoc and no examples.
	it("reads every component's JSDoc through the bundled source", async () => {
		const manifest = await buildSiteAgentManifest();
		const componentsMissingJsdoc = manifest.components
			.filter((component) => component.jsdoc == null)
			.map((component) => component.name);

		expect(componentsMissingJsdoc).toEqual([]);
	});

	it("puts a page's aliases into its search keywords", async () => {
		const manifest = await buildSiteAgentManifest();
		const entries = buildSearchEntries({
			components: { components: manifest.components },
			hooks: { hooks: manifest.hooks },
			utilities: { utilities: manifest.utilities },
		});
		const dialog = entries.find((entry) => entry.name === "Dialog");

		expect(dialog?.keywords).toContain("modal");
	});
	// The MCP `find` tool ranks the site manifest. A gap report asked for a divider with a
	// label in the middle and got no strong match, though Separator builds one.
	it("finds Separator for a divider with a text label", async () => {
		const manifest = await buildSiteAgentManifest();
		const records = recordsOf({
			version: "0.0.0",
			manifest,
			specifiers: new Set(),
			exportsBySpecifier: new Map(),
			llmsTxt: undefined,
			declarationsOf: () => undefined,
		});

		const [top] = findRecords(records, {
			query: "horizontal separator divider text label middle",
		});

		expect(top).toEqual(
			expect.objectContaining({
				record: expect.objectContaining({ name: "Separator" }),
				strong: true,
			}),
		);
	});
	// An alias word scores high, so an alias that names a different part sends agents to the wrong page.
	it("ranks a page that lists an alias first for that alias", async () => {
		const manifest = await buildSiteAgentManifest();
		const records = recordsOf({
			version: "0.0.0",
			manifest,
			specifiers: new Set(),
			exportsBySpecifier: new Map(),
			llmsTxt: undefined,
			declarationsOf: () => undefined,
		});

		const misses = manifest.components.flatMap((component) =>
			(component.aliases ?? [])
				.map((alias) => ({ alias, top: findRecords(records, { query: alias })[0]?.record }))
				.filter(({ alias, top }) => !top?.aliases?.includes(alias))
				.map(({ alias, top }) => `${alias} -> ${top?.name}`),
		);

		expect(misses).toEqual([]);
	});
	// The Separator search words must not rank a divider above Label for a plain label query.
	it("ranks Label above Separator for a text label", async () => {
		const manifest = await buildSiteAgentManifest();
		const records = recordsOf({
			version: "0.0.0",
			manifest,
			specifiers: new Set(),
			exportsBySpecifier: new Map(),
			llmsTxt: undefined,
			declarationsOf: () => undefined,
		});

		const names = findRecords(records, { query: "text label" }).map(({ record }) => record.name);

		const rank = (name: string) => (names.includes(name) ? names.indexOf(name) : names.length);

		expect(rank("Label")).toBeLessThan(rank("Separator"));
	});
	// Each query is a recent `find` with no strong match in the MCP feed.
	it.each([
		["monospace inline code bytes display", "Code"],
		["pick one value few fixed numeric", "Radio Group"],
		["horizontal bar chart scores small label", "Bar Chart"],
		["removable badge tag dismiss button", "Badge"],
		["segmented control pick one three none", "Segmented Control"],
	])("finds a strong match for %s", async (query, name) => {
		const manifest = await buildSiteAgentManifest();
		const records = recordsOf({
			version: "0.0.0",
			manifest,
			specifiers: new Set(),
			exportsBySpecifier: new Map(),
			llmsTxt: undefined,
			declarationsOf: () => undefined,
		});

		expect(findRecords(records, { query })[0]).toEqual(
			expect.objectContaining({ record: expect.objectContaining({ name }), strong: true }),
		);
	});
	// Mantle has no part for these queries. A part name in the query must not hide the gap.
	it.each([
		"rich text editor with code completion",
		"card carousel slider",
		"dialog wizard with steps",
	])("finds no strong match for %s", async (query) => {
		const manifest = await buildSiteAgentManifest();
		const records = recordsOf({
			version: "0.0.0",
			manifest,
			specifiers: new Set(),
			exportsBySpecifier: new Map(),
			llmsTxt: undefined,
			declarationsOf: () => undefined,
		});

		expect(findRecords(records, { query })[0]?.strong).toBe(false);
	});
	// A part of a qualified alias must not win: "text field" of "multiline text field" is not Text Area.
	it.each([
		["label a text field", "Field"],
		["labeled text input", "Input"],
	])("ranks the plain part first for %s", async (query, name) => {
		const manifest = await buildSiteAgentManifest();
		const records = recordsOf({
			version: "0.0.0",
			manifest,
			specifiers: new Set(),
			exportsBySpecifier: new Map(),
			llmsTxt: undefined,
			declarationsOf: () => undefined,
		});

		expect(findRecords(records, { query })[0]?.record.name).toBe(name);
	});
});
