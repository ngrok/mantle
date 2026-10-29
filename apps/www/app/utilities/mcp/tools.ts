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

const FIND_LIMIT = 8;

const STOP_WORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "when"]);

/** A name with case, spaces, and dashes removed, so "Data Table" equals "data-table" and "DataTable". */
function compact(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Ranks records against an intent or a name. A name or alias match ranks
 * first; then each query word scores by where it appears.
 *
 * @example
 * findRecords(records, { query: "modal" })[0]?.name; // "Dialog"
 */
export function findRecords(
	records: readonly ApiRecord[],
	{ query, kind }: { query: string; kind?: ApiRecord["kind"] },
): ApiRecord[] {
	const wanted = compact(query);
	const tokens = keywordsFrom(query).filter((token) => !STOP_WORDS.has(token));

	const scored = records
		.filter((record) => kind == null || record.kind === kind)
		.map((record) => {
			const nameKey = compact(record.name);
			const aliasKeys = (record.aliases ?? []).map(compact);
			const fields: [string[], number][] = [
				[keywordsFrom(record.name), 10],
				[keywordsFrom(...(record.aliases ?? [])), 8],
				[keywordsFrom(record.useWhen), 4],
				[keywordsFrom(record.summary), 3],
				[keywordsFrom(record.jsdoc), 2],
				[keywordsFrom(...(record.siblings ?? []).map((sibling) => sibling.boundary)), 1],
			];
			let score = 0;
			if (nameKey === wanted || aliasKeys.includes(wanted)) {
				score += 100;
			} else if (wanted.length >= 3 && nameKey.includes(wanted)) {
				score += 40;
			}
			for (const token of tokens) {
				for (const [words, weight] of fields) {
					if (
						words.some((word) => word === token || (token.length >= 4 && word.startsWith(token)))
					) {
						score += weight;
					}
				}
			}
			return { record, score };
		})
		.filter(({ score }) => score > 0)
		.toSorted(
			(left, right) =>
				right.score - left.score || left.record.name.localeCompare(right.record.name),
		);

	return scored.slice(0, FIND_LIMIT).map(({ record }) => record);
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
	const candidates = byName.length > 0 ? byName : findRecords(records, { query: name });
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
