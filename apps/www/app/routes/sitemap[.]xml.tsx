import { canonicalHref } from "~/utilities/canonical-origin";
import { urlToFileMap } from "~/utilities/docs";
import { etagFor } from "~/utilities/etag";
import type { Route } from "./+types/sitemap[.]xml";

const CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

function escapeXml(input: string): string {
	return input
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function getDocPaths(): string[] {
	const paths = new Set<string>(["/"]);

	for (const slug of urlToFileMap.keys()) {
		paths.add(slug === "index" ? "/" : `/${slug}`);
	}

	// Routes that aren't backed by an MDX file in app/docs/.
	paths.add("/changelog");
	paths.add("/layouts");
	paths.add("/recipes");
	paths.add("/migrations");

	return Array.from(paths).toSorted((a, b) => a.localeCompare(b));
}

function buildSitemap(): string {
	const entries = getDocPaths()
		.map((path) => `  <url>\n    <loc>${escapeXml(canonicalHref(path))}</loc>\n  </url>`)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function computePayload(): { body: string; etag: string } {
	const body = buildSitemap();
	return { body, etag: etagFor(body) };
}

// Memoize in production: the doc set is fixed at build time. In dev we
// recompute so newly added docs surface immediately.
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
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": CACHE_CONTROL,
			ETag: etag,
		},
	});
}
