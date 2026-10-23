/**
 * The agent manifest: one structured record per component, hook, and utility
 * that `@ngrok/mantle` ships, built from the docs pages and the source JSDoc.
 *
 * Two callers build it from the same inputs. The package build reads the
 * filesystem and writes `dist/agent.json` and `dist/llms.txt`, so an agent
 * with no network reads the manifest from `node_modules`. The docs site feeds
 * its bundled raw sources and serves the same records at `/api/*.json`. The
 * module is pure: it never touches the filesystem, so both callers share it.
 */

/** The docs sidebar categories, in the order the site lists them. */
const componentCategories = [
	"Actions",
	"Charts",
	"Data Display",
	"Feedback",
	"Forms",
	"Navigation",
	"Overlays",
	"Primitives",
	"Structure",
] as const;

/** One of the docs sidebar component categories. */
type ComponentCategory = (typeof componentCategories)[number];

/**
 * A sibling component that answers an adjacent intent, read from a
 * `@siblings` JSDoc list item.
 */
type AgentManifestSibling = {
	/** The sibling's display name or part name, as written in the backticks. */
	name: string;
	/** When a consumer reaches for the sibling instead. */
	boundary: string;
};

/**
 * One component or layout entry. The fields are stable and self-describing,
 * because LLMs, code-generation agents, and external tooling read them.
 */
type AgentManifestComponent = {
	/** Display name as used in the docs sidebar (e.g. "Data Table"). */
	name: string;
	/** URL slug under the docs site (e.g. "components/data-display/data-table"). */
	slug: string;
	/**
	 * What the export is. `component` owns an interaction or widget and is
	 * documented under `/components/<category>/`; `layout` owns page or viewport
	 * structure and is documented under `/layouts/`.
	 */
	kind: "component" | "layout";
	/**
	 * Docs sidebar category (e.g. "Data Display"). Present on every
	 * `kind: "component"` entry; layouts are a flat family and carry none.
	 */
	category?: ComponentCategory;
	/** Lifecycle status. `preview` components have unstable APIs. */
	status: "stable" | "preview";
	/** ESM import path for the component (e.g. "@ngrok/mantle/data-table"). */
	importPath: string;
	/** Absolute docs URL (HTML rendering). */
	docsUrl: string;
	/** Absolute docs URL serving plain markdown. */
	markdownUrl: string;
	/** One-line summary from the docs page frontmatter, when the page has one. */
	summary?: string;
	/**
	 * First sentence of the JSDoc block on the component's primary exported
	 * identifier: the text hovering the import shows.
	 */
	jsdoc?: string;
	/**
	 * Body of each `@example` block on the primary exported identifier, in
	 * declaration order. For a compound component the first is the full part
	 * tree. Omitted when the source has none.
	 */
	examples?: string[];
	/**
	 * Search words that name the same thing in other libraries, from the docs
	 * page's `aliases` frontmatter (`modal` for Dialog, `drawer` for Sheet).
	 * Omitted when the page lists none.
	 */
	aliases?: string[];
	/**
	 * The sibling components that answer an adjacent intent, from the
	 * `@siblings` JSDoc tag. Omitted when the JSDoc carries no tag.
	 */
	siblings?: AgentManifestSibling[];
	/** The situation this component is for, from the `@useWhen` JSDoc tag. */
	useWhen?: string;
};

/** One hook entry. Every hook imports from `@ngrok/mantle/hooks`. */
type AgentManifestHook = {
	/** Exported identifier, e.g. "useBreakpoint". */
	name: string;
	/** ESM import path. Always "@ngrok/mantle/hooks". */
	importPath: string;
	/** Absolute docs URL for the hooks page. */
	docsUrl: string;
	/** Absolute markdown URL for the hooks page. */
	markdownUrl: string;
	/** One-line summary from the hook's JSDoc, when it has one. */
	summary?: string;
	/** Body of each `@example` block on the hook, in declaration order. */
	examples?: string[];
};

/** One utility entry. */
type AgentManifestUtility = {
	/** Display name (e.g. "cx", "composeRefs"). */
	name: string;
	/** ESM import path (e.g. "@ngrok/mantle/cx"). */
	importPath: string;
	/** Absolute docs URL. */
	docsUrl: string;
	/** Absolute markdown URL. */
	markdownUrl: string;
	/** One-line summary from the utility's JSDoc, when it has one. */
	summary?: string;
	/** Body of each `@example` block on the primary export, in declaration order. */
	examples?: string[];
};

/** The live endpoints that serve the same records, keyed by purpose. */
type AgentManifestEndpoints = {
	docs: string;
	forAiAgents: string;
	llmsTxt: string;
	llmsFullTxt: string;
	components: string;
	hooks: string;
	utilities: string;
	package: string;
	changelog: string;
	searchIndex: string;
	schema: string;
};

/** The whole manifest, the shape of `dist/agent.json`. */
type AgentManifest = {
	/** The package name, `@ngrok/mantle`. */
	name: string;
	/** The published package version the records describe. */
	version: string;
	/** Canonical docs origin. */
	origin: string;
	/** The live endpoints that serve the same records. */
	endpoints: AgentManifestEndpoints;
	/** Every importable `@ngrok/mantle/*` specifier, sorted. */
	subpaths: string[];
	/** Stable and preview components plus layouts, sorted by display name. */
	components: AgentManifestComponent[];
	/** Public hooks, sorted by name. */
	hooks: AgentManifestHook[];
	/** Public utilities, sorted by name. */
	utilities: AgentManifestUtility[];
};

/** A docs page as the builder reads it: its URL slug and its parsed frontmatter. */
type DocPage = {
	/** The slug without a leading slash, e.g. `components/actions/button`. */
	slug: string;
	/** The page's parsed YAML frontmatter. */
	frontmatter: Record<string, unknown>;
};

/** What a caller passes to {@link buildAgentManifest}. */
type AgentManifestInputs = {
	/** The package name. */
	name: string;
	/** The package version. */
	version: string;
	/** The docs origin every `docsUrl` and `markdownUrl` is built on, with no trailing slash. */
	origin: string;
	/** Every importable `@ngrok/mantle/*` specifier; see {@link importableSubpaths}. */
	subpaths: string[];
	/** Every docs page. The builder picks the component and layout pages itself. */
	docs: DocPage[];
	/**
	 * Reads one package source file. `basePath` is relative to `packages/mantle/src`
	 * and may omit its `.ts` or `.tsx` extension. Returns `undefined` when the
	 * file does not exist.
	 */
	readSource: (basePath: string) => string | undefined;
};

/**
 * Docs pages whose import subpath differs from their slug leaf, because the
 * component ships from a sibling's module.
 */
const importPathOverrides: Record<string, string> = {
	"components/actions/icon-button": "@ngrok/mantle/button",
	"components/forms/password-input": "@ngrok/mantle/input",
	"components/feedback/progress-bar": "@ngrok/mantle/progress",
	"components/feedback/progress-donut": "@ngrok/mantle/progress",
};

/**
 * Sorted list of importable `@ngrok/mantle/*` specifiers, derived from
 * `package.json#exports`. Skips CSS bundles, the `./package.json`
 * passthrough, and the agent artifacts the manifest itself describes.
 *
 * @example
 * importableSubpaths({ "./button": {}, "./mantle.css": "./dist/mantle.css" });
 * // => ["@ngrok/mantle/button"]
 */
function importableSubpaths(exports: Record<string, unknown>): string[] {
	const skip = new Set(["./package.json", "./agent.json", "./llms.txt"]);
	return Object.keys(exports)
		.filter((key) => key.startsWith("./") && !skip.has(key) && !key.endsWith(".css"))
		.map((key) => `@ngrok/mantle/${key.slice(2)}`)
		.toSorted((a, b) => a.localeCompare(b));
}

/**
 * Parse the YAML subset mantle's docs frontmatter uses: `key: value` scalars,
 * plain or quoted, and string lists, inline (`[a, b]`) or as `- item` lines.
 * Throws on a line it cannot read, so a build never ships a half-read page.
 *
 * @example
 * parseFrontmatter("---\ntitle: Dialog\naliases: [modal]\n---\n# Dialog");
 * // => { title: "Dialog", aliases: ["modal"] }
 */
function parseFrontmatter(source: string): Record<string, unknown> {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	if (match == null) {
		return {};
	}
	const block = match[1] ?? "";
	const result: Record<string, unknown> = {};
	const lines = block.split(/\r?\n/);
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (line.trim() === "" || line.trimStart().startsWith("#")) {
			continue;
		}
		const keyMatch = line.match(/^([A-Za-z_][\w-]*):(?:[ \t]+(.*))?$/);
		if (keyMatch == null) {
			throw new Error(`Cannot parse the frontmatter line "${line}".`);
		}
		const key = keyMatch[1] ?? "";
		const rawValue = stripComment(keyMatch[2] ?? "");
		if (rawValue === "") {
			const items: string[] = [];
			while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1] ?? "")) {
				index += 1;
				items.push(parseScalar(stripComment((lines[index] ?? "").replace(/^\s+-\s+/, ""))));
			}
			result[key] = items;
			continue;
		}
		if (rawValue.startsWith("[")) {
			if (!rawValue.endsWith("]")) {
				throw new Error(`Cannot parse the frontmatter list "${line}".`);
			}
			const inner = rawValue.slice(1, -1).trim();
			result[key] =
				inner === "" ? [] : splitInlineList(inner).map((item) => parseScalar(item.trim()));
			continue;
		}
		result[key] = parseScalar(rawValue);
	}
	return result;
}

/**
 * Walk a YAML value and report whether each index sits inside a quoted span,
 * so a comment marker or a list comma inside quotes is not read as syntax.
 * A double-quoted span honors a backslash escape; a single-quoted span honors
 * a doubled quote.
 */
function quotedSpans(value: string): boolean[] {
	const inside: boolean[] = [];
	let quote: '"' | "'" | null = null;
	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		inside.push(quote != null);
		if (quote == null) {
			if (character === '"' || character === "'") {
				quote = character;
				inside[index] = true;
			}
			continue;
		}
		if (quote === '"' && character === "\\") {
			index += 1;
			inside.push(true);
			continue;
		}
		if (character === quote) {
			if (quote === "'" && value[index + 1] === "'") {
				index += 1;
				inside.push(true);
				continue;
			}
			quote = null;
		}
	}
	return inside;
}

/**
 * Cut a YAML inline comment: a `#` at the start of the value or after
 * whitespace, outside a quoted span. Returns the value trimmed.
 *
 * @example
 * stripComment('"a # b" # c'); // '"a # b"'
 */
function stripComment(value: string): string {
	const inside = quotedSpans(value);
	for (let index = 0; index < value.length; index += 1) {
		if (
			value[index] === "#" &&
			!inside[index] &&
			(index === 0 || /\s/.test(value[index - 1] ?? ""))
		) {
			return value.slice(0, index).trim();
		}
	}
	return value.trim();
}

/**
 * Split the inside of a YAML inline list on the commas outside quoted spans,
 * so `"a, b", c` reads as two items.
 */
function splitInlineList(inner: string): string[] {
	const inside = quotedSpans(inner);
	const items: string[] = [];
	let start = 0;
	for (let index = 0; index < inner.length; index += 1) {
		if (inner[index] === "," && !inside[index]) {
			items.push(inner.slice(start, index));
			start = index + 1;
		}
	}
	items.push(inner.slice(start));
	return items;
}

/** Read one YAML scalar: a double-quoted, single-quoted, or plain string. */
function parseScalar(value: string): string {
	if (value.startsWith('"')) {
		if (!value.endsWith('"') || value.length < 2) {
			throw new Error(`Cannot parse the frontmatter scalar ${value}.`);
		}
		return value.slice(1, -1).replace(/\\(["\\])/g, "$1");
	}
	if (value.startsWith("'")) {
		if (!value.endsWith("'") || value.length < 2) {
			throw new Error(`Cannot parse the frontmatter scalar ${value}.`);
		}
		return value.slice(1, -1).replace(/''/g, "'");
	}
	return value;
}

/**
 * Locate a JSDoc block (`/** ... *\/`) immediately preceding the given
 * declaration index. Tolerates whitespace between the JSDoc close and the
 * declaration, and returns `undefined` when any other content intervenes, so
 * a JSDoc from an unrelated earlier declaration never lifts.
 */
function findPrecedingJsDoc(source: string, declarationIndex: number): string | undefined {
	const before = source.slice(0, declarationIndex).trimEnd();
	if (!before.endsWith("*/")) {
		return undefined;
	}
	const closeIndex = before.lastIndexOf("*/");
	const openIndex = before.lastIndexOf("/**", closeIndex);
	if (openIndex < 0 || openIndex >= closeIndex) {
		return undefined;
	}
	return before.slice(openIndex, closeIndex + 2);
}

/** Strip the `/** … *\/` wrapper and the per-line `*` markers. */
function jsDocLines(jsdoc: string): string[] {
	return jsdoc
		.replace(/^\/\*\*/, "")
		.replace(/\*\/$/, "")
		.split("\n")
		.map((line) => line.replace(/^\s*\*\s?/, ""));
}

/**
 * Extract the first sentence of a JSDoc block's description, ignoring
 * `@tag` lines.
 *
 * "First sentence" means the text up to the first `.` followed by whitespace
 * and an uppercase letter, or up to the first `@<tag>` line, whichever comes
 * first. The uppercase requirement keeps an abbreviation such as `e.g.`
 * whole. The search runs over the first paragraph only, so a summary that
 * ends in front of a markdown block stops there. Returns `undefined` when the
 * block has no description text.
 *
 * @example
 * firstSentenceFromJsDoc("/**\n * The palette's query field. It filters.\n *\/");
 * // => "The palette's query field."
 */
function firstSentenceFromJsDoc(jsdoc: string): string | undefined {
	const stripped = jsDocLines(jsdoc).join("\n").trim();
	if (!stripped) {
		return undefined;
	}

	const tagMatch = stripped.match(/^[ \t]*@\w+/m);
	const description = (tagMatch ? stripped.slice(0, tagMatch.index ?? 0) : stripped).trim();
	if (!description) {
		return undefined;
	}

	// Why the paragraph cut: a summary that ends in front of a markdown block (a
	// bold lead-in, a bullet list, a table row) has no uppercase letter after its
	// period, so the sentence search reaches `\.$` and swallows the whole block.
	const [firstParagraph] = description.split(/\n[ \t]*\n/);

	// An inline `{@link Target}` tag reads as raw JSDoc syntax in a plain-text
	// summary, so it renders as its label, else its target.
	const flattened = (firstParagraph ?? description)
		.replace(/\s+/g, " ")
		.replace(
			/\{@link\s+([^}|\s]+)(?:[|\s]+([^}]+))?\}/g,
			(_match, target: string, label?: string) => (label ?? target).trim(),
		)
		.trim();
	const sentenceEnd = flattened.search(/\.\s+(?=[A-Z])|\.$/);
	if (sentenceEnd === -1) {
		return flattened;
	}
	return flattened.slice(0, sentenceEnd + 1);
}

/**
 * Collect the body of every `@<tag>` block in a JSDoc comment: the text on
 * the tag line plus every line after it, up to the next block tag or the end
 * of the comment. A leading `@word` inside a fenced code block is example
 * content, not a tag, so the fence state gates tag detection.
 *
 * Returns one trimmed string per block, in source order, and an empty array
 * when the comment has no such tag.
 *
 * @example
 * blocksForTag("/**\n * @example\n * <Foo />\n * @see x\n *\/", "example");
 * // => ["<Foo />"]
 */
function blocksForTag(jsdoc: string, tag: string): string[] {
	const blocks: string[] = [];
	let current: string[] | null = null;
	let inFence = false;

	const flush = () => {
		if (current == null) {
			return;
		}
		const text = current.join("\n").trim();
		if (text) {
			blocks.push(text);
		}
		current = null;
		inFence = false;
	};

	for (const line of jsDocLines(jsdoc)) {
		if (current != null && /^[ \t]*```/.test(line)) {
			inFence = !inFence;
			current.push(line);
			continue;
		}
		const tagMatch = inFence ? null : line.match(/^[ \t]*@(\w+)/);
		if (tagMatch) {
			flush();
			if (tagMatch[1] === tag) {
				current = [];
				const inline = line.replace(/^[ \t]*@\w+[ \t]?/, "");
				if (inline.trim()) {
					current.push(inline);
				}
			}
			continue;
		}
		if (current != null) {
			current.push(line);
		}
	}
	flush();

	return blocks;
}

/**
 * Extract the body of each `@example` block from a JSDoc comment. Fenced code
 * blocks are preserved as authored.
 *
 * @example
 * examplesFromJsDoc("/**\n * @example\n * ```tsx\n * <Foo />\n * ```\n *\/");
 * // => ["```tsx\n<Foo />\n```"]
 */
function examplesFromJsDoc(jsdoc: string): string[] {
	return blocksForTag(jsdoc, "example");
}

/**
 * Read the `@siblings` list from a JSDoc comment. Each item is
 * `- \`Name\`: when to reach for it instead.` Throws on an item in any other
 * shape, so a malformed boundary fails the build instead of shipping as prose.
 *
 * @example
 * siblingsFromJsDoc("/**\n * @siblings\n * - `Well`: recessed content.\n *\/");
 * // => [{ name: "Well", boundary: "recessed content." }]
 */
function siblingsFromJsDoc(jsdoc: string): AgentManifestSibling[] {
	const siblings: AgentManifestSibling[] = [];
	for (const block of blocksForTag(jsdoc, "siblings")) {
		for (const line of block.split("\n")) {
			if (line.trim() === "") {
				continue;
			}
			const match = line.match(/^\s*-\s+`([^`]+)`:\s*(\S.*)$/);
			if (match == null) {
				throw new Error(
					`Cannot parse the @siblings item "${line.trim()}". Write it as "- \`Name\`: when to use it instead."`,
				);
			}
			siblings.push({ name: match[1] ?? "", boundary: (match[2] ?? "").trim() });
		}
	}
	return siblings;
}

/**
 * Read the `@useWhen` text from a JSDoc comment, whitespace collapsed.
 * Returns `undefined` when the comment carries no tag.
 *
 * @example
 * whenToUseFromJsDoc("/**\n * @useWhen A region has\n * no data.\n *\/");
 * // => "A region has no data."
 */
function whenToUseFromJsDoc(jsdoc: string): string | undefined {
	const [first] = blocksForTag(jsdoc, "useWhen");
	if (first == null) {
		return undefined;
	}
	return first.replace(/\s+/g, " ").trim();
}

/** Escape a string for use inside a `RegExp`. */
function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The JSDoc block immediately preceding the named declaration
 * (`function <name>` or `const <name>`, with or without `export`) in a source
 * file. Returns `undefined` when the declaration or its JSDoc is absent.
 */
function jsDocForDeclaration(source: string, name: string): string | undefined {
	const declarations = [
		new RegExp(`(?:export\\s+)?function\\s+${escapeRegex(name)}\\b`),
		new RegExp(`(?:export\\s+)?const\\s+${escapeRegex(name)}\\b`),
	];
	for (const declRegex of declarations) {
		const match = declRegex.exec(source);
		if (!match) {
			continue;
		}
		const jsdoc = findPrecedingJsDoc(source, match.index);
		if (jsdoc != null) {
			return jsdoc;
		}
	}
	return undefined;
}

/**
 * The JSDoc block a module opens with, before any declaration. A barrel
 * such as `highlight-utils.ts` documents itself this way.
 */
function leadingJsDoc(source: string): string | undefined {
	const match = source.match(/^\s*\/\*\*[\s\S]*?\*\//);
	return match?.[0];
}

/** The summary, examples, and boundary tags one JSDoc block carries. */
type JsDocFields = {
	jsdoc?: string;
	examples?: string[];
	siblings?: AgentManifestSibling[];
	useWhen?: string;
};

/** Read every manifest field from one JSDoc block. Empty fields are omitted. */
function fieldsFromJsDoc(jsdoc: string): JsDocFields {
	const examples = examplesFromJsDoc(jsdoc);
	const siblings = siblingsFromJsDoc(jsdoc);
	const useWhen = whenToUseFromJsDoc(jsdoc);
	return {
		jsdoc: firstSentenceFromJsDoc(jsdoc),
		...(examples.length > 0 ? { examples } : {}),
		...(siblings.length > 0 ? { siblings } : {}),
		...(useWhen == null ? {} : { useWhen }),
	};
}

/**
 * Walk a source file for the JSDoc on the named declaration, else the
 * module-level JSDoc, and return the manifest fields it carries. Returns an
 * empty object when the file or both blocks are absent.
 */
function fieldsForName(
	readSource: AgentManifestInputs["readSource"],
	basePath: string,
	name: string,
): JsDocFields {
	const source = readSource(basePath);
	if (source == null) {
		return {};
	}
	const jsdoc = jsDocForDeclaration(source, name) ?? leadingJsDoc(source);
	if (jsdoc == null) {
		return {};
	}
	return fieldsFromJsDoc(jsdoc);
}

/** Join path parts with `/` and drop `.` and `..` segments the way POSIX would. */
function joinPath(...parts: string[]): string {
	const segments: string[] = [];
	for (const part of parts.join("/").split("/")) {
		if (part === "" || part === ".") {
			continue;
		}
		if (part === "..") {
			segments.pop();
			continue;
		}
		segments.push(part);
	}
	return segments.join("/");
}

/**
 * Convert a kebab-case slug leaf (`data-table`) into the PascalCase
 * identifier the component is most often exported as (`DataTable`).
 */
function leafToPascal(leaf: string): string {
	return leaf
		.split("-")
		.map((part) => {
			const first = part.charAt(0);
			if (first === "") {
				return part;
			}
			return first.toUpperCase() + part.slice(1);
		})
		.join("");
}

/** Convert a kebab-case category segment (`data-display`) into its sidebar label. */
function categoryFromSegment(segment: string): ComponentCategory {
	const label = segment
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
	const category = componentCategories.find((candidate) => candidate === label);
	if (category == null) {
		throw new Error(`The docs category "${segment}" is not a sidebar category.`);
	}
	return category;
}

/** Read an optional string field off a frontmatter object. */
function stringField(frontmatter: Record<string, unknown>, key: string): string | undefined {
	const value = frontmatter[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Read an optional list of strings off a frontmatter object. */
function stringListField(
	frontmatter: Record<string, unknown>,
	key: string,
	slug: string,
): string[] | undefined {
	const value = frontmatter[key];
	if (value == null) {
		return undefined;
	}
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		throw new Error(`The frontmatter "${key}" on ${slug} must be a list of strings.`);
	}
	return value.length > 0 ? value.map(String) : undefined;
}

/**
 * The docs pages that describe an importable module: `components/<category>/<leaf>`
 * and `layouts/<leaf>`. A deeper path is a supplementary sub-page and is skipped.
 */
function componentPages(docs: DocPage[]): DocPage[] {
	return docs.filter((doc) => {
		const parts = doc.slug.split("/");
		return (
			(parts[0] === "components" && parts.length === 3) ||
			(parts[0] === "layouts" && parts.length === 2)
		);
	});
}

/** Build one component or layout entry from its docs page and source JSDoc. */
function componentEntry(
	doc: DocPage,
	inputs: AgentManifestInputs,
	subpaths: Set<string>,
): AgentManifestComponent {
	const { slug, frontmatter } = doc;
	const parts = slug.split("/");
	const leaf = parts[parts.length - 1] ?? "";
	const name = stringField(frontmatter, "title");
	if (name == null) {
		throw new Error(`The docs page ${slug} has no frontmatter title.`);
	}

	const kind = parts[0] === "layouts" ? "layout" : "component";
	const segment = parts[1] ?? "";
	const status = segment === "preview" ? "preview" : "stable";
	let category: ComponentCategory | undefined;
	if (kind === "component") {
		if (status === "preview") {
			const declared = stringField(frontmatter, "category");
			if (declared == null) {
				throw new Error(`The preview page ${slug} must declare a frontmatter category.`);
			}
			category = categoryFromSegment(declared.toLowerCase().replace(/\s+/g, "-"));
		} else {
			category = categoryFromSegment(segment);
		}
	}

	const importPath = importPathOverrides[slug] ?? `@ngrok/mantle/${leaf}`;
	if (!subpaths.has(importPath)) {
		throw new Error(
			`The docs page ${slug} names ${importPath}, which package.json does not export.`,
		);
	}

	const dir = importPath.replace(/^@ngrok\/mantle\//, "");
	const candidates = [leafToPascal(leaf), name.replace(/\s+/g, "")];
	let fields: JsDocFields = {};
	for (const basePath of [
		joinPath("components", dir, leaf),
		joinPath("components", dir, "index"),
	]) {
		for (const candidate of new Set(candidates)) {
			fields = fieldsForName(inputs.readSource, basePath, candidate);
			if (fields.jsdoc != null) {
				break;
			}
		}
		if (fields.jsdoc != null) {
			break;
		}
	}

	const summary = stringField(frontmatter, "description");
	const aliases = stringListField(frontmatter, "aliases", slug);
	return {
		name,
		slug,
		kind,
		...(category == null ? {} : { category }),
		status,
		importPath,
		docsUrl: `${inputs.origin}/${slug}`,
		markdownUrl: `${inputs.origin}/${slug}.md`,
		...(summary == null ? {} : { summary }),
		...fields,
		...(aliases == null ? {} : { aliases }),
	};
}

/** Strip every `export type { ... } from "..."` block from a barrel's source. */
function removeExportTypeBlocks(source: string): string {
	return source.replace(/export\s+type\s*\{[\s\S]*?\}\s*from\s*"[^"]+"\s*;?/g, "");
}

/**
 * Parse a barrel file and return one entry per exported value, skipping
 * `export type` declarations. `sourcePath` is relative to `packages/mantle/src`
 * with no extension.
 */
function valueExports(barrelSource: string, dir: string): { name: string; sourcePath: string }[] {
	const exportFromRegex = /export\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"/g;
	const entries: { name: string; sourcePath: string }[] = [];
	for (const match of removeExportTypeBlocks(barrelSource).matchAll(exportFromRegex)) {
		const namesBlob = match[1] ?? "";
		const fromPath = match[2] ?? "";
		const names = namesBlob
			.split(",")
			.map((piece) => piece.replace(/\/\/.*$/g, "").trim())
			.filter((piece) => piece.length > 0);
		const sourcePath = joinPath(dir, fromPath.replace(/\.js$/, ""));
		for (const name of names) {
			entries.push({ name, sourcePath });
		}
	}
	return entries;
}

/** Build the hook entries from the `hooks/index` barrel. */
function hookEntries(inputs: AgentManifestInputs): AgentManifestHook[] {
	const barrel = inputs.readSource("hooks/index");
	if (barrel == null) {
		throw new Error("The hooks barrel hooks/index is missing.");
	}
	const docsUrl = `${inputs.origin}/hooks`;
	const markdownUrl = `${inputs.origin}/hooks.md`;
	const hooks: AgentManifestHook[] = [];
	const seen = new Set<string>();
	for (const { name, sourcePath } of valueExports(barrel, "hooks")) {
		// A plain constant such as `breakpoints` sits in the barrel for proximity.
		// A hook starts with `use`; an imperative read that mirrors one starts with `get`.
		if (seen.has(name) || (!/^use[A-Z]/.test(name) && !/^get[A-Z]/.test(name))) {
			continue;
		}
		seen.add(name);
		const fields = fieldsForName(inputs.readSource, sourcePath, name);
		hooks.push({
			name,
			importPath: "@ngrok/mantle/hooks",
			docsUrl,
			markdownUrl,
			...(fields.jsdoc == null ? {} : { summary: fields.jsdoc }),
			...(fields.examples == null ? {} : { examples: fields.examples }),
		});
	}
	return hooks.toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * The curated utilities. `cx`, `color`, and `highlight-utils` are subpath
 * exports of their own; `composeRefs`, `inView`, and `sorting` ship through
 * the `@ngrok/mantle/utils` barrel and have their own docs pages. `./hooks`
 * is the hooks manifest and `./types` has no runtime entry, so neither is here.
 */
const utilityDescriptors = [
	{
		name: "cx",
		docsSlug: "utils/cx",
		importPath: "@ngrok/mantle/cx",
		sourcePath: "utils/cx/cx",
		primaryExport: "cx",
	},
	{
		name: "color",
		docsSlug: "utils/color",
		importPath: "@ngrok/mantle/color",
		sourcePath: "utils/color/colors",
		primaryExport: "namedColors",
	},
	{
		name: "composeRefs",
		docsSlug: "utils/compose-refs",
		importPath: "@ngrok/mantle/utils",
		sourcePath: "utils/compose-refs/compose-refs",
		primaryExport: "composeRefs",
	},
	{
		name: "inView",
		docsSlug: "utils/in-view",
		importPath: "@ngrok/mantle/utils",
		sourcePath: "utils/in-view",
		primaryExport: "inView",
	},
	{
		name: "sorting",
		docsSlug: "utils/sorting",
		importPath: "@ngrok/mantle/utils",
		sourcePath: "utils/sorting/compare",
		primaryExport: "compareDatesNewestToOldest",
	},
	// `highlight-utils.ts` is a barrel, so the module-level JSDoc is its summary.
	{
		name: "highlight-utils",
		docsSlug: "utils/highlight-utils",
		importPath: "@ngrok/mantle/highlight-utils",
		sourcePath: "components/code-block/highlight-utils",
		primaryExport: "decorateHighlightedHtml",
	},
] as const;

/** Build the utility entries from the curated list. */
function utilityEntries(inputs: AgentManifestInputs): AgentManifestUtility[] {
	return utilityDescriptors
		.map((descriptor): AgentManifestUtility => {
			const fields = fieldsForName(
				inputs.readSource,
				descriptor.sourcePath,
				descriptor.primaryExport,
			);
			return {
				name: descriptor.name,
				importPath: descriptor.importPath,
				docsUrl: `${inputs.origin}/${descriptor.docsSlug}`,
				markdownUrl: `${inputs.origin}/${descriptor.docsSlug}.md`,
				...(fields.jsdoc == null ? {} : { summary: fields.jsdoc }),
				...(fields.examples == null ? {} : { examples: fields.examples }),
			};
		})
		.toSorted((a, b) => a.name.localeCompare(b.name));
}

/** The live endpoints on `origin` that serve the same records. */
function endpointsFor(origin: string): AgentManifestEndpoints {
	return {
		docs: `${origin}/`,
		forAiAgents: `${origin}/for-ai-agents`,
		llmsTxt: `${origin}/llms.txt`,
		llmsFullTxt: `${origin}/llms-full.txt`,
		components: `${origin}/api/components.json`,
		hooks: `${origin}/api/hooks.json`,
		utilities: `${origin}/api/utils.json`,
		package: `${origin}/api/package.json`,
		changelog: `${origin}/api/changelog.json`,
		searchIndex: `${origin}/api/search-index.json`,
		schema: `${origin}/api/schema.json`,
	};
}

/**
 * Build the agent manifest from the docs pages and the package source. Throws
 * when a page names no importable module, a preview page declares no category,
 * or a `@siblings` item is malformed, so the build fails before a bad record ships.
 *
 * @example
 * const manifest = buildAgentManifest({
 *   name: "@ngrok/mantle",
 *   version: "0.89.0",
 *   origin: "https://mantle.ngrok.com",
 *   subpaths: importableSubpaths(packageJson.exports),
 *   docs: [{ slug: "components/actions/button", frontmatter: { title: "Button" } }],
 *   readSource: (basePath) => sources[basePath],
 * });
 * manifest.components[0]?.importPath; // => "@ngrok/mantle/button"
 */
function buildAgentManifest(inputs: AgentManifestInputs): AgentManifest {
	const subpaths = new Set(inputs.subpaths);
	const components = componentPages(inputs.docs)
		.map((doc) => componentEntry(doc, inputs, subpaths))
		.toSorted((a, b) => a.name.localeCompare(b.name));
	return {
		name: inputs.name,
		version: inputs.version,
		origin: inputs.origin,
		endpoints: endpointsFor(inputs.origin),
		subpaths: [...inputs.subpaths].toSorted((a, b) => a.localeCompare(b)),
		components,
		hooks: hookEntries(inputs),
		utilities: utilityEntries(inputs),
	};
}

/** One index line for a component, hook, or utility. */
function indexLine(entry: {
	name: string;
	importPath: string;
	summary?: string;
	jsdoc?: string;
	status?: string;
	aliases?: string[];
}): string {
	const status = entry.status === "preview" ? ", preview" : "";
	const summary = entry.summary ?? entry.jsdoc;
	const aliases = entry.aliases == null ? "" : ` Also called: ${entry.aliases.join(", ")}.`;
	return `- **${entry.name}** (\`${entry.importPath}\`${status})${summary == null ? "" : `: ${summary}`}${aliases}`;
}

/**
 * Render the manifest as the `dist/llms.txt` index: every component, layout,
 * hook, and utility on one line each, with its import path and summary, so an
 * agent with no network can pick a module and then read its `.d.ts`.
 *
 * @example
 * renderLlmsTxt(manifest).startsWith("# @ngrok/mantle (0.89.0)"); // => true
 */
function renderLlmsTxt(manifest: AgentManifest): string {
	const { endpoints } = manifest;
	const components = manifest.components.filter((entry) => entry.kind === "component");
	const layouts = manifest.components.filter((entry) => entry.kind === "layout");
	return [
		`# ${manifest.name} (${manifest.version})`,
		"",
		`> Offline index shipped inside the ${manifest.name} npm package. The full records, with examples and sibling boundaries, are in agent.json beside this file. Neither file lists props: read the bundled type declarations (\`<subpath>.d.ts\` beside this file) for every prop and its JSDoc. Live docs: ${endpoints.forAiAgents}.`,
		"",
		`Docs: ${endpoints.docs}`,
		`Agent guide: ${endpoints.forAiAgents}`,
		`Index: ${endpoints.llmsTxt}`,
		`Full text: ${endpoints.llmsFullTxt}`,
		"",
		"## Endpoints",
		"",
		`- Components: ${endpoints.components}`,
		`- Hooks: ${endpoints.hooks}`,
		`- Utilities: ${endpoints.utilities}`,
		`- Package info: ${endpoints.package}`,
		`- Changelog: ${endpoints.changelog}`,
		`- Search index: ${endpoints.searchIndex}`,
		`- Schemas: ${endpoints.schema}`,
		"",
		"## Components",
		"",
		...components.map(indexLine),
		"",
		"## Layouts",
		"",
		...layouts.map(indexLine),
		"",
		"## Hooks",
		"",
		...manifest.hooks.map(indexLine),
		"",
		"## Utilities",
		"",
		...manifest.utilities.map(indexLine),
		"",
		"## Importable subpaths",
		"",
		...manifest.subpaths.map((subpath) => `- \`${subpath}\``),
		"",
	].join("\n");
}

export {
	blocksForTag,
	buildAgentManifest,
	componentCategories,
	examplesFromJsDoc,
	firstSentenceFromJsDoc,
	importableSubpaths,
	parseFrontmatter,
	renderLlmsTxt,
	siblingsFromJsDoc,
	whenToUseFromJsDoc,
};

export type {
	AgentManifest,
	AgentManifestComponent,
	AgentManifestHook,
	AgentManifestInputs,
	AgentManifestSibling,
	AgentManifestUtility,
	ComponentCategory,
	DocPage,
};
