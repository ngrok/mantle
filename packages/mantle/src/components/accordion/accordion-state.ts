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
 * nextOpenValues({ openValues: ["a"], value: "b", open: true, type: "single" });   // => ["b"]
 * nextOpenValues({ openValues: ["a"], value: "b", open: true, type: "multiple" }); // => ["a", "b"]
 * nextOpenValues({ openValues: ["a"], value: "a", open: false, type: "single" });  // => []
 * nextOpenValues({ openValues: ["a"], value: "b", open: false, type: "single" });  // => ["a"] (same ref, no change)
 */
export function nextOpenValues({
	openValues,
	value,
	open,
	type,
}: {
	openValues: readonly string[];
	value: string;
	open: boolean;
	type: AccordionType;
}): readonly string[] {
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
 * Normalizes the public `value`/`defaultValue` prop (a `string` in `"single"`
 * mode, where `""` means "no item open", or a `string[]` in `"multiple"` mode)
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

/**
 * `"single"` mode props: at most one item open at a time. Opening a section
 * auto-closes the previously open one. This is the **opt-in** behavior; `type`
 * defaults to `"multiple"`, so you must set `type="single"` explicitly to get
 * the auto-close accordion. `value`/`defaultValue` are the open item's value
 * (`""` for none).
 */
type AccordionSingleProps = {
	/**
	 * Keep at most one section open at a time: opening a section auto-closes the
	 * previously open one. Must be set explicitly: the default is `"multiple"`,
	 * where sections open independently.
	 */
	type: "single";
	/** The controlled open item value (`""` for none). */
	value?: string;
	/** The initial open item value when uncontrolled. */
	defaultValue?: string;
	/** Called with the newly open item value (`""` when collapsed). */
	onValueChange?: (value: string) => void;
};

/**
 * `"multiple"` mode props, the **default** when `type` is omitted. Any number
 * of items may be open at once, and opening one never closes another.
 * `value`/`defaultValue` are the list of open item values. Use `type="single"`
 * instead if you want opening a section to auto-close the others.
 */
type AccordionMultipleProps = {
	/**
	 * Allow any number of sections open at once. This is the **default** when
	 * `type` is omitted. Opening one section never collapses the others. Switch to
	 * `type="single"` for the accordion that auto-closes the previously open
	 * section.
	 *
	 * @default "multiple"
	 */
	type?: "multiple";
	/** The controlled list of open item values. */
	value?: string[];
	/** The initial list of open item values when uncontrolled. */
	defaultValue?: string[];
	/** Called with the new list of open item values. */
	onValueChange?: (value: string[]) => void;
};

/**
 * The `type`, `value`, `defaultValue`, and `onValueChange` props of an accordion `Root`: a
 * discriminated union on `type`, so the value is a `string` in `"single"` mode and a
 * `string[]` in `"multiple"` mode.
 */
export type AccordionValueProps = AccordionSingleProps | AccordionMultipleProps;

/**
 * Invokes the consumer's `onValueChange` with the correctly-typed value for the
 * current `type`. Kept as a standalone function so the discriminated-union
 * narrowing on `props.type` (and thus the matching `onValueChange` signature) is
 * preserved without a type assertion.
 *
 * @example
 * ```ts
 * emitValueChange({ type: "single", onValueChange }, ["a"]);        // onValueChange("a")
 * emitValueChange({ type: "multiple", onValueChange }, ["a", "b"]); // onValueChange(["a", "b"])
 * ```
 */
export function emitValueChange(props: AccordionValueProps, next: readonly string[]): void {
	if (props.type === "single") {
		props.onValueChange?.(next[0] ?? "");
	} else {
		props.onValueChange?.([...next]);
	}
}
