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

/**
 * Function words and query filler. They name no part, so `find` does not score
 * them and `gapTokens` does not log them: "before" in "confirm before delete"
 * matches nothing.
 */
const STOP_WORDS = new Set(
	`about above after against along also although among and are around because been before behind
	being below beside between beyond but can component components could did does during either for
	from had has have her here him his how into its let lets like may might must need needs neither
	nor onto other our over per shall she should since such than that the their them then there
	these they this those though through toward towards under unless until upon use used user users
	using via want wants was were what when where whether which while who whom whose why will with
	within without would yet you your`.split(/\s+/),
);

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

/** Whether a query word hits a field word: the same singular, or a prefix of four or more letters. */
function hits(word: string, token: string): boolean {
	return singular(word) === token || (token.length >= 4 && word.startsWith(token));
}

/**
 * The alias words of a record that score for a query. A whole alias scores
 * each word. A partial alias does not score a word from the name of a
 * different record. Why: "text" and "field" of the Text Area alias "multiline
 * text field" must not rank Text Area above Field for "label a text field".
 */
function aliasWords(
	record: ApiRecord,
	tokens: readonly string[],
	nameWords: ReadonlySet<string>,
): string[] {
	const ownWords = keywordsFrom(record.name).map(singular);
	return (record.aliases ?? []).flatMap((alias) => {
		const words = keywordsFrom(alias).filter((word) => !STOP_WORDS.has(word));
		const whole = words.every((word) => tokens.some((token) => hits(word, token)));
		return whole
			? words
			: words.filter((word) => ownWords.includes(singular(word)) || !nameWords.has(singular(word)));
	});
}

/** The words of each field that `find` searches, with the weight of a hit. */
function weightedFields(
	record: FindRecord,
	tokens: readonly string[],
	nameWords: ReadonlySet<string>,
): [string[], number][] {
	if (record.kind === "page") {
		return [
			[keywordsFrom(record.name), 10],
			[keywordsFrom(record.docsSlug), 4],
			[keywordsFrom(record.summary), 3],
		];
	}
	return [
		[keywordsFrom(record.name), 10],
		[aliasWords(record, tokens, nameWords), 8],
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
 * strong match, and each strong match ranks above each weak match.
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
	const nameWords = new Set(records.flatMap((record) => keywordsFrom(record.name).map(singular)));

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
			const fields = weightedFields(record, tokens, nameWords);
			let wordScore = 0;
			let matchedTokens = 0;
			for (const token of tokens) {
				let tokenScore = 0;
				for (const [words, weight] of fields) {
					if (words.some((word) => hits(word, token))) {
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
		// Why strong first: `find` reads the strong flag of the top result only. A weak record that
		// repeats one query word in many fields must not hide a strong record.
		.toSorted(
			(left, right) =>
				Number(right.strong) - Number(left.strong) ||
				right.score - left.score ||
				left.record.name.localeCompare(right.record.name),
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

/** The longest intent that the log keeps, in characters. */
const INTENT_LOG_LENGTH = 160;

/** A code span, a tag, a call, or an assignment. An intent with one is not logged. */
const CODE_SIGNAL = /[`{};=]|<\/?\p{L}|\p{L}\(/u;

/** A number, `@`, `:`, a slash, a quote, a bracket, `_`, `$`, `#`, a leading dot, or a dot inside a word. */
const UNSAFE_WORD = /[\p{N}@:/\\<>()[\]"_$#]|\p{L}\.\p{L}|^\./u;

/**
 * The part of an agent's `intent` that is safe to log. An intent that holds
 * code (a code span, a tag, a call, or an assignment) is not logged. In other
 * intents, a word goes when it matches `UNSAFE_WORD`, so URLs, emails, paths,
 * domains, dotfiles, IDs, and quoted literals do not survive, in any script.
 * Returns `undefined` when no word is left.
 *
 * @example
 * scrubIntent("Settings page for acme.example.com with a danger zone, ticket 4412");
 * // "Settings page for with a danger zone, ticket"
 */
export function scrubIntent(intent: string): string | undefined {
	if (CODE_SIGNAL.test(intent)) {
		return undefined;
	}
	const kept = intent
		.split(/\s+/)
		.filter((word) => word !== "" && !UNSAFE_WORD.test(word))
		.join(" ")
		.slice(0, INTENT_LOG_LENGTH)
		.trim();
	return kept === "" ? undefined : kept;
}

/** A slug of 1 to 32 lowercase letters, digits, and hyphens. */
const WORKSPACE_SLUG = /^[a-z0-9][a-z0-9-]{0,31}$/;

/**
 * The part of an agent's `workspace` that is safe to log: the trimmed,
 * lowercase value when it is a slug, else `undefined`. A path, a name with a
 * space, or an email does not survive.
 *
 * @example
 * workspaceSlug(" Dashboard "); // "dashboard"
 * workspaceSlug("apps/dashboard"); // undefined
 */
export function workspaceSlug(workspace: string): string | undefined {
	const slug = workspace.trim().toLowerCase();
	return WORKSPACE_SLUG.test(slug) ? slug : undefined;
}

/** A Linear issue key: any team key in capitals (such as `FEP` or `K8SOP`), a hyphen, and a number. */
const TICKET_KEY = /^[A-Z][A-Z0-9]{0,9}-[1-9]\d{0,6}$/;

/**
 * The part of an agent's `ticket` that is safe to log: the trimmed, uppercase
 * value when it is a Linear issue key, else `undefined`. A URL, a branch name,
 * or an issue title does not survive.
 *
 * @example
 * ticketKey(" fep-1867 "); // "FEP-1867"
 * ticketKey("cody/fep-1867-usage"); // undefined
 */
export function ticketKey(ticket: string): string | undefined {
	const key = ticket.trim().toUpperCase();
	return TICKET_KEY.test(key) ? key : undefined;
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

/**
 * The name that the record's subpath exports for it: `DataTable` for "Data
 * Table", `QrCode` for "QR Code". Returns `undefined` for a record that names
 * a module of several exports, such as `color`.
 */
function identifierOf(record: ApiRecord, data: VersionData): string | undefined {
	const wanted = compact(record.name);
	const names = data.exportsBySpecifier.get(record.importPath)?.names ?? [];
	return Array.from(names).find((name) => compact(name) === wanted);
}

/** The docs prose of a contract: `sections`, else the default section, else the page. */
function contractProse({
	record,
	docsMarkdown,
	sections,
}: {
	record: ApiRecord;
	docsMarkdown: string;
	sections: readonly string[] | undefined;
}): string {
	if (sections != null) {
		return fitMarkdown({ markdown: docsMarkdown, sections }).text.trim();
	}
	const section = fitMarkdown({ markdown: docsMarkdown, sections: [contractSectionOf(record)] });
	// Why the page: some utility pages split their API across topic headings.
	const fitted =
		section.kind === "sections" && section.missing.length > 0
			? fitMarkdown({ markdown: docsMarkdown })
			: section;
	return fitted.text.trim();
}

/**
 * Builds the `get` result: the record, its examples, and its contract.
 *
 * - When the docs build is the selected version, the contract is the docs API
 *   reference, or the whole page when it has no such section.
 * - Otherwise the contract is the selected version's declarations, and the
 *   docs prose follows as labeled extra context.
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
	const identifier = identifierOf(record, data);
	const header = [
		`# ${record.name}`,
		"",
		identifier == null
			? `- Import from: \`${record.importPath}\``
			: `- Import: \`import { ${identifier} } from "${record.importPath}";\``,
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

	const proseText = docsMarkdown == null ? "" : contractProse({ record, docsMarkdown, sections });
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
				(identifier == null
					? undefined
					: data.declarationsOf(record.importPath, [identifier, `${identifier}Props`])) ??
					`// ${record.importPath} has no single declaration for ${record.name}. The docs below name its exports.`,
				"```",
			];
	const extraContext = docsMatchData
		? undefined
		: [
				`## Extra context: docs prose for ${provenance.docsVersion}, not ${provenance.dataVersion}`,
				"",
				"This prose can name props that the selected version does not have. The declarations above are the contract.",
				"",
				proseText,
			].join("\n");

	return truncate(
		// Why this order: the budget cuts from the end, so the contract goes first.
		[header, contract.join("\n"), examples && `## Examples\n\n${examples}`, extraContext]
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
