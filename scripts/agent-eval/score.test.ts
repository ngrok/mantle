import { describe, expect, it } from "vitest";
import { addedFiles, scoreRun, type Evidence, type McpCall } from "./score.ts";
import { tasks, type Task } from "./tasks.ts";

function task(id: string): Task {
	const found = tasks.find((candidate) => candidate.id === id);
	if (found == null) {
		throw new Error(`No task ${id}`);
	}
	return found;
}

const findsDataTable: McpCall = {
	tool: "find",
	args: { query: "expandable table row detail panel" },
};

const readsDataTable: McpCall[] = [
	findsDataTable,
	{ tool: "get", args: { name: "Data Table" } },
	{ tool: "check", args: { code: "<1200 bytes>" } },
];

/** Wave 3 of the A/B: `DataTable` with `renderExpanded` and the docs' expansion state, and an accurate reply. */
const dataTableDetail: Evidence = {
	files: [
		{
			path: "src/interface-counters-table.tsx",
			added: [
				'import { DataTable, useTable } from "@ngrok/mantle/data-table";',
				"const [expanded, setExpanded] = useState<ExpandedState>({});",
				"onExpandedChange: setExpanded,",
				"renderExpanded={(row) => <ErrorPanel errors={row.original.errors} />}",
			].join("\n"),
		},
	],
	calls: readsDataTable,
	finalMessage:
		"Mantle's static `Table` can't expand rows, so the table now uses mantle's `DataTable` with `renderExpanded`.",
	typechecks: true,
};

/** Run r39 of the A/B: a hand-built toggle inside `Table`, and a false gap claim. */
const handBuiltDetail: Evidence = {
	files: [
		{
			path: "src/interface-counters-table.tsx",
			added: [
				"const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());",
				'<button type="button" aria-expanded={open} onClick={() => toggle(counter.name)}>',
			].join("\n"),
		},
	],
	calls: [findsDataTable, { tool: "get", args: { name: "Table" } }],
	finalMessage:
		"Mantle's Table has no built-in expandable rows, so I added a caret button that toggles a detail row.",
	typechecks: true,
};

describe("scoreRun", () => {
	it("passes a run that uses the mantle part, reads it, and reports it accurately", () => {
		const score = scoreRun(task("table-detail-panel"), dataTableDetail);

		expect(score.pass).toBe(true);
	});

	it("fails a hand-built expansion on every criterion it breaks, and says why", () => {
		const { pass, criteria } = scoreRun(task("table-detail-panel"), handBuiltDetail);

		expect(pass).toBe(false);
		expect(criteria.rightParts.notes).toEqual(["no DataTable", "no row expansion"]);
		expect(criteria.noHandRolling.notes).toEqual([
			"expansion state in src/interface-counters-table.tsx",
			"raw HTML control in src/interface-counters-table.tsx",
		]);
		expect(criteria.mcpUse.notes).toEqual(["no get DataTable", "no check"]);
		expect(criteria.honestClaim.notes).toEqual([`claims a gap: "${handBuiltDetail.finalMessage}"`]);
		expect(criteria.typechecks.pass).toBe(true);
	});

	it("accepts a tagged custom part and a gap report only where mantle has no part", () => {
		const customDrag: Evidence = {
			files: [
				{
					path: "src/rules-editor.tsx",
					added: [
						'import { Badge } from "@ngrok/mantle/badge";',
						'import { Switch } from "@ngrok/mantle/switch";',
						"// @mantle-gap pending: sortable list with a drag handle",
						'<button type="button" draggable onDragStart={start}>',
					].join("\n"),
				},
			],
			calls: [
				{ tool: "find", args: { query: "drag reorder list" } },
				{ tool: "get", args: { name: "Badge" } },
				{ tool: "get", args: { name: "Switch" } },
				{ tool: "check", args: { code: "<900 bytes>" } },
				{ tool: "report_gap", args: { need: "sortable list" } },
			],
			finalMessage: "Mantle has no sortable list, so the drag handle is custom and tagged.",
			typechecks: true,
		};

		const untaggedInput = {
			...customDrag,
			files: [
				{
					path: "src/rules-editor.tsx",
					added: `${customDrag.files[0]?.added}\nconst a = 1;\nconst b = 2;\nconst c = 3;\n<input value={name} />`,
				},
			],
		};

		expect(scoreRun(task("rules-reorder"), customDrag).pass).toBe(true);
		expect(scoreRun(task("rules-reorder"), untaggedInput).criteria.noHandRolling.notes).toEqual([
			"raw HTML control in src/rules-editor.tsx",
		]);
		expect(scoreRun(task("sub-row-table"), customDrag).criteria.noHandRolling.pass).toBe(false);
	});

	it("lets a file that uses the answer compose it, as the Strata docs put a grid inside it", () => {
		const { criteria } = scoreRun(task("settings-strata"), {
			files: [
				{
					path: "src/account-settings.tsx",
					added: [
						'import { Strata } from "@ngrok/mantle/strata";',
						'<Strata.Body className="grid grid-cols-1 gap-2 sm:grid-cols-2">',
					].join("\n"),
				},
			],
			calls: [],
			finalMessage: "",
			typechecks: true,
		});

		expect(criteria.noHandRolling.pass).toBe(true);
	});

	it("fails a reply that names a part the code does not use or claims a browser check", () => {
		const { criteria } = scoreRun(task("settings-strata"), {
			files: [{ path: "src/account-settings.tsx", added: "<div className='flex gap-8'>" }],
			calls: [],
			finalMessage:
				"I built the page with Strata sections. I verified the layout in the browser. I did not check it in a browser at other widths.",
			typechecks: false,
		});

		expect(criteria.honestClaim.notes).toEqual([
			"names Strata but does not use it",
			'claims a visual check: "I verified the layout in the browser."',
		]);
	});
});

describe("addedFiles", () => {
	it("keeps only the added lines of each file, so an existing import does not count", () => {
		const diff = [
			"diff --git a/src/t.tsx b/src/t.tsx",
			"--- a/src/t.tsx",
			"+++ b/src/t.tsx",
			"@@ -1 +1,2 @@",
			' import { Table } from "@ngrok/mantle/table";',
			'+import { DataTable } from "@ngrok/mantle/data-table";',
			"diff --git a/src/n.tsx b/src/n.tsx",
			"--- /dev/null",
			"+++ b/src/n.tsx",
			"@@ -0,0 +1 @@",
			"+export {};",
		].join("\n");

		expect(addedFiles(diff)).toEqual([
			{ path: "src/t.tsx", added: 'import { DataTable } from "@ngrok/mantle/data-table";' },
			{ path: "src/n.tsx", added: "export {};" },
		]);
	});
});
