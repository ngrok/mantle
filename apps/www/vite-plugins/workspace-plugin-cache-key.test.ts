import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { digestFiles, resolvePackageEntry } from "./workspace-plugin-cache-key";

test("digest changes when a hashed file's content changes", () => {
	const dir = mkdtempSync(path.join(tmpdir(), "cache-key-"));
	const file = path.join(dir, "index.js");
	writeFileSync(file, "export const version = 1;");
	const before = digestFiles([file]);

	writeFileSync(file, "export const version = 2;");

	expect(digestFiles([file])).not.toBe(before);
});

test("resolves a package to the file its import condition names", () => {
	// Why realpath: `require.resolve` returns the real path. macOS puts the temp dir behind a symlink.
	const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "cache-key-")));
	const packageDir = path.join(dir, "node_modules", "@scope", "plugin");
	mkdirSync(packageDir, { recursive: true });
	writeFileSync(
		path.join(packageDir, "package.json"),
		JSON.stringify({
			name: "@scope/plugin",
			exports: {
				".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
				"./package.json": "./package.json",
			},
		}),
	);

	const entry = resolvePackageEntry(
		"@scope/plugin",
		pathToFileURL(path.join(dir, "vite.config.ts")).href,
	);

	expect(entry).toBe(path.join(packageDir, "dist", "index.js"));
});
