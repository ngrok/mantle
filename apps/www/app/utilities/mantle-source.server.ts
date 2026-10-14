/**
 * Raw Mantle package source, bundled by Vite so serverless runtimes can
 * inspect JSDoc and barrel exports without reading from the filesystem.
 * Test files are excluded: the manifest reads module and index base paths
 * only, so bundling tests is pure server-bundle dead weight.
 */
const eagerSourceFiles: Record<string, string> = import.meta.env.PROD
	? import.meta.glob<string>(
			["../../../../packages/mantle/src/**/*.{ts,tsx}", "!**/*.test.{ts,tsx}"],
			{
				eager: true,
				import: "default",
				query: "?raw",
			},
		)
	: {};

/**
 * Lazy importers for dev. A lazy import keeps dev-server startup fast, and
 * Vite re-reads an edited source file on the next request, so the manifest
 * follows a JSDoc edit without a restart.
 */
const lazySourceImporters: Record<string, () => Promise<string>> = import.meta.env.DEV
	? import.meta.glob<string>(
			["../../../../packages/mantle/src/**/*.{ts,tsx}", "!**/*.test.{ts,tsx}"],
			{
				import: "default",
				query: "?raw",
			},
		)
	: {};

const sourcePrefix = "../../../../packages/mantle/src/";

/**
 * Load every bundled source file, keyed by its `packages/mantle/src`-relative
 * path: the eager map in prod, a fresh import of each file in dev.
 *
 * @example
 * const files = await loadSourceFiles();
 * files["components/button/button.tsx"]?.includes("function Button"); // => true
 */
async function loadSourceFiles(): Promise<Record<string, string>> {
	const entries = import.meta.env.PROD
		? Object.entries(eagerSourceFiles)
		: await Promise.all(
				Object.entries(lazySourceImporters).map(
					async ([filePath, importer]): Promise<[string, string]> => [filePath, await importer()],
				),
			);
	const files: Record<string, string> = {};
	for (const [filePath, source] of entries) {
		files[filePath.slice(sourcePrefix.length)] = source;
	}
	return files;
}

/**
 * A reader over loaded source files. `basePath` is relative to
 * `packages/mantle/src` and may omit its `.ts`/`.tsx` extension.
 *
 * @example
 * const readSource = sourceReader(await loadSourceFiles());
 * readSource("components/button/button")?.includes("function Button"); // => true
 */
function sourceReader(files: Record<string, string>): (basePath: string) => string | undefined {
	return (basePath) => {
		const normalized = basePath.replace(/^\.\//, "");
		for (const candidate of [`${normalized}.tsx`, `${normalized}.ts`, normalized]) {
			const source = files[candidate];
			if (source != null) {
				return source;
			}
		}
		return undefined;
	};
}

export {
	//,
	loadSourceFiles,
	sourceReader,
};
