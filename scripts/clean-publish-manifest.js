import * as fs from "node:fs";
import path from "node:path";

/**
 * Rewrite a package's `package.json` into its lean published form before
 * packing, then restore the pristine file after the tarball is created. The
 * manifest of every published version is embedded permanently in the npm
 * registry's per-package metadata document (the packument), so anything we
 * strip here compounds across releases.
 *
 * The `clean` command applies these transformations:
 *
 * 1. Remove custom export conditions (e.g. `@ngrok/src-live-types`). They
 *    only exist so workspace apps can resolve live source files during local
 *    development and would point npm consumers at `./src/...` paths that are
 *    excluded from the tarball.
 * 2. Drop `import` conditions that duplicate a sibling `default` condition
 *    with the same target — `default` already matches importers.
 * 3. Collapse `{ "types": "./dist/x.d.ts", "import": "./dist/x.js" }` entries
 *    to the plain string `"./dist/x.js"`. TypeScript resolves the sibling
 *    `.d.ts` next to a string export target automatically, so the explicit
 *    `types` condition is redundant.
 * 4. Delete `devDependencies` and `scripts` — consumers never install or run
 *    them. pnpm resolves the pack lifecycle from the manifest it read at
 *    startup, so deleting `scripts` here does not stop `postpack` from
 *    running.
 *
 * Wire it into a package's pack lifecycle (pnpm runs both with the package
 * directory as cwd):
 *
 * ```json
 * {
 *   "scripts": {
 *     "prepack": "node ../../scripts/clean-publish-manifest.js clean",
 *     "postpack": "node ../../scripts/clean-publish-manifest.js restore"
 *   }
 * }
 * ```
 */

const packageJsonPath = path.resolve(process.cwd(), "package.json");

/**
 * The pristine `package.json` is stashed inside `node_modules` while the
 * tarball is created because npm/pnpm never include `node_modules` in a pack,
 * so the backup cannot leak into the published package.
 */
const backupPath = path.resolve(process.cwd(), "node_modules", ".package.json.prepack-backup");

/**
 * Whether an export condition name is a custom (community-defined) condition.
 * Custom conditions are namespaced with an `@scope/` prefix to avoid clashing
 * with current or future standard conditions (`types`, `import`, `default`,
 * `style`, …), which never start with `@`.
 *
 * see: https://nodejs.org/api/packages.html#community-conditions-definitions
 *
 * @param {string} condition
 * @returns {boolean}
 * @example
 * isCustomCondition("@ngrok/src-live-types"); // => true
 * isCustomCondition("import"); // => false
 */
function isCustomCondition(condition) {
	return condition.startsWith("@");
}

/**
 * Return a copy of a `package.json#exports` value with every custom condition
 * removed, recursing through nested condition objects and fallback arrays.
 * Fails fast if pruning would leave an entry with no conditions at all, since
 * publishing such an entry would make that subpath unresolvable for npm
 * consumers.
 *
 * @param {unknown} exportsValue
 * @param {string[]} trail breadcrumb of keys into `exports`, used in error messages
 * @returns {unknown}
 * @example
 * pruneCustomConditions(
 * 	{ "./button": { "@ngrok/src-live-types": "./src/button/index.ts", import: "./dist/button.js" } },
 * 	[],
 * );
 * // => { "./button": { import: "./dist/button.js" } }
 */
function pruneCustomConditions(exportsValue, trail) {
	if (Array.isArray(exportsValue)) {
		return exportsValue.map((entry, index) => pruneCustomConditions(entry, [...trail, `${index}`]));
	}

	if (exportsValue == null || typeof exportsValue !== "object") {
		return exportsValue;
	}

	/** @type {Record<string, unknown>} */
	const pruned = {};
	for (const [key, value] of Object.entries(exportsValue)) {
		if (isCustomCondition(key)) {
			continue;
		}
		pruned[key] = pruneCustomConditions(value, [...trail, key]);
	}

	if (Object.keys(pruned).length === 0) {
		const location = trail.length > 0 ? `exports ▸ ${trail.join(" ▸ ")}` : "exports";
		throw new Error(
			`Pruning custom conditions left "${location}" empty in ${packageJsonPath}; every entry needs at least one standard condition (e.g. "import" or "default") pointing at built output.`,
		);
	}

	return pruned;
}

/**
 * The declaration file TypeScript looks for next to a `.js` export target
 * when an exports entry is a plain string (no `types` condition).
 *
 * @param {string} jsPath
 * @returns {string}
 * @example
 * siblingDeclarationPath("./dist/button.js"); // => "./dist/button.d.ts"
 */
function siblingDeclarationPath(jsPath) {
	return jsPath.replace(/\.js$/, ".d.ts");
}

/**
 * Return a copy of a single exports entry with redundant conditions removed:
 * an `import` condition that duplicates `default` is dropped, and an entry of
 * exactly `{ types, import }` where `types` is the `.d.ts` sibling of the
 * `import` target collapses to the plain `import` string (TypeScript finds
 * the sibling declaration file on its own). Entries that don't match these
 * shapes are returned unchanged — a conservative rule, so anything with e.g.
 * a `require` condition or a non-sibling `types` path stays an object.
 *
 * @param {unknown} entry one value of the `exports` map
 * @returns {unknown}
 * @example
 * collapseRedundantConditions({ types: "./dist/button.d.ts", import: "./dist/button.js" });
 * // => "./dist/button.js"
 * collapseRedundantConditions({ style: "./dist/a.css", import: "./dist/a.css", default: "./dist/a.css" });
 * // => { style: "./dist/a.css", default: "./dist/a.css" }
 */
function collapseRedundantConditions(entry) {
	if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
		return entry;
	}

	/** @type {Record<string, unknown>} */
	const conditions = { ...entry };
	if (typeof conditions.import === "string" && conditions.import === conditions.default) {
		delete conditions.import;
	}

	const remaining = Object.keys(conditions);
	const isTypesImportPair =
		remaining.length === 2 &&
		typeof conditions.types === "string" &&
		typeof conditions.import === "string";
	if (isTypesImportPair && conditions.types === siblingDeclarationPath(conditions.import)) {
		return conditions.import;
	}

	return conditions;
}

/**
 * Back up the pristine `package.json`, then rewrite it in its lean published
 * form (see the module doc for the exact transformations). Fails fast if a
 * backup already exists — that means a previous pack aborted before its
 * `restore` ran, and overwriting the backup with the (possibly
 * already-cleaned) working copy would destroy the only pristine manifest.
 */
function clean() {
	if (fs.existsSync(backupPath)) {
		throw new Error(
			`Refusing to overwrite the existing backup at ${backupPath}; a previous prepack run never completed its postpack restore, so package.json may still be cleaned. Run the "restore" command to put the pristine manifest back (or restore package.json from git and delete the stale backup), then re-run the pack.`,
		);
	}

	const original = fs.readFileSync(packageJsonPath, "utf8");
	const packageJson = JSON.parse(original);

	if (packageJson.exports == null) {
		throw new Error(`${packageJsonPath} has no "exports" field to clean.`);
	}

	fs.mkdirSync(path.dirname(backupPath), { recursive: true });
	fs.writeFileSync(backupPath, original);

	const pruned = pruneCustomConditions(packageJson.exports, []);
	packageJson.exports = Object.fromEntries(
		Object.entries(pruned).map(([subpath, entry]) => [subpath, collapseRedundantConditions(entry)]),
	);
	delete packageJson.devDependencies;
	delete packageJson.scripts;

	fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, "\t")}\n`);
}

/**
 * Restore the pristine `package.json` from the backup created by `clean` and
 * remove the backup. Fails fast if the backup is missing, because that means
 * `prepack` never ran and the working tree is in an unexpected state.
 */
function restore() {
	if (!fs.existsSync(backupPath)) {
		throw new Error(
			`Missing ${backupPath}; "clean" must run (via prepack) before "restore" (via postpack).`,
		);
	}

	fs.copyFileSync(backupPath, packageJsonPath);
	fs.rmSync(backupPath);
}

const command = process.argv[2];
if (command === "clean") {
	clean();
} else if (command === "restore") {
	restore();
} else {
	console.error(
		`Unknown command "${command ?? ""}". Usage: node clean-publish-manifest.js <clean|restore>`,
	);
	process.exit(1);
}
