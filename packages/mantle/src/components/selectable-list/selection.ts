import type { SelectableListOption } from "./selectable-list.js";

/**
 * The plain-text form of an option's label: `labelText` when set,
 * otherwise the `label` itself when it is a string. This is what the default
 * filter matches; reuse it in a custom `filter` predicate to keep label
 * matching consistent while adding your own criteria. The option type requires
 * `labelText` whenever `label` isn't a string, so the empty-string fallback
 * only guards untyped callers.
 *
 * @example
 * ```ts
 * optionLabelText({ value: "a", label: "Onboarding key" }); // → "Onboarding key"
 * optionLabelText({ value: "b", label: <em>prod</em>, labelText: "prod" }); // → "prod"
 * ```
 */
function optionLabelText(option: SelectableListOption): string {
	if (option.labelText != null) {
		return option.labelText;
	}
	return typeof option.label === "string" ? option.label : "";
}

/**
 * Case-insensitive substring filter over each option's plain text (see
 * {@link optionLabelText}: `labelText`, or a string `label`). Returns the input
 * untouched for an empty/whitespace query so the common "no filter" path does no
 * work. Pure, so it is safe to unit test and to call from `useMemo`.
 *
 * @example
 * ```ts
 * filterSelectableOptions(
 *   [{ value: "a", label: "Onboarding Key" }, { value: "b", label: "prod" }],
 *   "prod",
 * ); // → [{ value: "b", label: "prod" }]
 * ```
 */
function filterSelectableOptions(
	options: readonly SelectableListOption[],
	query: string,
): readonly SelectableListOption[] {
	const normalized = query.trim().toLowerCase();
	if (normalized === "") {
		return options;
	}
	return options.filter((option) => optionLabelText(option).toLowerCase().includes(normalized));
}

/**
 * Add `value` to `values` if absent, or remove it if present. Returns a new
 * array (never mutates) so it composes cleanly with controlled state setters.
 *
 * @example
 * ```ts
 * toggleSelectionValue(["a"], "b"); // → ["a", "b"]
 * toggleSelectionValue(["a", "b"], "a"); // → ["b"]
 * ```
 */
function toggleSelectionValue(values: readonly string[], value: string): string[] {
	return values.includes(value)
		? values.filter((current) => current !== value)
		: [...values, value];
}

/**
 * Summarize how much of a set of options is selected, ignoring disabled options
 * (they can't be selected by "select all"). Feeds straight into
 * {@link selectAllChecked} to drive a tri-state header checkbox.
 *
 * @example
 * ```ts
 * summarizeSelection(
 *   [{ value: "a", label: "A" }, { value: "b", label: "B" }],
 *   new Set(["a"]),
 * ); // → { allSelected: false, someSelected: true }
 * ```
 */
function summarizeSelection(
	options: readonly SelectableListOption[],
	selected: ReadonlySet<string>,
): { allSelected: boolean; someSelected: boolean } {
	let selectableCount = 0;
	let selectedCount = 0;
	for (const option of options) {
		if (option.disabled) {
			continue;
		}
		selectableCount += 1;
		if (selected.has(option.value)) {
			selectedCount += 1;
		}
	}
	if (selectableCount === 0) {
		return { allSelected: false, someSelected: false };
	}
	return {
		allSelected: selectedCount === selectableCount,
		someSelected: selectedCount > 0,
	};
}

export {
	//,
	filterSelectableOptions,
	optionLabelText,
	summarizeSelection,
	toggleSelectionValue,
};
