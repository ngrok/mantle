#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Worker } from "node:worker_threads";

import { __unstable__loadDesignSystem, compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { parseSync, visitorKeys } from "oxc-parser";
import type { Node } from "oxc-parser";

/**
 * The Tailwind CSS entry that every class canonicalizes against.
 *
 * Why one entry: `apps/www/app/global.css` imports this theme from the built
 * `dist`, and it adds no token that changes a canonical form. The source entry
 * loads without a build.
 */
export const CSS_ENTRY = "packages/mantle/src/mantle.css";

/** The file types the fixer rewrites. Markdown and MDX stay out: a utility name in their prose is prose. */
export const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;

/** Where each CSS entry's canonical forms persist between runs. Gitignored with the rest of `.cache/`. */
export const CACHE_DIRECTORY = ".cache/tailwind-canonical";

/** Bump when a rule in {@link canonicalForms} changes, so every cache file recomputes under the new rule. */
const CACHE_RULES_VERSION = 5;

/**
 * Below this many files the run stays on one thread.
 *
 * Why: a worker pays about 150 ms to start and import TypeScript. The commit
 * hook and the editor hook hand over a few files, and those finish sooner inline.
 */
const WORKER_FILE_THRESHOLD = 32;

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A class the scanner found in a class-list literal, at its offset in the file. */
export type Hit = { position: number; candidate: string };

/** One candidate the scanner found, with the form the design system prefers. */
export type Replacement = Hit & { canonical: string };

/** The classes of one file, and the CSS entry they canonicalize against. */
export type ScanResult = { file: string; cssEntry: string; hits: Hit[] };

type DesignSystem = Awaited<ReturnType<typeof __unstable__loadDesignSystem>>;

/**
 * The fields of a parsed candidate that {@link isTokenRewrite} reads.
 *
 * Why: the `@tailwindcss/node` declarations import a `./candidate` module that
 * the package does not ship, so `parseCandidate` returns an untyped value.
 */
type CandidateValue = { kind: "named" | "arbitrary"; value: string } | null;
type Variant =
	| { kind: "static"; root: string }
	| { kind: "functional"; root: string; value: CandidateValue }
	| { kind: "compound"; root: string; variant: Variant }
	| { kind: "arbitrary"; selector: string };
type Candidate =
	| { kind: "static"; variants: readonly Variant[] }
	| {
			kind: "functional";
			value: CandidateValue;
			modifier: CandidateValue;
			variants: readonly Variant[];
	  }
	| { kind: "arbitrary"; value: string; modifier: CandidateValue; variants: readonly Variant[] };

/**
 * Whether the fixer owns a file: app or package source, but not `cx` or a
 * migration fixture.
 *
 * Why: `cx`, its vendored engine, and its tests read class names as data, so
 * a legacy form such as `!p-4` is there on purpose. A migration fixture models
 * consumer code as the codemod finds it.
 *
 * @example
 * isFixerTarget("packages/mantle/src/components/button/button.tsx"); // => true
 * isFixerTarget("packages/mantle/migrations/0002-data-table-action-header/before.tsx"); // => false
 */
export function isFixerTarget(repoRelativeFile: string): boolean {
	const posixFile = repoRelativeFile.split(path.sep).join("/");
	return (
		(posixFile.startsWith("apps/") || posixFile.startsWith("packages/")) &&
		!posixFile.startsWith("packages/mantle/migrations/") &&
		!posixFile.startsWith("packages/mantle/src/utils/cx/") &&
		SOURCE_EXTENSIONS.some((extension) => posixFile.endsWith(extension))
	);
}

/**
 * Writes each canonical form over its candidate.
 *
 * Replacements apply from the last position to the first, so an earlier
 * replacement that changes length never shifts a later offset.
 *
 * @example
 * applyReplacements("a -ml-[7px] b", [{ position: 2, candidate: "-ml-[7px]", canonical: "ml-[-7px]" }]);
 * // => "a ml-[-7px] b"
 */
export function applyReplacements(content: string, replacements: readonly Replacement[]): string {
	const ordered = replacements.toSorted((a, b) => b.position - a.position);
	let result = content;
	for (const { position, candidate, canonical } of ordered) {
		if (result.slice(position, position + candidate.length) !== candidate) {
			throw new Error(`Candidate "${candidate}" is not at offset ${position}`);
		}
		result = result.slice(0, position) + canonical + result.slice(position + candidate.length);
	}
	return result;
}

/** A string or template literal in a source file: the raw text between its delimiters, and where that text starts. */
export type Literal = { start: number; text: string };

/** Functions whose string arguments, and the string keys of the objects passed to them, are class lists. */
const CLASS_FUNCTIONS = new Set([
	"classNames",
	"clsx",
	"cn",
	"cva",
	"cx",
	"tv",
	"twJoin",
	"twMerge",
]);

/**
 * Where a literal sits: a place a class can go, the value of a class
 * attribute, the argument of a class function, or a place no class goes, such
 * as the argument of another call or an object key.
 */
type LiteralPosition = "open" | "class-attribute" | "class-function" | "closed";

/**
 * Whether a literal is one bare word, such as `flex-shrink`, with no variant,
 * arbitrary value, or modifier.
 *
 * Why: in an open position, such a word is as likely a CSS property name as a
 * class. A class attribute or a class function marks it as a class.
 */
function isBareWord(text: string): boolean {
	return /^\s*[\w-]+\s*$/.test(text);
}

/** Nodes that hold classes again inside a closed position, such as a callback passed to `map`. */
const OPEN_SCOPES = new Set([
	"ArrowFunctionExpression",
	"FunctionDeclaration",
	"FunctionExpression",
]);

/**
 * Whether a JSX attribute takes classes: its name holds `class`, or it is
 * mantle's `preferredWidth`. Any other attribute, such as `name`, is data.
 */
function isClassAttribute(name: string): boolean {
	return /class/i.test(name) || name === "preferredWidth";
}

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" && value != null && "type" in value && typeof value.type === "string"
	);
}

function calleeName(callee: Node): string | undefined {
	if (callee.type === "Identifier") {
		return callee.name;
	}
	if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
		return callee.property.name;
	}
	return undefined;
}

/**
 * Every string and template literal in a TypeScript or TSX file that can hold
 * a class.
 *
 * Why: a class lives in a literal. A utility name in a comment, an identifier,
 * or JSX text is prose, and the fixer must leave prose alone. A literal passed
 * to a function other than a class function, an object or member key, an operand of a
 * comparison, a `case` test, a JSX child, or the value of a JSX attribute that
 * takes no class is data: `setProperty("flex-shrink", "0")` must keep its
 * property name. Outside a class attribute or a class function, one bare word
 * is data too. A function body holds classes again. The text is raw source,
 * not the cooked value, so an offset into it is an offset into the file.
 *
 * @example
 * literals('const a = "flex p-2"; // flex-shrink', "x.ts"); // => [{ start: 11, text: "flex p-2" }]
 * literals('el.style.setProperty("flex-shrink", "0")', "x.ts"); // => []
 * literals('const property = "flex-shrink"', "x.ts"); // => []
 */
export function literals(content: string, fileName: string): Literal[] {
	const found: Literal[] = [];
	const add = (start: number, end: number, position: LiteralPosition): void => {
		const text = content.slice(start, end);
		if (position !== "open" || !isBareWord(text)) {
			found.push({ start, text });
		}
	};
	const visit = (value: unknown, position: LiteralPosition): void => {
		if (Array.isArray(value)) {
			for (const item of value) {
				visit(item, position);
			}
			return;
		}
		if (!isNode(value)) {
			return;
		}
		const node = value;
		switch (node.type) {
			case "Literal":
				if (position !== "closed" && typeof node.value === "string") {
					add(node.start + 1, node.end - 1, position);
				}
				return;
			// A template element spans its delimiters: `` ` `` or `}` before the text, `` ` `` or `${` after it.
			// Why: the text comes from the source, because oxc normalizes CRLF to LF in `value.raw`.
			case "TemplateElement":
				if (position !== "closed") {
					add(node.start + 1, node.end - (content[node.end - 1] === "`" ? 1 : 2), position);
				}
				return;
			case "CallExpression":
			case "NewExpression": {
				visit(node.callee, position);
				const name = calleeName(node.callee);
				visit(
					node.arguments,
					name != null && CLASS_FUNCTIONS.has(name) ? "class-function" : "closed",
				);
				return;
			}
			case "MemberExpression":
				visit(node.object, position);
				visit(node.property, "closed");
				return;
			case "Property":
				visit(node.key, position === "class-function" ? position : "closed");
				visit(node.value, position);
				return;
			case "BinaryExpression":
				visit(node.left, "closed");
				visit(node.right, "closed");
				return;
			case "SwitchCase":
				visit(node.test, "closed");
				visit(node.consequent, position);
				return;
			case "JSXAttribute": {
				const name = node.name.type === "JSXIdentifier" ? node.name.name : node.name.name.name;
				visit(node.value, isClassAttribute(name) ? "class-attribute" : "closed");
				return;
			}
			case "JSXElement":
				visit(node.openingElement, "open");
				visit(node.children, "closed");
				return;
			case "JSXFragment":
				visit(node.children, "closed");
				return;
			default: {
				const childPosition = OPEN_SCOPES.has(node.type) ? "open" : position;
				for (const key of visitorKeys[node.type] ?? []) {
					// The `key` of a class or type member, and the `id` of an enum member, is a name.
					const isName = key === "key" || (node.type === "TSEnumMember" && key === "id");
					visit(Reflect.get(node, key), isName ? "closed" : childPosition);
				}
			}
		}
	};
	visit(parseSync(fileName, content).program, "open");
	return found.toSorted((a, b) => a.start - b.start);
}

/**
 * Whether a literal reads as a class list: no CSS punctuation, and more than
 * half of its tokens parse as utilities.
 *
 * Why: a CSS stylesheet in a test and a sentence of copy both contain words
 * that are also utility names, such as `flex-shrink`. Neither is a class list.
 * A class list can still hold a few names that are not utilities, such as `group`.
 *
 * @example
 * isClassList("scroll-fade-y -ml-[7px]", parses); // => true
 * isClassList(".shrink-0 { flex-shrink: 0 }", parses); // => false
 */
export function isClassList(text: string, parses: (token: string) => boolean): boolean {
	if (/[{};]/.test(text)) {
		return false;
	}
	const tokens = text.split(/\s+/).filter((token) => token.length > 0);
	if (tokens.length === 0) {
		return false;
	}
	const utilities = tokens.filter(parses).length;
	return utilities * 2 > tokens.length;
}

const designSystems = new Map<string, Promise<DesignSystem>>();

/** Loads a CSS entry's design system once per thread. */
export function loadDesignSystem(cssEntry: string): Promise<DesignSystem> {
	let designSystem = designSystems.get(cssEntry);
	if (designSystem == null) {
		const entryPath = path.join(REPO_ROOT, cssEntry);
		designSystem = readFile(entryPath, "utf8").then((css) =>
			__unstable__loadDesignSystem(css, { base: path.dirname(entryPath) }),
		);
		designSystems.set(cssEntry, designSystem);
	}
	return designSystem;
}

const scanner = new Scanner({ sources: [] });

/**
 * Finds every class in the class-list literals of one file.
 *
 * @example
 * scanContent('<div className="-ml-[7px]" />', "x.tsx", designSystem);
 * // => [{ position: 16, candidate: "-ml-[7px]" }]
 */
export function scanContent(
	content: string,
	repoRelativeFile: string,
	designSystem: DesignSystem,
): Hit[] {
	const parses = (token: string) => designSystem.parseCandidate(token).length > 0;
	const extension = path.extname(repoRelativeFile).slice(1);
	const hits: Hit[] = [];
	for (const literal of literals(content, repoRelativeFile)) {
		if (!isClassList(literal.text, parses)) {
			continue;
		}
		for (const { candidate, position } of scanner.getCandidatesWithPositions({
			content: literal.text,
			extension,
		})) {
			hits.push({ candidate, position: literal.start + position });
		}
	}
	return hits;
}

/** Scans one file from disk. */
export async function scanFile(repoRelativeFile: string): Promise<ScanResult> {
	const cssEntry = CSS_ENTRY;
	const [content, designSystem] = await Promise.all([
		readFile(path.join(REPO_ROOT, repoRelativeFile), "utf8"),
		loadDesignSystem(cssEntry),
	]);
	return {
		file: repoRelativeFile,
		cssEntry,
		hits: scanContent(content, repoRelativeFile, designSystem),
	};
}

/**
 * Whether an arbitrary value is the theme variable that a name stands for,
 * such as `var(--text-color-muted)` for `muted`. A value that only uses a
 * variable, such as `calc(var(--spacing)*128)` for `lg`, is not.
 */
function isVariableOf(value: string, name: string): boolean {
	return /^var\(--[\w-]+\)$/.test(value) && value.endsWith(`-${name})`);
}

/** A theme name such as `tooltip`, `lg`, or `wider`, as opposed to a scale step such as `30` or `1000/467`. */
function isThemeName(value: string): boolean {
	return !/^[\d.]+$/.test(value);
}

/**
 * Whether the canonical form reads a literal value as a theme token.
 *
 * Why: `bg-[#000]` canonicalizes to `bg-tooltip` because mantle's tooltip
 * color is black today. The author chose black, not the tooltip token, and
 * the element must not follow the token when it changes. A scale step such
 * as `w-30`, a reference the source already made such as
 * `text-[var(--text-color-muted)]`, and a plain rename such as
 * `bg-gradient-to-r` keep their meaning, so they still rewrite.
 *
 * @example
 * isTokenRewrite(parse("bg-[#000]"), parse("bg-tooltip")); // => true
 * isTokenRewrite(parse("[background-color:#000]"), parse("bg-tooltip")); // => true
 * isTokenRewrite(parse("w-[7.5rem]"), parse("w-30")); // => false
 */
export function isTokenRewrite(source: Candidate, target: Candidate): boolean {
	const sourceModifier = source.kind === "static" ? null : source.modifier;
	const targetModifier = target.kind === "static" ? null : target.modifier;
	if (
		targetModifier?.kind === "named" &&
		isThemeName(targetModifier.value) &&
		sourceModifier?.kind === "arbitrary" &&
		!isVariableOf(sourceModifier.value, targetModifier.value)
	) {
		return true;
	}
	if (
		target.kind === "functional" &&
		target.value?.kind === "named" &&
		isThemeName(target.value.value)
	) {
		const name = target.value.value;
		if (
			source.kind === "functional" &&
			source.value?.kind === "arbitrary" &&
			!isVariableOf(source.value.value, name)
		) {
			return true;
		}
		if (source.kind === "arbitrary" && !isVariableOf(source.value, name)) {
			return true;
		}
		if (
			source.kind === "functional" &&
			source.value?.kind === "named" &&
			!isThemeName(source.value.value) &&
			source.value.value !== target.value.value
		) {
			return true;
		}
	}
	const targetVariants = literalVariants(target.variants);
	return literalVariants(source.variants).some((variant) => !targetVariants.includes(variant));
}

/**
 * The arbitrary breakpoints and container sizes that variants write, such as
 * `min-[64rem]` or `[@media(width>=64rem)]`, at any depth of `not-*` or
 * `group-*`. A value the source writes and the target drops became a theme
 * name, such as `lg`. Other variants name no theme value, so `data-[active]`
 * still becomes `data-active`.
 */
function literalVariants(variants: readonly Variant[]): string[] {
	return variants.flatMap(function literal(variant: Variant): string[] {
		if (variant.kind === "compound") {
			return literal(variant.variant);
		}
		if (
			variant.kind === "functional" &&
			/^@?(min|max)?$/.test(variant.root) &&
			variant.value?.kind === "arbitrary"
		) {
			return [`${variant.root}-[${variant.value.value}]`];
		}
		if (variant.kind === "arbitrary" && /^@(media|container)/.test(variant.selector)) {
			return [variant.selector];
		}
		return [];
	});
}

/**
 * The canonical form of each candidate, as `[candidate, canonical]` pairs. A
 * candidate keeps its form when the canonical one reads a literal as a theme
 * token ({@link isTokenRewrite}), or drops a variable ({@link dropsVariable}).
 *
 * Why: one candidate per call. A batch call returns a de-duplicated set, not a
 * positional map, so its result cannot be matched back to its input. A token
 * that does not parse as a utility never changes, so it skips the call.
 */
export function canonicalForms(
	designSystem: DesignSystem,
	candidates: readonly string[],
): [string, string][] {
	return candidates.map((candidate) => {
		const [source] = designSystem.parseCandidate(candidate);
		if (source == null) {
			return [candidate, candidate];
		}
		const canonical = designSystem.canonicalizeCandidates([candidate])[0] ?? candidate;
		const [target] = designSystem.parseCandidate(canonical);
		if (
			target == null ||
			isTokenRewrite(source, target) ||
			dropsVariable(designSystem, candidate, canonical)
		) {
			return [candidate, candidate];
		}
		return [candidate, canonical];
	});
}

/**
 * Whether the canonical form's CSS no longer reads a variable that the
 * candidate's CSS reads.
 *
 * Why: Tailwind 4.3.3 canonicalizes `calc(100%_-_var(--_x))` to
 * `calc(100%-var(--_x))`, and then compiles that form to `var(-- x)`, which is
 * invalid CSS. The check compares variables and not whole declarations, because
 * a scale step such as `w-56` adds `var(--spacing)` on purpose.
 */
function dropsVariable(designSystem: DesignSystem, candidate: string, canonical: string): boolean {
	const [sourceCss, targetCss] = designSystem.candidatesToCss([candidate, canonical]);
	const targetVariables = new Set(cssVariables(targetCss ?? ""));
	return cssVariables(sourceCss ?? "").some((variable) => !targetVariables.has(variable));
}

/** The custom properties that `var()` reads in a CSS string. */
function cssVariables(css: string): string[] {
	return Array.from(css.matchAll(/var\((--[\w-]*)/g), (match) => match[1] ?? "");
}

type CacheFile = { key: string; forms: Record<string, string> };

/**
 * Computes the key a CSS entry's cache must carry to stay valid: the lockfile,
 * which pins Tailwind and each plugin, and the content of the entry and of each
 * stylesheet or local plugin it loads.
 *
 * Why: a stylesheet the entry imports, such as `tw-animate-css`, can change the
 * design system while the entry stays the same.
 */
export async function cacheKeyFor(entryPath: string): Promise<string> {
	const css = await readFile(entryPath, "utf8");
	const dependencies = new Set([path.join(REPO_ROOT, "pnpm-lock.yaml")]);
	await compile(css, {
		base: path.dirname(entryPath),
		onDependency: (file) => dependencies.add(file),
	});
	const hash = createHash("sha256").update(`${CACHE_RULES_VERSION}\0${css}`);
	for (const file of [...dependencies].toSorted()) {
		hash.update(`\0${path.relative(REPO_ROOT, file)}\0`).update(await readFile(file));
	}
	return hash.digest("hex");
}

/** Reads the forms of a cache file; a missing file or a stale key reads as empty. */
async function readForms(filePath: string, key: string): Promise<Map<string, string>> {
	try {
		const parsed: CacheFile = JSON.parse(await readFile(filePath, "utf8"));
		if (parsed.key === key) {
			return new Map(Object.entries(parsed.forms));
		}
	} catch {
		// No file yet, or one this version cannot read: compute from scratch.
	}
	return new Map();
}

/**
 * The canonical forms one CSS entry has computed so far, persisted under
 * {@link CACHE_DIRECTORY}.
 *
 * Why: Tailwind builds a reverse index of the whole theme on the first class
 * it canonicalizes, which costs seconds per design system and per thread. The
 * same classes recur in every run, so a warm cache turns a full check into a
 * scan that never calls Tailwind.
 */
export class CanonicalFormCache {
	readonly #path: string;
	readonly #key: string;
	readonly #forms: Map<string, string>;
	#dirty = false;

	private constructor(filePath: string, key: string, forms: Map<string, string>) {
		this.#path = filePath;
		this.#key = key;
		this.#forms = forms;
	}

	/** Reads the entry's cache file; a missing file or a stale key starts empty. */
	static async load(
		cssEntry: string,
		{ cacheDirectory = path.join(REPO_ROOT, CACHE_DIRECTORY) }: { cacheDirectory?: string } = {},
	): Promise<CanonicalFormCache> {
		const key = await cacheKeyFor(path.join(REPO_ROOT, cssEntry));
		const filePath = path.join(cacheDirectory, `${cssEntry.replaceAll("/", "__")}.json`);
		return new CanonicalFormCache(filePath, key, await readForms(filePath, key));
	}

	get(candidate: string): string | undefined {
		return this.#forms.get(candidate);
	}

	set(candidate: string, canonical: string): void {
		this.#forms.set(candidate, canonical);
		this.#dirty = true;
	}

	/**
	 * Writes the file when a form was added. The rename keeps a concurrent reader
	 * from seeing a partial file.
	 *
	 * Why: another run can save the same entry after this one loads it, so the
	 * save merges the forms on disk instead of discarding them.
	 */
	async save(): Promise<void> {
		if (!this.#dirty) {
			return;
		}
		const onDisk = await readForms(this.#path, this.#key);
		const file: CacheFile = {
			key: this.#key,
			forms: Object.fromEntries([...onDisk, ...this.#forms]),
		};
		await mkdir(path.dirname(this.#path), { recursive: true });
		const temporaryPath = `${this.#path}.${process.pid}.tmp`;
		await writeFile(temporaryPath, JSON.stringify(file));
		await rename(temporaryPath, this.#path);
		this.#dirty = false;
	}
}

/** Request and response shapes between the main thread and a worker. */
export type WorkerRequestBody =
	| { type: "scan"; files: string[] }
	| { type: "canonicalize"; cssEntry: string; candidates: string[] };
export type WorkerRequest = WorkerRequestBody & { id: number };
export type WorkerResponse =
	| { id: number; type: "scanned"; results: ScanResult[] }
	| { id: number; type: "canonicalized"; forms: [string, string][] }
	| { id: number; type: "failed"; message: string };

/** The two slow phases, run either inline or across worker threads. */
type Backend = {
	scan(files: string[]): Promise<ScanResult[]>;
	canonicalize(cssEntry: string, candidates: string[]): Promise<[string, string][]>;
	close(): Promise<void>;
};

function inlineBackend(): Backend {
	return {
		async scan(files) {
			const results: ScanResult[] = [];
			for (const file of files) {
				results.push(await scanFile(file));
			}
			return results;
		},
		async canonicalize(cssEntry, candidates) {
			return canonicalForms(await loadDesignSystem(cssEntry), candidates);
		},
		async close() {},
	};
}

/** Splits a list into `count` lists of near-equal length, round-robin. */
export function shard<T>(items: readonly T[], count: number): T[][] {
	const shards: T[][] = Array.from(
		{ length: Math.max(1, Math.min(count, items.length)) },
		() => [],
	);
	items.forEach((item, index) => {
		shards[index % shards.length]?.push(item);
	});
	return shards;
}

function workerBackend(size: number): Backend {
	const workers = Array.from(
		{ length: size },
		() => new Worker(new URL("./tailwind-canonical-worker.ts", import.meta.url)),
	);
	const pending = new Map<
		number,
		{ resolve: (response: WorkerResponse) => void; reject: (error: Error) => void }
	>();
	let nextId = 0;
	let canonicalizeCalls = 0;

	for (const worker of workers) {
		worker.on("message", (response: WorkerResponse) => {
			const request = pending.get(response.id);
			pending.delete(response.id);
			if (response.type === "failed") {
				request?.reject(new Error(response.message));
			} else {
				request?.resolve(response);
			}
		});
		worker.on("error", (error) => {
			for (const request of pending.values()) {
				request.reject(error);
			}
			pending.clear();
		});
	}

	function send(index: number, body: WorkerRequestBody): Promise<WorkerResponse> {
		const worker = workers[index];
		if (worker == null) {
			throw new Error(`No worker at index ${index}`);
		}
		const id = nextId;
		nextId += 1;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			const request: WorkerRequest = { ...body, id };
			// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker port takes no origin
			worker.postMessage(request);
		});
	}

	return {
		async scan(files) {
			const responses = await Promise.all(
				shard(files, workers.length).map((shardFiles, index) =>
					send(index, { type: "scan", files: shardFiles }),
				),
			);
			return responses.flatMap((response) => (response.type === "scanned" ? response.results : []));
		},
		async canonicalize(cssEntry, candidates) {
			// Why: every worker that canonicalizes for an entry pays that entry's
			// index build, so one entry goes to one worker, and entries spread out.
			const index = canonicalizeCalls % workers.length;
			canonicalizeCalls += 1;
			const response = await send(index, { type: "canonicalize", cssEntry, candidates });
			return response.type === "canonicalized" ? response.forms : [];
		},
		async close() {
			await Promise.all(workers.map((worker) => worker.terminate()));
		},
	};
}

/**
 * Every file under `apps/` and `packages/` that git tracks or does not ignore,
 * and that is on disk. A tracked file deleted in the working tree stays out.
 */
function sourceFiles(): string[] {
	const output = execFileSync(
		"git",
		["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "apps", "packages"],
		{ cwd: REPO_ROOT, encoding: "utf8" },
	);
	return output
		.split("\0")
		.filter((file) => file.length > 0 && existsSync(path.join(REPO_ROOT, file)));
}

function lineOf(content: string, position: number): number {
	let line = 1;
	for (let index = 0; index < position; index += 1) {
		if (content.charCodeAt(index) === 10) {
			line += 1;
		}
	}
	return line;
}

/**
 * Resolves the canonical form of every candidate the scan found, from the
 * cache first and from Tailwind for the rest, then persists what was new.
 */
async function resolveForms(
	results: readonly ScanResult[],
	backend: Backend,
): Promise<Map<string, Map<string, string>>> {
	const candidatesByEntry = new Map<string, Set<string>>();
	for (const { cssEntry, hits } of results) {
		let candidates = candidatesByEntry.get(cssEntry);
		if (candidates == null) {
			candidates = new Set();
			candidatesByEntry.set(cssEntry, candidates);
		}
		for (const { candidate } of hits) {
			candidates.add(candidate);
		}
	}

	const formsByEntry = new Map<string, Map<string, string>>();
	await Promise.all(
		[...candidatesByEntry].map(async ([cssEntry, candidates]) => {
			const cache = await CanonicalFormCache.load(cssEntry);
			const misses = [...candidates].filter((candidate) => cache.get(candidate) == null);
			for (const [candidate, canonical] of await backend.canonicalize(cssEntry, misses)) {
				cache.set(candidate, canonical);
			}
			await cache.save();
			formsByEntry.set(
				cssEntry,
				new Map([...candidates].map((candidate) => [candidate, cache.get(candidate) ?? candidate])),
			);
		}),
	);
	return formsByEntry;
}

async function main({ files, write }: { files: string[]; write: boolean }) {
	const targets = (files.length > 0 ? files : sourceFiles())
		.map((file) => path.relative(REPO_ROOT, path.resolve(REPO_ROOT, file)))
		.filter(isFixerTarget);

	const backend =
		targets.length >= WORKER_FILE_THRESHOLD
			? workerBackend(Math.min(availableParallelism(), targets.length))
			: inlineBackend();
	try {
		const results = await backend.scan(targets);
		const formsByEntry = await resolveForms(results, backend);

		let changedFiles = 0;
		let changedClasses = 0;
		for (const { file, cssEntry, hits } of results) {
			const forms = formsByEntry.get(cssEntry);
			const replacements: Replacement[] = [];
			for (const hit of hits) {
				const canonical = forms?.get(hit.candidate) ?? hit.candidate;
				if (canonical !== hit.candidate) {
					replacements.push({ ...hit, canonical });
				}
			}
			if (replacements.length === 0) {
				continue;
			}
			changedFiles += 1;
			changedClasses += replacements.length;
			const absolutePath = path.join(REPO_ROOT, file);
			const content = await readFile(absolutePath, "utf8");
			if (write) {
				await writeFile(absolutePath, applyReplacements(content, replacements));
				console.log(
					`${file}: rewrote ${replacements.length} class${replacements.length === 1 ? "" : "es"}`,
				);
				continue;
			}
			for (const { position, candidate, canonical } of replacements) {
				console.log(`${file}:${lineOf(content, position)}: ${candidate} -> ${canonical}`);
			}
		}

		if (changedClasses > 0 && !write) {
			console.error(
				`\n${changedClasses} non-canonical Tailwind class${changedClasses === 1 ? "" : "es"} in ${changedFiles} file${changedFiles === 1 ? "" : "s"}. Run \`pnpm -w run tailwind:fix\`.`,
			);
			process.exitCode = 1;
		}
	} finally {
		await backend.close();
	}
}

const isEntrypoint =
	process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
	// With no file arguments, the run checks every source file under `apps/` and `packages/`.
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: { write: { type: "boolean", default: false } },
	});
	await main({ files: positionals, write: values.write });
}
