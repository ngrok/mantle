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

/**
 * Words such as `analytics` after a letter or digit, as in `useAnalytics` or
 * `glassAnalysis`. Why: the dataset matches `eanal` and similar patterns
 * across that joint, and the matcher ignores case, so the joint of a
 * camelCase name looks like one word.
 */
const WORDS_AFTER_A_NAME = Array.from(
	"abcdefghijklmnopqrstuvwxyz0123456789",
	(char) => `${char}analy`,
);

// Why lazy: the matcher compiles many regexes once, at the first check.
let matcher: RegExpMatcher | undefined;

/**
 * Whether `text` holds a term from the `obscenity` English dataset, with
 * evasions such as leet-speak, mixed case, and repeated characters. Names
 * such as `useApiAnalytics` do not match, and a hex literal such as `#a55` is
 * not read as text.
 *
 * @example
 * hasProfanity("Settings page needs a stepper with a done state"); // false
 */
export function hasProfanity(text: string): boolean {
	if (matcher == null) {
		const dataset = englishDataset.build();
		matcher = new RegExpMatcher({
			...dataset,
			whitelistedTerms: [...(dataset.whitelistedTerms ?? []), ...WORDS_AFTER_A_NAME],
			...englishRecommendedTransformers,
		});
	}
	return matcher.hasMatch(text.replace(HEX_LITERAL, " "));
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
