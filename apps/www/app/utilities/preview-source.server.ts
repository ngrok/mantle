import type { PreviewExampleName } from "~/features/preview-registry";
import { isPreviewExampleName, previewExamples } from "~/features/preview-registry";

/**
 * Raw source for every demo module under `app/features/`, bundled by Vite so
 * serverless runtimes can publish it without reading from the filesystem — the
 * same approach `mantle-source.server.ts` takes for the package's own source.
 * The two patterns cover the naming every demo module already follows and leave
 * their test files out, since those never render a preview.
 */
const rawDemoSources: Record<string, string> = import.meta.glob<string>(
	["../features/*-demo.tsx", "../features/*-demos.tsx"],
	{
		eager: true,
		import: "default",
		query: "?raw",
	},
);

const sourcePrefix = "../features/";

/** One demo module, with every framed preview it renders. */
type PreviewSourceModule = {
	/** The module's path from the repo root, for the reader who wants to edit it. */
	path: string;
	/** Every registered preview the module renders, in registry order. */
	previewNames: Array<PreviewExampleName>;
	/** The module's verbatim source. */
	source: string;
};

/**
 * Every demo module that owns a framed preview, deduped and sorted by path.
 * Several previews can share one module (`centered-layout` and
 * `centered-layout-header` both live in `centered-layout-demos.tsx`), so each
 * module appears once and names all of them. Throws when a registered
 * `sourceFile` matches no module, because that is a renamed file the registry
 * never heard about — and the alternative is a silent hole in the published
 * docs.
 *
 * @example
 * ```ts
 * for (const { path, previewNames, source } of collectPreviewSources()) {
 *   console.log(path, previewNames, source.length);
 * }
 * ```
 */
export function collectPreviewSources(): Array<PreviewSourceModule> {
	const modules = new Map<string, PreviewSourceModule>();

	// The guard, rather than `Object.entries`, because `Object.keys` widens a
	// `Record`'s keys to `string` and the loop body needs the registered names.
	for (const name of Object.keys(previewExamples).filter(isPreviewExampleName)) {
		const { sourceFile } = previewExamples[name];
		const existing = modules.get(sourceFile);
		if (existing) {
			existing.previewNames.push(name);
			continue;
		}

		const source = rawDemoSources[`${sourcePrefix}${sourceFile}`];
		if (source == null) {
			throw new Error(
				`previewExamples["${name}"].sourceFile is "${sourceFile}", which no module under app/features/ matches.`,
			);
		}

		modules.set(sourceFile, {
			path: `apps/www/app/features/${sourceFile}`,
			previewNames: [name],
			source,
		});
	}

	return [...modules.values()].toSorted((a, b) => a.path.localeCompare(b.path));
}
