/** The URL schemes that a link in an answer may use. */
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
/** The URL schemes that an image in an answer may load. */
const IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
/** A scheme at the start of a URL, such as `javascript:`, before any `/`, `?`, or `#`. */
const SCHEME = /^([a-z][a-z\d+.-]*):/i;
/** ASCII control characters and spaces, which a browser strips from a URL before it reads the scheme. */
// oxlint-disable-next-line no-control-regex -- Why: these are the characters that hide a scheme such as `java\tscript:`.
const URL_NOISE = /[\u0000-\u0020\u007F]/g;

/**
 * Returns `url` when it is safe to put in an answer's link or image, else
 * `undefined`. A relative URL is safe. An absolute URL is safe only with an
 * allowed scheme: `http:`, `https:`, `mailto:`, and `tel:` for a link, and
 * `http:` and `https:` for an image. So `javascript:` and `data:` never reach
 * the DOM.
 *
 * @example
 * safeUrl("https://ngrok.com", "link"); // "https://ngrok.com"
 * safeUrl("/docs", "link"); // "/docs"
 * safeUrl("javascript:alert(1)", "link"); // undefined
 * safeUrl("mailto:support@ngrok.com", "image"); // undefined
 */
function safeUrl(url: string, kind: "link" | "image"): string | undefined {
	const scheme = SCHEME.exec(url.replace(URL_NOISE, ""))?.[1];
	if (scheme == null) {
		return url;
	}
	const protocols = kind === "link" ? LINK_PROTOCOLS : IMAGE_PROTOCOLS;
	return protocols.has(`${scheme.toLowerCase()}:`) ? url : undefined;
}

export {
	//,
	safeUrl,
};
