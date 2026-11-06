import { rawDocContent, urlToFileMap } from "~/utilities/docs";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";
import type { Route } from "./+types/$.md";

/**
 * Serve `/<slug>.md`: the docs page as plain markdown. The build prerenders
 * each one, and the app server also sends it for the page URL to a request
 * that prefers markdown (`markdownTwins` in `server.ts`).
 */
export function loader({ url }: Route.LoaderArgs) {
	const slug = url.pathname.replace(/^\/+/, "").replace(/\.md$/, "");

	const filePath = urlToFileMap.get(slug);
	const rawContent = filePath ? rawDocContent[filePath] : undefined;
	if (!rawContent) {
		throw new Response("Not Found", { status: 404 });
	}

	const filename = slug.split("/").pop() || "document";

	return new Response(renderMdxToMarkdown(rawContent), {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": `inline; filename="${filename}.md"`,
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
}
