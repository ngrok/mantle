/**
 * True when the request explicitly asks for markdown, per https://acceptmarkdown.com.
 * A wildcard Accept does not count; only a `text/markdown` media range with a
 * quality above zero does, so `text/markdown;q=0` (explicitly unacceptable) is false.
 *
 * The same rule as `prefersMarkdown` in the frontend repo, so every ngrok site
 * answers one request the same way.
 *
 * @example
 * prefersMarkdown(new Request("https://mantle.ngrok.com/", { headers: { Accept: "text/markdown" } }));
 * // => true
 */
function prefersMarkdown(request: Request): boolean {
	const accept = request.headers.get("Accept");
	if (accept == null) {
		return false;
	}
	return accept.split(",").some((entry) => {
		const [mediaRange = "", ...parameters] = entry.trim().split(";");
		if (mediaRange.trim().toLowerCase() !== "text/markdown") {
			return false;
		}
		const qualityParameter = parameters
			.map((parameter) => parameter.trim().toLowerCase())
			.find((parameter) => parameter.startsWith("q="));
		if (qualityParameter == null) {
			return true;
		}
		const quality = Number.parseFloat(qualityParameter.slice(2));
		// An unparseable q is a malformed header; treat it as the default quality of 1.
		return Number.isNaN(quality) ? true : quality > 0;
	});
}

export {
	//,
	prefersMarkdown,
};
