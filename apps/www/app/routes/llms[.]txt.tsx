import { canonicalHref } from "~/utilities/canonical-origin";
import { loadFrontmatter, urlToFileMap } from "~/utilities/docs";
import { etagFor } from "~/utilities/etag";
import { buildHooksManifest } from "~/utilities/hooks-manifest.server";
import type { Route } from "./+types/llms[.]txt";

type DocEntry = {
	slug: string;
	title: string;
	description: string;
};

const SECTION_ORDER = [
	{
		id: "welcome",
		title: "Welcome",
		match: (slug: string) => slug === "index" || slug === "philosophy",
	},
	{ id: "base", title: "Base", match: (slug: string) => slug.startsWith("base/") },
	{
		id: "components",
		title: "Components",
		match: (slug: string) =>
			slug.startsWith("components/") && !slug.startsWith("components/preview/"),
	},
	{
		id: "preview",
		title: "Preview Components",
		match: (slug: string) => slug.startsWith("components/preview/"),
	},
	{ id: "blocks", title: "Blocks", match: (slug: string) => slug.startsWith("blocks/") },
	{
		id: "migrations",
		title: "Migrations",
		match: (slug: string) => slug.startsWith("migrations/"),
	},
	{ id: "hooks", title: "Hooks", match: (slug: string) => slug === "hooks" },
	{ id: "utils", title: "Utilities", match: (slug: string) => slug.startsWith("utils/") },
] as const;

const CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";

function fallbackTitleFromSlug(slug: string): string {
	const last = slug.split("/").pop() ?? slug;
	return last
		.split("-")
		.map((part) => {
			const first = part.charAt(0);
			return first ? first.toUpperCase() + part.slice(1) : part;
		})
		.join(" ");
}

async function loadDocEntry(slug: string, filePath: string): Promise<DocEntry> {
	const frontmatter = await loadFrontmatter(filePath);
	const title = frontmatter?.title;
	const description = frontmatter?.description;
	return {
		slug,
		title: typeof title === "string" && title.length > 0 ? title : fallbackTitleFromSlug(slug),
		description: typeof description === "string" ? description : "",
	};
}

function pathForSlug(slug: string, suffix: "" | ".md"): string {
	if (slug === "index") {
		return suffix === ".md" ? "/index.md" : "/";
	}
	return `/${slug}${suffix}`;
}

async function buildBody(): Promise<string> {
	const slugs = Array.from(urlToFileMap.keys()).toSorted((a, b) => a.localeCompare(b));

	const entries = await Promise.all(
		slugs.map(async (slug): Promise<DocEntry> => {
			const filePath = urlToFileMap.get(slug);
			if (!filePath) {
				return {
					slug,
					title: fallbackTitleFromSlug(slug),
					description: "",
				};
			}
			return loadDocEntry(slug, filePath);
		}),
	);

	const sections = SECTION_ORDER.map((section) => ({
		...section,
		entries: entries
			.filter((entry) => section.match(entry.slug))
			.toSorted((a, b) => a.title.localeCompare(b.title)),
	})).filter((section) => section.entries.length > 0);

	const lines: string[] = [
		"# @ngrok/mantle",
		"",
		"> ngrok's UI library and design system — built with React, TypeScript, Tailwind CSS, Radix, and Ariakit. Accessible, semantic, and progressively enhanced primitives for production web apps.",
		"",
		`Docs: ${canonicalHref("/")}`,
		`NPM: https://www.npmjs.com/package/@ngrok/mantle`,
		`Source: https://github.com/ngrok/mantle`,
		`Component manifest: ${canonicalHref("/api/components.json")}`,
		`Hooks manifest: ${canonicalHref("/api/hooks.json")}`,
		`Utilities manifest: ${canonicalHref("/api/utils.json")}`,
		`Package info: ${canonicalHref("/api/package.json")}`,
		`Changelog (structured): ${canonicalHref("/api/changelog.json")}`,
		`Search index: ${canonicalHref("/api/search-index.json")}`,
		`Schemas: ${canonicalHref("/api/schema.json")}`,
		`Full text: ${canonicalHref("/llms-full.txt")}`,
		"",
		"Every docs page is also available as plain markdown by appending `.md` to its URL (e.g. `/components/button.md`).",
		"",
	];

	const hooksManifest = await buildHooksManifest();

	for (const section of sections) {
		lines.push(`## ${section.title}`, "");
		for (const entry of section.entries) {
			const url = canonicalHref(pathForSlug(entry.slug, ""));
			const mdUrl = canonicalHref(pathForSlug(entry.slug, ".md"));
			const summary = entry.description ? `: ${entry.description}` : "";
			lines.push(`- [${entry.title}](${url}) ([md](${mdUrl}))${summary}`);
		}
		// The hooks docs live on a single page, which would otherwise surface
		// as one opaque entry here. List every exported hook individually
		// (sourced from the same manifest as /api/hooks.json) so agents can
		// discover each one and deep-link to its heading anchor.
		if (section.id === "hooks") {
			for (const hook of hooksManifest.hooks) {
				const url = `${canonicalHref("/hooks")}#${hook.name.toLowerCase()}`;
				const summary = hook.summary ? `: ${hook.summary}` : "";
				lines.push(`- [${hook.name}](${url})${summary}`);
			}
		}
		lines.push("");
	}

	return `${lines.join("\n").trimEnd()}\n`;
}

async function computePayload(): Promise<{ body: string; etag: string }> {
	const body = await buildBody();
	return { body, etag: etagFor(body) };
}

// Memoize in production: the doc set and frontmatter are fixed at build time,
// so a single computation produces a stable body and ETag for the process
// lifetime. In dev we recompute each request so MDX edits surface immediately.
let cachedPayload: Promise<{ body: string; etag: string }> | null = null;

function getPayload(): Promise<{ body: string; etag: string }> {
	if (!import.meta.env.PROD) {
		return computePayload();
	}
	if (!cachedPayload) {
		cachedPayload = computePayload();
	}
	return cachedPayload;
}

/**
 * Serve `/llms.txt` — the curated index agents and LLMs use to ingest the
 * mantle docs site.
 *
 * The format follows the emerging `llms.txt` convention: a top-level H1
 * with a one-line description, optional blockquoted long description, then
 * H2 sections of bullet-listed `[Title](url): summary` links. Each entry
 * also exposes a `.md` URL so agents can fetch plain markdown without
 * having to strip HTML.
 *
 * @see https://llmstxt.org
 */
export async function loader({ request }: Route.LoaderArgs) {
	const { body, etag } = await getPayload();

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
			"X-Content-Type-Options": "nosniff",
		},
	});
}
