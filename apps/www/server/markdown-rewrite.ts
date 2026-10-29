/**
 * Whether an `Accept` header asks for markdown. The match is a substring
 * test, the same test `app/entry.server.tsx` and `vercel.json` use, so every
 * host answers the same request the same way.
 *
 * @example
 * acceptsMarkdown("text/markdown, text/html;q=0.5"); // => true
 * acceptsMarkdown("text/html"); // => false
 */
export function acceptsMarkdown(accept: string | undefined): boolean {
	return accept?.includes("text/markdown") ?? false;
}

/**
 * The prerendered markdown file that answers a page path, or `undefined` when
 * the build has no markdown twin for it. The root path maps to `/index.md`,
 * and a trailing slash does not change the result.
 *
 * @param markdownPaths - Every `.md` file under `build/client`, as URL paths
 * that start with `/`.
 *
 * @example
 * const markdownPaths = new Set(["/index.md", "/components/actions/button.md"]);
 * markdownTwinPath("/components/actions/button/", markdownPaths);
 * // => "/components/actions/button.md"
 * markdownTwinPath("/llms.txt", markdownPaths); // => undefined
 */
export function markdownTwinPath(
	pathname: string,
	markdownPaths: ReadonlySet<string>,
): string | undefined {
	const trimmed = pathname.replace(/\/+$/, "");
	const twin = trimmed === "" ? "/index.md" : `${trimmed}.md`;
	return markdownPaths.has(twin) ? twin : undefined;
}
