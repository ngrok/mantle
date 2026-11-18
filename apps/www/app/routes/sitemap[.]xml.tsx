import { canonicalHref } from "~/utilities/canonical-origin";
import { urlToFileMap } from "~/utilities/docs";

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

export function loader() {
	return new Response(buildSitemap(), {
		headers: { "Content-Type": "application/xml; charset=utf-8" },
	});
}
