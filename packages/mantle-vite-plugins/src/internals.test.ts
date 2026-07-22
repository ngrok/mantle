import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	MARKER_END,
	MARKER_START,
	collectFiles,
	findFirstExisting,
	parseComponentsFromCssFile,
	resolveMantleDistDir,
	scanMantleImports,
	writeSourcesToCssFile,
} from "./internals.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mantle-vite-plugin-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(relPath: string, content: string): string {
	const absPath = path.join(tmpDir, relPath);
	fs.mkdirSync(path.dirname(absPath), { recursive: true });
	fs.writeFileSync(absPath, content, "utf8");
	return absPath;
}

function readFile(relPath: string): string {
	return fs.readFileSync(path.join(tmpDir, relPath), "utf8");
}

// ---------------------------------------------------------------------------
// resolveMantleDistDir
// ---------------------------------------------------------------------------

describe("resolveMantleDistDir", () => {
	it("finds dist/ when node_modules/@ngrok/mantle exists directly under root", () => {
		writeFile("node_modules/@ngrok/mantle/package.json", "{}");
		expect(resolveMantleDistDir(tmpDir)).toBe(path.join(tmpDir, "node_modules/@ngrok/mantle/dist"));
	});

	it("finds dist/ by walking up to a parent directory", () => {
		writeFile("node_modules/@ngrok/mantle/package.json", "{}");
		const child = path.join(tmpDir, "apps/www");
		fs.mkdirSync(child, { recursive: true });
		expect(resolveMantleDistDir(child)).toBe(path.join(tmpDir, "node_modules/@ngrok/mantle/dist"));
	});

	it("returns the symlink path, not the realpath, when node_modules is a symlink (pnpm)", () => {
		// Simulate pnpm: real package lives at a hashed path, symlinked into node_modules
		const realPkgDir = path.join(
			tmpDir,
			".pnpm/@ngrok+mantle@1.0.0_hash/node_modules/@ngrok/mantle",
		);
		fs.mkdirSync(realPkgDir, { recursive: true });
		fs.writeFileSync(path.join(realPkgDir, "package.json"), "{}", "utf8");

		const symlinkDir = path.join(tmpDir, "node_modules/@ngrok/mantle");
		fs.mkdirSync(path.dirname(symlinkDir), { recursive: true });
		fs.symlinkSync(realPkgDir, symlinkDir, process.platform === "win32" ? "junction" : "dir");

		const result = resolveMantleDistDir(tmpDir);
		// Must use the symlink path, not the pnpm content-addressed realpath
		expect(result).toBe(path.join(tmpDir, "node_modules/@ngrok/mantle/dist"));
		expect(result).not.toContain(".pnpm");
	});

	it("returns null when the package is not installed", () => {
		expect(resolveMantleDistDir(tmpDir)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// scanMantleImports
// ---------------------------------------------------------------------------

describe("scanMantleImports", () => {
	it("returns an empty set when no mantle imports are present", () => {
		const file = writeFile("app.tsx", `import { useState } from "react";`);
		expect(scanMantleImports([file])).toEqual(new Set());
	});

	it("extracts a single component import", () => {
		const file = writeFile("app.tsx", `import { Button } from "@ngrok/mantle/button";`);
		expect(scanMantleImports([file])).toEqual(new Set(["button"]));
	});

	it("extracts multiple distinct component imports from one file", () => {
		const file = writeFile(
			"app.tsx",
			`
import { Button } from "@ngrok/mantle/button";
import { Badge } from "@ngrok/mantle/badge";
import { Input } from "@ngrok/mantle/input";
`,
		);
		expect(scanMantleImports([file])).toEqual(new Set(["button", "badge", "input"]));
	});

	it("deduplicates components across multiple files", () => {
		const a = writeFile("a.tsx", `import { Button } from "@ngrok/mantle/button";`);
		const b = writeFile("b.tsx", `import { Button } from "@ngrok/mantle/button";`);
		const c = writeFile("c.tsx", `import { Badge } from "@ngrok/mantle/badge";`);
		expect(scanMantleImports([a, b, c])).toEqual(new Set(["button", "badge"]));
	});

	it("ignores .css imports", () => {
		const file = writeFile("global.css", `@import "@ngrok/mantle/mantle.css";`);
		expect(scanMantleImports([file])).toEqual(new Set());
	});

	it("ignores .css?url imports (Vite query suffix)", () => {
		const file = writeFile(
			"app.tsx",
			`import mantleDark from "@ngrok/mantle/mantle-dark.css?url";`,
		);
		expect(scanMantleImports([file])).toEqual(new Set());
	});

	it("handles single-quoted imports", () => {
		const file = writeFile("app.tsx", `import { Button } from '@ngrok/mantle/button';`);
		expect(scanMantleImports([file])).toEqual(new Set(["button"]));
	});

	it("silently skips files that do not exist", () => {
		expect(scanMantleImports(["/nonexistent/file.tsx"])).toEqual(new Set());
	});
});

// ---------------------------------------------------------------------------
// collectFiles
// ---------------------------------------------------------------------------

describe("collectFiles", () => {
	it("collects files with matching extensions", () => {
		writeFile("src/a.ts", "");
		writeFile("src/b.tsx", "");
		writeFile("src/c.js", "");
		writeFile("src/ignore.css", "");

		const results: string[] = [];
		collectFiles(path.join(tmpDir, "src"), results, [".ts", ".tsx", ".js"]);
		const names = results.map((f) => path.basename(f)).toSorted();
		expect(names).toEqual(["a.ts", "b.tsx", "c.js"]);
	});

	it("recurses into subdirectories", () => {
		writeFile("src/components/button.tsx", "");
		writeFile("src/pages/home.tsx", "");

		const results: string[] = [];
		collectFiles(path.join(tmpDir, "src"), results, [".tsx"]);
		const names = results.map((f) => path.basename(f)).toSorted();
		expect(names).toEqual(["button.tsx", "home.tsx"]);
	});

	it("skips node_modules directories", () => {
		writeFile("src/app.tsx", "");
		writeFile("src/node_modules/lib/index.ts", "");

		const results: string[] = [];
		collectFiles(path.join(tmpDir, "src"), results, [".ts", ".tsx"]);
		const names = results.map((f) => path.basename(f));
		expect(names).toEqual(["app.tsx"]);
	});

	it("returns an empty array for a non-existent directory", () => {
		const results: string[] = [];
		collectFiles("/nonexistent/dir", results, [".ts"]);
		expect(results).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// writeSourcesToCssFile
// ---------------------------------------------------------------------------

describe("writeSourcesToCssFile", () => {
	it("inserts @source block after the last @import with relative paths", () => {
		// CSS file at tmpDir/app/global.css, dist at tmpDir/dist/
		writeFile(
			"app/global.css",
			`@import "tailwindcss";\n@import "@ngrok/mantle/mantle.css";\n\n@theme {\n\t--color-brand: red;\n}\n`,
		);
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(
			path.join(tmpDir, "app/global.css"),
			new Set(["button", "badge"]),
			distDir,
		);

		const content = readFile("app/global.css");
		expect(content).toContain(MARKER_START);
		expect(content).toContain(MARKER_END);
		// Paths should be relative from app/ to dist/ — i.e. ../dist/
		// Each component emits two lines: exact stub + hashed-chunk glob.
		expect(content).toContain(`@source "../dist/badge.js";`);
		expect(content).toContain(`@source "../dist/badge-*.js";`);
		expect(content).toContain(`@source "../dist/button.js";`);
		expect(content).toContain(`@source "../dist/button-*.js";`);
		// No absolute paths
		expect(content).not.toContain(tmpDir);
		// Block should appear before @theme (after last @import)
		const markerIdx = content.indexOf(MARKER_START);
		const themeIdx = content.indexOf("@theme");
		expect(markerIdx).toBeLessThan(themeIdx);
	});

	it("prepends @source block to the start of the file when no @import is present", () => {
		writeFile("global.css", `@theme {\n\t--color-brand: red;\n}\n`);
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(path.join(tmpDir, "global.css"), new Set(["button"]), distDir);

		const content = readFile("global.css");
		expect(content.trimStart().startsWith(MARKER_START)).toBe(true);
		expect(content).toContain("@theme");
	});

	it("uses ./ prefix when dist is a sibling of the CSS file", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(path.join(tmpDir, "global.css"), new Set(["button"]), distDir);

		const content = readFile("global.css");
		expect(content).toContain(`@source "./dist/button.js";`);
		expect(content).toContain(`@source "./dist/button-*.js";`);
	});

	it("sorts @source lines alphabetically", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(
			path.join(tmpDir, "global.css"),
			new Set(["toast", "badge", "button"]),
			distDir,
		);

		const content = readFile("global.css");
		const badgeIdx = content.indexOf("badge");
		const buttonIdx = content.indexOf("button");
		const toastIdx = content.indexOf("toast");
		expect(badgeIdx).toBeLessThan(buttonIdx);
		expect(buttonIdx).toBeLessThan(toastIdx);
	});

	it("replaces an existing block on re-run", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");

		writeSourcesToCssFile(cssFile, new Set(["button"]), distDir);
		expect(readFile("global.css")).toContain("button.js");
		expect(readFile("global.css")).not.toContain("badge.js");

		writeSourcesToCssFile(cssFile, new Set(["button", "badge"]), distDir);
		const content = readFile("global.css");
		expect(content).toContain("button.js");
		expect(content).toContain("badge.js");
		// Only one marker block should exist
		expect(content.split(MARKER_START).length).toBe(2);
	});

	it("removes the block when components set is empty", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");

		writeSourcesToCssFile(cssFile, new Set(["button"]), distDir);
		expect(readFile("global.css")).toContain(MARKER_START);

		writeSourcesToCssFile(cssFile, new Set(), distDir);
		const content = readFile("global.css");
		expect(content).not.toContain(MARKER_START);
		expect(content).not.toContain("@source");
	});

	it("does not write to disk when content is unchanged", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");

		writeSourcesToCssFile(cssFile, new Set(["button"]), distDir);
		const mtime1 = fs.statSync(cssFile).mtimeMs;

		writeSourcesToCssFile(cssFile, new Set(["button"]), distDir);
		const mtime2 = fs.statSync(cssFile).mtimeMs;

		expect(mtime1).toBe(mtime2);
	});

	it("silently skips a non-existent CSS file", () => {
		expect(() =>
			writeSourcesToCssFile("/nonexistent/global.css", new Set(["button"]), tmpDir),
		).not.toThrow();
	});

	it("emits an internal shared-chunk glob (without an entry stub) for chart components", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(cssFile, new Set(["bar-chart"]), distDir);

		const content = readFile("global.css");
		expect(content).toContain(`@source "./dist/bar-chart.js";`);
		expect(content).toContain(`@source "./dist/bar-chart-*.js";`);
		// The shared canvas engine chunk (chart-<hash>.js) must be scanned too.
		expect(content).toContain(`@source "./dist/chart-*.js";`);
		// "chart" is not a public subpath — there is no chart.js entry stub.
		expect(content).not.toContain(`@source "./dist/chart.js";`);
		// The engine's CopyButton renders an IconButton whose classes live in the
		// published button chunk — scan it, but as a transitive dependency (glob
		// only, no button.js entry, since the app never imported button directly).
		expect(content).toContain(`@source "./dist/button-*.js";`);
		expect(content).not.toContain(`@source "./dist/button.js";`);
	});

	it("does not double-emit the button chunk when a chart and button are both imported", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(cssFile, new Set(["bar-chart", "button"]), distDir);

		const content = readFile("global.css");
		// button is a direct import here, so it gets the full component treatment
		// (entry stub + glob), and the chart's transitive reference must not add a
		// second glob.
		expect(content).toContain(`@source "./dist/button.js";`);
		const buttonGlobCount = (content.match(/"\.\/dist\/button-\*\.js"/g) ?? []).length;
		expect(buttonGlobCount).toBe(1);
	});

	it("deduplicates the internal chunk glob across sibling chart components", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(
			cssFile,
			new Set(["area-chart", "bar-chart", "line-chart", "scatter-plot"]),
			distDir,
		);

		const content = readFile("global.css");
		const chartGlobCount = (content.match(/"\.\/dist\/chart-\*\.js"/g) ?? []).length;
		expect(chartGlobCount).toBe(1);
	});

	it("emits the list chunk glob for selectable-list without duplicating it when list is also present", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");

		// selectable-list alone: glob only, no list.js entry stub.
		writeSourcesToCssFile(cssFile, new Set(["selectable-list"]), distDir);
		let content = readFile("global.css");
		expect(content).toContain(`@source "./dist/list-*.js";`);
		expect(content).not.toContain(`@source "./dist/list.js";`);

		// list + selectable-list: the list component already emits list-*.js —
		// exactly one glob line, plus the list.js entry stub.
		writeSourcesToCssFile(cssFile, new Set(["list", "selectable-list"]), distDir);
		content = readFile("global.css");
		expect(content).toContain(`@source "./dist/list.js";`);
		const listGlobCount = (content.match(/"\.\/dist\/list-\*\.js"/g) ?? []).length;
		expect(listGlobCount).toBe(1);
	});

	it("does not produce prefix collisions between similar component names", () => {
		// "alert" must not match "alert-dialog"; "code" must not match "code-block".
		// Each component gets its own exact `.js` and chunk `-*.js` pair.
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(cssFile, new Set(["alert", "alert-dialog"]), distDir);

		const content = readFile("global.css");
		// Exact-stub line for "alert" must not bleed into "alert-dialog".
		expect(content).toContain(`@source "./dist/alert.js";`);
		expect(content).toContain(`@source "./dist/alert-*.js";`);
		expect(content).toContain(`@source "./dist/alert-dialog.js";`);
		expect(content).toContain(`@source "./dist/alert-dialog-*.js";`);
		// The chunk glob for "alert" must not be `alert*.js` (which would also
		// match alert-dialog-<hash>.js). It must be specifically `alert-*.js`.
		expect(content).not.toContain(`@source "./dist/alert*.js";`);
	});
});

// ---------------------------------------------------------------------------
// parseComponentsFromCssFile
// ---------------------------------------------------------------------------

describe("parseComponentsFromCssFile", () => {
	it("returns an empty set when the file does not exist", () => {
		expect(parseComponentsFromCssFile("/nonexistent/global.css")).toEqual(new Set());
	});

	it("returns an empty set when no marker block is present", () => {
		const cssFile = writeFile("global.css", `@import "tailwindcss";\n`);
		expect(parseComponentsFromCssFile(cssFile)).toEqual(new Set());
	});

	it("extracts component names from a written @source block", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(cssFile, new Set(["button", "badge", "input"]), distDir);

		expect(parseComponentsFromCssFile(cssFile)).toEqual(new Set(["button", "badge", "input"]));
	});

	it("is the inverse of writeSourcesToCssFile (round-trips correctly)", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		const components = new Set(["anchor", "badge", "button", "card", "tooltip"]);

		writeSourcesToCssFile(cssFile, components, distDir);
		expect(parseComponentsFromCssFile(cssFile)).toEqual(components);
	});

	it("returns an empty set after the block is removed", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");

		writeSourcesToCssFile(cssFile, new Set(["button"]), distDir);
		writeSourcesToCssFile(cssFile, new Set(), distDir); // remove block
		expect(parseComponentsFromCssFile(cssFile)).toEqual(new Set());
	});

	it("does not read internal shared-chunk globs back as components", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		const components = new Set(["bar-chart", "selectable-list"]);

		writeSourcesToCssFile(cssFile, components, distDir);
		// The emitted chart-*.js / list-*.js globs must not round-trip as
		// "chart" / "list" — those are not importable subpaths.
		expect(parseComponentsFromCssFile(cssFile)).toEqual(components);
	});

	it("does not conflate prefix-sharing component names (alert vs alert-dialog)", () => {
		writeFile("global.css", `@import "tailwindcss";\n`);
		const cssFile = path.join(tmpDir, "global.css");
		const distDir = path.join(tmpDir, "dist");
		const components = new Set(["alert", "alert-dialog", "code", "code-block"]);

		writeSourcesToCssFile(cssFile, components, distDir);
		// Round-trip must return the exact same set — no extra or missing names.
		expect(parseComponentsFromCssFile(cssFile)).toEqual(components);
	});
});

// ---------------------------------------------------------------------------
// findFirstExisting
// ---------------------------------------------------------------------------

describe("findFirstExisting", () => {
	it("returns the first candidate that exists", () => {
		writeFile("src/global.css", "");
		writeFile("app/global.css", "");

		const result = findFirstExisting(tmpDir, ["app/global.css", "src/global.css"]);
		expect(result).toBe(path.join(tmpDir, "app/global.css"));
	});

	it("skips missing candidates", () => {
		writeFile("src/global.css", "");

		const result = findFirstExisting(tmpDir, ["app/global.css", "src/global.css"]);
		expect(result).toBe(path.join(tmpDir, "src/global.css"));
	});

	it("returns null when no candidate exists", () => {
		expect(findFirstExisting(tmpDir, ["app/global.css", "src/global.css"])).toBeNull();
	});

	it("handles absolute candidate paths", () => {
		const abs = writeFile("global.css", "");
		expect(findFirstExisting(tmpDir, [abs])).toBe(abs);
	});
});

// ---------------------------------------------------------------------------
// Integration: scan → write
// ---------------------------------------------------------------------------

describe("scan → writeSourcesToCssFile integration", () => {
	it("produces correct @source lines for components found in app source", () => {
		writeFile("src/app.tsx", `import { Button } from "@ngrok/mantle/button";`);
		writeFile("src/nav.tsx", `import { Badge } from "@ngrok/mantle/badge";`);
		writeFile("app/global.css", `@import "tailwindcss";\n`);

		const files: string[] = [];
		collectFiles(path.join(tmpDir, "src"), files, [".ts", ".tsx", ".js", ".jsx"]);

		const components = scanMantleImports(files);
		const distDir = path.join(tmpDir, "dist");
		writeSourcesToCssFile(path.join(tmpDir, "app/global.css"), components, distDir);

		const content = readFile("app/global.css");
		// CSS is at app/global.css, dist is at dist/ — relative path is ../dist/
		// Each component emits two lines: exact stub + hashed-chunk glob.
		expect(content).toContain(`@source "../dist/button.js";`);
		expect(content).toContain(`@source "../dist/button-*.js";`);
		expect(content).toContain(`@source "../dist/badge.js";`);
		expect(content).toContain(`@source "../dist/badge-*.js";`);
		expect(content).not.toContain(tmpDir);
	});

	it("leaves file unchanged when app imports no mantle components", () => {
		const original = `@import "tailwindcss";\n`;
		writeFile("app/global.css", original);
		writeFile("src/app.tsx", `import { useState } from "react";`);

		const files: string[] = [];
		collectFiles(path.join(tmpDir, "src"), files, [".ts", ".tsx", ".js", ".jsx"]);

		const components = scanMantleImports(files);
		writeSourcesToCssFile(
			path.join(tmpDir, "app/global.css"),
			components,
			path.join(tmpDir, "dist"),
		);

		expect(readFile("app/global.css")).toBe(original);
	});

	it("allowlist components appear in output even when not found by the scanner", () => {
		// App only imports button, but dialog is allowlisted (e.g. transitively
		// required by command which the scanner wouldn't catch).
		writeFile("src/app.tsx", `import { Button } from "@ngrok/mantle/button";`);
		writeFile("app/global.css", `@import "tailwindcss";\n`);

		const files: string[] = [];
		collectFiles(path.join(tmpDir, "src"), files, [".ts", ".tsx", ".js", ".jsx"]);

		const scanned = scanMantleImports(files);
		const allowlist = new Set(["dialog"]);
		const components = new Set([...scanned, ...allowlist]);
		writeSourcesToCssFile(
			path.join(tmpDir, "app/global.css"),
			components,
			path.join(tmpDir, "dist"),
		);

		const content = readFile("app/global.css");
		expect(content).toContain(`@source "../dist/button.js";`);
		expect(content).toContain(`@source "../dist/button-*.js";`);
		expect(content).toContain(`@source "../dist/dialog.js";`);
		expect(content).toContain(`@source "../dist/dialog-*.js";`);
	});

	it("allowlist deduplicates components already found by the scanner", () => {
		writeFile("src/app.tsx", `import { Button } from "@ngrok/mantle/button";`);
		writeFile("app/global.css", `@import "tailwindcss";\n`);

		const files: string[] = [];
		collectFiles(path.join(tmpDir, "src"), files, [".ts", ".tsx", ".js", ".jsx"]);

		const scanned = scanMantleImports(files);
		// button is both scanned and allowlisted — should only appear once in output.
		const allowlist = new Set(["button"]);
		const components = new Set([...scanned, ...allowlist]);
		writeSourcesToCssFile(
			path.join(tmpDir, "app/global.css"),
			components,
			path.join(tmpDir, "dist"),
		);

		const content = readFile("app/global.css");
		const buttonCount = (content.match(/"\.\.\/dist\/button\.js"/g) ?? []).length;
		expect(buttonCount).toBe(1);
	});
});
