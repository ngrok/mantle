/**
 * The request header that the mantle.ngrok.com traffic policy adds before it
 * forwards a request to the app. A preview URL or the app's own ngrok domain
 * does not get it.
 */
const EDGE_HEADER = "x-ngrok-edge";

/**
 * Whether search engines may index the response to a request: only when the
 * request came through mantle.ngrok.com.
 *
 * Why the header and not the host: the edge forwards with the app's own host
 * (`ngrok-mantle.ngrok.app`), so the app never sees `mantle.ngrok.com`.
 *
 * @example
 * allowsIndexing(new Request("https://ngrok-mantle.ngrok.app/", { headers: { "x-ngrok-edge": "1" } })); // => true
 * allowsIndexing(new Request("https://mantle-1640.ngrok-previews.ngrok.app/")); // => false
 */
function allowsIndexing(request: Request): boolean {
	return request.headers.has(EDGE_HEADER);
}

export {
	//,
	allowsIndexing,
	EDGE_HEADER,
};
