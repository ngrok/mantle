import type { Route } from "./+types/$.md";
import { rawDocContent, urlToFileMap } from "~/utilities/docs";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	let pathname = url.pathname;

	// Remove leading slash and .md extension
	if (pathname.startsWith("/")) {
		pathname = pathname.slice(1);
	}
	const cleanSlug = pathname.replace(/\.md$/, "");

	const filePath = urlToFileMap.get(cleanSlug);
	if (!filePath) {
		throw new Response("Not Found", { status: 404 });
	}

	const rawContent = rawDocContent[filePath];
	if (!rawContent) {
		throw new Response("Not Found", { status: 404 });
	}

	const filename = cleanSlug.split("/").pop() || "document";

	// Render MDX source to plain markdown: JSX elements are routed through
	// per-component handlers (e.g. `<Example>` is dropped; unregistered tags
	// are replaced with an HTML comment placeholder), code fences are
	// preserved as-is, and ESM imports are stripped.
	const rendered = renderMdxToMarkdown(rawContent);

	return new Response(rendered, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": `inline; filename="${filename}.md"`,
			"Cache-Control": "max-age=300, stale-while-revalidate=604800",
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
}
