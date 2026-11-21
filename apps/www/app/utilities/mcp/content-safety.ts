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

/** Absolute `http(s)` URLs and bare `www.` hosts. */
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/gi;

// Why lazy: the matcher compiles many regexes, and most calls never report a gap.
let matcher: RegExpMatcher | undefined;

/**
 * Whether `text` holds a term from the `obscenity` English dataset, with
 * evasions such as leet-speak and repeated characters. A camelCase name reads
 * as separate words, so `useAnalytics` does not match.
 *
 * @example
 * hasProfanity("Settings page needs a stepper with a done state"); // false
 */
export function hasProfanity(text: string): boolean {
	matcher ??= new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });
	return matcher.hasMatch(text.replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2"));
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
