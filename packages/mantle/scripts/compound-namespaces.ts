import fs from "node:fs";

/**
 * A compound component namespace, read from the component's `index.ts`.
 */
type CompoundNamespace = {
	/** The component directory under `src/components`, such as `dropdown-menu`. */
	dir: string;
	/** The namespace identifier, such as `DropdownMenu`. */
	name: string;
	/** The stem of the parts module, such as `dropdown-menu` for `dropdown-menu-parts.ts`. */
	stem: string;
	/** The dist entry that holds the parts, such as `dropdown-menu-parts`. */
	entry: string;
};

/** Matches the parts import of a compound component's `index.ts`. */
const PARTS_IMPORT_RE = /^import \* as (\w+)Parts from "\.\/([\w-]+)-parts\.js";$/gm;

/** Matches a module id of a component's `index.ts`, and captures the component directory. */
const COMPONENT_INDEX_RE = /[\\/]src[\\/]components[\\/]([^\\/]+)[\\/]index\.ts$/;

/** Matches a component's `index.ts` or the `index.d.ts` the declaration build derives from it. */
const COMPONENT_INDEX_OR_DECLARATION_RE =
	/[\\/]src[\\/]components[\\/]([^\\/]+)[\\/]index\.(?:d\.)?ts$/;

/**
 * Reads the compound namespaces that a component's `index.ts` declares. Each one
 * imports its parts module as `<Name>Parts` and aliases it as `const <Name> = <Name>Parts`.
 *
 * @example
 * compoundNamespacesIn("card", 'import * as CardParts from "./card-parts.js";');
 * // => [{ dir: "card", name: "Card", stem: "card", entry: "card-parts" }]
 */
function compoundNamespacesIn(dir: string, indexSource: string): CompoundNamespace[] {
	return [...indexSource.matchAll(PARTS_IMPORT_RE)].map(([, name = "", stem = ""]) => ({
		dir,
		name,
		stem,
		// Why the directory prefix: per-component `@source "<dir>-*.js"` globs must match the file.
		entry: stem.startsWith(dir) ? `${stem}-parts` : `${dir}-${stem}-parts`,
	}));
}

/**
 * Rewrites a compound component's `index.ts` so that each namespace is the parts
 * module's namespace object itself, not a `const` alias of it. Throws when an
 * alias is missing, so a changed `index.ts` shape fails the build.
 *
 * Why: the alias carries the namespace JSDoc for editors and the agent manifest.
 * Bundlers drop unused parts from a namespace import, but they keep every part
 * once a `const` holds the namespace.
 *
 * @example
 * rewriteNamespaceAliases(
 * 	'import * as CardParts from "./card-parts.js";\nconst Card = CardParts;\nexport { Card };',
 * 	[{ dir: "card", name: "Card", stem: "card", entry: "card-parts" }],
 * );
 * // => 'import * as Card from "./card-parts.js";\n\nexport { Card };'
 */
function rewriteNamespaceAliases(code: string, namespaces: readonly CompoundNamespace[]): string {
	let result = code;
	for (const { name, stem } of namespaces) {
		const alias = new RegExp(`^const ${name} = ${name}Parts;$`, "m");
		if (!alias.test(result)) {
			throw new Error(`index.ts for ${name} must declare \`const ${name} = ${name}Parts;\`.`);
		}
		result = result
			.replace(alias, "")
			.replace(
				`import * as ${name}Parts from "./${stem}-parts.js";`,
				`import * as ${name} from "./${stem}-parts.js";`,
			);
	}
	return result;
}

/**
 * A rolldown plugin that ships each compound component namespace as a real ES
 * module namespace, so a consumer bundle keeps only the parts it reads.
 *
 * - Each `<stem>-parts.ts` module builds as its own entry (`entries`).
 * - The component entry imports that entry as an external module. Why: rolldown
 *   turns a bundled namespace that an entry re-exports into a getter object,
 *   which no consumer bundler can shake.
 * - The component entry's JavaScript loses the `const` alias
 *   ({@link rewriteNamespaceAliases}). Its `.d.ts` keeps the alias and the JSDoc.
 * - The build fails when a component entry does not take its namespace from a
 *   namespace import of the parts entry.
 *
 * @example
 * const { entries, plugin } = compoundNamespaces({ componentsDir: "src/components", dirs: ["card"] });
 * defineConfig({ entry: { ...entries }, plugins: [plugin] });
 */
function compoundNamespaces({
	componentsDir,
	dirs,
}: {
	/** The directory that holds the component directories. */
	componentsDir: string;
	/** The component directories to read. A directory with no `index.ts` is skipped. */
	dirs: readonly string[];
}) {
	const byDir = new Map<string, CompoundNamespace[]>();
	for (const dir of dirs) {
		const indexPath = `${componentsDir}/${dir}/index.ts`;
		if (!fs.existsSync(indexPath)) {
			continue;
		}
		const namespaces = compoundNamespacesIn(dir, fs.readFileSync(indexPath, "utf8"));
		if (namespaces.length > 0) {
			byDir.set(dir, namespaces);
		}
	}
	const all = [...byDir.values()].flat();
	const entries = Object.fromEntries(
		all.map(({ dir, stem, entry }) => [entry, `${componentsDir}/${dir}/${stem}-parts.ts`]),
	);
	return {
		entries,
		plugin: {
			name: "compound-namespaces",
			resolveId(source: string, importer: string | undefined) {
				const dir =
					importer == null ? undefined : COMPONENT_INDEX_OR_DECLARATION_RE.exec(importer)?.[1];
				const namespace = byDir.get(dir ?? "")?.find(({ stem }) => source === `./${stem}-parts.js`);
				return namespace == null ? null : { id: `./${namespace.entry}.js`, external: true };
			},
			transform: {
				order: "pre" as const,
				filter: { id: { include: COMPONENT_INDEX_RE } },
				handler(code: string, id: string) {
					const dir = COMPONENT_INDEX_RE.exec(id)?.[1];
					const namespaces = byDir.get(dir ?? "");
					return namespaces == null ? null : rewriteNamespaceAliases(code, namespaces);
				},
			},
			generateBundle(_options: unknown, bundle: Record<string, { type: string; code?: string }>) {
				for (const { dir, name, entry } of all) {
					const code = bundle[`${dir}.js`]?.code ?? "";
					const namespaceImport = new RegExp(
						`(?:export\\s*\\*\\s*as\\s+${name}|import\\s*\\*\\s*as\\s+[\\w$]+)\\s+from\\s*"\\./${entry}\\.js"`,
					);
					if (!namespaceImport.test(code)) {
						throw new Error(
							`${dir}.js must take ${name} from a namespace import of ./${entry}.js, so consumer bundlers drop unused parts.`,
						);
					}
				}
			},
		},
	};
}

export {
	//,
	compoundNamespaces,
	compoundNamespacesIn,
	rewriteNamespaceAliases,
};

export type {
	//,
	CompoundNamespace,
};
