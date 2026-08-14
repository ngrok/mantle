import type { ShouldRevalidateFunctionArgs } from "react-router";
import { Outlet, useLocation } from "react-router";
import { z } from "zod";
import { ContentLayout } from "~/components/content-layout";
import { canonicalHref } from "~/utilities/canonical-origin";
import { loadFrontmatter, urlToFileMap } from "~/utilities/docs";
import {
	jsonLdGraphMetaDescriptor,
	mantleTechArticleJsonLd,
	mantleWebPageJsonLd,
	mantleWebsiteJsonLd,
} from "~/utilities/json-ld";
import type { Route } from "./+types/doc-page";

const frontmatterSchema = z.object({
	title: z.string().trim().min(1, "Frontmatter title is required"),
	description: z.string().trim().min(1, "Frontmatter description is required"),
});

const indexTitle = "@ngrok/mantle";
const indexDescription = "mantle is ngrok's UI library and design system";

/**
 * Route `meta` for every MDX docs page. Lives on this pathless layout because
 * the child route modules are the MDX files themselves; the layout is the
 * nearest route that can export `meta`. The site index keeps its own
 * website-shaped descriptors; every other page emits article descriptors from
 * the doc's frontmatter.
 */
export function meta({ loaderData, location }: Route.MetaArgs) {
	const canonicalUrl = canonicalHref(location.pathname);
	const isIndex = location.pathname === "/";

	// The loader's schema rejects an empty title or description, so both are
	// always present here.
	const title = isIndex ? indexTitle : `${loaderData.frontmatter.title} - @ngrok/mantle`;
	const description = isIndex ? indexDescription : loaderData.frontmatter.description;

	const jsonLdValues = [
		mantleWebsiteJsonLd(),
		mantleWebPageJsonLd({
			name: title,
			description,
			pathname: location.pathname,
		}),
		...(isIndex
			? []
			: [
					mantleTechArticleJsonLd({
						title: loaderData.frontmatter.title,
						description,
						pathname: location.pathname,
					}),
				]),
	];

	return [
		{ title },
		{ name: "description", content: description },
		{ property: "og:title", content: title },
		{ name: "twitter:title", content: title },
		{ property: "og:description", content: description },
		{ name: "twitter:description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		{ property: "og:type", content: isIndex ? "website" : "article" },
		{ name: "og:url", property: "og:url", content: canonicalUrl },
		{ name: "twitter:url", content: canonicalUrl },
		jsonLdGraphMetaDescriptor(jsonLdValues),
	];
}

/**
 * Loader for every MDX docs page. Each child route is a single doc's MDX
 * module registered at its canonical path, so the doc comes from the URL.
 * Returns the doc's validated frontmatter for `meta`; the toc rides on the
 * matched route's `handle`, not through this loader.
 */
export async function loader({ url }: Route.LoaderArgs) {
	let pathname = url.pathname;

	if (pathname.startsWith("/")) {
		pathname = pathname.slice(1);
	}

	const filePath = urlToFileMap.get(pathname === "" ? "index" : pathname);
	if (!filePath) {
		throw Response.json({ message: "Not Found" }, { status: 404 });
	}

	const frontmatter = await loadFrontmatter(filePath);

	const frontmatterResult = frontmatterSchema.safeParse(frontmatter ?? {});
	if (!frontmatterResult.success) {
		throw Response.json(
			{
				message: `Invalid frontmatter in ${filePath}: ${frontmatterResult.error.issues.map((issue) => issue.message).join(", ")}`,
			},
			{ status: 500 },
		);
	}

	return {
		frontmatter: frontmatterResult.data,
	};
}

/**
 * Revalidate whenever the pathname changes.
 *
 * Why: this pathless layout stays a reused match when the user navigates from
 * one doc to a sibling doc. React Router does not revalidate reused matches
 * whose params did not change. The loader derives the doc from the pathname,
 * so a pathname change must re-run it. Otherwise the previous doc's
 * frontmatter, meta, and toc would render under the new doc's URL.
 */
export function shouldRevalidate({
	currentUrl,
	nextUrl,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	if (currentUrl.pathname !== nextUrl.pathname) {
		return true;
	}
	return defaultShouldRevalidate;
}

/**
 * Shared frame for MDX docs pages. The matched child route module is the
 * compiled MDX itself, so the router loads it before rendering: on the
 * server, at hydration, and on client navigations. The content is always in
 * the initial HTML with no `Suspense` fallback and no client-side MDX
 * resolution.
 */
export default function DocPage() {
	const location = useLocation();
	const isIndex = location.pathname === "/";

	return (
		<ContentLayout markdownPath={isIndex ? "/index.md" : undefined}>
			<Outlet />
		</ContentLayout>
	);
}
