import { appendFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { McpDependencies } from "~/utilities/mcp/server.server";
import { currentDependencies, rpcAt } from "~/utilities/mcp/test-server";

/**
 * The golden-query eval for `find`: how designers and agents describe a need,
 * and the record that must answer it, ranked over the docs, JSDoc, and recipes
 * of this checkout. A case passes when an answer ranks first as a strong match.
 * Several answers mean that each one is a correct first result.
 *
 * Add a case when a weak find in #pulse-mantle-mcp turns out to be a find bug,
 * not a gap. Fix a miss you can, or add it to `knownMisses`.
 */
const goldenFinds: Record<string, Record<string, string | readonly string[]>> = {
	"Strata, in Ricky Frame's words": {
		"form sections (our 2column layouts with label/description on left, inputs or controls on right)":
			"Strata",
		"this group of info on left, form fields on right": "Strata",
		"form section with label and description on the left": "Strata",
		"description left controls right": "Strata",
		"two-column settings layout": "Strata",
		"settings page": "Strata",
		"two column form sections": "Strata",
		"section layout": "Strata",
		"create form sections": "Strata",
		"form section title on left": "Strata",
		"info on the left inputs on the right": "Strata",
		"two column form": "Strata",
		"title and description on the left, form on the right": "Strata",
	},
	Layouts: {
		"app shell sidebar header": "App Layout",
		"dashboard layout": "App Layout",
		"page heading with actions": "App Layout",
		"page header buttons": "App Layout",
		"page with sidebar navigation": ["Sidebar", "App Layout"],
		"centered login page": "Centered Layout",
		"sign in page centered card": "Centered Layout",
		"responsive adaptive layouts": "Breakpoints",
		"icon on the left text on the right": "Media Object",
		"checkbox on the left label and description on the right": "Choice",
	},
	Recipes: {
		"form actions": "Cancel and Submit Actions",
		"form footer save cancel": "Cancel and Submit Actions",
		"where do the save and cancel buttons go": "Cancel and Submit Actions",
		"cancel and submit buttons form footer": "Cancel and Submit Actions",
		"list page with filters and a table": "List Page Loading States",
		"skeleton rows while a table loads": "List Page Loading States",
		"dialog loading state": "Overlays + Async Data (React Query)",
		"dialog loading state pattern": "Overlays + Async Data (React Query)",
		"sparkline in each table row": "Sparklines in a List",
		"keep filters in the url search params": "Query from the URL",
		"sync search query to the url": "Query from the URL",
		"filter a table by clicking a value": "Filter from a Value",
		"click a cell value to filter the list": "Filter from a Value",
		"page actions in the header per route": "Header Actions from Routes",
		"chat assistant panel that persists across pages": "Assistant Across Routes",
		"announce page changes to screen readers": "Route Announcer",
		"fold long json in a code block": "Code Block Folding by Language",
	},
	"DataTable sub-rows and detail panels": {
		"table sub-rows": "Data Table",
		"expandable row detail": "Data Table",
		"nested rows in a table": "Data Table",
		"expandable table row detail panel": "Data Table",
		"expandable nested sub rows table": "Data Table",
		"subrow expand row": "Data Table",
		"row details panel": "Data Table",
		"click a row to show details under it": "Data Table",
	},
	"New in 0.95": {
		"headless tabs": "Tabs",
		"tabs in my own visual style": "Tabs",
		"slider value label": "Slider",
		"current value of a range slider": "Slider",
		"render a date in the visitor's time zone": "Time Zone",
		"show times in the browser timezone without hydration mismatch": "Time Zone",
		"toast above an open dialog": "Overlay Prompt",
		"a prompt that stays clickable while a dialog is open": "Overlay Prompt",
		"qr code rendered on the server": "QR Code",
	},
	"Weak finds from #pulse-mantle-mcp": {
		"status banner success callout": "Alert",
		"horizontal separator divider text label middle": "Separator",
		"monospace inline code bytes display": "Code",
		"sidebar workspace switcher": "Sidebar",
		"pick one four options single choice": ["Choice", "Radio Group", "Segmented Control"],
		"segmented control pick one three none": "Segmented Control",
		"command dialog wider taller scrolling list": "Command",
		"tabs destructive confirmation dialog": "Alert Dialog",
		"search pick one account member name": "Combobox",
		"world map click drag returns coordinates": "World Map",
		"collapsible section reader clicks expand inside": "Accordion",
		"sparkline bar chart small metric trend": ["Bar Chart", "Sparklines in a List"],
	},
	"Forms and other names": {
		"form validation": "Field",
		"form validation on submit": "Field",
		forms: "Field",
		"form field": "Field",
		"error message under a field": "Field",
		"avatar initials from name": "Avatar",
		"cancel dialog": "Dialog",
		"text search query": "Query",
		"search filter": "Query",
		breadcrumbs: "Breadcrumb",
		"unsaved changes bar": "Sandbar",
		"truncate long url keep end visible": "Truncated Text",
		"password field show hide": "Password Input",
	},
	"AI answers": {
		"chat message bubble rendered markdown prose": "Markdown",
	},
};

/**
 * Needs that mantle has a part for, but `find` misses: the right record ranks
 * below another, or ranks first as a weak match. Each one must still miss, so
 * a fix moves it to `goldenFinds` and it cannot regress again.
 */
const knownMisses: Record<string, string | readonly string[]> = {
	"selectable cards pick one product": ["Radio Group", "Choice"],
	"selectable radio card grid icon": ["Radio Group", "Choice"],
	"banner explaining degraded data source list": "Alert",
	"inline alert": "Alert",
	"chip shows one word text colored": "Badge",
	"status badge unknown unavailable state": "Badge",
	"select expiry duration": "Select",
	"single choice compact inline segmented filter": "Segmented Control",
	"toggle with two line explanation": ["Choice", "Switch"],
	"show error toast delete failure": "Toast",
	"toast show error menu action failed": "Toast",
	"expand row disclosure button chevron": "Data Table",
	"disclosure toggle show hide section": "Accordion",
	"tab state hook custom tab markup": "Tabs",
	"tabs with custom styling marketing cards": "Tabs",
	"type a question to build a filter": "Natural Language Query",
};

/**
 * Needs that mantle has no part for, from real gap reports. `find` must call
 * each one weak, so the agent composes parts and reports the gap instead of
 * using a near miss. The value names the gap and any open work on it.
 */
const weakFinds: Record<string, string> = {
	stepper: "Steps (#1431)",
	"multi step wizard stepper progress": "Steps (#1431)",
	"file drop zone": "file upload",
	"drag reorder sortable list handle": "sortable list",
	"sankey flow diagram": "flow chart",
	"static flowchart diagram yes branches": "flow chart",
	"waffle grid squares showing percentage share": "waffle chart",
	"vertical timeline steps icons joining line": "timeline",
	"bounding box image region overlay": "image annotation",
	"availability uptime bar status history": "status history strip",
	"mark inline search keyword match highlight": "text match highlight",
	"highlight text react named highlightedtext matching": "text match highlight",
};

type Found = { strongMatch: boolean; results: { name: string; score: number }[] };

type Row = {
	section: string;
	query: string;
	want: string;
	got: string;
	wantRank: string;
	/** A miss is a known miss that still misses; fixed is one that now hits. */
	status: "pass" | "regression" | "miss" | "fixed";
};

const rows: Row[] = [];
let dependencies: McpDependencies;
const rpc = rpcAt("https://mantle.example/mcp");

beforeAll(async () => {
	dependencies = await currentDependencies();
});

async function find(query: string): Promise<Found> {
	const { result, error } = await rpc(dependencies, "tools/call", {
		name: "find",
		arguments: { query },
	});
	if (result?.structuredContent == null || result.isError === true) {
		throw new Error(`find "${query}" failed: ${error?.message ?? JSON.stringify(result?.content)}`);
	}
	return result.structuredContent as Found;
}

/** Runs `work`, and records a call that throws as a regression, so the report counts it. */
async function orRegression<T>(
	row: Pick<Row, "section" | "query" | "want">,
	work: () => Promise<T>,
): Promise<T> {
	try {
		return await work();
	} catch (error) {
		rows.push({ ...row, got: String(error), wantRank: "", status: "regression" });
		throw error;
	}
}

/** The first three results with their scores, and whether the match is weak. */
function topThree(found: Found): string {
	const results = found.results
		.slice(0, 3)
		.map(({ name, score }) => `${name} (${score})`)
		.join(", ");
	return `${results || "nothing"}${found.strongMatch ? "" : ", weak"}`;
}

/** Ranks `query`, and records how it went against `wanted` for the report. */
async function rank(section: string, query: string, wanted: string | readonly string[]) {
	const found = await find(query);
	const answers = typeof wanted === "string" ? [wanted] : wanted;
	const top = found.results[0]?.name;
	const hit = found.strongMatch && top != null && answers.includes(top);
	const index = found.results.findIndex(({ name }) => answers.includes(name));
	return {
		hit,
		row: {
			section,
			query,
			want: answers.join(" or "),
			got: topThree(found),
			wantRank: index === -1 ? "not in top 8" : `#${index + 1}`,
		},
	};
}

describe("the golden find queries", () => {
	const cases = Object.entries(goldenFinds).flatMap(([section, queries]) =>
		Object.entries(queries).map(([query, wanted]) => ({ section, query, wanted })),
	);

	it.each(cases)(
		'$section: ranks $wanted first for "$query"',
		async ({ section, query, wanted }) => {
			const { hit, row } = await orRegression(
				{ section, query, want: [wanted].flat().join(" or ") },
				() => rank(section, query, wanted),
			);
			rows.push({ ...row, status: hit ? "pass" : "regression" });

			expect(hit, `find "${query}" wants ${row.want} first and strong, got ${row.got}`).toBe(true);
		},
	);
});

describe("the known find misses", () => {
	it.each(Object.entries(knownMisses))('still misses %s for "%s"', async (query, wanted) => {
		const { hit, row } = await orRegression(
			{ section: "Known misses", query, want: [wanted].flat().join(" or ") },
			() => rank("Known misses", query, wanted),
		);
		rows.push({ ...row, status: hit ? "fixed" : "miss" });

		expect(
			hit,
			`find "${query}" now ranks ${row.want} first and strong (${row.got}). Move it to goldenFinds.`,
		).toBe(false);
	});
});

describe("the real gaps", () => {
	it.each(Object.entries(weakFinds))(
		'calls "%s" weak, so the agent reports %s',
		async (query, gap) => {
			const found = await orRegression({ section: "Real gaps", query, want: `weak (${gap})` }, () =>
				find(query),
			);
			rows.push({
				section: "Real gaps",
				query,
				want: `weak (${gap})`,
				got: topThree(found),
				wantRank: "",
				status: found.strongMatch ? "regression" : "pass",
			});

			expect(
				found.strongMatch,
				`find "${query}" is a strong match (${topThree(found)}). If mantle now has a part for ${gap}, move it to goldenFinds.`,
			).toBe(false);
		},
	);
});

const statusMark = { pass: "✅", regression: "❌", miss: "·", fixed: "⬆️" } satisfies Record<
	Row["status"],
	string
>;

/** One Markdown table of `rows`, with `|` escaped in each cell. */
function table(tableRows: readonly Row[]): string {
	const cell = (text: string) => text.replaceAll("|", "\\|");
	return [
		"| | Query | Want | Got (top 3, score) | Want's rank |",
		"| --- | --- | --- | --- | --- |",
		...tableRows.map(
			(row) =>
				`| ${statusMark[row.status]} | ${cell(row.query)} | ${cell(row.want)} | ${cell(row.got)} | ${row.wantRank} |`,
		),
	].join("\n");
}

// Why: CI sets FIND_EVAL_REPORT to the job summary, so a regression reads as one table on the run page.
afterAll(() => {
	const path = process.env.FIND_EVAL_REPORT;
	if (path == null || rows.length === 0) {
		return;
	}
	const inSection = (...sections: string[]) => rows.filter((row) => sections.includes(row.section));
	const golden = rows.filter(
		(row) => row.section !== "Known misses" && row.section !== "Real gaps",
	);
	const misses = inSection("Known misses");
	const gaps = inSection("Real gaps");
	const regressions = rows.filter((row) => row.status === "regression");
	const fixed = rows.filter((row) => row.status === "fixed");
	const passed = (part: readonly Row[]) =>
		`${part.filter((row) => row.status === "pass").length}/${part.length}`;
	const report = [
		"## `find` golden queries",
		"",
		`- ${passed(golden)} golden queries rank the right record first as a strong match.`,
		`- ${passed(gaps)} real gaps stay weak.`,
		`- ${misses.length - fixed.length}/${misses.length} known misses still miss.`,
		"",
		regressions.length === 0
			? "No ranking regressions."
			: `### ❌ Regressions\n\n${table(regressions)}`,
		"",
		fixed.length === 0 ? "" : `### ⬆️ Fixed: move these to goldenFinds\n\n${table(fixed)}\n`,
		`<details><summary>Known misses</summary>\n\n${table(misses)}\n\n</details>`,
		"",
		`<details><summary>All cases</summary>\n\n${table(rows)}\n\n</details>`,
		"",
	].join("\n");
	appendFileSync(path, report);
});
