import { rawDocContent, urlToFileMap } from "./docs";
import { prefersMarkdown } from "./prefers-markdown";

/** The `urlToFileMap` key of the docs page at `pathname`, with or without a trailing slash. */
function docKey(pathname: string): string {
	return pathname.replace(/^\/|\/+$/g, "") || "index";
}

/** The raw markdown of the docs page at `pathname`, or `undefined` when the page has none. */
function markdownSource(pathname: string): string | undefined {
	const filePath = urlToFileMap.get(docKey(pathname));
	return filePath == null ? undefined : rawDocContent[filePath];
}

/**
 * Whether the document at `pathname` also has a markdown answer. Its HTML
 * response must send `Vary: Accept`, or a cache could give the HTML to an
 * agent that asked for markdown, or the markdown to a browser.
 *
 * @example
 * hasMarkdownVariant("/components/button"); // => true
 */
function hasMarkdownVariant(pathname: string): boolean {
	return markdownSource(pathname) != null;
}

/**
 * The URL of the markdown twin of the docs page at `pathname` (its `.md`
 * route, which the build prerenders), or `undefined` when the page has none.
 *
 * @example
 * markdownTwinPath("/components/actions/button"); // => "/components/actions/button.md"
 * markdownTwinPath("/"); // => "/index.md"
 */
function markdownTwinPath(pathname: string): string | undefined {
	return hasMarkdownVariant(pathname) ? `/${docKey(pathname)}.md` : undefined;
}

/**
 * The markdown body for a request that prefers `text/markdown` per
 * https://acceptmarkdown.com, or `null` when the HTML render must go out as
 * is. Only a docs page with raw markdown negotiates.
 *
 * `handleRequest` gets document requests only (single-fetch `.data` requests
 * are handled before it), so the pathname never ends in `.data`.
 *
 * @example
 * const response = negotiatedMarkdownResponse(request);
 * response?.headers.get("Content-Type"); // => "text/markdown; charset=utf-8"
 */
function negotiatedMarkdownResponse(request: Request): Response | null {
	if (!prefersMarkdown(request)) {
		return null;
	}
	const { pathname } = new URL(request.url);
	const markdown = markdownSource(pathname);
	if (markdown == null) {
		return null;
	}
	const filename = pathname.split("/").pop() || "index";
	return new Response(markdown, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": `inline; filename="${filename}.md"`,
			"Cache-Control": "max-age=300, stale-while-revalidate=604800",
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "noindex, nofollow",
			Vary: "Accept",
		},
	});
}

export {
	//,
	hasMarkdownVariant,
	markdownTwinPath,
	negotiatedMarkdownResponse,
};
