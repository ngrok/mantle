import * as fs from "node:fs";
import path from "node:path";

/**
 * Prune custom export conditions (e.g. `@ngrok/src-live-types`) from a
 * package's `package.json#exports` before packing so they are never shipped
 * in the npm tarball, then restore the original file after the tarball is
 * created.
 *
 * Custom conditions only exist so workspace apps can resolve live source
 * files during local development; npm consumers should only ever see the
 * standard `types`/`import`/`style`/`default` conditions pointing at `dist`.
 *
 * Wire it into a package's pack lifecycle (pnpm runs both with the package
 * directory as cwd):
 *
 * ```json
 * {
 *   "scripts": {
 *     "prepack": "node ../../scripts/prune-custom-export-conditions.js prune",
 *     "postpack": "node ../../scripts/prune-custom-export-conditions.js restore"
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
 * Back up the pristine `package.json`, then rewrite it with all custom export
 * conditions removed so the manifest that lands in the tarball is clean.
 * Fails fast if a backup already exists — that means a previous pack aborted
 * before its `restore` ran, and overwriting the backup with the (possibly
 * already-pruned) working copy would destroy the only pristine manifest.
 */
function prune() {
	if (fs.existsSync(backupPath)) {
		throw new Error(
			`Refusing to overwrite the existing backup at ${backupPath}; a previous prepack run never completed its postpack restore, so package.json may still be pruned. Run the "restore" command to put the pristine manifest back (or restore package.json from git and delete the stale backup), then re-run the pack.`,
		);
	}

	const original = fs.readFileSync(packageJsonPath, "utf8");
	const packageJson = JSON.parse(original);

	if (packageJson.exports == null) {
		throw new Error(`${packageJsonPath} has no "exports" field to prune.`);
	}

	fs.mkdirSync(path.dirname(backupPath), { recursive: true });
	fs.writeFileSync(backupPath, original);

	packageJson.exports = pruneCustomConditions(packageJson.exports, []);
	fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, "\t")}\n`);
}

/**
 * Restore the pristine `package.json` from the backup created by `prune` and
 * remove the backup. Fails fast if the backup is missing, because that means
 * `prepack` never ran and the working tree is in an unexpected state.
 */
function restore() {
	if (!fs.existsSync(backupPath)) {
		throw new Error(
			`Missing ${backupPath}; "prune" must run (via prepack) before "restore" (via postpack).`,
		);
	}

	fs.copyFileSync(backupPath, packageJsonPath);
	fs.rmSync(backupPath);
}

const command = process.argv[2];
if (command === "prune") {
	prune();
} else if (command === "restore") {
	restore();
} else {
	console.error(
		`Unknown command "${command ?? ""}". Usage: node prune-custom-export-conditions.js <prune|restore>`,
	);
	process.exit(1);
}
