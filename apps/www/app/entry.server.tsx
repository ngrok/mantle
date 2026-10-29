/**
 * The React Router server entry, with a per-request CSP nonce and markdown
 * negotiation. It follows the server entries of the apps in the frontend repo.
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
import { isRouteErrorResponse, ServerRouter } from "react-router";
import { NonceProvider } from "./components/nonce";
import { documentHeaders } from "./utilities/document-headers";
import { hasMarkdownVariant, negotiatedMarkdownResponse } from "./utilities/markdown-negotiation";

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
	// An agent that asks for markdown gets the docs page's raw markdown instead of the HTML.
	const markdownResponse = negotiatedMarkdownResponse(request);
	if (markdownResponse != null) {
		return markdownResponse;
	}

	const uniquePerRequestNonce = randomBytes(16).toString("hex");

	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const userAgent = request.headers.get("user-agent");

		// A crawler, SPA mode, and the prerender pass get the whole page in one flush with every
		// Suspense boundary inline; a browser gets the shell first.
		// https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
		const readyOption: keyof RenderToPipeableStreamOptions =
			(userAgent != null && isbot(userAgent)) || routerContext.isSpaMode || isPrerenderPass()
				? "onAllReady"
				: "onShellReady";

		const { pipe, abort } = renderToPipeableStream(
			<NonceProvider value={uniquePerRequestNonce}>
				<ServerRouter context={routerContext} url={request.url} nonce={uniquePerRequestNonce} />
			</NonceProvider>,
			{
				[readyOption]() {
					shellRendered = true;
					const body = new PassThrough();
					const stream = createReadableStreamFromReadable(body);

					responseHeaders.set("Content-Type", "text/html; charset=utf-8");

					const headers = documentHeaders({
						request,
						routerContext,
						nonce: uniquePerRequestNonce,
						isDev,
						hasMarkdownVariant: hasMarkdownVariant(new URL(request.url).pathname),
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
				// Why: above 12.8 KB, React moves a completed boundary into a hidden template that a
				// script reveals, and a reader without JavaScript sees no content in that boundary.
				progressiveChunkSize: Number.MAX_SAFE_INTEGER,
			},
		);

		// Abort the rendering stream after the `streamTimeout` so it has time to
		// flush down the rejected boundaries
		globalThis.setTimeout(abort, reactRendererTimeout);
	});
}

/**
 * A client abort is not a failure. A 4xx from React Router, such as a 404 for
 * a scanner's `/xmlrpc.php`, is a client mistake, so the error log skips it.
 */
export function handleError(error: unknown, { request }: LoaderFunctionArgs | ActionFunctionArgs) {
	if (request.signal.aborted || isClientErrorRouteResponse(error)) {
		return;
	}
	console.error("react-router entry.server handleError (unexpected error)", error);
}

/** True when `error` is a React Router `ErrorResponse` with a 4xx status. */
function isClientErrorRouteResponse(error: unknown): boolean {
	return isRouteErrorResponse(error) && error.status >= 400 && error.status < 500;
}

/**
 * True while `react-router build` prerenders routes. React Router sets the
 * marker before it starts the prerender server, and `react-router-serve` never
 * sets it. The prerender requests carry no user agent, so this is the only
 * signal a server entry has.
 */
function isPrerenderPass(): boolean {
	return process.env.IS_RR_BUILD_REQUEST === "yes";
}
