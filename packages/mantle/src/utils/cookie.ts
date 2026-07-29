/**
 * Reading one named cookie out of a raw cookie string — the one place mantle
 * parses cookies.
 *
 * Three call sites share this: `extractThemeCookie` and `getStoredTheme`
 * (`components/theme/theme-provider.tsx`) and `extractSidebarStateCookie`
 * (`components/sidebar/sidebar-state-cookie.ts`). They read the same format for
 * the same reason, so they change for the same reason too.
 *
 * Deliberately NOT shared with `preventThemeFlash`'s inline reader: that
 * function is serialized into a `<script>` with `Function.prototype.toString()`,
 * which captures only its own body, so anything it imported would be `undefined`
 * at runtime. Its duplication is a runtime constraint, not an oversight.
 *
 * Module-internal on purpose — imported by relative path, never re-exported
 * from `utils/index.ts`, so it adds no public subpath (see COMPONENT_SPEC.md
 * §1.2).
 */

/**
 * Finds one cookie in a raw cookie string and returns its whole `name=value`
 * pair, or `undefined` when the cookie is absent.
 *
 * Returning the pair rather than the value is what lets a server hand a single
 * cookie to the client without leaking the rest of the `Cookie` header — which
 * may carry session or `HttpOnly` cookies — into serialized loader data.
 *
 * @param cookieString - A raw `Cookie` header or `document.cookie`. `null` and
 *   `undefined` are accepted so a caller can pass `headers.get("Cookie")`
 *   straight through.
 * @param name - The cookie's name, matched exactly.
 * @returns The trimmed `name=value` pair, or `undefined`.
 *
 * @example
 * ```ts
 * findCookiePair("a=1; mantle-theme=dark", "mantle-theme"); // "mantle-theme=dark"
 * findCookiePair("a=1", "mantle-theme"); // undefined
 * ```
 */
function findCookiePair(cookieString: string | null | undefined, name: string): string | undefined {
	if (!cookieString) {
		return undefined;
	}

	return cookieString
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`));
}

/**
 * Reads one cookie's percent-decoded value, or `undefined` when the cookie is
 * absent or its value cannot be decoded.
 *
 * Two details are load-bearing, and both were bugs at call sites before this
 * existed:
 *
 * - **Splitting on the first `=` only.** A cookie value may legally contain
 *   `=` (base64 padding, for one), and `value.split("=")[1]` silently truncates
 *   it at the first one.
 * - **Decoding cannot throw.** `decodeURIComponent` raises `URIError` on a
 *   malformed percent-escape, and a cookie header is client-controlled — any
 *   client can send `name=%E0%A4%A`. An undecodable value is absent data, not a
 *   fatal error, so it resolves to `undefined` rather than failing a server
 *   render on every request.
 *
 * @param cookieString - A raw `Cookie` header or `document.cookie`. `null` and
 *   `undefined` are accepted.
 * @param name - The cookie's name, matched exactly.
 * @returns The decoded value (possibly `""` for a present-but-empty cookie), or
 *   `undefined` when absent or undecodable.
 *
 * @example
 * ```ts
 * readCookie("mantle-theme=dark", "mantle-theme"); // "dark"
 * readCookie("mantle-theme=%E0%A4%A", "mantle-theme"); // undefined — malformed, not a throw
 * readCookie("", "mantle-theme"); // undefined
 * ```
 */
function readCookie(cookieString: string | null | undefined, name: string): string | undefined {
	const pair = findCookiePair(cookieString, name);
	if (pair == null) {
		return undefined;
	}

	// Everything after the FIRST "=" — a value may contain more of them.
	const rawValue = pair.slice(name.length + 1);

	try {
		return decodeURIComponent(rawValue);
	} catch {
		// URIError from a malformed percent-escape. Client-controlled input, so
		// absent beats fatal.
		return undefined;
	}
}

export {
	//,
	findCookiePair,
	readCookie,
};
