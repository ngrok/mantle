import { expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";

const roles = [
	"heading-1",
	"heading-2",
	"heading-3",
	"heading-4",
	"heading-5",
	"heading-6",
	"paragraph",
	"lead",
] as const;

// Why: Tailwind emits a declaration only for a sub-key that the theme declares, so a role that
// skips one ignores that sub-key when a site or a section sets it.
test.each(roles)("the %s role declares every sub-key a site can set", (role) => {
	const missing = ["line-height", "letter-spacing", "font-weight"].filter(
		(subKey) => !new RegExp(`^\\t--text-${role}--${subKey}: `, "m").test(mantleCss),
	);
	expect(missing).toEqual([]);
});
