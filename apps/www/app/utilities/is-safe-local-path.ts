/**
 * Returns `true` if {@link value} is a string that looks like a safe,
 * same-origin, relative path — that is, it starts with a single `/` and
 * contains only printable ASCII.
 *
 * This is the lowest-common-denominator check used to defend against:
 * - **Open redirects** (`//evil.com/foo`, `https://evil.com/foo`) — an attacker
 *   who controls the `redirectTo` param could otherwise bounce users through
 *   our origin to a lookalike domain.
 * - **Non-navigation schemes** (`javascript:…`, `mailto:…`, `data:…`) — these
 *   parse as valid `URL`s but their pathnames don't start with `/`, and
 *   executing them via client-side navigation is unsafe (XSS, unintended
 *   protocol handlers).
 * - **Control characters** that could smuggle CRLF into a `Location` header
 *   and split the response.
 *
 * This predicate is intentionally strict; it rejects more than is strictly
 * unsafe (e.g. UTF-8 in a query string) in exchange for a small, auditable
 * allow list. Loosening the rule should be a deliberate decision with a
 * regression test.
 *
 * @param value - Arbitrary input. Non-strings always return `false`.
 * @returns `true` only if the input is a string, starts with a single `/`,
 *   and contains only printable ASCII (0x20–0x7E).
 *
 * @example
 * isSafeLocalPath("/endpoints")          // true
 * isSafeLocalPath("/endpoints?tab=1")    // true
 * isSafeLocalPath("//evil.com/foo")      // false (protocol-relative)
 * isSafeLocalPath("https://foo/bar")     // false (absolute URL)
 * isSafeLocalPath("javascript:alert(1)") // false (non-http scheme)
 * isSafeLocalPath("")                    // false
 * isSafeLocalPath("/foo\x01bar")         // false (control char)
 */
function isSafeLocalPath(value: unknown): value is string {
	if (typeof value !== "string") {
		return false;
	}

	// Must start with "/" but not "//" (rules out protocol-relative URLs).
	if (!/^\/(?!\/)/.test(value)) {
		return false;
	}

	// Basic printable-ASCII check — blocks control chars and non-Latin-1 bytes
	// that could be used to smuggle header sequences via a Location response.
	if (/[^\x20-\x7E]/.test(value)) {
		return false;
	}

	return true;
}

export {
	//,
	isSafeLocalPath,
};
