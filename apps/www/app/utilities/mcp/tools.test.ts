import { describe, expect, it } from "vitest";
import { fitMarkdown } from "~/utilities/mcp/markdown-budget";
import { packageFilesFixture } from "~/utilities/mcp/test-fixtures";
import {
	closeNames,
	findRecords,
	getRecordText,
	migrateText,
	migrationsBetween,
	recordNamed,
	recordsOf,
	type MigrationGuide,
} from "~/utilities/mcp/tools";
import { versionDataFromFiles } from "~/utilities/mcp/version-data.server";

const data = versionDataFromFiles("0.93.0", packageFilesFixture());
const records = recordsOf(data);

describe("findRecords", () => {
	it("finds a component by a name from another library", () => {
		expect(findRecords(records, { query: "modal" }).map((record) => record.name)).toEqual([
			"Dialog",
		]);
	});

	it("ranks an intent by the words of useWhen", () => {
		expect(findRecords(records, { query: "confirm before delete" })[0]?.name).toBe("Dialog");
	});

	it("filters by kind", () => {
		expect(findRecords(records, { query: "breakpoint", kind: "component" })).toEqual([]);
		expect(findRecords(records, { query: "breakpoint", kind: "hook" })[0]?.name).toBe(
			"useBreakpoint",
		);
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
