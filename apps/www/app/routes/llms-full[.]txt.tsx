import { canonicalHref } from "~/utilities/canonical-origin";
import { rawDocContent, urlToFileMap } from "~/utilities/docs";
import { collectPreviewSources } from "~/utilities/preview-source.server";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";

function buildBody(): string {
	const slugs = Array.from(urlToFileMap.keys()).toSorted((a, b) => a.localeCompare(b));

	const sections: string[] = [
		"# @ngrok/mantle — Full Documentation",
		"",
		"> Concatenated markdown for every page on https://mantle.ngrok.com. Each section is preceded by its canonical docs URL. JSX preview blocks (`<Example>`) are dropped; code fences are preserved verbatim. The framed demos those pages embed follow the last page, under `# Framed preview sources`.",
		"",
		`Docs index: ${canonicalHref("/llms.txt")}`,
		`Component manifest: ${canonicalHref("/api/components.json")}`,
		`Hooks manifest: ${canonicalHref("/api/hooks.json")}`,
		`Utilities manifest: ${canonicalHref("/api/utils.json")}`,
		`Package info: ${canonicalHref("/api/package.json")}`,
		`Changelog (structured): ${canonicalHref("/api/changelog.json")}`,
		`Search index: ${canonicalHref("/api/search-index.json")}`,
		`Schemas: ${canonicalHref("/api/schema.json")}`,
		"",
		"---",
		"",
	];

	for (const slug of slugs) {
		const filePath = urlToFileMap.get(slug);
		const raw = filePath ? rawDocContent[filePath] : undefined;
		if (!raw) {
			continue;
		}
		const path = slug === "index" ? "/" : `/${slug}`;
		sections.push(
			`<!-- source: ${canonicalHref(path)} -->`,
			"",
			renderMdxToMarkdown(raw).trimEnd(),
			"",
			"---",
			"",
		);
	}

	// The docs pages' own fences are hand-written excerpts, so an agent reading
	// them offline builds a simpler shell than the framed demo beside them
	// renders. Publish the demo modules themselves, whole, so the richer
	// composition is readable without the browser.
	sections.push(
		"# Framed preview sources",
		"",
		"> The React source of the framed demos the pages above embed, verbatim. Each module renders one or more previews at `/preview/<name>` and is the code that preview actually runs — the fences on the docs pages are shorter, hand-written excerpts. The preview URLs a module serves are listed above it.",
		"",
		"---",
		"",
	);

	for (const { path, previewNames, source } of collectPreviewSources()) {
		const previewUrls = previewNames.map((name) => canonicalHref(`/preview/${name}`)).join(", ");
		sections.push(
			`<!-- source: ${path} -->`,
			`<!-- previews: ${previewUrls} -->`,
			"",
			"```tsx",
			source.trimEnd(),
			"```",
			"",
			"---",
			"",
		);
	}

	return sections.join("\n");
}

// Why: the route matches without case, so `/LLMS-FULL.TXT` misses the
// prerendered file and runs the loader. A build takes about a second.
let productionBody: string | undefined;

/**
 * Serve `/llms-full.txt` — the concatenated markdown of every docs page, then
 * the React source of every framed preview those pages embed, suitable for
 * shoving into an LLM context window when an agent needs full coverage of the
 * library rather than just the per-page index.
 *
 * Each page section is delimited by a heading with the docs URL so agents can
 * cite specific pages, and content is the same plain-markdown rendering
 * served at `/<slug>.md`. Each preview module follows under `# Framed preview
 * sources`, in a `tsx` fence headed by its repo path and preview URLs.
 */
export function loader() {
	// Why dev builds each time: an MDX edit then shows on the next request.
	const body = import.meta.env.PROD ? (productionBody ??= buildBody()) : buildBody();
	return new Response(body, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}
