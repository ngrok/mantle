import { parseSync } from "oxc-parser";

/** Matches an import of the React Compiler runtime in an output chunk. */
const COMPILER_RUNTIME_IMPORT_RE = /["']react\/compiler-runtime["']/;

/** Matches a module whose first statement is `"use client"`, after any comments. */
const USE_CLIENT_RE = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/;

/** Matches the source modules that the build transforms, but not their declarations. */
const SOURCE_RE = /[\\/]src[\\/].+\.tsx?$/;
const DECLARATION_RE = /\.d\.[cm]?ts$/;

/** Matches a Phosphor import as written, such as `@phosphor-icons/react/Check`, or as bundled from `node_modules`. */
const PHOSPHOR_RE = /(?:^|[\\/])@phosphor-icons[\\/]react[\\/]/;

/** Captures the icon name of a bundled Phosphor module, such as `Check` for `dist/csr/Check.es.js`. */
const PHOSPHOR_ICON_RE =
	/[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/](?:csr|defs|ssr)[\\/](\w+)\.es\.js$/;

/**
 * Reports whether a source module starts with the `"use client"` directive.
 *
 * @example
 * hasUseClientDirective('"use client";\nimport { useState } from "react";'); // => true
 */
function hasUseClientDirective(code: string): boolean {
	return USE_CLIENT_RE.test(code);
}

/**
 * Reports whether an output chunk must start with `"use client"`: it holds a
 * client module, or it imports `react/compiler-runtime`. The React Compiler
 * adds a hook to each component it compiles, so its output is client code
 * even when the source has no directive.
 *
 * @example
 * chunkNeedsUseClient({ code: 'import{c}from"react/compiler-runtime";', moduleIds: [], clientModuleIds: new Set() }); // => true
 */
function chunkNeedsUseClient({
	code,
	moduleIds,
	clientModuleIds,
}: {
	code: string;
	moduleIds: readonly string[];
	clientModuleIds: ReadonlySet<string>;
}): boolean {
	return (
		COMPILER_RUNTIME_IMPORT_RE.test(code) ||
		moduleIds.some((moduleId) => clientModuleIds.has(moduleId))
	);
}

/** An output chunk, as far as {@link findClientImport} and {@link findClientHelperExports} read it. */
type OutputChunkLike = {
	type: string;
	code?: string;
	imports?: readonly string[];
	exports?: readonly string[];
	isEntry?: boolean;
};

/**
 * Finds a client chunk that a server-callable entry imports, directly or
 * through other chunks. Returns the chunk files from the entry to that chunk,
 * or `undefined` when the entry reaches no client chunk.
 *
 * @example
 * findClientImport("utils.js", {
 *   "utils.js": { type: "chunk", code: 'import"./a.js";', imports: ["a.js"] },
 *   "a.js": { type: "chunk", code: '"use client";', imports: [] },
 * }); // => ["utils.js", "a.js"]
 */
function findClientImport(
	entry: string,
	bundle: Readonly<Record<string, OutputChunkLike>>,
): string[] | undefined {
	const seen = new Set<string>();
	const visit = (fileName: string, path: string[]): string[] | undefined => {
		const chunk = bundle[fileName];
		if (chunk == null || chunk.type !== "chunk" || seen.has(fileName)) {
			return undefined;
		}
		seen.add(fileName);
		if (hasUseClientDirective(chunk.code ?? "")) {
			return path;
		}
		for (const imported of chunk.imports ?? []) {
			const found = visit(imported, [...path, imported]);
			if (found != null) {
				return found;
			}
		}
		return undefined;
	};
	return visit(entry, [entry]);
}

/** Matches an export name for a component, a namespace of parts, or a hook: anything but a plain helper. */
const COMPONENT_OR_HOOK_NAME_RE = /^(?:[A-Z](?![A-Z\d_]*$)|use[A-Z])/;

/** Captures the directory under `src/components`, `src/utils`, or `src/` that owns a module. */
const OWNER_DIR_RE = /[\\/]src[\\/](?:(?:components|utils)[\\/])?([^\\/.]+)[\\/]/;

/**
 * Reports whether a transformed source module is client code: it starts with
 * `"use client"`, the React Compiler gave it a hook from
 * `react/compiler-runtime`, or it imports a Phosphor icon. Each Phosphor icon
 * module calls `createContext` when it loads, so it cannot load on the server.
 *
 * @example
 * isClientModule({ code: "export {};", importedIds: ["@phosphor-icons/react/Check"] }); // => true
 */
function isClientModule({
	code,
	importedIds,
}: {
	code: string;
	importedIds: readonly string[];
}): boolean {
	return (
		hasUseClientDirective(code) ||
		importedIds.some((id) => id === "react/compiler-runtime" || PHOSPHOR_RE.test(id))
	);
}

/**
 * Returns the chunk group name for a module: the directory that owns it, so
 * each group chunk holds one component's code (see `owningComponentDir` in
 * `tsdown.config.ts`).
 *
 * @example
 * chunkGroupName("/m/src/components/theme/theme-provider.tsx"); // => "theme"
 */
function chunkGroupName(moduleId: string): string {
	return OWNER_DIR_RE.exec(moduleId)?.[1] ?? "shared";
}

/** Returns the name of an import or export specifier, which is an identifier or a string literal. */
const specifierName = (node: { type: string; name?: string; value?: unknown }) =>
	node.type === "Identifier" ? (node.name ?? "") : String(node.value);

/** Where an export of a chunk gets its value: an import from another file, or `undefined` for this chunk. */
type ExportBinding = { source: string; imported: string } | undefined;

/**
 * Maps each export of an output chunk to the file and name it re-exports, or
 * to `undefined` when the chunk declares the value itself.
 *
 * @example
 * exportBindings('import{t as e}from"./a.js";export{e as cx};'); // => Map { "cx" => { source: "./a.js", imported: "t" } }
 */
function exportBindings(code: string): Map<string, ExportBinding> {
	const { program } = parseSync("chunk.js", code);
	const imports = new Map<string, ExportBinding>();
	const bindings = new Map<string, ExportBinding>();
	for (const node of program.body) {
		if (node.type === "ImportDeclaration") {
			for (const specifier of node.specifiers) {
				const imported =
					specifier.type === "ImportSpecifier" ? specifierName(specifier.imported) : "*";
				imports.set(specifier.local.name, { source: node.source.value, imported });
			}
		} else if (node.type === "ExportNamedDeclaration" && node.declaration == null) {
			for (const specifier of node.specifiers) {
				const local = specifierName(specifier.local);
				bindings.set(
					specifierName(specifier.exported),
					node.source == null ? imports.get(local) : { source: node.source.value, imported: local },
				);
			}
		}
	}
	return bindings;
}

/**
 * Lists each plain helper that an entry exports from a client chunk, as
 * `"<entry>: <name> comes from <chunk>"`. A React Server Components host
 * turns each export of a `"use client"` chunk into a client reference that
 * throws when server code calls it, even when a server chunk re-exports it.
 * Components, part namespaces, hooks, and the names in `browserOnlyExports`
 * may come from a client chunk.
 *
 * @example
 * findClientHelperExports({
 *   bundle: {
 *     "theme.js": { type: "chunk", isEntry: true, code: 'import{t}from"./a.js";export{t as isTheme};', imports: ["a.js"] },
 *     "a.js": { type: "chunk", code: '"use client";\nconst t=()=>1;export{t};', imports: [] },
 *   },
 *   browserOnlyExports: [],
 * }); // => ["theme.js: isTheme comes from a.js"]
 */
function findClientHelperExports({
	bundle,
	browserOnlyExports,
}: {
	bundle: Readonly<Record<string, OutputChunkLike>>;
	browserOnlyExports: readonly string[];
}): string[] {
	const bindingsByFile = new Map<string, Map<string, ExportBinding>>();
	const clientOrigin = (fileName: string, name: string): string | undefined => {
		const chunk = bundle[fileName];
		if (chunk == null || chunk.type !== "chunk") {
			return undefined;
		}
		const code = chunk.code ?? "";
		if (hasUseClientDirective(code)) {
			return fileName;
		}
		let bindings = bindingsByFile.get(fileName);
		if (bindings == null) {
			bindings = exportBindings(code);
			bindingsByFile.set(fileName, bindings);
		}
		const binding = bindings.get(name);
		if (binding == null || !binding.source.startsWith("./")) {
			return undefined;
		}
		// A namespace import (`*`) names no export, so only the directive of its chunk decides.
		return clientOrigin(binding.source.slice(2), binding.imported === "*" ? "" : binding.imported);
	};
	const found: string[] = [];
	for (const [fileName, chunk] of Object.entries(bundle)) {
		if (chunk.type !== "chunk" || chunk.isEntry !== true) {
			continue;
		}
		for (const name of chunk.exports ?? []) {
			if (COMPONENT_OR_HOOK_NAME_RE.test(name) || browserOnlyExports.includes(name)) {
				continue;
			}
			const origin = clientOrigin(fileName, name);
			if (origin != null) {
				found.push(`${fileName}: ${name} comes from ${origin}`);
			}
		}
	}
	return found;
}

/**
 * A rolldown plugin that puts `"use client"` back on each output chunk that
 * needs it (see {@link chunkNeedsUseClient}), and keeps plain helpers out of
 * those chunks.
 *
 * Why: rolldown drops module-level directives when it bundles modules into a
 * chunk, so a React Server Components host would treat every mantle part as a
 * server component. A chunk with no client code, such as `cx`, stays free of
 * the directive, so server code can still call it.
 *
 * Why the chunk group: rolldown puts modules that the same entries import into
 * one chunk, so a pure helper module would share a chunk, and the directive,
 * with the client module next to it. The group moves each client module
 * ({@link isClientModule}) into a chunk of client modules. `entriesAware`
 * keeps the split for each set of entries that rolldown would make anyway, so
 * no entry loads more code. The build fails when an entry exports a plain
 * helper from a client chunk ({@link findClientHelperExports}).
 *
 * @example
 * defineConfig({ plugins: [preserveUseClient({ serverEntries: ["cx.js"], browserOnlyExports: [] })] });
 */
function preserveUseClient({
	serverEntries,
	browserOnlyExports,
}: {
	/** The entries that server code calls. The build fails when one imports a client chunk. */
	serverEntries: readonly string[];
	/** The helper exports that read a browser-only API, such as `document`, so they stay client code. */
	browserOnlyExports: readonly string[];
}) {
	const clientModuleIds = new Set<string>();
	const importedIdsById = new Map<string, readonly string[]>();
	const entryModuleIds = new Set<string>();
	let clientDependencyIds: Set<string> | undefined;
	/** The modules that a client module imports, directly or through other modules. */
	const isClientDependency = (moduleId: string) => {
		if (clientDependencyIds == null) {
			clientDependencyIds = new Set();
			const pending = [...clientModuleIds];
			for (let id = pending.pop(); id != null; id = pending.pop()) {
				for (const importedId of importedIdsById.get(id) ?? []) {
					if (!clientDependencyIds.has(importedId)) {
						clientDependencyIds.add(importedId);
						pending.push(importedId);
					}
				}
			}
		}
		return clientDependencyIds.has(moduleId);
	};
	return {
		name: "preserve-use-client",
		// After the transforms, so it sees the React Compiler output and only the imports that run.
		moduleParsed: (info: {
			id: string;
			code: string | null;
			importedIds: readonly string[];
			isEntry: boolean;
		}) => {
			importedIdsById.set(info.id, info.importedIds);
			if (info.isEntry) {
				entryModuleIds.add(info.id);
			}
			if (
				SOURCE_RE.test(info.id) &&
				!DECLARATION_RE.test(info.id) &&
				isClientModule({ code: info.code ?? "", importedIds: info.importedIds })
			) {
				clientModuleIds.add(info.id);
			}
		},
		outputOptions: <T extends object>(options: T) => ({
			...options,
			codeSplitting: {
				groups: [
					{
						// Why: an icon left out of the groups goes into the one entry chunk that reaches it, and a
						// client chunk that renders the icon imports that entry back. One chunk for each icon,
						// not one for each component, so a consumer bundle drops each icon that it never renders.
						debugName: "Phosphor icons",
						name: (moduleId: string) => PHOSPHOR_ICON_RE.exec(moduleId)?.[1] ?? "phosphor",
						test: PHOSPHOR_ICON_RE,
					},
					{
						debugName: "client modules",
						name: chunkGroupName,
						test: (moduleId: string) => clientModuleIds.has(moduleId),
						entriesAware: true,
						// Why: a client module's pure dependencies stay out of its chunk.
						includeDependenciesRecursively: false,
					},
					{
						// Why: a client chunk that imports a pure module left in an entry chunk imports the entry back.
						debugName: "pure modules that client modules import",
						name: chunkGroupName,
						test: (moduleId: string) =>
							SOURCE_RE.test(moduleId) &&
							!clientModuleIds.has(moduleId) &&
							// An entry module cannot leave its entry chunk, so a group with it would pull its pure dependencies in.
							!entryModuleIds.has(moduleId) &&
							isClientDependency(moduleId),
						entriesAware: true,
						includeDependenciesRecursively: false,
					},
				],
			},
		}),
		renderChunk: (code: string, chunk: { fileName: string; moduleIds: readonly string[] }) => {
			if (!chunk.fileName.endsWith(".js")) {
				return null;
			}
			if (!chunkNeedsUseClient({ code, moduleIds: chunk.moduleIds, clientModuleIds })) {
				return null;
			}
			return `"use client";\n${code}`;
		},
		generateBundle: (_options: unknown, bundle: Record<string, OutputChunkLike>) => {
			for (const entry of serverEntries) {
				const path = findClientImport(entry, bundle);
				if (path != null) {
					throw new Error(
						`${entry} must stay server-callable, but it imports a client chunk: ${path.join(" -> ")}. Move the pure code out of the "use client" module.`,
					);
				}
			}
			const clientHelpers = findClientHelperExports({ bundle, browserOnlyExports });
			if (clientHelpers.length > 0) {
				throw new Error(
					`Each plain helper must stay server-callable, but these come from a "use client" chunk:\n${clientHelpers.join("\n")}\nMove each helper to a module with no "use client", hooks, or Phosphor icons. If it reads a browser-only API, add it to browserOnlyExports.`,
				);
			}
		},
	};
}

export {
	//,
	chunkNeedsUseClient,
	findClientHelperExports,
	findClientImport,
	hasUseClientDirective,
	isClientModule,
	preserveUseClient,
};
