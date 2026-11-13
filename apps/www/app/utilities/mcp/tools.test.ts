import { describe, expect, it } from "vitest";
import { fitMarkdown } from "~/utilities/mcp/markdown-budget";
import { packageFilesFixture } from "~/utilities/mcp/test-fixtures";
import {
	closeNames,
	findRecords,
	gapTokens,
	getRecordText,
	migrateText,
	migrationsBetween,
	recordNamed,
	recordsOf,
	scrubIntent,
	ticketKey,
	workspaceSlug,
	type ApiRecord,
	type DocPageRecord,
	type MigrationGuide,
} from "~/utilities/mcp/tools";
import { versionDataFromFiles } from "~/utilities/mcp/version-data.server";

const data = versionDataFromFiles("0.93.0", packageFilesFixture());
const records = recordsOf(data);

const names = (matches: { record: { name: string } }[]) => matches.map(({ record }) => record.name);

describe("findRecords", () => {
	it("finds a component by a name from another library", () => {
		expect(names(findRecords(records, { query: "modal" }))).toEqual(["Dialog"]);
	});

	it("ranks an intent by the words of useWhen", () => {
		expect(names(findRecords(records, { query: "confirm before delete" }))[0]).toBe("Dialog");
	});

	it("does not score a function word such as before", () => {
		const avatar: ApiRecord = {
			name: "Avatar",
			kind: "component",
			importPath: "@ngrok/mantle/avatar",
			jsdoc: "A small image, with a fallback before one loads.",
			docsUrl: "https://mantle.ngrok.com/components/data-display/avatar",
			docsSlug: "components/data-display/avatar",
		};

		expect(names(findRecords([...records, avatar], { query: "confirm before delete" }))).toEqual([
			"Dialog",
		]);
	});

	it("filters by kind", () => {
		expect(findRecords(records, { query: "breakpoint", kind: "component" })).toEqual([]);
		expect(names(findRecords(records, { query: "breakpoint", kind: "hook" }))[0]).toBe(
			"useBreakpoint",
		);
	});

	it("matches a plural and a name one typo away", () => {
		expect(names(findRecords(records, { query: "dialogs" }))[0]).toBe("Dialog");
		expect(names(findRecords(records, { query: "buton" }))[0]).toBe("Button");
	});

	it("ranks a docs page by its title and description", () => {
		const page: DocPageRecord = {
			name: "Colors",
			kind: "page",
			summary: "Color system with automatic dark mode support",
			docsUrl: "https://mantle.ngrok.com/base/colors",
			docsSlug: "base/colors",
		};

		const [match] = findRecords([...records, page], { query: "dark mode colors" });

		expect(match).toEqual(expect.objectContaining({ record: page, strong: true }));
	});

	it("calls a match weak when fewer than half the query words match", () => {
		const [top] = findRecords(records, { query: "rich action editor" });

		expect(top).toEqual(expect.objectContaining({ strong: false }));
	});

	it("ranks a strong match above a weak match with a higher score", () => {
		const record = (name: string, useWhen: string): ApiRecord => ({
			name,
			kind: "component",
			importPath: `@ngrok/mantle/${name.toLowerCase()}`,
			useWhen,
			summary: useWhen,
			jsdoc: useWhen,
			docsUrl: `https://mantle.ngrok.com/components/${name.toLowerCase()}`,
			docsSlug: `components/${name.toLowerCase()}`,
		});
		const usage = record("Account Usage", "Show account limits.");
		const chooser = record("Chooser", "Pick a member.");

		const [top, next] = findRecords([usage, chooser], { query: "pick account member" });

		expect(top).toEqual(expect.objectContaining({ record: chooser, strong: true }));
		expect(next).toEqual(expect.objectContaining({ record: usage, strong: false }));
		expect(next?.score).toBeGreaterThan(top?.score ?? 0);
	});

	const part = (name: string, fields: Partial<ApiRecord> = {}): ApiRecord => ({
		name,
		kind: "component",
		importPath: `@ngrok/mantle/${name.toLowerCase()}`,
		docsUrl: `https://mantle.ngrok.com/components/${name.toLowerCase()}`,
		docsSlug: `components/${name.toLowerCase()}`,
		...fields,
	});

	it("calls a match strong when the query names the part", () => {
		const chart = part("Bar Chart");
		const meter = part("Meter", {
			useWhen: "Show a horizontal bar with a small label for scores.",
		});

		const [top] = findRecords([chart, meter], {
			query: "horizontal bar chart scores small label",
		});

		expect(top).toEqual(expect.objectContaining({ record: chart, strong: true }));
	});

	it("needs a second name or alias word to call a one-word name strong", () => {
		const badge = part("Badge", { aliases: ["tag"] });
		const code = part("Code");

		expect(findRecords([badge], { query: "removable badge tag" })[0]?.strong).toBe(true);
		expect(findRecords([code], { query: "rich editor code completion" })[0]?.strong).toBe(false);
	});

	it("scores a sibling boundary for the sibling it names", () => {
		const radio = part("Radio", {
			siblings: [{ name: "Picker", boundary: "The set is long or numeric." }],
		});
		const picker = part("Picker");

		expect(names(findRecords([radio, picker], { query: "long numeric set" }))).toEqual(["Picker"]);
	});
});

describe("gapTokens", () => {
	it("keeps generic words and drops URLs, emails, IDs, and stop words", () => {
		expect(
			gapTokens("Date range picker for https://dashboard.ngrok.com/x a@b.co ep_2abc user42"),
		).toEqual(["date", "range", "picker"]);
	});

	it("keeps at most six words", () => {
		expect(gapTokens("one two three four five six seven eight")).toHaveLength(6);
	});
});

describe("recordNamed and closeNames", () => {
	it("matches a name across case and spacing, and lists close names on a miss", () => {
		expect(recordNamed(records, "dialog")?.importPath).toBe("@ngrok/mantle/dialog");
		expect(recordNamed(records, "Dialogue")).toBeUndefined();
		expect(closeNames(records, "Dialogue")).toEqual(["Dialog"]);
	});
});

const buttonPage = [
	"# Button",
	"",
	"## Size",
	"",
	"Small and medium.",
	"",
	"## API Reference",
	"",
	"| Prop | Type |",
	"| intent | `neutral` |",
].join("\n");

describe("getRecordText", () => {
	const record = recordNamed(records, "Button");
	if (record == null) {
		throw new Error("The fixture has no Button.");
	}

	it("uses the docs API reference as the contract when the docs match the version", () => {
		const text = getRecordText({
			record,
			data,
			provenance: { dataVersion: "0.93.0", docsVersion: "0.93.0" },
			docsMarkdown: buttonPage,
		});

		expect(text).toContain("## Contract (docs for 0.93.0)\n\n## API Reference");
		expect(text).not.toContain("Small and medium.");
	});

	it("uses the version's declarations when the docs are another version, and labels the prose", () => {
		const text = getRecordText({
			record,
			data,
			provenance: { dataVersion: "0.93.0", docsVersion: "0.94.0" },
			docsMarkdown: buttonPage,
		});

		expect(text).toContain("## Contract (declarations of @ngrok/mantle@0.93.0)");
		expect(text).toContain("declare const Button: (props: ButtonProps) => unknown;");
		expect(text).toContain("## Extra context: docs prose for 0.94.0, not 0.93.0");
	});

	it("imports the name the subpath exports, and adds the parts of a compound component", () => {
		const dialog = recordNamed(records, "Dialog");
		const dataTable = recordNamed(records, "Data Table");
		if (dialog == null || dataTable == null) {
			throw new Error("The fixture has no Dialog or Data Table.");
		}
		const provenance = { dataVersion: "0.93.0", docsVersion: "0.94.0" };

		const dialogText = getRecordText({ record: dialog, data, provenance, docsMarkdown: undefined });
		const dataTableText = getRecordText({
			record: dataTable,
			data,
			provenance,
			docsMarkdown: undefined,
		});

		expect(dialogText).toContain("type ContentProps = { title: string };");
		expect(dataTableText).toContain('`import { DataTable } from "@ngrok/mantle/data-table";`');
	});

	it("names only the subpath of a utility module, and falls back to its page with no API section", () => {
		const color = recordNamed(records, "color");
		if (color == null) {
			throw new Error("The fixture has no color utility.");
		}

		const text = getRecordText({
			record: color,
			data,
			provenance: { dataVersion: "0.93.0", docsVersion: "0.93.0" },
			docsMarkdown: "# Color\n\n## Type guards\n\nisColor checks a name.",
		});

		expect(text).toContain("- Import from: `@ngrok/mantle/color`");
		expect(text).not.toContain("import { color }");
		expect(text).toContain("isColor checks a name.");
	});
});

const guide = (overrides: Partial<MigrationGuide>): MigrationGuide => ({
	slug: "migrations/0001-a-migration",
	title: "A",
	description: "Change A.",
	introducedIn: "0.90.0",
	codemodIdempotent: true,
	url: "https://mantle.ngrok.com/migrations/0001-a-migration",
	codemodSection: "## Codemod\n\nnpx …",
	...overrides,
});

describe("migrationsBetween", () => {
	it("keeps guides after from, up to and including to, in version order", () => {
		const guides = [
			guide({ slug: "c", introducedIn: "0.92.0" }),
			guide({ slug: "a", introducedIn: "0.88.0" }),
			guide({ slug: "b", introducedIn: "0.89.0" }),
			guide({ slug: "d", introducedIn: "0.93.0" }),
		];

		expect(
			migrationsBetween(guides, { from: "0.88.0", to: "0.92.0" }).map((entry) => entry.slug),
		).toEqual(["b", "c"]);
	});
});

describe("migrateText", () => {
	it("warns when a codemod is not idempotent", () => {
		const text = migrateText({
			guides: [guide({ codemodIn: "0.90.0", codemodIdempotent: false })],
			from: "0.89.0",
			to: "0.93.0",
		});

		expect(text).toContain("Warning: the codemod is not idempotent.");
	});

	it("says to migrate by hand when the target version does not ship the codemod", () => {
		const text = migrateText({
			guides: [guide({ introducedIn: "0.88.0", codemodIn: "0.90.0" })],
			from: "0.87.0",
			to: "0.88.0",
		});

		expect(text).toContain(
			"Codemod: first ships in 0.90.0, after 0.88.0. Follow the guide by hand.",
		);
	});
});

describe("fitMarkdown", () => {
	it("returns an outline when the page is over the budget", () => {
		const page = buttonPage.replace("Small and medium.", "Small and medium. ".repeat(20));

		const result = fitMarkdown({ markdown: page, budgetBytes: 300 });

		expect(result.kind).toBe("outline");
		expect(result.text).toContain("- Size\n- API Reference");
	});

	it("does not split on a heading inside a code fence", () => {
		const page = "## Usage\n\n```md\n## Not a heading\n```\n\n## API";

		const result = fitMarkdown({ markdown: page, sections: ["Usage"] });

		expect(result.text).toBe("## Usage\n\n```md\n## Not a heading\n```\n");
	});
});

describe("scrubIntent", () => {
	it("drops URLs, domains, emails, paths, and IDs, and keeps the words", () => {
		expect(
			scrubIntent(
				"Settings page for acme.example.com, mail ops@acme.io, see src/app.tsx, .env, user_id, and ticket 4412",
			),
		).toBe("Settings page for mail see and ticket");
	});

	it("drops domains and numbers in any script", () => {
		expect(scrubIntent("Show данные.рф and 商店.公司 for account １２３４５")).toBe(
			"Show and for account",
		);
	});

	it.each([
		["a fenced code span", '```updateCustomer("Confidential Customer")```'],
		["a call", 'Load data with fetch("customer-secret")'],
		["a JSX tag", 'Render <Button variant="danger">Delete Acme</Button>'],
		["an assignment", "Set const plan = premium"],
		["a block", "Handle if (isOpen) { return null }"],
	])("logs no intent that holds %s", (_, intent) => {
		expect(scrubIntent(intent)).toBeUndefined();
	});

	it("keeps quotes and apostrophes", () => {
		const intent = 'Settings page, rename the "Save changes" button, it\'s unclear';
		expect(scrubIntent(intent)).toBe(intent);
	});

	it("keeps 500 characters at most", () => {
		expect(scrubIntent("abcdef ".repeat(80))).toHaveLength(500);
	});

	it("returns undefined when no word is left", () => {
		expect(scrubIntent("https://example.com 42")).toBeUndefined();
	});
});

describe("workspaceSlug", () => {
	it("keeps a slug, lowercased and trimmed", () => {
		expect(workspaceSlug(" AI-Dashboard ")).toBe("ai-dashboard");
	});

	it.each([
		["a path", "apps/dashboard"],
		["a name with a space", "Jane Doe"],
		["an email", "jane@example.com"],
		["Slack markup", "<!channel>"],
		["a leading hyphen", "-dashboard"],
		["33 characters", "a".repeat(33)],
		["an empty value", " "],
	])("drops %s", (_, workspace) => {
		expect(workspaceSlug(workspace)).toBeUndefined();
	});
});

describe("ticketKey", () => {
	it("keeps an issue key, uppercased and trimmed", () => {
		expect(ticketKey(" fep-1867 ")).toBe("FEP-1867");
	});

	it.each(["PE-3", "MNTL-59", "K8SOP-120", "CDATA-1234567"])(
		"keeps the key %s of any team",
		(key) => {
			expect(ticketKey(key)).toBe(key);
		},
	);

	it.each([
		["a branch name", "cody/fep-1867-usage"],
		["a URL", "https://linear.app/ngrok/issue/FEP-1867"],
		["a title", "FEP-1867 Fix usage page"],
		["Slack markup", "<!channel>"],
		["a key with no number", "FEP-"],
		["a zero number", "FEP-0"],
	])("drops %s", (_, ticket) => {
		expect(ticketKey(ticket)).toBeUndefined();
	});
});
