import { redirect } from "react-router";
import { mdxUrlToCanonicalPath } from "~/utilities/mdx-url";
import type { Route } from "./+types/$.mdx";

/**
 * Permanently redirect `.mdx` source URLs to their canonical, extension-less
 * doc URL. Docs are served as HTML at the canonical path and as raw markdown
 * at `.md`; `.mdx` URLs are never served, but search engines crawled stale
 * ones. A 301 here consolidates them onto the canonical page and removes the
 * `.mdx` entries from the index.
 */
export function loader({ url }: Route.LoaderArgs) {
	return redirect(mdxUrlToCanonicalPath(url.pathname), 301);
}
