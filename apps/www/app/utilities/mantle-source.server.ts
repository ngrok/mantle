import path from "node:path";

/**
 * Raw Mantle package source, bundled by Vite so serverless runtimes can
 * inspect JSDoc and barrel exports without reading from the filesystem.
 */
const rawSourceFiles: Record<string, string> = import.meta.glob<string>(
	"../../../../packages/mantle/src/**/*.{ts,tsx}",
	{
		eager: true,
		import: "default",
		query: "?raw",
	},
);

const sourcePrefix = "../../../../packages/mantle/src/";

const componentsSrcDir = "components";
const hooksSrcDir = "hooks";
const utilsSrcDir = "utils";

function sourceBasePath(...parts: string[]): string {
	return path.posix.normalize(path.posix.join(...parts)).replace(/^\.\//, "");
}

function sourcePathFromExport(dir: string, fromPath: string): string {
	return sourceBasePath(dir, fromPath.replace(/\.js$/, ""));
}

/**
 * Read a bundled source file. `basePath` is relative to
 * `packages/mantle/src` and may omit its `.ts`/`.tsx` extension.
 */
function readSourceFile(basePath: string): string | undefined {
	const normalized = sourceBasePath(basePath);
	const candidates = [`${normalized}.tsx`, `${normalized}.ts`, normalized];

	for (const candidate of candidates) {
		const source = rawSourceFiles[`${sourcePrefix}${candidate}`];
		if (source != null) {
			return source;
		}
	}

	return undefined;
}

export {
	componentsSrcDir,
	hooksSrcDir,
	readSourceFile,
	sourceBasePath,
	sourcePathFromExport,
	utilsSrcDir,
};
