import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * The parts that take a function child, and why. A function child is opt-in:
 * each entry is a decision that the part's state is internal (no prop, callback,
 * or attribute selector covers the case) and worth its bytes on product and
 * marketing pages. Only listbox options with virtual focus qualify. To add a
 * part, add its module here with the reason and the measured cost.
 */
const OPTION_SLOT_PARTS: Record<string, string> = {
	"combobox/combobox.tsx": "Combobox.Item: { highlighted } for a row preview.",
	"multi-select/multi-select.tsx": "MultiSelect.Item: { highlighted } for a row preview.",
	"select/select.tsx": "Select.Item: { highlighted } for a row preview.",
};

const COMPONENTS = path.resolve(import.meta.dirname, "..");
const IMPORT = /from "(?:\.\.\/slot\/|\.\/)option-slot\.js";/;

test("only the listed parts import OptionSlot", () => {
	const importers = readdirSync(COMPONENTS, { recursive: true, encoding: "utf8" })
		.filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
		.filter((file) => IMPORT.test(readFileSync(path.join(COMPONENTS, file), "utf8")))
		.filter((file) => !file.startsWith("slot/"))
		.toSorted();

	expect(importers).toEqual(Object.keys(OPTION_SLOT_PARTS).toSorted());
});
