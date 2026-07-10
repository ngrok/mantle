import { rawDocContent, urlToFileMap } from "~/utilities/docs";
import { etagFor } from "~/utilities/etag";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";
import type { Route } from "./+types/$.md";

const CACHE_CONTROL = "max-age=300, stale-while-revalidate=604800";

type Payload = { body: string; etag: string };

function computePayload(rawContent: string): Payload {
	const body = renderMdxToMarkdown(rawContent);
	return { body, etag: etagFor(body) };
}

// Memoize per-slug in production. Raw MDX content is fixed at build time, and
// `renderMdxToMarkdown` runs a unified pipeline that is expensive to repeat.
// In dev we always recompute so MDX edits surface immediately.
const payloadCache = new Map<string, Payload>();

function getPayload(filePath: string, rawContent: string): Payload {
	if (!import.meta.env.PROD) {
		return computePayload(rawContent);
	}
	const cached = payloadCache.get(filePath);
	if (cached) {
		return cached;
	}
	const payload = computePayload(rawContent);
	payloadCache.set(filePath, payload);
	return payload;
}

export async function loader({ request, url }: Route.LoaderArgs) {
	const cleanSlug = url.pathname.replace(/^\/+/, "").replace(/\.md$/, "");

	const filePath = urlToFileMap.get(cleanSlug);
	const rawContent = filePath ? rawDocContent[filePath] : undefined;
	if (!filePath || !rawContent) {
		throw new Response("Not Found", { status: 404 });
	}

	const { body, etag } = getPayload(filePath, rawContent);

	if (request.headers.get("If-None-Match") === etag) {
		return new Response(null, {
			status: 304,
			headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
		});
	}

	const filename = cleanSlug.split("/").pop() || "document";

	return new Response(body, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": `inline; filename="${filename}.md"`,
			"Cache-Control": CACHE_CONTROL,
			ETag: etag,
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "noindex, nofollow",
		},
	});
}
