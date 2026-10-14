import { describe, expect, it } from "vitest";

import {
	layoutPages,
	previewComponentCategoryLookup,
	previewComponents,
	prodReadyComponents,
} from "~/components/navigation-data";
import { canonicalHref } from "~/utilities/canonical-origin";
import { buildSiteAgentManifest } from "./agent-manifest.server";
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
});
