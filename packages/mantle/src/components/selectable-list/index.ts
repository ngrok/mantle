/**
 * Re-exports for the SelectableList component.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 */

import * as SelectableListParts from "./selectable-list-parts.js";

export {
	//,
	filterSelectableOptions,
	optionLabelText,
	summarizeSelection,
	toggleSelectionValue,
} from "./selectable-list.js";

/**
 * A filterable, multi-select **grid** of checkbox rows, the inline
 * (non-popover) counterpart to `MultiSelect`/`Combobox`. Map your data into
 * `options` once; the list owns filtering, selection, and (optionally)
 * virtualization. Each row is an APG grid `role="row"` (`aria-selected`) whose
 * cells hold a real `Checkbox` and a `Choice`-laid-out title + description. This is the
 * pattern that lets a selectable row carry a real control and nested interactive
 * content. Non-virtualized by default; swap `Viewport` → `VirtualViewport` (same
 * props) for windowing. Built on the shared `list` primitive.
 *
 * Keyboard: the grid is a single tab stop: `Arrow`/`Home`/`End` move an active
 * row (tracked via `aria-activedescendant`, so navigation works across the full
 * option set even when virtualized) and `Space`/`Enter` toggles it.
 *
 * @useWhen Select several items from an inline, filterable list of checkbox rows, with no popover.
 *
 * @siblings
 * - `MultiSelect`: the options open in a popover, and the picks show as tags.
 * - `List`: each row runs an action or navigates, with no selection.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * Composition:
 * ```
 * SelectableList.Root
 * ├── SelectableList.Filter
 * ├── SelectableList.SelectAll
 * ├── SelectableList.Viewport            (or .VirtualViewport)
 * │   └── SelectableList.Item            (optional render-prop; auto-rendered by default)
 * │       ├── SelectableList.ItemTitle
 * │       └── SelectableList.ItemDescription
 * └── SelectableList.Empty
 * ```
 *
 * @example
 * ```tsx
 * const options = accessKeys.map((key) => ({
 *   value: key.id,
 *   label: key.name,
 *   description: key.maskedToken,
 * }));
 *
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const SelectableList = SelectableListParts;

export {
	//,
	SelectableList,
};

export type {
	//,
	SelectableListItemProps,
	SelectableListOption,
	SelectableListRootProps,
	SelectableListViewportProps,
	SelectableListVirtualViewportProps,
} from "./selectable-list.js";
