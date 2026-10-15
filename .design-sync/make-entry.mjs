// Generates the stand-in package the claude.ai/design converter reads.
//
// Why: `@ngrok/mantle` ships subpath exports only (`@ngrok/mantle/button`, ...),
// and the converter needs one root entry plus one root `.d.ts`. This script
// writes `.design-sync/.cache/pkg/` with an `index.js` and an `index.d.ts` that
// re-export every JS subpath of the built `dist/`. It also copies the compiled
// sync stylesheet in, because the converter bounds `cssEntry` to the package.
//
// Run after `pnpm -w run build -F @ngrok/mantle` and the Tailwind compile. The
// `buildCmd` in `config.json` chains all three.
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mantleDir = resolve(here, "../packages/mantle");
const outDir = join(here, ".cache/pkg");
const compiledCss = join(here, ".cache/mantle.compiled.css");

const pkgJson = JSON.parse(readFileSync(join(mantleDir, "package.json"), "utf8"));

// Why skip `types`: it is type-only and exports no runtime values.
const skippedSubpaths = new Set(["./types"]);

const subpaths = Object.entries(pkgJson.exports).filter(
	([key, value]) =>
		typeof value === "object" &&
		value != null &&
		typeof value.import === "string" &&
		!skippedSubpaths.has(key),
);

if (!existsSync(compiledCss)) {
	throw new Error(`Missing ${compiledCss}. Run the Tailwind compile first (see buildCmd).`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// The first subpath to export a name owns it. A later duplicate is skipped, so
// `export *` never turns a shared name into an ambiguous (dropped) export.
const owners = new Map();
const jsLines = [];
const dtsLines = [];
for (const [key, value] of subpaths) {
	const jsPath = join(mantleDir, value.import);
	const source = readFileSync(jsPath, "utf8");
	const names = [...source.matchAll(/export\s*\{([^}]*)\}/g)]
		.flatMap((match) => match[1].split(","))
		.map((part) =>
			part
				.trim()
				.split(/\s+as\s+/)
				.pop(),
		)
		.filter(Boolean);
	// Why pass `export *` through: `data-table` re-exports all of
	// `@tanstack/react-table`, and a `DataTable` needs `createColumnHelper` and
	// the row-model helpers from it. Named exports above win over a star export.
	for (const match of source.matchAll(/export\s*\*\s*from\s*"([^".][^"]*)"/g)) {
		jsLines.push(`export * from ${JSON.stringify(match[1])};`);
		dtsLines.push(`export * from ${JSON.stringify(match[1])};`);
	}
	const fresh = names.filter((name) => !owners.has(name));
	for (const name of names) {
		if (owners.has(name)) {
			console.error(
				`[make-entry] ${name}: ${key} duplicates ${owners.get(name)}; keeping the first`,
			);
		} else {
			owners.set(name, key);
		}
	}
	if (fresh.length === 0) {
		continue;
	}
	const toJs = `./${relative(outDir, jsPath)}`;
	const toDts = `./${relative(outDir, join(mantleDir, value.types)).replace(/\.d\.ts$/, ".js")}`;
	const list = fresh.join(", ");
	jsLines.push(`export { ${list} } from ${JSON.stringify(toJs)};`);
	dtsLines.push(`export { ${list} } from ${JSON.stringify(toDts)};`);
}

// Why the prelude: `dist/` is built with the React Compiler, so components call
// `c` from `react/compiler-runtime`. The converter maps that import to
// `window.React`, which keeps `c` on `__COMPILER_RUNTIME` only.
writeFileSync(
	join(outDir, "compiler-runtime-prelude.js"),
	[
		"const React = window.React;",
		'if (typeof React.c !== "function") {',
		"\tReact.c = React.__COMPILER_RUNTIME.c;",
		"}",
		"",
	].join("\n"),
);
writeFileSync(
	join(outDir, "index.js"),
	`import "./compiler-runtime-prelude.js";\n${jsLines.join("\n")}\n`,
);
writeFileSync(join(outDir, "index.d.ts"), `${dtsLines.join("\n")}\n`);
copyFileSync(compiledCss, join(outDir, "mantle.compiled.css"));
// Why the link: the converter resolves `@types/react` and the dist's own deps
// from the stand-in package's location. pnpm keeps them under Mantle only.
symlinkSync(relative(outDir, join(mantleDir, "node_modules")), join(outDir, "node_modules"));
writeFileSync(
	join(outDir, "package.json"),
	`${JSON.stringify(
		{
			name: pkgJson.name,
			version: pkgJson.version,
			type: "module",
			module: "index.js",
			types: "index.d.ts",
		},
		null,
		2,
	)}\n`,
);

console.error(
	`[make-entry] ${owners.size} exports from ${subpaths.length} subpaths -> ${relative(process.cwd(), outDir)}`,
);
