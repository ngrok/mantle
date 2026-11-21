import { expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";

const roles = [
	...["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"].map(
		(step) => `heading-${step}`,
	),
	...["sm", "base", "lg"].map((step) => `paragraph-${step}`),
];

// Why: Tailwind emits a declaration only for a sub-key that the theme declares, so a step that
// skips one ignores that sub-key when a site or a section sets it.
test.each(roles)("the %s step declares every sub-key a site can set", (role) => {
	const missing = ["line-height", "letter-spacing", "font-weight"].filter(
		(subKey) => !new RegExp(`^\\t--text-${role}--${subKey}: `, "m").test(mantleCss),
	);
	expect(missing).toEqual([]);
});
