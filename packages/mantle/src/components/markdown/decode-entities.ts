/**
 * The names of U+00A0 to U+00FF in order, the HTML 4 Latin-1 set: the
 * character of each name is its index plus `0xA0`.
 */
const LATIN_1 =
	"nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml";

/**
 * The named character references a model writes most; other names stay as
 * written. Why not the full HTML table: it holds over 2,000 names.
 */
let namedEntities: Map<string, string> | undefined;

/** The character of a named reference. Why built on first use: an import that never decodes skips it. */
function namedEntity(name: string): string | undefined {
	namedEntities ??= new Map<string, string>([
		...LATIN_1.split(" ").map(
			(latin, index) => [latin, String.fromCharCode(0xa0 + index)] as const,
		),
		["amp", "&"],
		["apos", "'"],
		["bull", "•"],
		["euro", "€"],
		["gt", ">"],
		["hellip", "…"],
		["larr", "←"],
		["ldquo", "“"],
		["lsquo", "‘"],
		["lt", "<"],
		["mdash", "—"],
		["ndash", "–"],
		["quot", '"'],
		["rarr", "→"],
		["rdquo", "”"],
		["rsquo", "’"],
		["trade", "™"],
	]);
	return namedEntities.get(name);
}

const ENTITY = /&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([a-zA-Z][a-zA-Z\d]*));/g;

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
		return (name != null && namedEntity(name)) || match;
	});
}

export {
	//,
	decodeEntities,
};
