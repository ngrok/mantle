/**
 * The fuzzy score that `Command.Root` filters and sorts items by. It is a port
 * of cmdk 1.1.1's `command-score.ts` (MIT), which derives from Superhuman's
 * `command-score` (MIT). The constants and the recursion match it, so a query
 * ranks the items in the same order as cmdk.
 *
 * @see https://github.com/pacocoursey/cmdk/blob/v1.1.1/cmdk/src/command-score.ts
 */

// A continuous match of characters scores 1 in total.
const SCORE_CONTINUE_MATCH = 1;
// A new match at the start of a word scores higher than a match inside a word.
// A word that starts after a space scores a little higher than one after a slash, a bracket, or a dash.
const SCORE_SPACE_WORD_JUMP = 0.9;
const SCORE_NON_SPACE_WORD_JUMP = 0.8;
const SCORE_CHARACTER_JUMP = 0.17;
// Two transposed letters score much lower: "uc" ranks "ouch" above "curtain".
const SCORE_TRANSPOSITION = 0.1;
// Each skipped character costs a little: "bd" ranks "bad" above "bard".
const PENALTY_SKIPPED = 0.999;
// An exact-case match scores a little higher: "HM" ranks "HTML" above "haml".
const PENALTY_CASE_MISMATCH = 0.9999;
// A longer string scores a little lower: "html" ranks "html" above "html5".
const PENALTY_NOT_COMPLETE = 0.99;

const IS_GAP_REGEXP = /[\\/_+.#"@[({&]/;
const COUNT_GAPS_REGEXP = /[\\/_+.#"@[({&]/g;
const IS_SPACE_REGEXP = /[\s-]/;
const COUNT_SPACE_REGEXP = /[\s-]/g;

type ScoreInput = {
	string: string;
	abbreviation: string;
	lowerString: string;
	lowerAbbreviation: string;
	memo: Map<number, number>;
};

/**
 * The best score for `abbreviation` from `abbreviationIndex` against `string`
 * from `stringIndex`. The memo key packs both indexes into one number.
 */
const scoreFrom = (input: ScoreInput, stringIndex: number, abbreviationIndex: number): number => {
	const { string, abbreviation, lowerString, lowerAbbreviation, memo } = input;
	if (abbreviationIndex === abbreviation.length) {
		return stringIndex === string.length ? SCORE_CONTINUE_MATCH : PENALTY_NOT_COMPLETE;
	}

	const memoKey = stringIndex * (abbreviation.length + 1) + abbreviationIndex;
	const memoized = memo.get(memoKey);
	if (memoized !== undefined) {
		return memoized;
	}

	const abbreviationChar = lowerAbbreviation.charAt(abbreviationIndex);
	let index = lowerString.indexOf(abbreviationChar, stringIndex);
	let highScore = 0;

	while (index >= 0) {
		let score = scoreFrom(input, index + 1, abbreviationIndex + 1);
		if (score > highScore) {
			if (index === stringIndex) {
				score *= SCORE_CONTINUE_MATCH;
			} else if (IS_GAP_REGEXP.test(string.charAt(index - 1))) {
				score *= SCORE_NON_SPACE_WORD_JUMP;
				const wordBreaks = string.slice(stringIndex, index - 1).match(COUNT_GAPS_REGEXP);
				if (wordBreaks != null && stringIndex > 0) {
					score *= PENALTY_SKIPPED ** wordBreaks.length;
				}
			} else if (IS_SPACE_REGEXP.test(string.charAt(index - 1))) {
				score *= SCORE_SPACE_WORD_JUMP;
				const spaceBreaks = string.slice(stringIndex, index - 1).match(COUNT_SPACE_REGEXP);
				if (spaceBreaks != null && stringIndex > 0) {
					score *= PENALTY_SKIPPED ** spaceBreaks.length;
				}
			} else {
				score *= SCORE_CHARACTER_JUMP;
				if (stringIndex > 0) {
					score *= PENALTY_SKIPPED ** (index - stringIndex);
				}
			}

			if (string.charAt(index) !== abbreviation.charAt(abbreviationIndex)) {
				score *= PENALTY_CASE_MISMATCH;
			}
		}

		const nextChar = lowerAbbreviation.charAt(abbreviationIndex + 1);
		// Why the second clause: a doubled letter in the query can match one letter in the string.
		if (
			(score < SCORE_TRANSPOSITION && lowerString.charAt(index - 1) === nextChar) ||
			(nextChar === abbreviationChar && lowerString.charAt(index - 1) !== abbreviationChar)
		) {
			const transposedScore = scoreFrom(input, index + 1, abbreviationIndex + 2);
			if (transposedScore * SCORE_TRANSPOSITION > score) {
				score = transposedScore * SCORE_TRANSPOSITION;
			}
		}

		if (score > highScore) {
			highScore = score;
		}

		index = lowerString.indexOf(abbreviationChar, index + 1);
	}

	memo.set(memoKey, highScore);
	return highScore;
};

/** Lowercases `string` and turns each space or dash into a space, so they match each other. */
const formatInput = (string: string): string =>
	string.toLowerCase().replace(COUNT_SPACE_REGEXP, " ");

/**
 * Scores how well `search` matches `value` and its `keywords`, from 0 (no
 * match) to 1 (an exact match). `Command.Root` hides an item that scores 0 and
 * puts the highest score first. This is the default `filter`.
 *
 * @example
 * ```ts
 * commandScore("Calendar", "cal"); // 0.99
 * commandScore("Calendar", "xyz"); // 0
 * commandScore("Profile", "account", ["account", "user"]); // > 0
 * ```
 */
const commandScore = (value: string, search: string, keywords?: readonly string[]): number => {
	const string = keywords != null && keywords.length > 0 ? `${value} ${keywords.join(" ")}` : value;
	return scoreFrom(
		{
			string,
			abbreviation: search,
			lowerString: formatInput(string),
			lowerAbbreviation: formatInput(search),
			memo: new Map(),
		},
		0,
		0,
	);
};

export {
	//,
	commandScore,
};
