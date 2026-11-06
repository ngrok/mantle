import type { AgentManifestSibling } from "../../../../../packages/mantle/scripts/agent-manifest";
import { keywordsFrom } from "~/utilities/search-index.server";
import { fitMarkdown, RESULT_BUDGET_BYTES, truncate } from "~/utilities/mcp/markdown-budget";
import { compareVersions, type VersionData } from "~/utilities/mcp/version-data.server";

/** The versions a result answers for. */
export type Provenance = {
	/** The published version of the API data: records, exports, and declarations. */
	dataVersion: string;
	/** The version of the docs prose. The prose is always the latest docs build. */
	docsVersion: string;
	/** The commit of the docs build, when the docs are ahead of the latest release. */
	docsCommit?: string;
};

/** One component, layout, hook, or utility record in a tool result. */
export type ApiRecord = {
	name: string;
	kind: "component" | "layout" | "hook" | "utility";
	importPath: string;
	status?: "stable" | "preview";
	summary?: string;
	/** The first JSDoc sentence; `find` searches it. */
	jsdoc?: string;
	useWhen?: string;
	siblings?: AgentManifestSibling[];
	aliases?: string[];
	examples?: string[];
	docsUrl: string;
	/** The docs page slug, such as `components/actions/button`. */
	docsSlug: string;
};

/** The docs slug of an absolute docs URL. */
function slugOf(url: string): string {
	return new URL(url).pathname.replace(/^\/+|\/+$/g, "") || "index";
}

/** Flattens a version's manifest into one list of records. */
export function recordsOf(data: VersionData): ApiRecord[] {
	return [
		...data.manifest.components.map((component): ApiRecord => ({
			name: component.name,
			kind: component.kind,
			importPath: component.importPath,
			status: component.status,
			summary: component.summary ?? component.jsdoc,
			jsdoc: component.jsdoc,
			useWhen: component.useWhen,
			siblings: component.siblings,
			aliases: component.aliases,
			examples: component.examples,
			docsUrl: component.docsUrl,
			docsSlug: component.slug,
		})),
		...data.manifest.hooks.map((hook): ApiRecord => ({
			name: hook.name,
			kind: "hook",
			importPath: hook.importPath,
			summary: hook.summary,
			examples: hook.examples,
			docsUrl: hook.docsUrl,
			docsSlug: slugOf(hook.docsUrl),
		})),
		...data.manifest.utilities.map((utility): ApiRecord => ({
			name: utility.name,
			kind: "utility",
			importPath: utility.importPath,
			summary: utility.summary,
			examples: utility.examples,
			docsUrl: utility.docsUrl,
			docsSlug: slugOf(utility.docsUrl),
		})),
	];
}

/** A docs page with no API record: a foundation such as Colors, a recipe, or a guide. */
export type DocPageRecord = {
	/** The page title. */
	name: string;
	kind: "page";
	/** The page description. */
	summary?: string;
	docsUrl: string;
	docsSlug: string;
};

/** One record that `find` can return. */
export type FindRecord = ApiRecord | DocPageRecord;

/** One ranked `find` result. */
export type FindMatch<T extends FindRecord> = {
	record: T;
	score: number;
	/**
	 * Whether the record clearly answers the query: its name or an alias
	 * matches, or half the query words or more match. When the top result is
	 * not strong, mantle may lack a part for the query.
	 */
	strong: boolean;
};

const FIND_LIMIT = 8;

/** The lowest word score of a strong match: two summary words, or a name word. */
const STRONG_WORD_SCORE = 6;

const STOP_WORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "when"]);

/** A name with case, spaces, and dashes removed, so "Data Table" equals "data-table" and "DataTable". */
function compact(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Folds a plural to its singular, so "tables" matches "table" and "tabs" matches "tab". */
function singular(word: string): string {
	if (word.length > 4 && word.endsWith("ies")) {
		return `${word.slice(0, -3)}y`;
	}
	return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

/** Whether one insert, delete, or substitution turns `left` into `right`. */
function withinOneEdit(left: string, right: string): boolean {
	if (Math.abs(left.length - right.length) > 1) {
		return false;
	}
	let start = 0;
	while (start < left.length && left[start] === right[start]) {
		start += 1;
	}
	let leftEnd = left.length;
	let rightEnd = right.length;
	while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) {
		leftEnd -= 1;
		rightEnd -= 1;
	}
	return leftEnd - start <= 1 && rightEnd - start <= 1;
}

/** The words of each field that `find` searches, with the weight of a hit. */
function weightedFields(record: FindRecord): [string[], number][] {
	if (record.kind === "page") {
		return [
			[keywordsFrom(record.name), 10],
			[keywordsFrom(record.docsSlug), 4],
			[keywordsFrom(record.summary), 3],
		];
	}
	return [
		[keywordsFrom(record.name), 10],
		[keywordsFrom(...(record.aliases ?? [])), 8],
		[keywordsFrom(record.useWhen), 4],
		[keywordsFrom(record.summary), 3],
		[keywordsFrom(record.jsdoc), 2],
		[keywordsFrom(...(record.siblings ?? []).map((sibling) => sibling.boundary)), 1],
	];
}

/**
 * Ranks records against an intent or a name. A name or alias match ranks
 * first, then a name one typo away; then each query word scores by where it
 * appears. A plural matches its singular. Each result says whether it is a
 * strong match.
 *
 * @example
 * findRecords(records, { query: "modal" })[0]?.record.name; // "Dialog"
 */
export function findRecords<T extends FindRecord>(
	records: readonly T[],
	{ query, kind }: { query: string; kind?: FindRecord["kind"] },
): FindMatch<T>[] {
	const wanted = compact(query);
	const tokens = keywordsFrom(query)
		.filter((token) => !STOP_WORDS.has(token))
		.map(singular);

	const scored = records
		.filter((record) => kind == null || record.kind === kind)
		.map((record) => {
			const nameKeys = [record.name, ...(record.kind === "page" ? [] : (record.aliases ?? []))].map(
				compact,
			);
			let nameScore = 0;
			if (nameKeys.includes(wanted)) {
				nameScore = 100;
			} else if (wanted.length >= 3 && nameKeys[0]?.includes(wanted)) {
				nameScore = 40;
			} else if (wanted.length >= 4 && nameKeys.some((key) => withinOneEdit(key, wanted))) {
				nameScore = 30;
			}
			let wordScore = 0;
			let matchedTokens = 0;
			for (const token of tokens) {
				let tokenScore = 0;
				for (const [words, weight] of weightedFields(record)) {
					if (
						words.some(
							(word) => singular(word) === token || (token.length >= 4 && word.startsWith(token)),
						)
					) {
						tokenScore += weight;
					}
				}
				wordScore += tokenScore;
				matchedTokens += tokenScore > 0 ? 1 : 0;
			}
			const strong =
				nameScore > 0 || (wordScore >= STRONG_WORD_SCORE && matchedTokens * 2 >= tokens.length);
			return { record, score: nameScore + wordScore, strong };
		})
		.filter(({ score }) => score > 0)
		.toSorted(
			(left, right) =>
				right.score - left.score || left.record.name.localeCompare(right.record.name),
		);

	return scored.slice(0, FIND_LIMIT);
}

/**
 * The words of a query that are safe to log as a gap signal: lowercase words
 * with no digits, at most six. A word with `@`, `.`, `:`, or a slash goes, so
 * URLs, domains, emails, and paths do not survive, and neither do IDs.
 *
 * @example
 * gapTokens("Date range picker for https://dashboard.ngrok.com/x/123"); // ["date", "range", "picker"]
 */
export function gapTokens(query: string): string[] {
	const words = query
		.toLowerCase()
		.replace(/\S*[@.:/\\]\S*/g, " ")
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length >= 3 && word.length <= 24 && !/\d/.test(word))
		.filter((word) => !STOP_WORDS.has(word));
	return Array.from(new Set(words)).slice(0, 6);
}

/** The record named `name`, by display name or identifier. */
export function recordNamed(records: readonly ApiRecord[], name: string): ApiRecord | undefined {
	const wanted = compact(name);
	return records.find((record) => compact(record.name) === wanted);
}

/** Up to five record names close to `name`, for a miss. */
export function closeNames(records: readonly ApiRecord[], name: string): string[] {
	const wanted = compact(name);
	const byName = records.filter((record) => {
		const key = compact(record.name);
		return wanted.length >= 2 && (key.includes(wanted) || wanted.includes(key));
	});
	const candidates =
		byName.length > 0 ? byName : findRecords(records, { query: name }).map(({ record }) => record);
	return candidates.slice(0, 5).map((record) => record.name);
}

/** The docs section that holds a record's prop or signature contract. */
function contractSectionOf(record: ApiRecord): string {
	if (record.kind === "hook") {
		return record.name;
	}
	return record.kind === "utility" ? "API" : "API Reference";
}

/** The identifier a record exports: `DataTable` for "Data Table", `useBreakpoint` for itself. */
function identifierOf(record: ApiRecord): string {
	return record.kind === "component" || record.kind === "layout"
		? record.name.replace(/[^A-Za-z0-9]/g, "")
		: record.name;
}

/**
 * Builds the `get` result: the record, its examples, and its contract.
 *
 * - When the docs build is the selected version, the contract is the docs API
 *   reference.
 * - Otherwise the contract is the selected version's declaration, and the docs
 *   prose follows as labeled extra context.
 *
 * @example
 * getRecordText({ record, data, provenance, docsMarkdown });
 */
export function getRecordText({
	record,
	data,
	provenance,
	docsMarkdown,
	sections,
}: {
	record: ApiRecord;
	data: VersionData;
	provenance: Provenance;
	docsMarkdown: string | undefined;
	sections?: readonly string[];
}): string {
	const header = [
		`# ${record.name}`,
		"",
		`- Import: \`import { ${identifierOf(record)} } from "${record.importPath}";\``,
		`- Kind: ${record.kind}${record.status === "preview" ? " (preview: the API can change in any release)" : ""}`,
		record.useWhen != null ? `- Use when: ${record.useWhen}` : undefined,
		record.summary != null ? `- Summary: ${record.summary}` : undefined,
		`- Docs: ${record.docsUrl}`,
		...(record.siblings ?? []).map(
			(sibling) => `- Sibling \`${sibling.name}\`: ${sibling.boundary}`,
		),
	]
		.filter((line) => line != null)
		.join("\n");

	const examples = (record.examples ?? [])
		.map((example, index) => `### Example ${index + 1}\n\n${example.trim()}`)
		.join("\n\n");

	const sectionNames = sections ?? [contractSectionOf(record)];
	const prose =
		docsMarkdown == null
			? undefined
			: fitMarkdown({ markdown: docsMarkdown, sections: sectionNames });
	const proseText = prose?.text.trim() ?? "";
	const docsMatchData = provenance.docsVersion === provenance.dataVersion;

	const contract = docsMatchData
		? [
				`## Contract (docs for ${provenance.docsVersion})`,
				"",
				proseText || "The docs page has no API section.",
			]
		: [
				`## Contract (declarations of @ngrok/mantle@${provenance.dataVersion})`,
				"",
				"```ts",
				...[identifierOf(record), `${identifierOf(record)}Props`]
					.map((name) => data.declarationOf(record.importPath, name))
					.filter((declaration) => declaration != null),
				"```",
				"",
				`## Extra context: docs prose for ${provenance.docsVersion}, not ${provenance.dataVersion}`,
				"",
				"This prose can name props that the selected version does not have. The declarations above are the contract.",
				"",
				proseText,
			];

	return truncate(
		[header, examples && `## Examples\n\n${examples}`, contract.join("\n")]
			.filter(Boolean)
			.join("\n\n"),
		RESULT_BUDGET_BYTES,
	);
}

/** The migration facts that a guide's frontmatter carries. */
export type MigrationGuide = {
	slug: string;
	title: string;
	description: string;
	/** The release that made the change this guide migrates. */
	introducedIn: string;
	/** The first release whose `dist/migrations` holds the codemod; absent for a manual guide. */
	codemodIn?: string;
	/** `false` when a second run of the codemod undoes the first. */
	codemodIdempotent: boolean;
	url: string;
	/** The guide's `## Codemod` section. */
	codemodSection: string;
};

/**
 * The migration guides to apply, in order, to go from `from` to `to`: each
 * guide with `from < introducedIn <= to`.
 *
 * @example
 * migrationsBetween(guides, { from: "0.88.0", to: "0.93.0" }).map((guide) => guide.slug);
 * // ["migrations/0009-chart-root-mode-migration", …]
 */
export function migrationsBetween(
	guides: readonly MigrationGuide[],
	{ from, to }: { from: string; to: string },
): MigrationGuide[] {
	return guides
		.filter(
			(guide) =>
				compareVersions(guide.introducedIn, from) > 0 &&
				compareVersions(guide.introducedIn, to) <= 0,
		)
		.toSorted(
			(left, right) =>
				compareVersions(left.introducedIn, right.introducedIn) ||
				left.slug.localeCompare(right.slug),
		);
}

/** Says whether the target version ships the guide's codemod. */
function codemodLine(guide: MigrationGuide, to: string): string {
	if (guide.codemodIn == null) {
		return "Codemod: none. Follow the guide by hand.";
	}
	return compareVersions(to, guide.codemodIn) >= 0
		? `Codemod: ships in ${guide.codemodIn} and later. Run it after you install ${to}.`
		: `Codemod: first ships in ${guide.codemodIn}, after ${to}. Follow the guide by hand.`;
}

/** Renders the `migrate` result for the guides in a range. */
export function migrateText({
	guides,
	from,
	to,
}: {
	guides: readonly MigrationGuide[];
	from: string;
	to: string;
}): string {
	if (guides.length === 0) {
		return `No migration guide applies from ${from} to ${to}. Read the changelog for other changes: https://mantle.ngrok.com/changelog`;
	}
	const blocks = guides.map((guide, index) => {
		const codemod = codemodLine(guide, to);
		return [
			`## ${index + 1}. ${guide.title} (introduced in ${guide.introducedIn})`,
			"",
			guide.description,
			"",
			`Guide: ${guide.url}`,
			codemod,
			guide.codemodIdempotent
				? undefined
				: "Warning: the codemod is not idempotent. Run it once only; a second run undoes the first.",
			"",
			guide.codemodSection.trim(),
		]
			.filter((line) => line != null)
			.join("\n");
	});
	return truncate(
		[`# Migrations from ${from} to ${to}`, "", "Apply them in this order.", "", ...blocks].join(
			"\n",
		),
		RESULT_BUDGET_BYTES,
	);
}
