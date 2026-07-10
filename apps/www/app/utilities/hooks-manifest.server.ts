import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import { canonicalHref, canonicalOrigin } from "~/utilities/canonical-origin";
import {
	hooksSrcDir,
	readSourceFile,
	sourcePathFromExport,
} from "~/utilities/mantle-source.server";

/**
 * One entry in the public hooks manifest. Designed for ingestion by
 * LLMs, code-generation agents, and external tooling — fields are stable
 * and self-describing.
 */
export type ManifestHook = {
	/** Exported identifier, e.g. "useBreakpoint". */
	name: string;
	/** ESM import path. Always "@ngrok/mantle/hooks". */
	importPath: string;
	/** Absolute docs URL for the hooks page. */
	docsUrl: string;
	/** Absolute markdown URL for the hooks page. */
	markdownUrl: string;
	/** One-line summary from the hook's JSDoc, if available. */
	summary?: string;
};

/** Top-level shape returned by `/api/hooks.json`. */
export type HooksManifest = {
	/** Currently published `@ngrok/mantle` version. */
	version: string;
	/** Canonical docs origin. */
	origin: string;
	/** Public hooks, sorted by name. */
	hooks: ManifestHook[];
};

/**
 * Match `export { ... } from "..."` blocks in a barrel file, skipping
 * `export type { ... }`. Capture group 1 is the comma-separated names,
 * capture group 2 is the relative source path.
 *
 * The leading `(?<!type\s)` lookbehind would be ideal but is unsupported
 * in older runtimes — instead, we strip any `export type {...} from "..."`
 * matches first via {@link removeExportTypeBlocks}.
 */
const exportFromRegex = /export\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"/g;

/**
 * Strip every `export type { ... } from "..."` block from `source` so the
 * lighter-weight {@link exportFromRegex} can be applied without lookbehinds.
 */
function removeExportTypeBlocks(source: string): string {
	return source.replace(/export\s+type\s*\{[\s\S]*?\}\s*from\s*"[^"]+"\s*;?/g, "");
}

/**
 * Parse a barrel file's text and return one entry per exported value
 * (excluding `export type` declarations). The returned `sourcePath` is
 * relative to `packages/mantle/src`, with no extension.
 */
function extractValueExports(
	barrelSource: string,
	dir: string,
): { name: string; sourcePath: string }[] {
	const stripped = removeExportTypeBlocks(barrelSource);
	const entries: { name: string; sourcePath: string }[] = [];

	for (const match of stripped.matchAll(exportFromRegex)) {
		const namesBlob = match[1] ?? "";
		const fromPath = match[2] ?? "";

		const names = namesBlob
			.split(",")
			.map((piece) => piece.replace(/\/\/.*$/g, "").trim())
			.filter((piece) => piece.length > 0 && !piece.startsWith("//"));

		const resolved = sourcePathFromExport(dir, fromPath);
		for (const name of names) {
			entries.push({ name, sourcePath: resolved });
		}
	}
	return entries;
}

/**
 * Locate a JSDoc block (`/** ... *\/`) immediately preceding the given
 * declaration index. Tolerates whitespace between the JSDoc close and the
 * declaration, but bails out if any non-whitespace, non-comment content
 * intervenes (so we don't accidentally lift a JSDoc from an unrelated
 * earlier declaration).
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

/**
 * Extract the first sentence of a JSDoc block's description, ignoring
 * `@tag` lines.
 *
 * "First sentence" means the text up to the first `.` followed by
 * whitespace and an uppercase letter (the start of the next sentence),
 * or up to the first `@<tag>` line — whichever comes first. The
 * uppercase-letter requirement avoids prematurely splitting on common
 * Latin abbreviations like "e.g." or "i.e." that are followed by inline
 * code or quoted text. Returns `undefined` when no description text is
 * present.
 */
function firstSentenceFromJsDoc(jsdoc: string): string | undefined {
	const stripped = jsdoc
		.replace(/^\/\*\*/, "")
		.replace(/\*\/$/, "")
		.split("\n")
		.map((line) => line.replace(/^\s*\*\s?/, ""))
		.join("\n")
		.trim();

	if (!stripped) {
		return undefined;
	}

	const tagMatch = stripped.match(/^[ \t]*@\w+/m);
	const description = (tagMatch ? stripped.slice(0, tagMatch.index ?? 0) : stripped).trim();
	if (!description) {
		return undefined;
	}

	// Inline `{@link Target}` / `{@link Target label}` tags read as raw JSDoc
	// syntax in plain-text summaries — render them as their label (or target).
	const flattened = description
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
 * Extract the body of each `@example` block from a JSDoc comment. Strips
 * the `/** … *\/` wrapper and per-line `*` markers, then collects every
 * line after an `@example` tag up to the next block tag (`@word`) or the
 * end of the comment. Fenced code blocks are preserved as authored.
 *
 * Returns one trimmed string per `@example`, in source order; an empty
 * array when the comment has no `@example` blocks.
 */
function examplesFromJsDoc(jsdoc: string): string[] {
	const lines = jsdoc
		.replace(/^\/\*\*/, "")
		.replace(/\*\/$/, "")
		.split("\n")
		.map((line) => line.replace(/^\s*\*\s?/, ""));

	const examples: string[] = [];
	let current: string[] | null = null;
	let inFence = false;

	const flush = () => {
		if (current == null) {
			return;
		}
		const text = current.join("\n").trim();
		if (text) {
			examples.push(text);
		}
		current = null;
		inFence = false;
	};

	for (const line of lines) {
		// Inside a fenced code block, a leading `@word` is example content
		// (a decorator, `@media`, etc.) — not a JSDoc tag. Track fence state
		// so tag detection doesn't terminate the example early.
		if (current != null && /^[ \t]*```/.test(line)) {
			inFence = !inFence;
			current.push(line);
			continue;
		}
		const tagMatch = inFence ? null : line.match(/^[ \t]*@(\w+)/);
		if (tagMatch) {
			flush();
			if (tagMatch[1] === "example") {
				current = [];
				const inline = line.replace(/^[ \t]*@example[ \t]?/, "");
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

	return examples;
}

/**
 * Escape a string for safe use inside a `RegExp`.
 */
function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Walk a source file and return the first sentence of the JSDoc block
 * immediately preceding the named declaration (`function <name>` or
 * `const <name>`, with or without `export`). When no matching declaration
 * is found — for example, when `name` is re-exported from a barrel file
 * via `export { name } from "..."` — falls back to the file-level JSDoc
 * at the top of the source. Returns `undefined` when neither is found.
 */
async function extractFirstSentenceForName(
	sourcePath: string,
	name: string,
): Promise<string | undefined> {
	const source = readSourceFile(sourcePath);
	if (source == null) {
		return undefined;
	}

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
		if (jsdoc == null) {
			continue;
		}
		const sentence = firstSentenceFromJsDoc(jsdoc);
		if (sentence) {
			return sentence;
		}
	}

	// Fallback: if the file opens with a `/** ... */` block before any
	// declarations, treat that as the module-level summary. Useful for
	// barrel files like `highlight-utils.ts` whose primary identifier
	// is a re-export rather than a local declaration.
	const leadingMatch = source.match(/^\s*\/\*\*[\s\S]*?\*\//);
	if (leadingMatch) {
		const sentence = firstSentenceFromJsDoc(leadingMatch[0]);
		if (sentence) {
			return sentence;
		}
	}

	return undefined;
}

/**
 * Walk a source file and return the body of every `@example` block in the
 * JSDoc immediately preceding the named declaration (`function <name>` or
 * `const <name>`, with or without `export`). Surfaces the same
 * copy-pasteable canonical usage an agent would see hovering the import,
 * without a network lookup. Returns an empty array when the declaration,
 * its JSDoc, or any `@example` tag is absent.
 *
 * @example
 * const examples = await extractExamplesForName("components/field/field", "Field");
 * // examples[0] === "```tsx\n<Field.Group>…</Field.Group>\n```"
 */
async function extractExamplesForName(sourcePath: string, name: string): Promise<string[]> {
	const source = readSourceFile(sourcePath);
	if (source == null) {
		return [];
	}

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
		if (jsdoc == null) {
			continue;
		}
		const examples = examplesFromJsDoc(jsdoc);
		if (examples.length > 0) {
			return examples;
		}
	}

	return [];
}

/**
 * Build the public hooks manifest. Parses `packages/mantle/src/hooks/index.ts`
 * for the canonical list of exported identifiers, then reads each hook's
 * source file to extract a one-line summary from its JSDoc.
 *
 * Cached after first build because the inputs are static for the lifetime
 * of the server process.
 */
let cachedManifest: HooksManifest | null = null;
export async function buildHooksManifest(): Promise<HooksManifest> {
	if (cachedManifest) {
		return cachedManifest;
	}

	const barrelSource = readSourceFile(`${hooksSrcDir}/index`) ?? "";
	const entries = extractValueExports(barrelSource, hooksSrcDir);

	const docsUrl = canonicalHref("/hooks");
	const markdownUrl = canonicalHref("/hooks.md");

	const hooks: ManifestHook[] = [];
	const seen = new Set<string>();

	for (const { name, sourcePath } of entries) {
		if (seen.has(name)) {
			continue;
		}
		seen.add(name);

		// Filter to hook-like exports only. Excludes plain constants like
		// `breakpoints` re-exported from the hooks barrel for proximity.
		// Includes React hooks (`use*`) and imperative reads that mirror a
		// hook (`get*`, e.g. `getPrefersReducedMotion`).
		if (!/^use[A-Z]/.test(name) && !/^get[A-Z]/.test(name)) {
			continue;
		}

		const summary = await extractFirstSentenceForName(sourcePath, name);

		hooks.push({
			name,
			importPath: "@ngrok/mantle/hooks",
			docsUrl,
			markdownUrl,
			summary,
		});
	}

	hooks.sort((a, b) => a.name.localeCompare(b.name));

	cachedManifest = {
		version: mantlePackageJson.version,
		origin: canonicalOrigin,
		hooks,
	};
	return cachedManifest;
}

export { examplesFromJsDoc, extractExamplesForName, extractFirstSentenceForName };
