import { describe, expect, it } from "vitest";
import { previewExamples } from "~/features/preview-registry";
import { collectPreviewSources } from "./preview-source.server";

describe("collectPreviewSources", () => {
	it("resolves a non-empty module for every registered preview", () => {
		const modules = collectPreviewSources();
		const published = modules.flatMap((module) => module.previewNames);

		expect(published.toSorted()).toEqual(Object.keys(previewExamples).toSorted());
		expect(modules.filter((module) => module.source.length === 0)).toEqual([]);
	});

	// The registry declares a component and a file name side by side, and nothing
	// but this makes them agree: rename a demo's export or move it to another
	// module and the published source stops carrying the component the preview
	// renders, while `/preview/<name>` keeps working.
	it("publishes the module that declares each preview's component", () => {
		const componentNames = collectPreviewSources().flatMap(({ path, previewNames, source }) =>
			previewNames.map((name) => ({
				componentName: previewExamples[name].Component.name,
				path,
				source,
			})),
		);
		const missing = componentNames
			.filter(({ componentName, source }) => !source.includes(`export function ${componentName}`))
			.map(({ componentName, path }) => `${path} declares no ${componentName}`);

		// An anonymous component would turn the substring check into
		// `includes("export function ")`, which every module satisfies.
		expect(componentNames.filter(({ componentName }) => componentName.length === 0)).toEqual([]);
		expect(missing).toEqual([]);
	});

	it("lists a module once, however many previews it renders", () => {
		const modules = collectPreviewSources();
		const paths = modules.map((module) => module.path);
		const appShell = modules.filter((module) => module.path.endsWith("app-shell-demo.tsx"));

		// deduped and sorted: publishing app-shell-demo.tsx twice would double the
		// biggest module in /llms-full.txt
		expect(paths).toEqual([...new Set(paths)].toSorted());
		expect(appShell).toHaveLength(1);
		expect(appShell[0]?.previewNames.toSorted()).toEqual(["app-shell", "bridge-shell"]);
	});

	// `/llms-full.txt` wraps each source in a ```tsx fence. A demo module's own
	// JSDoc fences are comment-prefixed (` * ```tsx`), so they cannot close it —
	// but a fence at the start of a line would, and the rest of the module would
	// spill out of the code block as broken markdown.
	it("publishes no source that could close the markdown fence around it", () => {
		const closesTheFence = collectPreviewSources()
			.filter((module) => /^ {0,3}`{3,}/m.test(module.source))
			.map((module) => module.path);

		expect(closesTheFence).toEqual([]);
	});
});
