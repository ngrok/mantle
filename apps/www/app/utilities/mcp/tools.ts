import type { AgentManifestSibling } from "../../../../../packages/mantle/scripts/agent-manifest";
import { keywordsFrom } from "~/utilities/search-index.server";
import { hasProfanity } from "~/utilities/mcp/content-safety";
import { fitMarkdown, RESULT_BUDGET_BYTES, truncate } from "~/utilities/mcp/markdown-budget";
import { compareVersions, type VersionData } from "~/utilities/mcp/version-data.server";

/** The versions a result answers for. */
export type Provenance = {
	/** The published version of the API data: records, exports, and declarations. */
	dataVersion: string;
	/**
	 * The version of the docs prose. The prose is always the latest docs build.
	 * It differs from `dataVersion` when the build is not that release, even
	 * when the version numbers match.
	 */
	docsVersion: string;
	/** The commit of the docs build, when the docs are not the selected release. */
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
export function recordsOf(data: Pick<VersionData, "manifest">): ApiRecord[] {
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

/**
 * A docs page with no API record. A page under `recipes/` is a `recipe`: a
 * composition of mantle parts that `get` returns. Other pages, such as Colors or a guide,
 * are a `page` that `read_docs` returns.
 */
export type DocPageRecord = {
	/** The page title. */
	name: string;
	kind: "page" | "recipe";
	/** The page description. */
	summary?: string;
	/** The `aliases` frontmatter: other names for the page, such as a designer's words. */
	aliases?: string[];
	/** The `useWhen` frontmatter. */
	useWhen?: string;
	/** The `parts` frontmatter: the mantle record names that the page composes. */
	parts?: string[];
	/**
	 * The import paths of the API records that own the page in the docs build,
	 * such as `@ngrok/mantle/drawer`. `find` drops the page for a version that
	 * exports none of them.
	 */
	importPaths?: string[];
	docsUrl: string;
	docsSlug: string;
};

/** One record that `find` can return. */
export type FindRecord = ApiRecord | DocPageRecord;

/** Whether a record is a docs page, not an API record. */
export function isDocPage(record: FindRecord): record is DocPageRecord {
	return record.kind === "page" || record.kind === "recipe";
}

/** One ranked `find` result. */
export type FindMatch<T extends FindRecord> = {
	record: T;
	score: number;
	/**
	 * Whether the record clearly answers the query: its name or an alias
	 * matches, the query contains each word of its name and a second name or
	 * alias word, or half the query words or more match. A recipe also needs
	 * the query to name it. When the top result is not strong, mantle may lack
	 * a part for the query.
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
	nor onto other our over pattern patterns per shall she should since such than that the their them then there
	these they this those though through toward towards under unless until upon use used user users
	using via want wants was were what when where whether which while who whom whose why will with
	within without would yet you your`.split(/\s+/),
);

/**
 * Words that ask for exactly one pick. Why: a bare count, as in "chart with
 * a single series" or "many options", counts things, not picks.
 */
const ONE_PICK =
	/\b(one of|(pick|choose|select)s? (exactly |only )?(one|a single)|only one|exactly one|single (choice|select|selection|pick|answer)|exclusive)\b/;

/** Words that ask for several picks, with the same rule as `ONE_PICK`. */
const MANY_PICKS =
	/\b((pick|choose|select|check)s? (several|multiple|many|any number)|(several|multiple|many) (selectable|selected|selection|picks)|one or more|all that apply|multi-?select)\b/;

/**
 * How many picks a query asks for, or undefined when it says nothing or both.
 * Why: "pick one" and "select all that apply" name the same cards, so only
 * this tells `RadioGroup` from `CheckboxGroup`.
 */
function queryPickCount(text: string): "one" | "many" | undefined {
	const lower = text.toLowerCase();
	const many = MANY_PICKS.test(lower);
	// Why: "select one or more" also contains "select one".
	const one = ONE_PICK.test(lower.replace(/\bone or more\b/g, ""));
	if (one === many) {
		return undefined;
	}
	return one ? "one" : "many";
}

/**
 * How many picks a `useWhen` states with a pick verb, or undefined.
 * Why: "many points" or "several lines" counts content, not picks.
 */
function recordPickCount(text: string | undefined): "one" | "many" | undefined {
	const lower = text?.toLowerCase() ?? "";
	if (/\b(pick|choose|select)s? (exactly )?one\b(?! \w+ or)|\bsingle choice\b/.test(lower)) {
		return "one";
	}
	return /\b(pick|choose|select)s? (several|multiple|any number)\b|all that apply/.test(lower)
		? "many"
		: undefined;
}

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
	record: FindRecord,
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

/**
 * The `@siblings` boundaries of all records, by the compact name of the
 * sibling that each boundary names. Why: a boundary tells when to use the
 * sibling, so its words describe the sibling, not the record that lists it.
 * "`Select`: the set is long" is a reason to use Select, not Radio Group.
 */
function boundariesBySibling(records: readonly FindRecord[]): Map<string, string[]> {
	const boundaries = new Map<string, string[]>();
	for (const record of records) {
		for (const sibling of isDocPage(record) ? [] : (record.siblings ?? [])) {
			const key = compact(sibling.name);
			boundaries.set(key, [...(boundaries.get(key) ?? []), sibling.boundary]);
		}
	}
	return boundaries;
}

/** The lowercase singular words of a text, short words included. */
function wordsOf(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.map(singular);
}

/**
 * Whether the query contains each word of the record name, and two or more
 * words of its name and aliases. Short words count, so "qr code" names QR
 * Code. Why two: one word is weak evidence. "rich text editor with code
 * completion" contains Code, but Code is not an editor. Docs pages do not
 * count: their titles are sentences, not part names.
 */
function namedInQuery(record: FindRecord, queryWords: ReadonlySet<string>): boolean {
	if (isDocPage(record)) {
		return false;
	}
	const words = wordsOf(record.name);
	const named = new Set(
		[...words, ...(record.aliases ?? []).flatMap(wordsOf)].filter((word) => queryWords.has(word)),
	);
	return words.length > 0 && words.every((word) => queryWords.has(word)) && named.size >= 2;
}

/**
 * The title words of a recipe that no part names. Why: a recipe title is a
 * sentence about parts. "Query" in "Query from the URL" names the Query part,
 * so it must not rank the recipe above that part.
 */
function ownTitleWords(record: DocPageRecord, partWords: ReadonlySet<string>): string[] {
	return keywordsFrom(record.name).filter(
		(word) => !STOP_WORDS.has(word) && !partWords.has(singular(word)),
	);
}

/**
 * Whether the query names a recipe: half or more of its own title words, or
 * each word of one alias. Why: one shared word, such as "page" in "List Page
 * Loading States", is weak evidence.
 */
function namesRecipe(
	record: DocPageRecord,
	tokens: readonly string[],
	partWords: ReadonlySet<string>,
): boolean {
	const hitCount = (words: string[]) =>
		words.filter((word) => tokens.some((token) => hits(word, token))).length;
	const title = ownTitleWords(record, partWords);
	if (title.length > 0 && hitCount(title) * 2 >= title.length) {
		return true;
	}
	return (record.aliases ?? []).some((alias) => {
		const words = keywordsFrom(alias).filter((word) => !STOP_WORDS.has(word));
		return words.length > 0 && hitCount(words) === words.length;
	});
}

/** The words of each field that `find` searches, with the weight of a hit. */
function weightedFields(
	record: FindRecord,
	{
		tokens,
		nameWords,
		partWords,
		boundaries,
	}: {
		tokens: readonly string[];
		nameWords: ReadonlySet<string>;
		partWords: ReadonlySet<string>;
		boundaries: ReadonlyMap<string, string[]>;
	},
): [string[], number][] {
	if (record.kind === "recipe") {
		const own = ownTitleWords(record, partWords);
		return [
			[own, 10],
			[keywordsFrom(record.name).filter((word) => !own.includes(word)), 3],
			[aliasWords(record, tokens, nameWords), 8],
			[keywordsFrom(record.useWhen), 4],
			[keywordsFrom(record.docsSlug), 4],
			[keywordsFrom(record.summary), 3],
		];
	}
	if (isDocPage(record)) {
		return [
			[keywordsFrom(record.name), 10],
			[aliasWords(record, tokens, nameWords), 8],
			[keywordsFrom(record.useWhen), 4],
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
		[keywordsFrom(...(boundaries.get(compact(record.name)) ?? [])), 1],
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
	{ query: rawQuery, kind }: { query: string; kind?: FindRecord["kind"] },
): FindMatch<T>[] {
	// Why: the word split drops a lone `/`, so "press / to search" lost its key. Read it as the
	// `slash` that the docs spell.
	const query = rawQuery.replace(/(?<=^|\s)[`'"]?\/[`'"]?(?=\s|$)/g, "slash");
	const wanted = compact(query);
	// Why: `⌘` is no word, so "⌘K palette" must read as "cmd k palette" to reach the `cmd k` alias.
	const tokens = keywordsFrom(query.replaceAll("⌘", " cmd "))
		.filter((token) => !STOP_WORDS.has(token))
		.map(singular);
	const nameWords = new Set(records.flatMap((record) => keywordsFrom(record.name).map(singular)));
	const partWords = new Set(
		records
			.filter((record) => !isDocPage(record))
			.flatMap((record) => keywordsFrom(record.name).map(singular)),
	);
	const queryWords = new Set(wordsOf(query));
	const boundaries = boundariesBySibling(records);
	const queryPicks = queryPickCount(query);

	const scored = records
		.filter((record) => kind == null || record.kind === kind)
		.map((record) => {
			const nameKeys = [record.name, ...(record.aliases ?? [])].map(compact);
			let nameScore = 0;
			if (nameKeys.includes(wanted)) {
				nameScore = 100;
			} else if (wanted.length >= 3 && record.kind !== "recipe" && nameKeys[0]?.includes(wanted)) {
				nameScore = 40;
			} else if (wanted.length >= 4 && nameKeys.some((key) => withinOneEdit(key, wanted))) {
				nameScore = 30;
			}
			const fields = weightedFields(record, { tokens, nameWords, partWords, boundaries });
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
			const named = nameScore > 0 || namedInQuery(record, queryWords);
			// Why: a part that takes several picks cannot answer "pick one", and the reverse,
			// unless the query names it: "single checkbox" still means Checkbox.
			const recordPicks = queryPicks == null ? undefined : recordPickCount(record.useWhen);
			const nameWordsInQuery = wordsOf(record.name).every((word) => queryWords.has(word));
			if (!named && !nameWordsInQuery && recordPicks != null && recordPicks !== queryPicks) {
				return { record, score: Math.floor(wordScore / 2), strong: false };
			}
			const strong =
				named ||
				(wordScore >= STRONG_WORD_SCORE &&
					matchedTokens * 2 >= tokens.length &&
					(record.kind !== "recipe" || namesRecipe(record, tokens, partWords)));
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
 * URLs, domains, emails, and paths do not survive, and neither do IDs. A
 * query with profanity has no safe words.
 *
 * @example
 * gapTokens("Date range picker for https://dashboard.ngrok.com/x/123"); // ["date", "range", "picker"]
 */
export function gapTokens(query: string): string[] {
	if (hasProfanity(query)) {
		return [];
	}
	const words = query
		.toLowerCase()
		.replace(/\S*[@.:/\\]\S*/g, " ")
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length >= 3 && word.length <= 24 && !/\d/.test(word))
		.filter((word) => !STOP_WORDS.has(word));
	return Array.from(new Set(words)).slice(0, 6);
}

/** The longest intent that the log keeps, in characters. */
const INTENT_LOG_LENGTH = 500;

/**
 * A code span, a tag, a call, an assignment, or a semicolon with no space
 * after it. An intent with one is not logged. Why the space: prose uses `; `.
 */
const CODE_SIGNAL = /[`{}=]|;(?!\s|$)|<\/?\p{L}|\p{L}\(/u;

/**
 * A number, `@`, `:`, a slash, a bracket, `_`, `$`, `#`, a dot inside a word,
 * or a leading dot. A leading dot can follow quotes, so `".env"` goes too.
 */
const UNSAFE_WORD = /[\p{N}@:/\\<>()[\]_$#]|\p{L}\.\p{L}|^\p{P}*\./u;

/**
 * The part of an agent's free text, such as `intent`, that is safe to log.
 * Backticks around a span go first, so "get `Tabs`" logs as "get Tabs". Text
 * that still holds code (a tag, a call, or an assignment) is not logged. In other text, a word goes when it matches `UNSAFE_WORD`, so URLs,
 * emails, paths, domains, dotfiles, and IDs do not survive, in any script.
 * Text with profanity is not logged. Returns `undefined` when no word is left.
 *
 * @example
 * scrubIntent("Settings page for acme.example.com with a danger zone, ticket 4412");
 * // "Settings page for with a danger zone, ticket"
 */
export function scrubIntent(intent: string): string | undefined {
	const unwrapped = intent.replace(/`([^`]+)`/g, "$1");
	if (CODE_SIGNAL.test(unwrapped) || hasProfanity(unwrapped)) {
		return undefined;
	}
	const kept = unwrapped
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
 * lowercase value when it is a clean slug, else `undefined`. A path, a name
 * with a space, an email, or profanity does not survive.
 *
 * @example
 * workspaceSlug(" Dashboard "); // "dashboard"
 * workspaceSlug("apps/dashboard"); // undefined
 */
export function workspaceSlug(workspace: string): string | undefined {
	const slug = workspace.trim().toLowerCase();
	return WORKSPACE_SLUG.test(slug) && !hasProfanity(slug) ? slug : undefined;
}

/** A Linear issue key: any team key in capitals (such as `FEP` or `K8SOP`), a hyphen, and a number. */
const TICKET_KEY = /^[A-Z][A-Z0-9]{0,9}-[1-9]\d{0,6}$/;

/**
 * The part of an agent's `ticket` that is safe to log: the trimmed, uppercase
 * value when it is a clean Linear issue key, else `undefined`. A URL, a branch
 * name, an issue title, or profanity does not survive.
 *
 * @example
 * ticketKey(" fep-1867 "); // "FEP-1867"
 * ticketKey("cody/fep-1867-usage"); // undefined
 */
export function ticketKey(ticket: string): string | undefined {
	const key = ticket.trim().toUpperCase();
	return TICKET_KEY.test(key) && !hasProfanity(key) ? key : undefined;
}

/** The record named `name`, by display name or identifier. */
export function recordNamed(records: readonly ApiRecord[], name: string): ApiRecord | undefined {
	const wanted = compact(name);
	return records.find((record) => compact(record.name) === wanted);
}

/** The recipe named `name`, by title or alias. */
export function recipeNamed(
	pages: readonly DocPageRecord[],
	name: string,
): DocPageRecord | undefined {
	const wanted = compact(name);
	return pages.find(
		(page) =>
			page.kind === "recipe" &&
			[page.name, ...(page.aliases ?? [])].some((key) => compact(key) === wanted),
	);
}

/**
 * Builds the `get` result for a recipe: its parts with their imports at the
 * selected version, then its docs page. The docs are the latest build, so a
 * part that the selected version lacks says so.
 *
 * @example
 * getRecipeText({ recipe, records, dataVersion: "0.94.1", docsMarkdown });
 */
export function getRecipeText({
	recipe,
	records,
	dataVersion,
	docsMarkdown,
	sections,
}: {
	recipe: DocPageRecord;
	records: readonly ApiRecord[];
	dataVersion: string;
	docsMarkdown: string | undefined;
	sections?: readonly string[];
}): string {
	const parts = (recipe.parts ?? []).map((name) => {
		const record = recordNamed(records, name);
		return record == null
			? `  - ${name}: not in @ngrok/mantle@${dataVersion}`
			: `  - ${record.name}: \`${record.importPath}\``;
	});
	const header = [
		`# ${recipe.name}`,
		"",
		"- Kind: recipe (a composition of mantle parts)",
		recipe.useWhen == null ? undefined : `- Use when: ${recipe.useWhen}`,
		recipe.summary == null ? undefined : `- Summary: ${recipe.summary}`,
		`- Docs: ${recipe.docsUrl}`,
		...(parts.length === 0 ? [] : ["- Parts:", ...parts]),
	]
		.filter((line) => line != null)
		.join("\n");
	// Why the smaller budget: the header shares the result, and an outline beats a page cut mid-fence.
	const fitted =
		docsMarkdown == null
			? undefined
			: fitMarkdown({
					markdown: docsMarkdown,
					sections,
					budgetBytes: RESULT_BUDGET_BYTES - new TextEncoder().encode(header).length - 200,
				});
	const missing =
		fitted?.kind === "sections" && fitted.missing.length > 0
			? `No heading matched: ${fitted.missing.join(", ")}.`
			: undefined;
	return truncate(
		[header, fitted?.text.trim(), missing].filter(Boolean).join("\n\n"),
		RESULT_BUDGET_BYTES,
	);
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
 * Marks each docs table row whose first cell names an identifier that the docs
 * build declares and `version` does not, such as a prop added after it. A prop
 * that both inherit from a dependency, such as a Radix prop, is in neither.
 *
 * @example
 * markUndeclared("| `keyboardShortcut` | `boolean` |", { version: "0.94.1", versionWords, docsWords });
 * // => "| `keyboardShortcut` (not in 0.94.1) | `boolean` |"
 */
function markUndeclared(
	markdown: string,
	{
		version,
		versionWords,
		docsWords,
	}: { version: string; versionWords: ReadonlySet<string>; docsWords: ReadonlySet<string> },
): string {
	return markdown.replace(
		/^\|\s*`([A-Za-z_$][\w$]*)\??`(?=\s*\|)/gm,
		(cell: string, name: string) =>
			docsWords.has(name) && !versionWords.has(name) ? `${cell} (not in ${version})` : cell,
	);
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
	docsWords,
	sections,
}: {
	record: ApiRecord;
	data: VersionData;
	provenance: Provenance;
	docsMarkdown: string | undefined;
	/** Each identifier in the docs build's declarations for the record, when the build has them. */
	docsWords?: ReadonlySet<string>;
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
				// Why every export: a utility module, such as `color`, has no one declaration that names the record.
				data.declarationsOf(
					record.importPath,
					identifier == null
						? Array.from(data.exportsBySpecifier.get(record.importPath)?.names ?? [])
						: [identifier, `${identifier}Props`],
				) ??
					`// ${record.importPath} has no declarations for ${record.name}. The docs name its exports.`,
				"```",
			];
	const extraContext = docsMatchData
		? undefined
		: [
				`## Extra context: docs prose for ${provenance.docsVersion}, not ${provenance.dataVersion}`,
				"",
				`This prose can name props that the selected version does not have. A table row marked "not in ${provenance.dataVersion}" names one. The declarations section is the contract.`,
				"",
				docsWords == null
					? proseText
					: markUndeclared(proseText, {
							version: data.version,
							versionWords: data.declaredWordsOf(record.importPath),
							docsWords,
						}),
			].join("\n");

	// Why this order: the budget cuts from the end, so the contract goes first.
	// Requested sections go first instead, because a large declaration can fill the budget.
	const parts =
		sections == null
			? [header, contract.join("\n"), examples && `## Examples\n\n${examples}`, extraContext]
			: [header, extraContext, contract.join("\n"), examples && `## Examples\n\n${examples}`];
	return truncate(parts.filter(Boolean).join("\n\n"), RESULT_BUDGET_BYTES);
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
