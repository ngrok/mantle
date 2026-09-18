import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { digestFiles, resolvePackageEntry } from "./workspace-plugin-cache-key";

/**
 * Writes `@scope/plugin` with the given `exports` map into a fresh `node_modules`, and returns
 * the package directory and a module URL to resolve from.
 */
function writePackage(exports: Record<string, unknown>): { packageDir: string; from: string } {
	// Why realpath: `require.resolve` returns the real path. macOS puts the temp dir behind a symlink.
	const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "cache-key-")));
	const packageDir = path.join(dir, "node_modules", "@scope", "plugin");
	mkdirSync(packageDir, { recursive: true });
	writeFileSync(
		path.join(packageDir, "package.json"),
		JSON.stringify({
			name: "@scope/plugin",
			exports: { ...exports, "./package.json": "./package.json" },
		}),
	);
	return { packageDir, from: pathToFileURL(path.join(dir, "vite.config.ts")).href };
}

test("digest changes when a hashed file's content changes", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "cache-key-"));
	const file = path.join(dir, "index.js");
	writeFileSync(file, "export const version = 1;");
	const before = digestFiles([file]);

	writeFileSync(file, "export const version = 2;");

	expect(digestFiles([file])).not.toBe(before);
});

test("resolves a package to the file its import condition names", () => {
	const { packageDir, from } = writePackage({
		".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
	});

	expect(resolvePackageEntry("@scope/plugin", from)).toBe(
		path.join(packageDir, "dist", "index.js"),
	);
});

test("resolves a subpath to the file its import condition names", () => {
	const { packageDir, from } = writePackage({
		".": { import: "./dist/index.js" },
		"./theme": { types: "./dist/theme.d.ts", import: "./dist/theme.js" },
	});

	expect(resolvePackageEntry("@scope/plugin/theme", from)).toBe(
		path.join(packageDir, "dist", "theme.js"),
	);
});

test("throws when the manifest exports no import file for the specifier", () => {
	const { from } = writePackage({ ".": { import: "./dist/index.js" } });

	expect(() => resolvePackageEntry("@scope/plugin/missing", from)).toThrow(
		'exports no import file for "@scope/plugin/missing"',
	);
});
