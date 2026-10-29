/**
 * The React Router server entry, with a per-request CSP nonce and markdown
 * negotiation.
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
import { NonceProvider } from "./components/nonce";
import { documentHeaders } from "./utilities/document-headers";
import { rawDocContent, urlToFileMap } from "./utilities/docs";
import { prefersMarkdown } from "./utilities/prefers-markdown";

// Increase the stack trace limit so we can see more of the error
Error.stackTraceLimit = Number.POSITIVE_INFINITY;

// Reject/cancel all pending promises after 5 seconds
export const streamTimeout = 5_000;

// Automatically timeout the React renderer after 6 seconds, which ensures
// React has enough time to flush down the rejected boundary contents
const reactRendererTimeout = streamTimeout + 1_000;

const isDev = import.meta.env.DEV || process.env.NODE_ENV !== "production";

export default function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
	_loadContext: RouterContextProvider,
) {
	// Content negotiation: return raw markdown when Accept: text/markdown is requested
	if (prefersMarkdown(request.headers.get("Accept"))) {
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

	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const userAgent = request.headers.get("user-agent");

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

					const headers = documentHeaders({
						request,
						nonce: uniquePerRequestNonce,
						isDev,
					});
					for (const [name, value] of Object.entries(headers)) {
						if (name === "Vary") {
							responseHeaders.append(name, value);
						} else {
							responseHeaders.set(name, value);
						}
					}

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
