import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
	buildAgentManifest,
	examplesFromJsDoc,
	firstSentenceFromJsDoc,
	importableSubpaths,
	parseFrontmatter,
	renderLlmsTxt,
	siblingsFromJsDoc,
	whenToUseFromJsDoc,
	type AgentManifestInputs,
} from "./agent-manifest.ts";
import { buildAgentManifestFromFilesystem } from "./write-agent-artifacts.ts";

describe("firstSentenceFromJsDoc", () => {
	it("stops at the paragraph break when the summary is followed by a markdown block", () => {
		// Regression: `Badge` published a 393-character "summary" carrying two
		// bulleted lists. Its first sentence ends in front of `**When to use**`,
		// which is not an uppercase letter, so the sentence search ran to the end
		// of the description.
		const jsdoc = `/**
 * A non-interactive label used to highlight short, scannable information.
 *
 * **When to use**
 *
 * - Status indicators: \`Succeeded\`, \`Failed\`.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe(
			"A non-interactive label used to highlight short, scannable information.",
		);
	});

	it("takes one sentence when the first paragraph holds several", () => {
		const jsdoc = `/**
 * The band below the body. Unless it is the first child, it draws a top border.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("The band below the body.");
	});

	it("keeps an abbreviation that a period-plus-space rule would split", () => {
		const jsdoc = `/**
 * Renders a count, e.g. \`12 new\`, beside its label.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("Renders a count, e.g. `12 new`, beside its label.");
	});

	it("ignores text after the first block tag", () => {
		const jsdoc = `/**
 * The palette's query field.
 *
 * @see https://mantle.ngrok.com/components/navigation/command
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("The palette's query field.");
	});

	it("renders an inline link tag as its label", () => {
		const jsdoc = `/**
 * See {@link Trigger} for the click target.
 */`;

		expect(firstSentenceFromJsDoc(jsdoc)).toBe("See Trigger for the click target.");
	});

	it("returns undefined when the block carries only tags", () => {
		expect(firstSentenceFromJsDoc("/**\n * @internal\n */")).toBeUndefined();
	});
});

describe("examplesFromJsDoc", () => {
	it("returns each @example block and stops at the next real tag", () => {
		const jsdoc = [
			"/**",
			" * Summary.",
			" * @example",
			" * ```tsx",
			" * <Foo />",
			" * ```",
			" * @param x the thing",
			" */",
		].join("\n");

		expect(examplesFromJsDoc(jsdoc)).toEqual(["```tsx\n<Foo />\n```"]);
	});

	it("does not terminate on an @-prefixed line inside a fenced code block", () => {
		const jsdoc = [
			"/**",
			" * @example",
			" * ```tsx",
			" * @Component()",
			" * class Widget {}",
			" * ```",
			" */",
		].join("\n");

		const [example] = examplesFromJsDoc(jsdoc);
		// Without fence tracking, the parser mistakes `@Component()` for a tag, so
		// it truncates the example at the opening fence.
		expect(example).toContain("@Component()");
		expect(example).toContain("class Widget {}");
	});

	it("returns an empty array when there are no @example blocks", () => {
		expect(examplesFromJsDoc("/**\n * Just a summary.\n */")).toEqual([]);
	});
});

describe("siblingsFromJsDoc", () => {
	it("reads one sibling per list item with its boundary", () => {
		const jsdoc = [
			"/**",
			" * Summary.",
			" *",
			" * @siblings",
			" * - `Well`: the content is secondary.",
			" * - `Separator`: adjacent content needs a divider and no box.",
			" *",
			" * @see https://mantle.ngrok.com/components/structure/card",
			" */",
		].join("\n");

		expect(siblingsFromJsDoc(jsdoc)).toEqual([
			{ name: "Well", boundary: "the content is secondary." },
			{ name: "Separator", boundary: "adjacent content needs a divider and no box." },
		]);
	});

	it("throws on an item without a backticked name and a colon", () => {
		const jsdoc = "/**\n * @siblings\n * - Well for secondary content.\n */";

		expect(() => siblingsFromJsDoc(jsdoc)).toThrow(/Cannot parse the @siblings item/);
	});

	it("returns an empty array when the block carries no @siblings tag", () => {
		expect(siblingsFromJsDoc("/**\n * Summary.\n * @see x\n */")).toEqual([]);
	});
});

describe("whenToUseFromJsDoc", () => {
	it("joins a wrapped @useWhen into one line", () => {
		const jsdoc = "/**\n * @useWhen A region has\n *   no data to show.\n * @see x\n */";

		expect(whenToUseFromJsDoc(jsdoc)).toBe("A region has no data to show.");
	});

	it("returns undefined when the block carries no @useWhen tag", () => {
		expect(whenToUseFromJsDoc("/**\n * Summary.\n */")).toBeUndefined();
	});
});

describe("parseFrontmatter", () => {
	it("reads plain, quoted, inline-list, and block-list values", () => {
		const source = [
			"---",
			"title: Sheet",
			'description: "A container: it overlays the view, \\"edge\\" first."',
			"aliases: [drawer, side panel]",
			"tags:",
			"  - one",
			"  - 'two'",
			"---",
			"# Sheet",
		].join("\n");

		expect(parseFrontmatter(source)).toEqual({
			title: "Sheet",
			description: 'A container: it overlays the view, "edge" first.',
			aliases: ["drawer", "side panel"],
			tags: ["one", "two"],
		});
	});

	// Catches: a comment cut that reads a `#` inside quotes, or none at all.
	it("cuts an inline comment outside a quoted span", () => {
		const source = [
			"---",
			"title: Sheet # the drawer",
			'description: "A # inside" # outside',
			"aliases: [drawer, panel] # two",
			"tags:",
			"  - one # first",
			"---",
		].join("\n");

		expect(parseFrontmatter(source)).toEqual({
			title: "Sheet",
			description: "A # inside",
			aliases: ["drawer", "panel"],
			tags: ["one"],
		});
	});

	// Catches: an inline list split on every comma.
	it("keeps a comma inside a quoted inline list item", () => {
		const source = "---\naliases: [\"side, panel\", 'a, b', drawer]\n---\n";

		expect(parseFrontmatter(source)).toEqual({ aliases: ["side, panel", "a, b", "drawer"] });
	});

	it("returns an empty object when the file has no frontmatter", () => {
		expect(parseFrontmatter("# Title\n")).toEqual({});
	});

	it("throws on a line it cannot read", () => {
		expect(() => parseFrontmatter("---\ntitle Sheet\n---\n")).toThrow(
			/Cannot parse the frontmatter line/,
		);
	});
});

describe("importableSubpaths", () => {
	it("lists the module exports and skips css, package.json, and the agent artifacts", () => {
		const subpaths = importableSubpaths({
			"./package.json": "./package.json",
			"./agent.json": "./dist/agent.json",
			"./llms.txt": "./dist/llms.txt",
			"./mantle.css": "./dist/mantle.css",
			"./hooks": {},
			"./button": {},
		});

		expect(subpaths).toEqual(["@ngrok/mantle/button", "@ngrok/mantle/hooks"]);
	});
});

/** A small package: a button module with a sibling icon button file, one hook barrel, one utility. */
const sources: Record<string, string> = {
	"components/button/button.tsx": [
		"/**",
		" * Renders a button.",
		" *",
		" * @useWhen The user triggers an action.",
		" *",
		" * @siblings",
		" * - `Anchor`: the control navigates.",
		" *",
		" * @example",
		" * ```tsx",
		' * <Button appearance="filled" intent="neutral">Save</Button>',
		" * ```",
		" */",
		"const Button = () => null;",
	].join("\n"),
	"components/button/icon-button.tsx":
		"/**\n * Renders an icon button.\n */\nconst IconButton = () => null;",
	"components/calendar/calendar.tsx": "/**\n * Picks a date.\n */\nconst Calendar = () => null;",
	"components/app-layout/index.ts":
		'/**\n * The app shell.\n */\nexport { AppLayout } from "./app-layout.js";',
	"hooks/index.ts": [
		'export { breakpoints, useBreakpoint } from "./use-breakpoint.js";',
		'export type { Breakpoint } from "./use-breakpoint.js";',
		'export { useComposedRefs } from "../utils/compose-refs/compose-refs.js";',
	].join("\n"),
	"hooks/use-breakpoint.ts": [
		"/** The current breakpoint. */",
		"export const breakpoints = [];",
		"/**",
		" * Reads the breakpoint.",
		" *",
		" * @example",
		" * const breakpoint = useBreakpoint();",
		" */",
		"export function useBreakpoint() {}",
	].join("\n"),
	"utils/compose-refs/compose-refs.ts": "/** Composes refs. */\nfunction useComposedRefs() {}",
	"utils/cx/cx.ts": "/** Composes class names. */\nexport function cx() {}",
};

function inputs(overrides: Partial<AgentManifestInputs> = {}): AgentManifestInputs {
	return {
		name: "@ngrok/mantle",
		version: "1.2.3",
		origin: "https://docs.test",
		subpaths: [
			"@ngrok/mantle/app-layout",
			"@ngrok/mantle/button",
			"@ngrok/mantle/calendar",
			"@ngrok/mantle/cx",
			"@ngrok/mantle/hooks",
		],
		docs: [
			{
				slug: "components/actions/button",
				frontmatter: { title: "Button", description: "A button." },
			},
			{
				slug: "components/actions/icon-button",
				frontmatter: { title: "Icon Button", aliases: ["icon only"] },
			},
			{
				slug: "components/preview/calendar",
				frontmatter: { title: "Calendar", category: "Forms" },
			},
			{ slug: "components/actions/button/variants", frontmatter: { title: "Button variants" } },
			{ slug: "layouts/app-layout", frontmatter: { title: "App Layout" } },
			{ slug: "base/colors", frontmatter: { title: "Colors" } },
		],
		readSource: (basePath) => sources[`${basePath}.tsx`] ?? sources[`${basePath}.ts`],
		...overrides,
	};
}

describe("buildAgentManifest", () => {
	it("reads a component's import path, JSDoc, examples, and boundary tags from its page and source", () => {
		const manifest = buildAgentManifest(inputs());
		const button = manifest.components.find((entry) => entry.name === "Button");

		expect(button).toEqual({
			name: "Button",
			slug: "components/actions/button",
			kind: "component",
			category: "Actions",
			status: "stable",
			importPath: "@ngrok/mantle/button",
			docsUrl: "https://docs.test/components/actions/button",
			markdownUrl: "https://docs.test/components/actions/button.md",
			summary: "A button.",
			jsdoc: "Renders a button.",
			examples: ['```tsx\n<Button appearance="filled" intent="neutral">Save</Button>\n```'],
			siblings: [{ name: "Anchor", boundary: "the control navigates." }],
			useWhen: "The user triggers an action.",
		});
	});

	// Icon Button ships from the button module, so the override decides both
	// the import path and which source file holds its JSDoc.
	it("resolves a component that ships from a sibling's module", () => {
		const manifest = buildAgentManifest(inputs());
		const iconButton = manifest.components.find((entry) => entry.name === "Icon Button");

		expect(iconButton).toMatchObject({
			importPath: "@ngrok/mantle/button",
			jsdoc: "Renders an icon button.",
			aliases: ["icon only"],
		});
	});

	it("marks a preview page preview with the category its frontmatter declares", () => {
		const manifest = buildAgentManifest(inputs());
		const calendar = manifest.components.find((entry) => entry.name === "Calendar");

		expect(calendar).toMatchObject({ status: "preview", category: "Forms" });
	});

	it("reads a layout from the module's index barrel JSDoc and gives it no category", () => {
		const manifest = buildAgentManifest(inputs());
		const appLayout = manifest.components.find((entry) => entry.name === "App Layout");

		expect(appLayout).toMatchObject({ kind: "layout", jsdoc: "The app shell." });
		expect(appLayout).not.toHaveProperty("category");
	});

	it("skips supplementary sub-pages and pages that describe no module", () => {
		const manifest = buildAgentManifest(inputs());

		expect(manifest.components.map((entry) => entry.name)).toEqual([
			"App Layout",
			"Button",
			"Calendar",
			"Icon Button",
		]);
	});

	it("throws when a preview page declares no category", () => {
		const docs = [{ slug: "components/preview/calendar", frontmatter: { title: "Calendar" } }];

		expect(() => buildAgentManifest(inputs({ docs }))).toThrow(
			/must declare a frontmatter category/,
		);
	});

	it("throws when a page names a subpath the package does not export", () => {
		const docs = [{ slug: "components/forms/date-picker", frontmatter: { title: "Date Picker" } }];

		expect(() => buildAgentManifest(inputs({ docs }))).toThrow(/does not export/);
	});

	it("throws when the aliases frontmatter is not a list of strings", () => {
		const docs = [
			{ slug: "components/actions/button", frontmatter: { title: "Button", aliases: "cta" } },
		];

		expect(() => buildAgentManifest(inputs({ docs }))).toThrow(/must be a list of strings/);
	});

	// `breakpoints` sits in the barrel beside the hooks; a hook starts with `use`.
	it("lists the hooks the barrel exports, with their summaries and examples", () => {
		const manifest = buildAgentManifest(inputs());

		expect(manifest.hooks).toEqual([
			{
				name: "useBreakpoint",
				importPath: "@ngrok/mantle/hooks",
				docsUrl: "https://docs.test/hooks",
				markdownUrl: "https://docs.test/hooks.md",
				summary: "Reads the breakpoint.",
				examples: ["const breakpoint = useBreakpoint();"],
			},
			{
				name: "useComposedRefs",
				importPath: "@ngrok/mantle/hooks",
				docsUrl: "https://docs.test/hooks",
				markdownUrl: "https://docs.test/hooks.md",
				summary: "Composes refs.",
			},
		]);
	});

	it("reads a utility's summary from its primary export", () => {
		const manifest = buildAgentManifest(inputs());
		const cx = manifest.utilities.find((entry) => entry.name === "cx");

		expect(cx).toMatchObject({ importPath: "@ngrok/mantle/cx", summary: "Composes class names." });
	});
});

describe("renderLlmsTxt", () => {
	it("prints one line per module with its import path, status, summary, and aliases", () => {
		const text = renderLlmsTxt(buildAgentManifest(inputs()));

		expect(text).toContain("- **Button** (`@ngrok/mantle/button`): A button.");
		expect(text).toContain("- **Calendar** (`@ngrok/mantle/calendar`, preview): Picks a date.");
		expect(text).toContain(
			"- **Icon Button** (`@ngrok/mantle/button`): Renders an icon button. Also called: icon only.",
		);
		expect(text).toContain("- **useBreakpoint** (`@ngrok/mantle/hooks`): Reads the breakpoint.");
	});
});

describe("buildAgentManifestFromFilesystem", () => {
	// Cross-file contract: the docs site snapshots the same projection from its
	// own bundled inputs (apps/www/app/utilities/agent-surface-drift.test.ts).
	// The tarball and the site must ship the same records.
	it("writes the component records the docs site snapshots", () => {
		const snapshotPath = path.resolve(
			import.meta.dirname,
			"../../../apps/www/app/utilities/__snapshots__/components-surface.json",
		);
		const snapshot: unknown = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
		const manifest = buildAgentManifestFromFilesystem();
		const surface = manifest.components.map((component) => ({
			name: component.name,
			slug: component.slug,
			kind: component.kind,
			category: component.category,
			status: component.status,
			importPath: component.importPath,
			summary: component.summary,
			jsdoc: component.jsdoc,
			examples: component.examples,
			aliases: component.aliases,
			siblings: component.siblings,
			useWhen: component.useWhen,
		}));

		expect(JSON.parse(JSON.stringify(surface))).toEqual(snapshot);
	});
});
