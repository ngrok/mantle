import { statSync } from "node:fs";
import { relative, sep } from "node:path";
import { getConnInfo } from "@hono/node-server/conninfo";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { requestId, type RequestIdVariables } from "hono/request-id";
import { flushingGzip } from "./flushing-gzip.ts";
import { acceptsMarkdown, markdownTwinPath } from "./markdown-rewrite.ts";
import { staticHeadersFor } from "./static-headers.ts";

/** The part of a pino logger the server uses. */
export type ServerLogger = {
	info: (fields: Record<string, unknown>, message: string) => void;
	error: (fields: Record<string, unknown>, message: string) => void;
};

/** What {@link createApp} needs; `start.ts` passes the real build, tests pass fakes. */
export type AppOptions = {
	/** The prerendered files and assets, `build/client`. */
	clientDirectory: string;
	/** Every `.md` file under `clientDirectory`, as URL paths. */
	markdownPaths: ReadonlySet<string>;
	/** React Router's request handler for every request that no file answers. */
	handleRequest: (request: Request) => Promise<Response>;
	log: ServerLogger;
	/**
	 * Whether to read the scheme from `X-Forwarded-Proto`. Set it only behind
	 * a proxy that overwrites the header, else a client can spoof it.
	 */
	trustForwardedProto: boolean;
};

/** The request ID, and the file that a static mount served, if one did. */
type Variables = RequestIdVariables & { staticFile?: string };

/** A path with each query value replaced, so a single-use code never reaches a log. */
export function redactedUrl(url: URL): string {
	const keys = Array.from(url.searchParams.keys());
	if (keys.length === 0) {
		return url.pathname;
	}
	return `${url.pathname}?${keys.map((key) => `${encodeURIComponent(key)}=REDACTED`).join("&")}`;
}

/** The client address, or `undefined` outside a Node server (as in `app.request` tests). */
function clientAddress(context: Context): string | undefined {
	try {
		return getConnInfo(context).remote.address;
	} catch {
		return undefined;
	}
}

/** One JSON line per request, static hits included, with Datadog standard attribute names. */
function accessLog(log: ServerLogger): MiddlewareHandler<{ Variables: RequestIdVariables }> {
	return async (context, next) => {
		const started = process.hrtime.bigint();
		await next();
		const length = context.res.headers.get("Content-Length");
		log.info(
			{
				http: {
					method: context.req.method,
					url: redactedUrl(new URL(context.req.url)),
					status_code: context.res.status,
					request_id: context.get("requestId"),
					useragent: context.req.header("User-Agent"),
				},
				network: {
					client: { ip: clientAddress(context) },
					bytes_written: length == null ? undefined : Number(length),
				},
				duration: Number(process.hrtime.bigint() - started),
			},
			"request",
		);
	};
}

/** Whether a path names a dotfile. `/.well-known/` stays reachable. */
function isDotPath(path: string): boolean {
	return path
		.split("/")
		.some(
			(segment, index) => segment.startsWith(".") && !(index === 1 && segment === ".well-known"),
		);
}

/** A weak ETag from a file's size and modification time. */
function fileEtag(path: string): string | undefined {
	try {
		const stats = statSync(path);
		return `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`;
	} catch {
		return undefined;
	}
}

/** Answers 304 when a static response's ETag matches `If-None-Match`. */
const conditionalGet: MiddlewareHandler = async (context, next) => {
	await next();
	const etag = context.res.headers.get("ETag");
	const ifNoneMatch = context.req.header("If-None-Match");
	if (etag == null || ifNoneMatch == null || context.res.status !== 200) {
		return;
	}
	const matches = ifNoneMatch
		.split(",")
		.some((candidate) => candidate.trim() === etag || candidate.trim() === "*");
	if (matches) {
		const headers = new Headers(context.res.headers);
		headers.delete("Content-Length");
		headers.delete("Content-Type");
		context.res = new Response(null, { status: 304, headers });
	}
};

/**
 * The docs site's HTTP pipeline. The order is the contract:
 *
 * 1. request ID, 2. access log, 3. flushing gzip, 4. dotfile deny,
 * 5. conditional GET and static headers, 6. `/assets/*` (immutable, any
 * origin), 7. prerendered files (markdown negotiation), 8. React Router.
 *
 * @example
 * const app = createApp({ clientDirectory: "build/client", markdownPaths, handleRequest, log, trustForwardedProto: false });
 * serve({ fetch: app.fetch, port: 3000 });
 */
export function createApp({
	clientDirectory,
	markdownPaths,
	handleRequest,
	log,
	trustForwardedProto,
}: AppOptions): Hono<{ Variables: Variables }> {
	const app = new Hono<{ Variables: Variables }>();

	app.use(requestId());
	// Why set it again after `next`: `requestId()` sets the header before the handler, and a
	// `Response` that React Router returns replaces the headers set that way.
	app.use(async (context, next) => {
		await next();
		context.res.headers.set("X-Request-Id", context.get("requestId"));
	});
	app.use(accessLog(log));
	app.use(flushingGzip());
	app.use(async (context, next) => {
		if (isDotPath(context.req.path)) {
			return context.text("Not Found", 404);
		}
		return next();
	});

	// Why outside the header middleware below: it needs the ETag that middleware sets.
	app.use(conditionalGet);
	// Why after `next`: `serveStatic` calls `onFound` after it builds the response, so a header
	// set there is lost. `onFound` records the file, and this middleware sets the headers.
	app.use(async (context, next) => {
		await next();
		const file = context.get("staticFile");
		if (file == null) {
			return;
		}
		const urlPath = `/${relative(clientDirectory, file).split(sep).join("/")}`;
		const headers: Record<string, string> = urlPath.startsWith("/assets/")
			? {
					"Cache-Control": "public, max-age=31536000, immutable",
					// Why: the sandboxed MCP preview frame has an opaque origin and loads modules in CORS mode.
					"Access-Control-Allow-Origin": "*",
				}
			: staticHeadersFor(urlPath);
		for (const [name, value] of Object.entries(headers)) {
			context.res.headers.set(name, value);
		}
		const etag = fileEtag(file);
		if (etag != null) {
			context.res.headers.set("ETag", etag);
		}
	});
	const recordFile = (path: string, context: Context<{ Variables: Variables }>) => {
		context.set("staticFile", path);
	};
	app.use("/assets/*", serveStatic({ root: clientDirectory, onFound: recordFile }));

	// Why: one URL answers HTML or markdown, so a shared cache must key on `Accept`.
	app.use(async (context, next) => {
		await next();
		if (markdownTwinPath(context.req.path, markdownPaths) != null) {
			context.res.headers.append("Vary", "Accept");
		}
	});
	app.use(
		serveStatic({
			root: clientDirectory,
			rewriteRequestPath: (path, context) => {
				const twin = markdownTwinPath(path, markdownPaths);
				return twin != null && acceptsMarkdown(context.req.header("Accept")) ? twin : path;
			},
			onFound: recordFile,
		}),
	);

	app.all("*", async (context) => {
		const forwardedProto = context.req.header("X-Forwarded-Proto");
		if (trustForwardedProto && (forwardedProto === "https" || forwardedProto === "http")) {
			const url = new URL(context.req.url);
			url.protocol = `${forwardedProto}:`;
			return handleRequest(new Request(url, context.req.raw));
		}
		return handleRequest(context.req.raw);
	});

	app.onError((error, context) => {
		log.error(
			{
				error: { message: error.message, stack: error.stack },
				http: { request_id: context.get("requestId") },
			},
			"unhandled error",
		);
		return context.text("Internal Server Error", 500);
	});

	return app;
}
