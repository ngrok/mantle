import { canonicalHref } from "~/utilities/canonical-origin";
import { etagFor } from "~/utilities/etag";
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

const enabledEtag = etagFor(robotsEnabled);
const disabledEtag = etagFor(robotsDisabled);

/** Serve robots.txt: allow indexing only for a request through mantle.ngrok.com. */
export function loader({ request }: Route.LoaderArgs) {
	const enableIndexing = allowsIndexing(request);
	const body = enableIndexing ? robotsEnabled : robotsDisabled;
	const etag = enableIndexing ? enabledEtag : disabledEtag;

	if (request.headers.get("If-None-Match") === etag) {
		return new Response(null, {
			status: 304,
			headers: { ETag: etag, "Cache-Control": CACHE_CONTROL, Vary: EDGE_HEADER },
		});
	}

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": CACHE_CONTROL,
			// Why: the body depends on the edge header, so a cache must key on it.
			Vary: EDGE_HEADER,
			ETag: etag,
		},
	});
}
