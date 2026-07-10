/**
 * Returns `true` if {@link value} looks like a path to a static, non-route
 * resource — a file the server serves directly rather than a React Router
 * route (e.g. `/llms.txt`, `/api/components.json`, `/components/actions/button.md`).
 *
 * Used by the MDX `<a>` mapper to decide whether to render a real `<a>` (full
 * document load) instead of a client-side `<Link>`. Client routing such paths
 * would 404 in the SPA, since they have no matching route module.
 *
 * @param value - Arbitrary input. Non-strings always return `false`.
 *
 * @example
 * isStaticResourcePath("/llms.txt")              // true
 * isStaticResourcePath("/api/components.json")   // true
 * isStaticResourcePath("/components/actions/button.md")  // true
 * isStaticResourcePath("/components/actions/button.md?v=1") // true
 * isStaticResourcePath("/components/actions/button")     // false (route)
 * isStaticResourcePath("/changelog")             // false (route)
 */
function isStaticResourcePath(value: unknown): value is string {
	if (typeof value !== "string") {
		return false;
	}
	return /\.(txt|json|md|xml|csv|ya?ml)(\?|#|$)/i.test(value);
}

export {
	//,
	isStaticResourcePath,
};
