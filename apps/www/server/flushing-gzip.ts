import { constants, createGzip } from "node:zlib";
import type { MiddlewareHandler } from "hono";

const COMPRESSIBLE =
	/^(text\/|application\/(json|javascript|xml|schema\+json|manifest\+json)|image\/svg\+xml)/;

/**
 * Gzips a response and flushes after each chunk, so a streamed page shell
 * reaches the client before the rest of the page renders. `hono/compress`
 * holds the whole stream until it ends.
 *
 * @example
 * app.use(flushingGzip());
 */
export function flushingGzip(): MiddlewareHandler {
	return async (context, next) => {
		await next();
		const response = context.res;
		response.headers.append("Vary", "Accept-Encoding");
		const acceptsGzip = /\bgzip\b/.test(context.req.header("Accept-Encoding") ?? "");
		const type = response.headers.get("Content-Type") ?? "";
		if (
			!acceptsGzip ||
			response.body == null ||
			context.req.method === "HEAD" ||
			response.headers.has("Content-Encoding") ||
			!COMPRESSIBLE.test(type)
		) {
			return;
		}
		const body = gzipStream(response.body);
		const headers = new Headers(response.headers);
		headers.set("Content-Encoding", "gzip");
		headers.delete("Content-Length");
		context.res = new Response(body, { status: response.status, headers });
	};
}

/** Gzips a byte stream; `Z_SYNC_FLUSH` makes each written chunk readable at once. */
function gzipStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
	const gzip = createGzip({ flush: constants.Z_SYNC_FLUSH });
	const reader = source.getReader();
	return new ReadableStream<Uint8Array>({
		start(controller) {
			gzip.on("data", (chunk: Buffer) => {
				controller.enqueue(new Uint8Array(chunk));
			});
			gzip.on("end", () => {
				controller.close();
			});
			gzip.on("error", (error) => {
				controller.error(error);
			});
			const pump = async () => {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) {
						gzip.end();
						return;
					}
					gzip.write(value);
				}
			};
			pump().catch((error: unknown) => {
				gzip.destroy(error instanceof Error ? error : new Error(String(error)));
			});
		},
		cancel(reason) {
			gzip.destroy();
			return reader.cancel(reason);
		},
	});
}
