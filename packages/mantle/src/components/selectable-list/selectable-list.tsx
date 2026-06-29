"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import {
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useId,
	useMemo,
	useState,
} from "react";
import type { ComponentProps, ComponentPropsWithoutRef, ComponentRef, ReactNode } from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import { Checkbox, selectAllChecked } from "../checkbox/checkbox.js";
import { Input, InputCapture } from "../input/input.js";
import { VirtualList } from "../virtual-list/virtual-list.js";

/**
 * A single selectable row in a {@link SelectableList}. The list is data-driven:
 * map your domain objects into these options once, and the list owns filtering,
 * virtualization, and selection. Row *rendering* stays composable — pass a
 * render-prop child to `SelectableList.Viewport` to draw your own layout.
 */
type SelectableListOption = {
	/** Stable, unique selection value. This is what flows through `value` / `onValueChange`. */
	value: string;
	/**
	 * Plain-text title. The text matched by the filter and, in the default row,
	 * the title and the checkbox's accessible name — so keep it human-readable.
	 */
	label: string;
	/** Optional de-emphasized sub-line under the title in the default row (e.g. a masked identifier). */
	description?: ReactNode;
	/** When `true`, the row renders dimmed and cannot be toggled or selected by "select all". */
	disabled?: boolean;
};

/**
 * Case-insensitive substring filter over an option's `label`. Returns the input
 * untouched for an empty/whitespace query so the common "no filter" path does no
 * work. Pure — safe to unit test and to call from `useMemo`.
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
): SelectableListOption[] {
	const normalized = query.trim().toLowerCase();
	if (normalized === "") {
		return [...options];
	}
	return options.filter((option) => option.label.toLowerCase().includes(normalized));
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
	const selectable = options.filter((option) => !option.disabled);
	if (selectable.length === 0) {
		return { allSelected: false, someSelected: false };
	}
	let selectedCount = 0;
	for (const option of selectable) {
		if (selected.has(option.value)) {
			selectedCount += 1;
		}
	}
	return {
		allSelected: selectedCount === selectable.length,
		someSelected: selectedCount > 0,
	};
}

type SelectableListContextValue = {
	/** Options after the active filter is applied. Drives the viewport and select-all. */
	filteredOptions: SelectableListOption[];
	/** Current filter query (controlled by `SelectableList.Filter`). */
	query: string;
	setQuery: (query: string) => void;
	/** Currently selected values. */
	selectedValues: readonly string[];
	/** Set of selected values for O(1) membership checks. */
	selectedSet: ReadonlySet<string>;
	/** Set of disabled values (from `options[].disabled`); excluded from toggling and select-all. */
	disabledSet: ReadonlySet<string>;
	/** Toggle a single value's selection. No-ops for disabled values. */
	toggle: (value: string) => void;
	/** Replace the entire selection (used by select-all). */
	setSelection: (values: string[]) => void;
};

const SelectableListContext = createContext<SelectableListContextValue | null>(null);

/**
 * Read the nearest {@link SelectableListContext}. Throws when a part is rendered
 * outside `SelectableList.Root` so misuse fails loudly rather than rendering an
 * inert, selection-less list.
 */
function useSelectableListContext(part: string): SelectableListContextValue {
	const context = useContext(SelectableListContext);
	invariant(context, `SelectableList.${part} must be rendered inside SelectableList.Root.`);
	return context;
}

/**
 * Props for `SelectableList.Root`. Extends `<div>` props (minus `onChange`,
 * which is replaced by `onValueChange`) with the option set and the
 * controlled/uncontrolled selection state.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Viewport aria-label="Access keys" />
 * </SelectableList.Root>
 * ```
 */
type SelectableListRootProps = Omit<ComponentProps<"div">, "onChange"> & {
	/** The full set of selectable rows. Map your domain data into these once. */
	options: readonly SelectableListOption[];
	/** Controlled selected values. Pair with `onValueChange`. */
	value?: readonly string[];
	/** Initial selected values for the uncontrolled case. */
	defaultValue?: readonly string[];
	/** Called with the next selection whenever it changes. */
	onValueChange?: (values: string[]) => void;
};

const EMPTY_SELECTION: readonly string[] = [];

/**
 * Root of a `SelectableList` — a filterable, virtualized, multi-select list of
 * checkbox rows. Owns selection state (controlled via `value`/`onValueChange`
 * or uncontrolled via `defaultValue`), the filter query, and the derived
 * filtered options, and shares them with the parts below it.
 *
 * Compose it with `SelectableList.Filter` (optional search box),
 * `SelectableList.SelectAll` (optional tri-state header), `SelectableList.Viewport`
 * (the virtualized, scrollable rows), and `SelectableList.Empty` (shown when the
 * filter matches nothing).
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
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
const Root = forwardRef<ComponentRef<"div">, SelectableListRootProps>(
	({ className, defaultValue, onValueChange, options, value, ...props }, ref) => {
		const isControlled = value != null;
		const [internalValue, setInternalValue] = useState<readonly string[]>(
			defaultValue ?? EMPTY_SELECTION,
		);
		const selectedValues = isControlled ? value : internalValue;
		const [query, setQuery] = useState("");

		const commitSelection = useCallback(
			(next: string[]) => {
				if (!isControlled) {
					setInternalValue(next);
				}
				onValueChange?.(next);
			},
			[isControlled, onValueChange],
		);

		const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
		const disabledSet = useMemo(
			() => new Set(options.filter((option) => option.disabled).map((option) => option.value)),
			[options],
		);
		const filteredOptions = useMemo(
			() => filterSelectableOptions(options, query),
			[options, query],
		);

		const context = useMemo<SelectableListContextValue>(
			() => ({
				filteredOptions,
				query,
				setQuery,
				selectedValues,
				selectedSet,
				disabledSet,
				toggle: (toggledValue) => {
					if (disabledSet.has(toggledValue)) {
						return;
					}
					commitSelection(toggleSelectionValue(selectedValues, toggledValue));
				},
				setSelection: commitSelection,
			}),
			[filteredOptions, query, selectedValues, selectedSet, disabledSet, commitSelection],
		);

		return (
			<SelectableListContext.Provider value={context}>
				<div
					ref={ref}
					data-slot="selectable-list"
					className={cx("flex w-full flex-col gap-3", className)}
					{...props}
				/>
			</SelectableListContext.Provider>
		);
	},
);
Root.displayName = "SelectableListRoot";

/**
 * The filter/search box for a `SelectableList`. Renders the mantle `Input` with
 * a leading magnifying-glass icon and drives the list's filter query (a
 * case-insensitive substring match over each option's `label`). Optional — omit
 * it for a non-filterable list.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const Filter = forwardRef<
	ComponentRef<typeof Input>,
	Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange" | "type" | "children">
>(({ "aria-label": ariaLabel = "Filter", className, ...props }, ref) => {
	const { query, setQuery } = useSelectableListContext("Filter");

	return (
		<Input
			ref={ref}
			type="text"
			data-slot="selectable-list-filter"
			aria-label={ariaLabel}
			value={query}
			onChange={(event) => setQuery(event.target.value)}
			className={className}
			{...props}
		>
			<MagnifyingGlassIcon />
			<InputCapture />
		</Input>
	);
});
Filter.displayName = "SelectableListFilter";

/**
 * A tri-state "select all" header for a `SelectableList`. Reflects the selection
 * of the **currently filtered** options — checked when all are selected,
 * indeterminate when only some are, unchecked when none are — and toggling it
 * selects or clears that filtered set. Optional. Children are the visible label.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const SelectAll = forwardRef<ComponentRef<"label">, Omit<ComponentProps<"label">, "htmlFor">>(
	({ children, className, ...props }, ref) => {
		const { filteredOptions, selectedValues, selectedSet, setSelection } =
			useSelectableListContext("SelectAll");
		const controlId = useId();

		const { allSelected, someSelected } = summarizeSelection(filteredOptions, selectedSet);
		const checked = selectAllChecked({ allSelected, someSelected });

		const selectableFilteredValues = filteredOptions
			.filter((option) => !option.disabled)
			.map((option) => option.value);

		const handleChange = () => {
			if (allSelected) {
				// Clear only the filtered values, preserving any selection outside the filter.
				const filteredSet = new Set(selectableFilteredValues);
				setSelection(selectedValues.filter((value) => !filteredSet.has(value)));
				return;
			}
			// Union the current selection with every filtered value.
			setSelection([...new Set([...selectedValues, ...selectableFilteredValues])]);
		};

		return (
			<label
				ref={ref}
				htmlFor={controlId}
				data-slot="selectable-list-select-all"
				className={cx(
					"text-strong flex cursor-pointer items-center gap-2 text-sm font-medium font-sans",
					className,
				)}
				{...props}
			>
				<Checkbox
					id={controlId}
					checked={checked}
					onChange={handleChange}
					disabled={selectableFilteredValues.length === 0}
				/>
				{children}
			</label>
		);
	},
);
SelectAll.displayName = "SelectableListSelectAll";

type SelectableListItemProps = Omit<ComponentProps<"label">, "children"> & {
	/** The option's selection value. Selection state is read from, and toggled in, the list. */
	value: string;
	/**
	 * Force the row's disabled state. Defaults to the matching option's `disabled`,
	 * so you usually don't pass this.
	 */
	disabled?: boolean;
	/**
	 * Row content — typically `SelectableList.ItemTitle` over a
	 * `SelectableList.ItemDescription`, or any layout you like. Must be
	 * non-interactive (it lives inside the row's `<label>`).
	 */
	children: ReactNode;
};

/**
 * A single, fully-clickable selectable row. The whole row is a `<label>`
 * wrapping a real checkbox, so clicking anywhere toggles selection and the
 * row's text is the checkbox's accessible name. Selection and disabled state
 * are read from the list by `value`.
 *
 * Render it from `SelectableList.Viewport`'s render-prop child when you want a
 * custom row layout; the default row (title + description) uses it under the hood.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Viewport aria-label="Access keys">
 *   {(option) => (
 *     <SelectableList.Item value={option.value}>
 *       <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *       <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 *     </SelectableList.Item>
 *   )}
 * </SelectableList.Viewport>
 * ```
 */
const Item = forwardRef<ComponentRef<"label">, SelectableListItemProps>(
	({ children, className, disabled: disabledProp, value, ...props }, ref) => {
		const { selectedSet, disabledSet, toggle } = useSelectableListContext("Item");
		const controlId = useId();
		const selected = selectedSet.has(value);
		const disabled = disabledProp ?? disabledSet.has(value);

		return (
			<label
				ref={ref}
				htmlFor={controlId}
				data-slot="selectable-list-item"
				aria-disabled={disabled || undefined}
				// The row's rounded hover / selected pill lives on the wrapping <li> (see
				// VirtualList); this label is the fully-clickable content area.
				className={cx(
					"flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-sm",
					"cursor-pointer aria-disabled:cursor-default",
					className,
				)}
				{...props}
			>
				{/* h-lh centers the box on the leading of the title's first line. */}
				<span className="flex h-lh items-center">
					<Checkbox
						id={controlId}
						checked={selected}
						onChange={() => toggle(value)}
						disabled={disabled}
					/>
				</span>
				<span className={cx("flex min-w-0 flex-1 flex-col gap-0.5", disabled && "opacity-50")}>
					{children}
				</span>
			</label>
		);
	},
);
Item.displayName = "SelectableListItem";

/**
 * The emphasized title line inside a `SelectableList.Item`, in the stronger
 * foreground color. A styled `<span>` — drop it into your custom row to match
 * the default row's typography.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Item value={option.value}>
 *   <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *   <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 * </SelectableList.Item>
 * ```
 */
const ItemTitle = forwardRef<ComponentRef<"span">, ComponentProps<"span">>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="selectable-list-item-title"
			className={cx("text-strong font-medium", className)}
			{...props}
		/>
	),
);
ItemTitle.displayName = "SelectableListItemTitle";

/**
 * The de-emphasized sub-line inside a `SelectableList.Item`, in the muted body
 * color. A styled `<span>` for custom rows that want the default look.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Item value={option.value}>
 *   <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *   <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 * </SelectableList.Item>
 * ```
 */
const ItemDescription = forwardRef<ComponentRef<"span">, ComponentProps<"span">>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			data-slot="selectable-list-item-description"
			className={cx("text-body leading-4", className)}
			{...props}
		/>
	),
);
ItemDescription.displayName = "SelectableListItemDescription";

/**
 * The default row renderer: a title (and description, if present) from the
 * option. Used by `Viewport` when no render-prop child is supplied.
 */
function renderDefaultOption(option: SelectableListOption): ReactNode {
	return (
		<Item value={option.value}>
			<ItemTitle>{option.label}</ItemTitle>
			{option.description != null && <ItemDescription>{option.description}</ItemDescription>}
		</Item>
	);
}

type SelectableListViewportProps = Omit<ComponentProps<"div">, "children"> & {
	/** Estimated row height in pixels, used to seed the virtualizer before rows are measured. */
	estimateRowHeight?: number;
	/**
	 * Optional render-prop for custom row content, called per filtered option.
	 * Return a `SelectableList.Item` with your own layout. Defaults to a
	 * title + description row built from the option.
	 */
	children?: (option: SelectableListOption) => ReactNode;
};

/**
 * The scrollable, virtualized body of a `SelectableList`, styled like the
 * `MultiSelect` popover: a bordered, rounded `bg-popover` container whose rows
 * highlight on hover / selection with an inset, rounded pill. Renders only the
 * rows in view (via `@tanstack/react-virtual`) as a `<ul role="list">` of `<li>`
 * rows, measuring each so rows with and without a description size correctly.
 * Renders nothing when the filtered list is empty — pair with `SelectableList.Empty`.
 *
 * By default it draws a title + description row from each option. Pass a
 * render-prop child to render your own row layout. Provide an `aria-label` (or
 * `aria-labelledby`) so the list has an accessible name. **Bound its height**
 * for virtualization to engage — e.g. `className="max-h-80"`, a fixed `h-*`, or
 * `min-h-0 flex-1` inside a flex parent; with an auto height it renders every row.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const Viewport = forwardRef<ComponentRef<"div">, SelectableListViewportProps>(
	({ children, ...props }, ref) => {
		const { filteredOptions, selectedSet, disabledSet } = useSelectableListContext("Viewport");
		const renderOption = children ?? renderDefaultOption;

		// Delegates the scroll viewport, virtualization, and row chrome to the shared
		// VirtualList shell; this layer only maps options -> per-row state + content.
		return (
			<VirtualList
				ref={ref}
				data-slot="selectable-list-viewport"
				{...props}
				count={filteredOptions.length}
				getItemKey={(index) => filteredOptions[index]?.value ?? String(index)}
				isItemSelected={(index) => {
					const option = filteredOptions[index];
					return option != null && selectedSet.has(option.value);
				}}
				isItemDisabled={(index) => {
					const option = filteredOptions[index];
					return option != null && disabledSet.has(option.value);
				}}
			>
				{(index) => {
					const option = filteredOptions[index];
					return option == null ? null : renderOption(option);
				}}
			</VirtualList>
		);
	},
);
Viewport.displayName = "SelectableListViewport";

/**
 * Shown in place of the viewport when the active filter matches no options.
 * Renders its children (e.g. "No results found.") in muted, centered text;
 * renders nothing while there are matching options.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const Empty = forwardRef<ComponentRef<"div">, ComponentProps<"div">>(
	({ className, ...props }, ref) => {
		const { filteredOptions } = useSelectableListContext("Empty");

		if (filteredOptions.length > 0) {
			return null;
		}

		return (
			<div
				ref={ref}
				data-slot="selectable-list-empty"
				className={cx(
					"text-muted border-popover bg-popover flex items-center justify-center rounded-md border px-3 py-8 text-center text-sm",
					className,
				)}
				{...props}
			/>
		);
	},
);
Empty.displayName = "SelectableListEmpty";

/**
 * A filterable, virtualized, multi-select list of checkbox rows — the inline
 * (non-popover) counterpart to `MultiSelect`/`Combobox`. Map your data into
 * `options` once; the list owns filtering, virtualization, and selection. By
 * default each row is a fully-clickable checkbox with a title and optional
 * sub-line — or pass a `Viewport` render-prop child to draw your own row layout
 * with `SelectableList.Item`.
 *
 * **Preview:** the API is still settling. Keyboard support is currently the
 * native checkbox tab order within the rendered window; roving arrow-key
 * navigation across the full virtualized list is a planned enhancement.
 *
 * @see https://mantle.ngrok.com/components/preview/selectable-list
 *
 * @example
 * Composition:
 * ```
 * SelectableList.Root
 * ├── SelectableList.Filter
 * ├── SelectableList.SelectAll
 * ├── SelectableList.Viewport
 * │   └── SelectableList.Item              (optional render-prop; auto-rendered by default)
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
const SelectableList = {
	/**
	 * Root: owns selection + filter state and the derived filtered options.
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	Root,
	/**
	 * Optional filter/search box (mantle `Input` + magnifying-glass icon).
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	Filter,
	/**
	 * Optional tri-state "select all" header over the filtered options.
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	SelectAll,
	/**
	 * The scrollable, virtualized rows. Give it an `aria-label`. Pass a
	 * render-prop child for custom row layout, or omit it for the default row.
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	Viewport,
	/**
	 * A fully-clickable row for custom `Viewport` rendering. Reads its selection
	 * and disabled state from the list by `value`.
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Viewport aria-label="Access keys">
	 *   {(option) => (
	 *     <SelectableList.Item value={option.value}>
	 *       <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 *       <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 *     </SelectableList.Item>
	 *   )}
	 * </SelectableList.Viewport>
	 * ```
	 */
	Item,
	/**
	 * Emphasized title line for a custom `SelectableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Viewport aria-label="Access keys">
	 *   {(option) => (
	 *     <SelectableList.Item value={option.value}>
	 *       <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 *       <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 *     </SelectableList.Item>
	 *   )}
	 * </SelectableList.Viewport>
	 * ```
	 */
	ItemTitle,
	/**
	 * De-emphasized sub-line for a custom `SelectableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Viewport aria-label="Access keys">
	 *   {(option) => (
	 *     <SelectableList.Item value={option.value}>
	 *       <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 *       <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 *     </SelectableList.Item>
	 *   )}
	 * </SelectableList.Viewport>
	 * ```
	 */
	ItemDescription,
	/**
	 * Shown when the filter matches no options.
	 *
	 * @see https://mantle.ngrok.com/components/preview/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	Empty,
} as const;

export {
	//,
	filterSelectableOptions,
	SelectableList,
	summarizeSelection,
	toggleSelectionValue,
};

export type {
	//,
	SelectableListItemProps,
	SelectableListOption,
	SelectableListRootProps,
};
