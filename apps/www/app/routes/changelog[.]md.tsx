import { etagFor } from "~/utilities/etag";
// `?raw` lets Vite bundle the package CHANGELOG verbatim so the docs site
// stays in sync with the published source without a copy step.
import changelogMarkdown from "../../../../packages/mantle/CHANGELOG.md?raw";
import type { Route } from "./+types/changelog[.]md";

const etag = etagFor(changelogMarkdown);

/**
 * Serve `/changelog.md` — the raw `@ngrok/mantle` CHANGELOG as plain
 * markdown. Mirrors the docs-site convention where every page is also
 * available with a `.md` suffix for agent and tooling consumption.
 */
export async function loader({ request }: Route.LoaderArgs) {
	if (request.headers.get("If-None-Match") === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				ETag: etag,
				"Cache-Control": "max-age=300, stale-while-revalidate=604800",
			},
		});
	}

	return new Response(changelogMarkdown, {
		status: 200,
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": 'inline; filename="changelog.md"',
			"Cache-Control": "max-age=300, stale-while-revalidate=604800",
			ETag: etag,
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
}
