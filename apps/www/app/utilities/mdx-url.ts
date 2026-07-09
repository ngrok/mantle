/**
 * Maps a `.mdx` request pathname to its canonical, extension-less doc URL.
 *
 * Docs are served at the extension-less path (canonical HTML) and at `.md`
 * (raw markdown). `.mdx` source URLs are not served, but search engines
 * discovered and crawled stale ones; redirecting them to the canonical path
 * consolidates ranking signals and drops the `.mdx` entries from the index.
 *
 * @example
 * mdxUrlToCanonicalPath("/docs/components/actions/button.mdx"); // "/docs/components/actions/button"
 */
export function mdxUrlToCanonicalPath(pathname: string): string {
	return pathname.replace(/\.mdx$/, "");
}
