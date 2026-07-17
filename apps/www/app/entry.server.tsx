/**
 * file stolen shamelessly from vercel so that we can plumb in the nonce provider
 *
 * @see https://github.com/vercel/vercel/blob/main/packages/react-router/entry.server.ts
 */

import { randomBytes } from "node:crypto";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import type {
	ActionFunctionArgs,
	EntryContext,
	LoaderFunctionArgs,
	RouterContextProvider,
} from "react-router";
import { ServerRouter } from "react-router";
import { assetsCdnOrigin, preloadFontLink } from "@ngrok/mantle/theme";
import invariant from "tiny-invariant";
import { NonceProvider } from "./components/nonce";
import { getBaseUrl } from "./utilities/base-url";
import { rawDocContent, urlToFileMap } from "./utilities/docs";

// Increase the stack trace limit so we can see more of the error
Error.stackTraceLimit = Number.POSITIVE_INFINITY;

// Reject/cancel all pending promises after 5 seconds
export const streamTimeout = 5_000;

// Automatically timeout the React renderer after 6 seconds, which ensures
// React has enough time to flush down the rejected boundary contents
const reactRendererTimeout = streamTimeout + 1_000;

const vercelDeploymentId = process.env.VERCEL_DEPLOYMENT_ID;
const vercelSkewProtectionEnabled = process.env.VERCEL_SKEW_PROTECTION_ENABLED === "1";
const isDev = import.meta.env.DEV || process.env.NODE_ENV !== "production";
const isPreview = process.env.VERCEL_ENV === "preview";

export default function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
	_loadContext: RouterContextProvider,
) {
	// Content negotiation: return raw markdown when Accept: text/markdown is requested
	const accept = request.headers.get("Accept") ?? "";
	if (accept.includes("text/markdown")) {
		// `handleRequest` only receives document requests — single-fetch `.data`
		// requests are handled before this — so `request.url` never carries a
		// `.data` suffix here (and the normalized `url` loader arg isn't available
		// to the entry handler regardless).
		const url = new URL(request.url);
		const pathname = url.pathname.replace(/^\//, "");
		const filePath = urlToFileMap.get(pathname || "index");

		if (filePath) {
			const rawContent = rawDocContent[filePath];
			if (rawContent) {
				const filename = pathname.split("/").pop() ?? "document";
				return new Response(rawContent, {
					headers: {
						"Content-Type": "text/markdown; charset=utf-8",
						"Content-Disposition": `inline; filename="${filename}.md"`,
						"Cache-Control": "max-age=300, stale-while-revalidate=604800",
						"X-Content-Type-Options": "nosniff",
						"X-Robots-Tag": "noindex, nofollow",
					},
				});
			}
		}
	}

	const uniquePerRequestNonce = randomBytes(16).toString("hex");

	/**
	 * SEO/indexing logic: only allow indexing when accessed through ngrok.com proxy
	 *
	 * Only allow indexing when:
	 *  1. Production environment (VERCEL_ENV === "production")
	 *  2. x-ngrok-edge header present (set by ngrok traffic policy)
	 */
	const isProdEnv = process.env.VERCEL_ENV === "production";
	const isNgrokProxy = request.headers.get("x-ngrok-edge") != null;

	/**
	 * Framed example previews (`/preview/:exampleName`, see routes.ts) are
	 * embedded in same-origin iframes by the docs pages' preview frames, so
	 * they alone allow same-origin framing; every other document refuses
	 * framing entirely (clickjacking mitigation).
	 */
	const requestPathname = new URL(request.url).pathname;
	const allowSameOriginFraming =
		requestPathname === "/preview" || requestPathname.startsWith("/preview/");

	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const userAgent = request.headers.get("user-agent");
		const baseUrl = getBaseUrl(request.url);

		// Ensure requests from bots and SPA Mode renders wait for all content to load before responding
		// https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
		const readyOption: keyof RenderToPipeableStreamOptions =
			(userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

		const { pipe, abort } = renderToPipeableStream(
			<NonceProvider value={uniquePerRequestNonce}>
				<ServerRouter context={routerContext} url={request.url} nonce={uniquePerRequestNonce} />
			</NonceProvider>,
			{
				[readyOption]() {
					shellRendered = true;
					const body = new PassThrough();
					const stream = createReadableStreamFromReadable(body);

					responseHeaders.set("Content-Type", "text/html");

					responseHeaders.set("Link", buildLinkHeader(request.url));

					/**
					 * Important: don't set cookies on cacheable HTML.
					 * Keep the skew-protection cookie to PREVIEW only.
					 */
					if (vercelSkewProtectionEnabled && vercelDeploymentId && isPreview) {
						responseHeaders.append(
							"Set-Cookie",
							`__vdpl=${vercelDeploymentId}; Path=/; HttpOnly; SameSite=Lax`,
						);
					}

					/**
					 * SEO & Indexing Strategy
					 *
					 * Only allow indexing when ALL conditions are met:
					 *  1. Production environment (VERCEL_ENV === "production")
					 *  2. x-ngrok-edge header present (proxied through ngrok.com)
					 */
					const shouldBlockIndexing = !(isProdEnv && isNgrokProxy);

					// preview documents are chrome-less fragments of their docs page —
					// they should never land in a search index, even in production
					if (shouldBlockIndexing || allowSameOriginFraming) {
						responseHeaders.set("X-Robots-Tag", "noindex, nofollow");
					}

					// Add debug headers to verify indexing logic
					responseHeaders.set("X-Debug-Indexing-Blocked", String(shouldBlockIndexing));
					responseHeaders.set("X-Debug-Is-Prod", String(isProdEnv));
					responseHeaders.set("X-Debug-Has-Ngrok-Header", String(isNgrokProxy));

					// Vary by x-ngrok-edge so CDN doesn't serve noindex responses to proxied traffic
					const existingVary = responseHeaders.get("Vary");
					responseHeaders.set(
						"Vary",
						existingVary ? `${existingVary}, x-ngrok-edge` : "x-ngrok-edge",
					);

					// Caching Strategy
					if (isDev || shouldBlockIndexing) {
						// Dev/HMR/Preview: avoid any caching weirdness
						// When blocking indexing, also prevent CDN caching
						responseHeaders.set("Cache-Control", "private, no-store");
					} else {
						// Prod: browsers revalidate; CDN caches briefly + SWR
						responseHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
						// Target the CDN specifically (Vercel honors this)
						responseHeaders.set(
							"CDN-Cache-Control",
							"public, s-maxage=900, stale-while-revalidate=300",
						);
						// Harmless belt-and-suspenders; either works on Vercel
						responseHeaders.set(
							"Vercel-CDN-Cache-Control",
							"public, s-maxage=900, stale-while-revalidate=300",
						);
					}

					/**
					 * Prevent the page from being embedded in an iframe to mitigate
					 * clickjacking attacks. Framed example previews are the exception:
					 * the docs pages iframe them from the same origin. The CSP
					 * `frame-ancestors` directive below mirrors this for modern
					 * browsers.
					 */
					responseHeaders.set("X-Frame-Options", allowSameOriginFraming ? "SAMEORIGIN" : "DENY");

					/**
					 * Enable basic XSS protection in older browsers by instructing them
					 * to block rendering if a reflected XSS attack is detected
					 */
					responseHeaders.set("X-XSS-Protection", "1; mode=block");

					/**
					 * Enforce a strict Content Security Policy (CSP) with a per-request
					 * nonce to prevent inline script execution unless explicitly allowed
					 */
					responseHeaders.set(
						"Content-Security-Policy",
						buildCSPHeader({ nonce: uniquePerRequestNonce, baseUrl, allowSameOriginFraming }),
					);

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: responseStatusCode,
						}),
					);

					pipe(body);
				},
				onShellError(error: unknown) {
					reject(error);
				},
				onError(error: unknown) {
					responseStatusCode = 500;
					// Log streaming rendering errors from inside the shell.  Don't log
					// errors encountered during initial shell rendering since they'll
					// reject and get logged in handleDocumentRequest.
					if (shellRendered) {
						console.error(error);
					}
				},
				nonce: uniquePerRequestNonce,
			},
		);

		// Abort the rendering stream after the `streamTimeout` so it has time to
		// flush down the rejected boundaries
		globalThis.setTimeout(abort, reactRendererTimeout);
	});
}

/**
 * TODO: add sentry/datadog handling here
 */
export function handleError(error: unknown, { request }: LoaderFunctionArgs | ActionFunctionArgs) {
	if (!request.signal.aborted) {
		console.error("react-router entry.server handleError (unexpected error)", error);
	}
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
 * The `nonce` should be securely generated for each request and inserted into script tags.
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

	/**
	 * in production, we use traffic policy to forward requests to vercel app from an ngrok.com origin
	 * we will want to filter this out if the baseUrl is just "/"
	 */
	const hostedOrigin = baseUrl !== "/" ? baseUrl : undefined;

	// List of trusted script sources.
	// NOTE: URLs ending in '/' indicate prefix match (important for CSP)
	const scriptSrcSources = [
		//,
		"'self'",
		hostedOrigin,
	].filter(Boolean);

	const scriptSrc = `script-src ${scriptNonce} ${scriptSrcSources.join(" ")}`;
	const baseUri = "base-uri 'self';";
	const objectSrc = "object-src 'none';";
	const workerSrc = "worker-src 'self' blob:;";
	const frameAncestors = allowSameOriginFraming
		? "frame-ancestors 'self';"
		: "frame-ancestors 'none';";

	return [
		//,
		scriptSrc,
		baseUri,
		objectSrc,
		workerSrc,
		frameAncestors,
	].join("; ");
}
