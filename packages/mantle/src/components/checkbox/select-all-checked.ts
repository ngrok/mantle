import type { CheckedState } from "./checkbox.js";

/**
 * Resolve the tri-state `checked` value for a "select all" checkbox from the
 * current selection counts: `true` when everything is selected,
 * `"indeterminate"` when only some is, and `false` when nothing is. The result
 * is a {@link CheckedState}, ready to pass straight to `<Checkbox checked={…} />`.
 *
 * `allSelected` is checked first, so it wins even if a caller also reports
 * `someSelected` for the all-selected case.
 *
 * @example
 * ```tsx
 * // Driving a TanStack Table "select all" header checkbox:
 * <Checkbox
 *   aria-label="Select all rows"
 *   checked={selectAllChecked({
 *     allSelected: table.getIsAllRowsSelected(),
 *     someSelected: table.getIsSomeRowsSelected(),
 *   })}
 *   onChange={(event) => table.toggleAllRowsSelected(event.target.checked)}
 * />
 * ```
 */
function selectAllChecked({
	allSelected,
	someSelected,
}: {
	/** Whether every selectable item is currently selected. */
	allSelected: boolean;
	/** Whether some (but not necessarily all) items are selected. */
	someSelected: boolean;
}): CheckedState {
	if (allSelected) {
		return true;
	}
	if (someSelected) {
		return "indeterminate";
	}
	return false;
}

export { selectAllChecked };
