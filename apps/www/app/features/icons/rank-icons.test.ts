import { describe, expect, test } from "vitest";
import { type IconData, iconData } from "./icon-data";
import { rankIcons } from "./rank-icons";

function idsFor(query: string): ReadonlyArray<string> {
	return rankIcons(iconData, query).map((icon) => icon.id);
}

function namesFor(query: string): ReadonlyArray<string> {
	return rankIcons(iconData, query).map((icon) => icon.name);
}

describe("rankIcons", () => {
	test("returns the icons unchanged for a blank query", () => {
		expect(rankIcons(iconData, "")).toBe(iconData);
		expect(rankIcons(iconData, "   ")).toBe(iconData);
	});

	test("ranks a name the query starts with above a name that only contains it", () => {
		const names = namesFor("theme");

		expect(names.slice(0, 5)).toEqual([
			"ThemeIcon",
			"ThemeIcon",
			"ThemeIcon",
			"ThemeIcon",
			"ThemeIcon",
		]);
		expect(names[5]).toBe("AutoThemeIcon");
		expect(names).toHaveLength(6);
	});

	test("breaks a rank tie toward the shorter name", () => {
		const names = namesFor("icon");

		expect(names[0]).toBe("ThemeIcon");
		expect(names.at(-1)).toBe("NgrokLettermarkIcon");
	});

	test("recovers a typo in the name", () => {
		expect(idsFor("thme")).toContain("Theme-Icon-System");
	});

	test("finds an icon by a tag its name does not carry, and keeps browse order when the matched tags are equal", () => {
		expect(idsFor("logo")).toEqual(["NgrokLettermarkIcon", "NgrokWordmarkIcon"]);
	});

	test("finds an icon by a substring of its id", () => {
		expect(idsFor("high-contrast")).toEqual(
			expect.arrayContaining(["Theme-Icon-Light-High-Contrast", "Theme-Icon-Dark-High-Contrast"]),
		);
	});

	test("does not fuzzy-match an id or a tag", () => {
		// `tlt` is a subsequence of `Theme-Icon-Light`. A fuzzy id match would
		// turn almost every short query into a hit.
		expect(idsFor("tlt")).toEqual([]);
	});

	test("ranks a name match above a tag-only match", () => {
		const icons: IconData[] = [
			{ id: "tagged", name: "Other", description: null, Icon: null, tags: ["arrow"] },
			{ id: "named", name: "ArrowIcon", description: null, Icon: null, tags: [] },
		];

		expect(rankIcons(icons, "arrow").map((icon) => icon.id)).toEqual(["named", "tagged"]);
	});

	test("lists an icon once when both its name and a tag match", () => {
		const icons: IconData[] = [
			{ id: "both", name: "ArrowIcon", description: null, Icon: null, tags: ["arrow"] },
		];

		expect(rankIcons(icons, "arrow")).toHaveLength(1);
	});
});
