import { describe, expect, test } from "vitest";
import {
	buildPaletteCommands,
	groupPaletteCommands,
	searchPaletteCommands,
} from "./command-palette-search";
import {
	basePages,
	componentCategories,
	componentsByCategory,
	layoutPages,
	previewComponents,
	utilsPages,
	welcomePages,
} from "./navigation-data";
import { releaseHref } from "~/utilities/release-href";

const commands = buildPaletteCommands("4.2.0");

const titles = (query: string) =>
	searchPaletteCommands(commands, query).map((command) => command.title);

describe("buildPaletteCommands", () => {
	test("ids are unique", () => {
		const ids = commands.map((command) => command.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("contains every navigable docs page plus the GitHub links and theme commands", () => {
		const componentCount = componentCategories.reduce(
			(count, category) => count + componentsByCategory[category].length,
			0,
		);
		const expectedCount =
			welcomePages.length +
			2 + // GitHub Repo + GitHub Releases
			basePages.length +
			1 + // Hooks
			utilsPages.length +
			componentCount +
			layoutPages.length +
			previewComponents.length +
			5; // theme commands

		expect(commands).toHaveLength(expectedCount);
	});

	test("the GitHub Releases command links the given version's release tag", () => {
		const releases = commands.find((command) => command.id === "github-releases");
		expect(releases).toMatchObject({
			kind: "external",
			href: releaseHref("4.2.0"),
			subtitle: "version 4.2.0",
		});
	});

	test("welcome commands show no subtitle but keep their route as a search keyword", () => {
		const philosophy = commands.find((command) => command.title === "Philosophy");
		expect(philosophy).toMatchObject({
			kind: "route",
			to: "/philosophy",
			keywords: ["/philosophy"],
		});
		expect(philosophy?.subtitle).toBeUndefined();
	});

	test("route commands carry their docs route as both target and subtitle", () => {
		const tabs = commands.find((command) => command.title === "Tabs");
		expect(tabs).toMatchObject({
			kind: "route",
			to: "/components/navigation/tabs",
			subtitle: "/components/navigation/tabs",
		});
	});

	test("preview components are flagged so search results can badge them", () => {
		const calendar = commands.find((command) => command.title === "Calendar");
		expect(calendar).toMatchObject({
			kind: "route",
			to: "/components/preview/calendar",
			preview: true,
		});
	});
});

describe("groupPaletteCommands", () => {
	test("preserves browse group order and drops no commands", () => {
		const groups = groupPaletteCommands(commands);

		expect(groups.map((entry) => entry.group)).toEqual([
			"Welcome",
			"Base",
			"Hooks",
			"Utils",
			...componentCategories.map((category) => `Components: ${category}`),
			"Layouts",
			"Preview Components",
			"Theme",
		]);
		expect(groups.flatMap((entry) => entry.commands)).toEqual(commands);
	});
});

describe("searchPaletteCommands", () => {
	test("an empty or whitespace-only query returns every command in browse order", () => {
		expect(searchPaletteCommands(commands, "")).toEqual(commands);
		expect(searchPaletteCommands(commands, "   ")).toEqual(commands);
	});

	// Regression for the original ranking bug: "tabs" surfaced Tailwind
	// Variants, Typography, and Table (fuzzy matches through titles and
	// route paths) while the Tabs page itself stayed buried below the fold.
	test("ranks the exact title match first and drops fuzzy path noise", () => {
		const results = titles("tabs");

		expect(results[0]).toBe("Tabs");
		expect(results).not.toContain("Tailwind Variants");
		expect(results).not.toContain("Typography");
		expect(results).not.toContain("Table");
	});

	test("is case-insensitive", () => {
		expect(titles("TABS")[0]).toBe("Tabs");
	});

	test("ranks an exact title match above a word-prefix match", () => {
		const results = titles("table");

		expect(results.indexOf("Table")).toBe(0);
		expect(results).toContain("Data Table");
	});

	test("ranks exact > prefix > word-prefix for title matches", () => {
		const results = titles("theme");

		expect(results[0]).toBe("Theme");
		expect(results[1]).toBe("Theme Switcher");
		expect(results).toContain("Use Dark theme");
	});

	test("matches acronyms of multi-word titles", () => {
		expect(titles("dm")[0]).toBe("Dropdown Menu");
	});

	test("finds theme commands by their distinguishing word", () => {
		const results = titles("dark");

		expect(results).toContain("Use Dark theme");
		expect(results).toContain("Use Dark High Contrast theme");
	});

	test("matches route-path substrings so URL fragments find their pages", () => {
		const results = titles("navigation");

		for (const component of componentsByCategory.Navigation) {
			expect(results).toContain(component);
		}
	});

	test("does not fuzzy-match route paths", () => {
		// "bsf" fuzzy-matches "/base/scroll-fade" (b→s→f in order) but is not a
		// substring of it, and matches no title; only titles may match fuzzily
		expect(titles("bsf")).not.toContain("Scroll Fade");
		// positive control: a real route substring still finds the page
		expect(titles("scroll-fade")).toContain("Scroll Fade");
	});

	test("finds external links by their subtitle", () => {
		expect(titles("ngrok/mantle")).toContain("GitHub Repo");
	});

	test("finds subtitle-less welcome pages by their route keyword", () => {
		expect(titles("/philosophy")).toContain("Philosophy");
		expect(titles("for-ai-agents")).toContain("For AI Agents");
	});

	// Regression: a per-key CONTAINS threshold in a single matchSorter call
	// gates the whole item by its highest-ranked key, so a sub-CONTAINS
	// subtitle match vetoed a qualifying fuzzy title match — "go" dropped
	// "GitHub Repo" and "Pagination" from the results entirely.
	test("a weak subtitle match never vetoes a qualifying fuzzy title match", () => {
		const results = titles("go");

		expect(results).toContain("GitHub Repo");
		expect(results).toContain("Pagination");
	});

	test("ranks every title match above subtitle-only matches", () => {
		// "at" fuzzy-matches the "Tailwind Variants" title and is a substring
		// of the "/components/navigation/…" routes; title matches come first
		const results = searchPaletteCommands(commands, "at");
		const tailwindIndex = results.findIndex((command) => command.title === "Tailwind Variants");
		const anchorIndex = results.findIndex((command) => command.title === "Anchor");

		expect(tailwindIndex).toBeGreaterThanOrEqual(0);
		expect(anchorIndex).toBeGreaterThanOrEqual(0);
		expect(tailwindIndex).toBeLessThan(anchorIndex);
	});

	test("returns no results for a query that matches nothing", () => {
		expect(searchPaletteCommands(commands, "xyzzyplugh")).toEqual([]);
	});

	test("treats regex special characters as plain text", () => {
		expect(() => searchPaletteCommands(commands, "c++ (draft) [wip]")).not.toThrow();
	});
});
