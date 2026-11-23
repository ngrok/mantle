/**
 * The named character references a model writes most. Why not the full HTML
 * table: it holds over 2,000 names, and an unknown name stays as written.
 */
const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	apos: "'",
	bull: "•",
	copy: "©",
	deg: "°",
	divide: "÷",
	euro: "€",
	gt: ">",
	hellip: "…",
	laquo: "«",
	larr: "←",
	ldquo: "“",
	lsquo: "‘",
	lt: "<",
	mdash: "—",
	middot: "·",
	nbsp: "\u00A0",
	ndash: "–",
	plusmn: "±",
	pound: "£",
	quot: '"',
	raquo: "»",
	rarr: "→",
	rdquo: "”",
	reg: "®",
	rsquo: "’",
	times: "×",
	trade: "™",
};

const ENTITY = /&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([a-zA-Z]+));/g;

/** Returns the character of a numeric reference, or U+FFFD for a code point that is not a valid character. */
function fromCodePoint(codePoint: number): string {
	const isValid =
		codePoint > 0 && codePoint <= 0x10_ff_ff && (codePoint < 0xd8_00 || codePoint > 0xdf_ff);
	return isValid ? String.fromCodePoint(codePoint) : "\uFFFD";
}

/**
 * Replaces the character references in Markdown text with their characters,
 * as an HTML renderer would: `&amp;` becomes `&`, and `&#x2192;` becomes `→`.
 * A text node shows its text as written, so React-rendered Markdown needs this
 * step that `innerHTML` does for free.
 *
 * @example
 * decodeEntities("Fish &amp; chips &#8212; &rarr;"); // "Fish & chips — →"
 * decodeEntities("&unknown;"); // "&unknown;"
 */
function decodeEntities(text: string): string {
	if (!text.includes("&")) {
		return text;
	}
	// oxlint-disable-next-line max-params -- Why: `String.prototype.replace` passes each capture group as its own argument.
	return text.replace(ENTITY, (match, decimal?: string, hex?: string, name?: string) => {
		if (decimal != null) {
			return fromCodePoint(Number.parseInt(decimal, 10));
		}
		if (hex != null) {
			return fromCodePoint(Number.parseInt(hex, 16));
		}
		return (name != null && NAMED_ENTITIES[name]) || match;
	});
}

export {
	//,
	decodeEntities,
};
