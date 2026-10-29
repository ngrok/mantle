import { assetsCdnOrigin, preloadFontLink } from "@ngrok/mantle/theme";
import invariant from "tiny-invariant";
import { getBaseUrl } from "./base-url";
import { allowsIndexing, EDGE_HEADER } from "./indexing";

type DocumentHeadersOptions = {
	request: Request;
	/** The nonce on the document's `<script>` tags. */
	nonce: string;
	/** Development and HMR responses are never cached. */
	isDev: boolean;
};

/**
 * The headers of an HTML document: security, indexing, caching, and
 * preconnect hints. `app/entry.server.tsx` sends them on each rendered page.
 *
 * Append `Vary` to the existing value; set the other headers.
 *
 * @example
 * const headers = documentHeaders({ request, nonce: "abc123", isDev: false });
 * headers["Content-Security-Policy"]; // => "script-src 'nonce-abc123' 'self' …"
 */
function documentHeaders({
	request,
	nonce,
	isDev,
}: DocumentHeadersOptions): Record<string, string> {
	const indexable = allowsIndexing(request);
	const allowSameOriginFraming = isPreviewDocument(new URL(request.url).pathname);
	// Why: a framed example preview is a fragment of its docs page, so it never goes in an index.
	const blockIndexing = !indexable || allowSameOriginFraming;

	return {
		Link: buildLinkHeader(request.url),
		...(blockIndexing ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
		"X-Debug-Indexing-Blocked": String(blockIndexing),
		"X-Debug-Has-Ngrok-Header": String(indexable),
		// Why: the edge and a direct request get different headers, so a cache must key on the edge header.
		Vary: EDGE_HEADER,
		...(isDev || blockIndexing
			? { "Cache-Control": "private, no-store" }
			: {
					// Browsers revalidate each time; the CDN caches briefly and serves stale while it revalidates.
					"Cache-Control": "public, max-age=0, must-revalidate",
					"CDN-Cache-Control": "public, s-maxage=900, stale-while-revalidate=300",
				}),
		// Clickjacking mitigation. The CSP `frame-ancestors` directive does the same for modern browsers.
		"X-Frame-Options": allowSameOriginFraming ? "SAMEORIGIN" : "DENY",
		"X-XSS-Protection": "1; mode=block",
		"Content-Security-Policy": buildCSPHeader({
			nonce,
			baseUrl: getBaseUrl(request.url),
			allowSameOriginFraming,
		}),
	};
}

/**
 * Framed example previews (`/preview/:exampleName`, see routes.ts) are
 * embedded in same-origin iframes by the docs pages' preview frames, so
 * they alone allow same-origin framing; every other document refuses
 * framing entirely.
 */
function isPreviewDocument(pathname: string): boolean {
	return pathname === "/preview" || pathname.startsWith("/preview/");
}

/**
 * Builds a single HTTP `Link` header value that advertises connection hints for
 * cross-origin resources using `rel=preconnect`.
 *
 * Behavior:
 * - Resolves the app's base origin from `requestUrl` via `getBaseUrl()`.
 * - Assembles a prioritized list of preconnect origins (regular and crossorigin).
 * - Asserts there are ≤4 total preconnects (typical UA limit; more can waste sockets).
 * - Serializes into a comma-separated `Link` header per RFC 8288.
 *
 * @param requestUrl Absolute URL for the incoming request (used to compute the base origin).
 * @returns A comma-separated `Link` header value.
 */
function buildLinkHeader(requestUrl: string) {
	const baseUrl = getBaseUrl(requestUrl);

	const preconnects = [baseUrl !== "/" && baseUrl].filter(Boolean);

	/**
	 * Origins that serve font files require `crossorigin` on the preconnect
	 * because font requests are always CORS. Without it the browser opens a
	 * non-CORS connection that can't be reused for the actual font fetch.
	 */
	const crossoriginPreconnects = [assetsCdnOrigin] as const;

	// keep ≤4 for optimal performance (browser limit)
	invariant(
		preconnects.length + crossoriginPreconnects.length <= 4,
		"Keep ≤4 priority preconnects",
	);

	const fontPreloads = [
		preloadFontLink("roobert"),
		preloadFontLink("jetbrains-mono"),
		preloadFontLink("family-regular"),
	];

	return [
		...preconnects.map((origin) => `<${origin}>; rel=preconnect`),
		...crossoriginPreconnects.map((origin) => `<${origin}>; rel=preconnect; crossorigin`),
		...fontPreloads,
	].join(", ");
}

/**
 * Constructs a CSP (Content Security Policy) header string.
 * The `nonce` must match the `nonce` attribute of the document's script tags.
 *
 * The script-src directive includes only trusted third-party scripts used in production.
 * `allowSameOriginFraming` relaxes `frame-ancestors` to `'self'` for the
 * framed example preview documents; everything else refuses framing.
 */
function buildCSPHeader({
	nonce,
	baseUrl,
	allowSameOriginFraming,
}: {
	nonce: string;
	baseUrl: string;
	allowSameOriginFraming: boolean;
}): string {
	const scriptNonce = `'nonce-${nonce}'`;

	// The origin of the request, when it is known. Not needed for a relative base URL.
	const hostedOrigin = baseUrl !== "/" ? baseUrl : undefined;

	// List of trusted script sources.
	// NOTE: URLs ending in '/' indicate prefix match (important for CSP)
	const scriptSrcSources = [
		//,
		"'self'",
		hostedOrigin,
	].filter(Boolean);

	return [
		//,
		`script-src ${scriptNonce} ${scriptSrcSources.join(" ")}`,
		"base-uri 'self'",
		"object-src 'none'",
		"worker-src 'self' blob:",
		allowSameOriginFraming ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
	].join("; ");
}

export {
	//,
	documentHeaders,
};
