import { parseSync } from "oxc-parser";
import { hasKind, isRecord, walk } from "~/utilities/mcp/ast-walk";
import type { PackageFiles } from "~/utilities/mcp/npm-tarball.server";

type ParseResult = ReturnType<typeof parseSync>;

/** One parsed declaration file and its source text. */
type ParsedDeclarationFile = {
	program: ParseResult["program"];
	module: ParseResult["module"];
	comments: ParseResult["comments"];
	source: string;
};

const MAX_REEXPORT_DEPTH = 6;

/** Parses each declaration file once per `files` map. */
function createParser(files: PackageFiles) {
	const cache = new Map<string, ParsedDeclarationFile | undefined>();
	return (path: string): ParsedDeclarationFile | undefined => {
		if (cache.has(path)) {
			return cache.get(path);
		}
		const source = files.get(path);
		const result = source == null ? undefined : parseSync(path, source);
		const parsed =
			result == null || source == null
				? undefined
				: { program: result.program, module: result.module, comments: result.comments, source };
		cache.set(path, parsed);
		return parsed;
	};
}

/** Resolves a relative module request from one `dist` declaration file to another. */
function resolveDeclarationPath(fromPath: string, request: string): string | undefined {
	if (!request.startsWith("./")) {
		return undefined;
	}
	const directory = fromPath.slice(0, fromPath.lastIndexOf("/") + 1);
	return `${directory}${request.slice(2).replace(/\.(m?js|d\.ts)$/, "")}.d.ts`;
}

/**
 * The `dist` declaration file for one `exports` entry of `package.json`, such
 * as `dist/button.d.ts` for `"./button"`. Returns `undefined` for a CSS, JSON,
 * or text entry.
 *
 * @example
 * declarationEntryFor({ "./button": "./dist/button.js" }, "./button"); // "dist/button.d.ts"
 */
export function declarationEntryFor(
	exportsField: Record<string, unknown>,
	subpath: string,
): string | undefined {
	const target = exportsField[subpath];
	const path = typeof target === "string" ? target : undefined;
	if (path == null || !path.endsWith(".js")) {
		return undefined;
	}
	return path.replace(/^\.\//, "").replace(/\.js$/, ".d.ts");
}

/** What one JavaScript subpath exports. */
export type SubpathExports = {
	/** Each name the subpath exports, types included. A default export is `default`. */
	names: ReadonlySet<string>;
	/** The packages that the subpath re-exports with `export *`. Their names are not in `names`. */
	externalStars: readonly string[];
};

/**
 * Every name that a declaration entry exports, types included. Follows
 * `export *` into other `dist` files, and records an `export *` from another
 * package.
 *
 * @example
 * exportNamesOf(files, "dist/button.d.ts").names; // Set { "Button", "ButtonProps", … }
 */
export function exportNamesOf(files: PackageFiles, entryPath: string): SubpathExports {
	const parse = createParser(files);
	const names = new Set<string>();
	const externalStars: string[] = [];

	const visit = (path: string, depth: number) => {
		const parsed = parse(path);
		if (parsed == null || depth > MAX_REEXPORT_DEPTH) {
			return;
		}
		for (const statement of parsed.module.staticExports) {
			for (const entry of statement.entries) {
				if (hasKind(entry.exportName, "Default")) {
					names.add("default");
				}
				if (hasKind(entry.exportName, "Name") && entry.exportName.name != null) {
					names.add(entry.exportName.name);
				}
				const isStar = hasKind(entry.exportName, "None") && !hasKind(entry.importName, "Name");
				if (!isStar || entry.moduleRequest == null) {
					continue;
				}
				const target = resolveDeclarationPath(path, entry.moduleRequest.value);
				if (target == null) {
					externalStars.push(entry.moduleRequest.value);
				} else {
					visit(target, depth + 1);
				}
			}
		}
	};

	visit(entryPath, 0);
	return { names, externalStars };
}

/**
 * Removes each `@example` block from the JSDoc comments in `source`. Why: the
 * examples are most of a declaration's size, and `get` lists examples apart.
 */
function withoutExamples(source: string): string {
	return source.replace(/\/\*\*[\s\S]*?\*\//g, (comment) => {
		let inExample = false;
		return comment
			.split("\n")
			.filter((line) => {
				// Why keep the last line: it closes the comment, also after an example.
				if (line.includes("*/")) {
					return true;
				}
				const tag = /^\s*\*\s*@(\w+)/.exec(line);
				if (tag != null) {
					inExample = tag[1] === "example";
				}
				return !inExample;
			})
			.join("\n");
	});
}

/** The leading JSDoc block of a statement, when one ends just before it. */
function leadingJsDoc(parsed: ParsedDeclarationFile, statementStart: number): string {
	const comment = parsed.comments.findLast(
		(candidate) => candidate.type === "Block" && candidate.end <= statementStart,
	);
	if (comment == null || !comment.value.startsWith("*")) {
		return "";
	}
	const between = parsed.source.slice(comment.end, statementStart);
	return between.trim() === "" ? `${parsed.source.slice(comment.start, comment.end)}\n` : "";
}

type Statement = ParsedDeclarationFile["program"]["body"][number];

/** The local names that one top-level statement declares. */
function declaredNames(statement: Statement): string[] {
	const declaration =
		statement.type === "ExportNamedDeclaration" && statement.declaration != null
			? statement.declaration
			: statement;
	if (declaration.type === "VariableDeclaration") {
		return declaration.declarations.flatMap((declarator) =>
			declarator.id.type === "Identifier" ? [declarator.id.name] : [],
		);
	}
	if (
		"id" in declaration &&
		declaration.id != null &&
		typeof declaration.id === "object" &&
		"name" in declaration.id &&
		typeof declaration.id.name === "string"
	) {
		return [declaration.id.name];
	}
	return [];
}

/** One top-level statement and the file that holds it. */
type LocatedStatement = { path: string; parsed: ParsedDeclarationFile; statement: Statement };

/** The names that a declaration refers to with `typeof X` or a type reference `X`. */
function referencedNames(statement: Statement): string[] {
	const names: string[] = [];
	walk(statement, (node) => {
		const reference = node.type === "TSTypeQuery" ? node.exprName : undefined;
		const typeName = node.type === "TSTypeReference" ? node.typeName : reference;
		if (isRecord(typeName) && typeName.type === "Identifier" && typeof typeName.name === "string") {
			names.push(typeName.name);
		}
	});
	return names;
}

/** The most declarations that one `declarationsOf` call returns. */
const MAX_DECLARATIONS = 24;

/**
 * The source text of the declarations that an entry exports as `names`, with
 * their JSDoc but no `@example` blocks, then each declaration in the package
 * that they refer to, such as the parts and props of a compound component. Follows the re-export chain
 * through the bundled `dist` chunks. Returns `undefined` when the entry
 * exports none of `names`.
 *
 * @example
 * declarationsOf(files, "dist/button.d.ts", ["Button", "ButtonProps"]);
 * // "/** Starts an action. *\/\ndeclare const Button: …\n\n/** … *\/\ntype ButtonProps = …"
 */
export function declarationsOf(
	files: PackageFiles,
	entryPath: string,
	names: readonly string[],
): string | undefined {
	const parse = createParser(files);

	const find = (
		path: string,
		exportedName: string,
		depth: number,
	): LocatedStatement | undefined => {
		const parsed = parse(path);
		if (parsed == null || depth > MAX_REEXPORT_DEPTH) {
			return undefined;
		}
		for (const statement of parsed.module.staticExports) {
			for (const entry of statement.entries) {
				const target =
					entry.moduleRequest == null
						? undefined
						: resolveDeclarationPath(path, entry.moduleRequest.value);
				if (hasKind(entry.exportName, "None") && target != null) {
					const found = find(target, exportedName, depth + 1);
					if (found != null) {
						return found;
					}
					continue;
				}
				if (entry.exportName.name !== exportedName) {
					continue;
				}
				if (target != null && hasKind(entry.importName, "Name") && entry.importName.name != null) {
					return find(target, entry.importName.name, depth + 1);
				}
				const localName = entry.localName.name ?? exportedName;
				return localDeclaration(path, localName, depth);
			}
		}
		return localDeclaration(path, exportedName, depth);
	};

	const localDeclaration = (
		path: string,
		localName: string,
		depth: number,
	): LocatedStatement | undefined => {
		const parsed = parse(path);
		if (parsed == null) {
			return undefined;
		}
		for (const statement of parsed.program.body) {
			if (declaredNames(statement).includes(localName)) {
				return { path, parsed, statement };
			}
		}
		for (const statement of parsed.module.staticImports) {
			const imported = statement.entries.find((entry) => entry.localName.value === localName);
			const target = resolveDeclarationPath(path, statement.moduleRequest.value);
			if (
				imported != null &&
				hasKind(imported.importName, "Name") &&
				imported.importName.name != null &&
				target != null
			) {
				return find(target, imported.importName.name, depth + 1);
			}
		}
		return undefined;
	};

	const seen = new Set<string>();
	const queue: LocatedStatement[] = [];
	const texts: string[] = [];
	const add = (located: LocatedStatement | undefined) => {
		if (located == null || texts.length >= MAX_DECLARATIONS) {
			return;
		}
		const key = `${located.path}:${located.statement.start}`;
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		queue.push(located);
		const { parsed, statement } = located;
		texts.push(
			withoutExamples(
				`${leadingJsDoc(parsed, statement.start)}${parsed.source.slice(statement.start, statement.end)}`,
			),
		);
	};

	for (const name of names) {
		add(find(entryPath, name, 0));
	}
	if (texts.length === 0) {
		return undefined;
	}
	for (let located = queue.shift(); located != null; located = queue.shift()) {
		for (const reference of referencedNames(located.statement)) {
			add(localDeclaration(located.path, reference, 0));
		}
	}
	return texts.join("\n\n");
}
