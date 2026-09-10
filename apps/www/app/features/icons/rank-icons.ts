import { type RankedItem, matchSorter, rankings } from "match-sorter";
import type { IconData } from "./icon-data";

/**
 * Breaks a ranking tie toward the shorter matched string, then alphabetically.
 *
 * Several names share match-sorter's top rank for one query: `icon` is a
 * substring of `ThemeIcon` and of `NgrokLettermarkIcon` alike. The shorter name
 * is the closer match, so it leads. match-sorter's default compares
 * alphabetically, which puts `AutoThemeIcon` ahead of `ThemeIcon`.
 *
 * @example
 * ```ts
 * preferShorterMatch({ rankedValue: "ThemeIcon" }, { rankedValue: "AutoThemeIcon" }); // negative
 * ```
 */
function preferShorterMatch(
	a: Pick<RankedItem<IconData>, "rankedValue">,
	b: Pick<RankedItem<IconData>, "rankedValue">,
): number {
	return a.rankedValue.length - b.rankedValue.length || a.rankedValue.localeCompare(b.rankedValue);
}

/**
 * Ranks icons against a search query, best match first. A blank query returns
 * the icons unchanged, in browse order.
 *
 * The name is the primary signal and matches fuzzily, so `thme` still finds
 * `ThemeIcon`. The id and the tags are secondary and must contain the query as
 * a real substring, because a fuzzy subsequence over a kebab-case id turns
 * almost any short query into a hit. Any name match outranks an id-or-tag-only
 * match.
 *
 * Within one pass, a tie breaks toward the shorter matched string: the name in
 * the first pass, the id or tag in the second. Equal strings keep browse order,
 * so `logo` lists `NgrokLettermarkIcon` before `NgrokWordmarkIcon`.
 *
 * The two signals run as separate passes rather than one call with a per-key
 * `threshold`, because match-sorter gates the whole item by whichever key
 * ranked highest: a weak id match would veto a qualifying fuzzy name match and
 * drop the icon.
 *
 * @example
 * ```ts
 * rankIcons(iconData, "thme")[0].name; // "ThemeIcon"
 * rankIcons(iconData, "logo").map((icon) => icon.name); // ["NgrokLettermarkIcon", "NgrokWordmarkIcon"], by tag
 * ```
 */
function rankIcons(icons: ReadonlyArray<IconData>, query: string): ReadonlyArray<IconData> {
	const search = query.trim();

	if (search === "") {
		return icons;
	}

	const byName = matchSorter(icons, search, { baseSort: preferShorterMatch, keys: ["name"] });
	const bySecondary = matchSorter(icons, search, {
		baseSort: preferShorterMatch,
		keys: ["id", "tags"],
		threshold: rankings.CONTAINS,
	});
	const nameMatches = new Set(byName);

	return [...byName, ...bySecondary.filter((icon) => !nameMatches.has(icon))];
}

export {
	//,
	rankIcons,
};
