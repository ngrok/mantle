// `?raw` lets Vite bundle the package CHANGELOG verbatim so the docs site
// stays in sync with the published source without a copy step.
import changelogMarkdown from "../../../../packages/mantle/CHANGELOG.md?raw";

/**
 * Serve `/changelog.md` — the raw `@ngrok/mantle` CHANGELOG as plain
 * markdown. Mirrors the docs-site convention where every page is also
 * available with a `.md` suffix for agent and tooling consumption.
 */
export function loader() {
	return new Response(changelogMarkdown, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": 'inline; filename="changelog.md"',
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
}
