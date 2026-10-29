/**
 * The headers of a prerendered file. The prerenderer writes only the body, so
 * the headers that a resource route's loader sets are lost. This map puts them
 * back. Each value mirrors the loader named in its comment.
 */

const AGENT_TEXT_CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

/**
 * The headers for one file under `build/client`, keyed by its URL path, or an
 * empty object for a file that needs none (a page, an image).
 *
 * @example
 * staticHeadersFor("/api/components.json")["Access-Control-Allow-Origin"]; // => "*"
 */
export function staticHeadersFor(path: string): Record<string, string> {
	// React Router's single-fetch payload for a prerendered route.
	if (path.endsWith(".data")) {
		return { "Content-Type": "text/x-script" };
	}
	// `app/routes/$.md.tsx` and `app/routes/changelog[.]md.tsx`.
	if (path.endsWith(".md")) {
		return {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "max-age=300, stale-while-revalidate=604800",
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "noindex, nofollow",
		};
	}
	// `app/utilities/json-response.server.ts`, which every `/api/*.json` route uses.
	if (path.startsWith("/api/") && path.endsWith(".json")) {
		return {
			"Content-Type":
				path === "/api/schema.json"
					? "application/schema+json; charset=utf-8"
					: "application/json; charset=utf-8",
			"Cache-Control": AGENT_TEXT_CACHE_CONTROL,
			"Access-Control-Allow-Origin": "*",
		};
	}
	// `app/routes/llms[.]txt.tsx`, `llms-full[.]txt.tsx`, and `robots[.]txt.tsx`.
	if (path === "/llms.txt" || path === "/llms-full.txt" || path === "/robots.txt") {
		return {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": AGENT_TEXT_CACHE_CONTROL,
			"X-Content-Type-Options": "nosniff",
		};
	}
	// `app/routes/sitemap[.]xml.tsx`.
	if (path === "/sitemap.xml") {
		return {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": AGENT_TEXT_CACHE_CONTROL,
		};
	}
	return {};
}
