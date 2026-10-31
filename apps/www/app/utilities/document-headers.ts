import type { EntryContext } from "react-router";
import { allowsIndexing, EDGE_HEADER } from "./indexing";

/** How the CSP trusts the scripts of a document. */
type DocumentScripts =
	| {
			/** A rendered page: the nonce on its `<script>` tags. */
			nonce: string;
			/** The router context of the render, for the `Link` header. */
			routerContext: EntryContext;
	  }
	| {
			/**
			 * A prerendered page: the base64 SHA-256 of each inline script. The nonce
			 * in the file is the same for each visitor, so it protects nothing.
			 */
			scriptHashes: readonly string[];
	  };

type DocumentHeadersOptions = DocumentScripts & {
	request: Request;
	/** Development and HMR responses are never cached. */
	isDev: boolean;
	/** The document also has a markdown answer, so caches must key on `Accept`. */
	hasMarkdownVariant: boolean;
};

/**
 * The headers of an HTML document: security, indexing, caching, and, for a
 * rendered page, the `Link` preloads. `app/entry.server.tsx` sends them on
 * each rendered page, and `server/prerendered-documents.ts` on each
 * prerendered page.
 *
 * Append `Vary` to the existing value; set the other headers.
 *
 * @example
 * const headers = documentHeaders({ request, routerContext, nonce: "abc", isDev: false, hasMarkdownVariant: true });
 * headers["Content-Security-Policy"]; // => "script-src 'nonce-abc' 'strict-dynamic'; …"
 */
function documentHeaders({
	request,
	isDev,
	hasMarkdownVariant,
	...scripts
}: DocumentHeadersOptions): Record<string, string> {
	const indexable = allowsIndexing(request);
	const allowSameOriginFraming = isPreviewDocument(new URL(request.url).pathname);
	// Why: a framed example preview is a fragment of its docs page, so it never goes in an index.
	const blockIndexing = !indexable || allowSameOriginFraming;

	return {
		...("routerContext" in scripts ? { Link: buildLinkHeader(scripts.routerContext) } : {}),
		...(blockIndexing ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
		"X-Debug-Indexing-Blocked": String(blockIndexing),
		"X-Debug-Has-Ngrok-Header": String(indexable),
		// Why: the edge and a direct request get different headers, and a docs page with a
		// markdown answer gets a different body for `Accept: text/markdown`.
		Vary: hasMarkdownVariant ? `${EDGE_HEADER}, Accept` : EDGE_HEADER,
		...(isDev || blockIndexing
			? { "Cache-Control": "private, no-store" }
			: {
					// Browsers revalidate each time; the CDN caches briefly and serves stale while it revalidates.
					"Cache-Control": "public, max-age=0, must-revalidate",
					"CDN-Cache-Control": "public, s-maxage=900, stale-while-revalidate=300",
				}),
		// Clickjacking mitigation. The CSP `frame-ancestors` directive does the same for modern browsers.
		"X-Frame-Options": allowSameOriginFraming ? "SAMEORIGIN" : "DENY",
		/**
		 * Harden browser content handling. `nosniff` prevents MIME-type sniffing
		 * for scripts and styles, and `X-XSS-Protection: 0` turns off the legacy
		 * XSS auditors, which are obsolete and can add inconsistent behavior.
		 */
		"X-Content-Type-Options": "nosniff",
		"X-XSS-Protection": "0",
		// A privacy-preserving referrer, and no powerful browser features that the docs do not use.
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
		"Content-Security-Policy": buildCSPHeader({ scripts, allowSameOriginFraming }),
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
 * Builds the HTTP `Link` header for a rendered page: `rel=preload; as=style`
 * for the matched routes' CSS and `rel=modulepreload` for the entry and the
 * matched route modules.
 *
 * The header arrives before the HTML body, so the browser starts these
 * fetches earlier than the `<link>` tags in the document. Preconnects and font
 * preloads live in `root.tsx` instead, because a prerendered page gets no
 * `Link` header.
 *
 * @example
 * buildLinkHeader(routerContext);
 * // => "</assets/root-abc.css>; rel=preload; as=style, </assets/entry.client-def.js>; rel=modulepreload; fetchpriority=low"
 */
function buildLinkHeader(routerContext: EntryContext): string {
	const { manifest, staticHandlerContext } = routerContext;
	const matchedRoutes = staticHandlerContext.matches.map(
		(match) => manifest.routes[match.route.id],
	);
	const stylesheets = new Set(matchedRoutes.flatMap((route) => route?.css ?? []));
	// The browser dedupes the `<link>` tags against these, so the header carries the same
	// low priority as the tags, or the CSS would wait behind them.
	const modules = new Set([
		manifest.entry.module,
		...manifest.entry.imports,
		...matchedRoutes.flatMap((route) => (route == null ? [] : [route.module])),
	]);

	return [
		...Array.from(stylesheets, (href) => `<${href}>; rel=preload; as=style`),
		...Array.from(modules, (href) => `<${href}>; rel=modulepreload; fetchpriority=low`),
	].join(", ");
}

/**
 * Constructs a CSP (Content Security Policy) header string. The `nonce` must
 * match the `nonce` attribute of the document's script tags.
 *
 * `'strict-dynamic'` makes every supported browser ignore host sources and
 * `'self'`. The policy trusts the per-request nonce and the scripts that
 * nonce-trusted code inserts. Do not add host sources: only browsers outside
 * the support window read them.
 *
 * A prerendered page trusts its inline scripts by hash and the app's own
 * modules by `'self'`. Why no `'strict-dynamic'`: a hash, unlike a nonce,
 * does not carry to the imports of an inline module script, so the browser
 * would block the entry module.
 *
 * `allowSameOriginFraming` relaxes `frame-ancestors` to `'self'` for the
 * framed example preview documents; everything else refuses framing.
 */
function buildCSPHeader({
	scripts,
	allowSameOriginFraming,
}: {
	scripts: DocumentScripts;
	allowSameOriginFraming: boolean;
}): string {
	return [
		//,
		"nonce" in scripts
			? `script-src 'nonce-${scripts.nonce}' 'strict-dynamic'`
			: ["script-src 'self'", ...scripts.scriptHashes.map((hash) => `'sha256-${hash}'`)].join(" "),
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
