import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

/**
 * Word-level checks that keep abusive text out of the MCP posts that ngrok
 * employees read. They follow the content-safety checks of the ngrok
 * marketing forms. The word list lives in the `obscenity` English dataset, so
 * this repo holds no profane terms.
 *
 * The matcher catches common evasions, such as leet-speak and repeated
 * characters. It does not classify meaning, so treat it as one layer.
 */

/**
 * Absolute `http(s)` URLs and bare `www.` hosts. A URL ends at the next URL or
 * at a character that closes it in Markdown or JSON, so `[a](…)[b](…)` counts 2.
 */
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s)\]"'<>,]+?(?=https?:\/\/|www\.|[\s)\]"'<>,]|$)/gi;

/**
 * Hex literals, such as the color `#a55` or `0xa55`. Why: leet-speak reads
 * their digits as letters, so a code sketch would fail the check.
 */
const HEX_LITERAL = /#[\da-f]{3,8}\b|\b0x[\da-f]+\b/gi;

/** A camelCase boundary: a lowercase letter or digit, then a capital. */
const CAMEL_BOUNDARY = /(?<=[\p{Ll}\d])(?=\p{Lu})/gu;

// Why lazy: the matcher compiles many regexes once, at the first check.
let matcher: RegExpMatcher | undefined;

/**
 * Whether `text` holds a term from the `obscenity` English dataset, with
 * evasions such as leet-speak, mixed case, and repeated characters. A term
 * that starts at a camelCase boundary in the text does not count, so
 * `useApiAnalytics` does not match, and a hex literal such as `#a55` is not
 * read as text.
 *
 * Why two passes: the raw text catches mixed case, such as `shIt`, and the
 * text split into words catches a term after a boundary, such as `myTerm`.
 *
 * @example
 * hasProfanity("Settings page needs a stepper with a done state"); // false
 */
export function hasProfanity(text: string): boolean {
	matcher ??= new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });
	const plain = text.replace(HEX_LITERAL, " ");
	const boundaries = new Set(Array.from(plain.matchAll(CAMEL_BOUNDARY), (match) => match.index));
	// Why `startIndex + 1`: a match can start one character before its term,
	// but not at the start of a word, so `fUcK` still counts.
	const inIdentifier = ({ startIndex }: { startIndex: number }) =>
		boundaries.has(startIndex) ||
		(boundaries.has(startIndex + 1) && /[\p{L}\d]/u.test(plain[startIndex - 1] ?? ""));
	return (
		matcher.getAllMatches(plain).some((match) => !inIdentifier(match)) ||
		matcher.hasMatch(plain.replace(CAMEL_BOUNDARY, " "))
	);
}

/**
 * The number of URLs in `text`. Many links in one report are a spam signal.
 *
 * @example
 * countUrls("see https://a.example and www.b.example"); // 2
 */
export function countUrls(text: string): number {
	return text.match(URL_PATTERN)?.length ?? 0;
}
