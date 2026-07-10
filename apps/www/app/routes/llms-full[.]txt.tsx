import { canonicalHref } from "~/utilities/canonical-origin";
import { rawDocContent, urlToFileMap } from "~/utilities/docs";
import { etagFor } from "~/utilities/etag";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";
import type { Route } from "./+types/llms-full[.]txt";

const CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

function buildBody(): string {
	const slugs = Array.from(urlToFileMap.keys()).toSorted((a, b) => a.localeCompare(b));

	const sections: string[] = [
		"# @ngrok/mantle — Full Documentation",
		"",
		"> Concatenated markdown for every page on https://mantle.ngrok.com. Each section is preceded by its canonical docs URL. JSX preview blocks (`<Example>`) are dropped; code fences are preserved verbatim.",
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

	return sections.join("\n");
}

function computePayload(): { body: string; etag: string } {
	const body = buildBody();
	return { body, etag: etagFor(body) };
}

// Memoize in production: rendering every MDX page through unified is the
// most expensive work in this loader, and the doc set is fixed at build
// time. In dev we recompute so MDX edits surface immediately.
let cachedPayload: { body: string; etag: string } | null = null;

function getPayload(): { body: string; etag: string } {
	if (!import.meta.env.PROD) {
		return computePayload();
	}
	if (!cachedPayload) {
		cachedPayload = computePayload();
	}
	return cachedPayload;
}

/**
 * Serve `/llms-full.txt` — the concatenated markdown of every docs page,
 * suitable for shoving into an LLM context window when an agent needs
 * full coverage of the library rather than just the per-page index.
 *
 * Each section is delimited by a heading with the docs URL so agents can
 * cite specific pages, and content is the same plain-markdown rendering
 * served at `/<slug>.md`.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const { body, etag } = getPayload();

	if (request.headers.get("If-None-Match") === etag) {
		return new Response(null, {
			status: 304,
			headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
		});
	}

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": CACHE_CONTROL,
			ETag: etag,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
