/** One media range of an `Accept` header, with its quality. */
type MediaRange = { type: string; q: number };

/**
 * The media ranges of an `Accept` header. A range with a `q` that is not a
 * number from 0 to 1 gets 1, as a range with no `q` does.
 */
function parseAccept(accept: string): MediaRange[] {
	return accept.split(",").map((part) => {
		const [type = "", ...params] = part.split(";").map((piece) => piece.trim());
		const qParam = params.find((param) => /^q\s*=/i.test(param));
		const q = qParam == null ? 1 : Number(qParam.replace(/^q\s*=\s*/i, ""));
		return { type: type.toLowerCase(), q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 1 };
	});
}

/** How closely a media range matches `text/html`: 3 exact, 2 `text/*`, 1 any type, 0 none. */
function htmlSpecificity(type: string): number {
	return ["*/*", "text/*", "text/html"].indexOf(type) + 1;
}

/**
 * Whether an `Accept` header prefers markdown to HTML. Markdown wins when the
 * header names `text/markdown` with a quality above zero and at least that of
 * HTML. HTML takes the quality of its most specific range: `text/html`, then
 * `text/*`, then any type. A browser does not name markdown, so it gets HTML.
 *
 * @example
 * prefersMarkdown("text/markdown, text/html;q=0.9"); // => true
 * prefersMarkdown("text/html, text/markdown;q=0"); // => false
 * prefersMarkdown("text/html"); // => false
 */
function prefersMarkdown(accept: string | null | undefined): boolean {
	if (accept == null || accept === "") {
		return false;
	}
	let markdown = 0;
	let html = { q: 0, specificity: 0 };
	for (const { type, q } of parseAccept(accept)) {
		const specificity = htmlSpecificity(type);
		if (type === "text/markdown") {
			markdown = Math.max(markdown, q);
		} else if (
			specificity > html.specificity ||
			(specificity > 0 && specificity === html.specificity && q > html.q)
		) {
			html = { q, specificity };
		}
	}
	return markdown > 0 && markdown >= html.q;
}

export {
	//,
	prefersMarkdown,
};
