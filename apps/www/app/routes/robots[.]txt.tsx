import { canonicalHref } from "~/utilities/canonical-origin";
import { allowsIndexing, EDGE_HEADER } from "~/utilities/indexing";
import type { Route } from "./+types/robots[.]txt";

const CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

const robotsEnabled = `
User-agent: *
Allow: /
Sitemap: ${canonicalHref("/sitemap.xml")}
`.trim();

const robotsDisabled = `
User-agent: *
Disallow: /
`.trim();

/** Serve robots.txt: allow indexing only for a request through mantle.ngrok.com. */
export function loader({ request }: Route.LoaderArgs) {
	return new Response(allowsIndexing(request) ? robotsEnabled : robotsDisabled, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": CACHE_CONTROL,
			// Why: the body depends on the edge header, so a cache must key on it.
			Vary: EDGE_HEADER,
		},
	});
}
