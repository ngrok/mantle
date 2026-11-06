const DEFAULT_CONTENT_TYPE = "application/json; charset=utf-8";

/**
 * Serialize `data` as pretty-printed JSON, with the content-type and CORS
 * headers of an agent-facing `/api/*.json` endpoint. Override `contentType`
 * for `application/schema+json` (the JSON Schema endpoint).
 *
 * The build prerenders each endpoint, so the app server sends the file with
 * its own ETag and `Cache-Control`.
 *
 * @example
 * jsonAgentResponse(manifest).headers.get("Access-Control-Allow-Origin"); // => "*"
 */
export function jsonAgentResponse(data: unknown, options?: { contentType?: string }): Response {
	return new Response(JSON.stringify(data, null, "\t"), {
		headers: {
			"Content-Type": options?.contentType ?? DEFAULT_CONTENT_TYPE,
			"Access-Control-Allow-Origin": "*",
		},
	});
}
