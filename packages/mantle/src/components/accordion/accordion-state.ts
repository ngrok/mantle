/**
 * Pure, framework-free state logic for the {@link Accordion}. Kept in its own
 * module so it can be unit-tested directly and reused without widening the
 * component file's public exports.
 */

/**
 * Whether a single item is open at a time (`"single"`) or any number of items
 * may be open simultaneously (`"multiple"`).
 */
export type AccordionType = "single" | "multiple";

/**
 * Returns whether the item identified by `value` is open, given the current set
 * of open item values.
 *
 * @example
 * isItemOpen(["a", "c"], "a"); // => true
 * isItemOpen(["a", "c"], "b"); // => false
 */
export function isItemOpen(openValues: readonly string[], value: string): boolean {
	return openValues.includes(value);
}

/**
 * Pure reducer for a single item's open-state change. In `"single"` mode at
 * most one item is open at a time; in `"multiple"` mode any number may be open.
 *
 * Returns the same `openValues` reference when nothing changes, so callers can
 * cheaply skip redundant state updates.
 *
 * @example
 * nextOpenValues(["a"], "b", true, "single");   // => ["b"]
 * nextOpenValues(["a"], "b", true, "multiple"); // => ["a", "b"]
 * nextOpenValues(["a"], "a", false, "single");  // => []
 * nextOpenValues(["a"], "b", false, "single");  // => ["a"] (same ref, no change)
 */
export function nextOpenValues(
	openValues: readonly string[],
	value: string,
	open: boolean,
	type: AccordionType,
): readonly string[] {
	const alreadyOpen = openValues.includes(value);

	if (open) {
		if (type === "single") {
			if (alreadyOpen && openValues.length === 1) {
				return openValues;
			}
			return [value];
		}
		if (alreadyOpen) {
			return openValues;
		}
		return [...openValues, value];
	}

	if (!alreadyOpen) {
		return openValues;
	}
	return openValues.filter((openValue) => openValue !== value);
}

/**
 * Normalizes the public `value`/`defaultValue` prop — a `string` in `"single"`
 * mode (where `""` means "no item open") or a `string[]` in `"multiple"` mode —
 * into the internal open-values array. Narrows on the runtime shape so no type
 * assertion is needed.
 *
 * @example
 * toOpenValues(undefined);     // => []
 * toOpenValues("");            // => []
 * toOpenValues("a");           // => ["a"]
 * toOpenValues(["a", "b"]);    // => ["a", "b"]
 */
export function toOpenValues(value: string | readonly string[] | undefined): readonly string[] {
	if (value == null) {
		return [];
	}
	if (typeof value === "string") {
		return value === "" ? [] : [value];
	}
	return value;
}
