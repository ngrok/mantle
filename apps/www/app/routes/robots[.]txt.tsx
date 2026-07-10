import { canonicalHref } from "~/utilities/canonical-origin";
import { etagFor } from "~/utilities/etag";
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

/** Serve robots.txt — allow indexing only in production. */
export function loader({ request }: Route.LoaderArgs) {
	const enableIndexing = process.env.VERCEL_ENV === "production";
	const body = enableIndexing ? robotsEnabled : robotsDisabled;
	const etag = enableIndexing ? enabledEtag : disabledEtag;

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
		},
	});
}
