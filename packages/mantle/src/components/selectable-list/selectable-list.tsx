"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import {
	cloneElement,
	createContext,
	forwardRef,
	isValidElement,
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
import { Choice } from "../choice/choice.js";
import { Input, InputCapture } from "../input/input.js";
import { Root as ListRoot, Row as ListRow } from "../list/primitive.js";
import { VirtualRoot as ListVirtualRoot } from "../list/virtual.js";

/**
 * A single selectable row in a {@link SelectableList}. The list is data-driven:
 * map your domain objects into these options once, and the list owns filtering,
 * selection, and (optionally) virtualization. Row *rendering* stays composable —
 * pass a render-prop child to a viewport to draw your own layout.
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
): readonly SelectableListOption[] {
	const normalized = query.trim().toLowerCase();
	if (normalized === "") {
		return options;
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

/**
 * Selector for the interactive controls inside a row that handle their own
 * click — the checkbox, the title's `<label>`, and any nested links/buttons.
 * A bare row click that lands inside one of these is left alone so selection
 * isn't toggled twice.
 */
const INTERACTIVE_ROW_TARGET_SELECTOR =
	'a[href], button, input, select, textarea, label, [role="button"], [role="link"], [role="menuitem"], [contenteditable="true"]';

/**
 * Whether a row click originated on an element (within `row`) that already
 * handles the click — the checkbox, the title label, or nested interactive
 * content — so the row's own click-to-toggle should defer to it. Pure over the
 * DOM; testable in isolation.
 *
 * @example
 * ```ts
 * // click on the row's checkbox → true (the row must not double-toggle)
 * isInteractiveRowTarget(checkboxEl, rowEl); // → true
 * // click on the description text → false (the row toggles)
 * isInteractiveRowTarget(descriptionEl, rowEl); // → false
 * ```
 */
function isInteractiveRowTarget(target: EventTarget | null, row: Element): boolean {
	if (!(target instanceof Element)) {
		return false;
	}
	const interactive = target.closest(INTERACTIVE_ROW_TARGET_SELECTOR);
	return interactive != null && row.contains(interactive);
}

type SelectableListContextValue = {
	/** A stable id namespace for the list's control ids. */
	listId: string;
	/** Options after the active filter is applied. Drives the viewport and select-all. */
	filteredOptions: readonly SelectableListOption[];
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
 * @see https://mantle.ngrok.com/components/selectable-list
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
 * Root of a `SelectableList` — a filterable, multi-select **grid** of checkbox
 * rows. Owns selection state (controlled via `value`/`onValueChange` or
 * uncontrolled via `defaultValue`), the filter query, and the derived filtered
 * options, and shares them with the parts below it.
 *
 * Compose it with `SelectableList.Filter` (optional search box),
 * `SelectableList.SelectAll` (optional tri-state header), a viewport
 * (`SelectableList.Viewport`, or the windowed `SelectableList.VirtualViewport`),
 * and `SelectableList.Empty` (shown when the filter matches nothing).
 *
 * @see https://mantle.ngrok.com/components/selectable-list
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
		const listId = useId();
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
				listId,
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
			[listId, filteredOptions, query, selectedValues, selectedSet, disabledSet, commitSelection],
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
 * @see https://mantle.ngrok.com/components/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Filter placeholder="Filter access keys…" />
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
 * @see https://mantle.ngrok.com/components/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 * ```
 */
const SelectAll = forwardRef<ComponentRef<"label">, Omit<ComponentProps<"label">, "htmlFor">>(
	({ children, className, ...props }, ref) => {
		const { filteredOptions, selectedValues, selectedSet, setSelection } =
			useSelectableListContext("SelectAll");
		const controlId = useId();

		const { allSelected, someSelected } = summarizeSelection(filteredOptions, selectedSet);
		const checked = selectAllChecked({ allSelected, someSelected });
		const hasSelectable = filteredOptions.some((option) => !option.disabled);

		const handleChange = () => {
			// Materialize the selectable values only on toggle, not on every render.
			const selectableFilteredValues = filteredOptions
				.filter((option) => !option.disabled)
				.map((option) => option.value);
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
					disabled={!hasSelectable}
				/>
				{children}
			</label>
		);
	},
);
SelectAll.displayName = "SelectableListSelectAll";

/**
 * The DOM id of a row's checkbox, derived from the list id and the option value.
 * The grid's `aria-activedescendant` resolves to this — the row element itself is
 * a `Choice.Root`, which reserves `id` for the control, so the checkbox is the
 * real element that carries the id.
 */
function controlIdFor(listId: string, value: string): string {
	// `encodeURIComponent` guarantees a whitespace-free, valid HTML id token (and
	// thus a resolvable `aria-activedescendant` IDREF) for ANY option `value` — e.g.
	// a display name like "Acme Inc" or an email. The checkbox `id` and the grid's
	// `aria-activedescendant`/`rowId` all derive from this one function, so encoding
	// every call site keeps them equal and preserves the accessibility association.
	return `${listId}-control-${encodeURIComponent(value)}`;
}

type SelectableListItemProps = Omit<ComponentProps<"div">, "children"> & {
	/** The option's selection value. Selection state is read from, and toggled in, the list. */
	value: string;
	/**
	 * Force the row's disabled state. Defaults to the matching option's `disabled`,
	 * so you usually don't pass this.
	 */
	disabled?: boolean;
	/**
	 * Row content — typically `SelectableList.ItemTitle` over a
	 * `SelectableList.ItemDescription`, or any layout you like. It fills the row's
	 * content `gridcell`; nested interactive content (links, buttons) is allowed.
	 */
	children: ReactNode;
};

/**
 * A single selectable grid row. Renders a `role="row"` (via the `list`
 * primitive) laid out with `Choice` — a `role="gridcell"` holding a real
 * `Checkbox`, and a `role="gridcell"` holding the title + description. The whole
 * row is click-to-toggle: a bare click anywhere toggles selection, while clicks
 * on the checkbox, the title label, or any nested interactive content are left
 * to those controls (no double-toggle). Selection and disabled state are read
 * from the list by `value`.
 *
 * Render it from a viewport's render-prop child for a custom row layout; the
 * default row (title + description) uses it under the hood.
 *
 * @see https://mantle.ngrok.com/components/selectable-list
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
const Item = forwardRef<ComponentRef<"div">, SelectableListItemProps>(
	({ children, className, disabled: disabledProp, onClick, value, ...props }, ref) => {
		const { listId, selectedSet, disabledSet, toggle } = useSelectableListContext("Item");
		const controlId = controlIdFor(listId, value);
		const selected = selectedSet.has(value);
		const disabled = disabledProp ?? disabledSet.has(value);

		return (
			<ListRow
				ref={ref}
				asChild
				selected={selected}
				disabled={disabled}
				className={cx(
					"px-2 py-1.5 text-sm",
					"cursor-pointer aria-disabled:cursor-default",
					className,
				)}
				{...props}
				data-value={value}
				aria-disabled={disabled || undefined}
				onClick={(event) => {
					// Run a consumer-supplied handler first so it composes with (and can
					// `preventDefault` to opt out of) the row's click-to-toggle, rather than
					// silently replacing it via the `{...props}` spread.
					onClick?.(event);
					// Forward a bare row click to selection, but defer to anything that already
					// handles its own click — the checkbox, the title's <label>, or nested
					// interactive content — so the row never double-toggles.
					if (
						event.defaultPrevented ||
						disabled ||
						isInteractiveRowTarget(event.target, event.currentTarget)
					) {
						return;
					}
					toggle(value);
				}}
			>
				<Choice.Root id={controlId} disabled={disabled}>
					<Choice.Indicator role="gridcell">
						{/* tabIndex -1: the grid collection is the single tab stop; Space/Enter there
						    activates the active row. The checkbox stays click-toggleable. */}
						<Checkbox checked={selected} onChange={() => toggle(value)} tabIndex={-1} />
					</Choice.Indicator>
					<Choice.Content role="gridcell">{children}</Choice.Content>
				</Choice.Root>
			</ListRow>
		);
	},
);
Item.displayName = "SelectableListItem";

/**
 * The emphasized title of a `SelectableList.Item`, rendered as `Choice.Label` —
 * a real `<label>` wired to the row's checkbox, so clicking it toggles the row
 * and it supplies the checkbox's accessible name.
 *
 * @see https://mantle.ngrok.com/components/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Item value={option.value}>
 *   <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *   <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 * </SelectableList.Item>
 * ```
 */
const ItemTitle = forwardRef<
	ComponentRef<typeof Choice.Label>,
	ComponentProps<typeof Choice.Label>
>(({ className, ...props }, ref) => (
	<Choice.Label ref={ref} data-slot="selectable-list-item-title" className={className} {...props} />
));
ItemTitle.displayName = "SelectableListItemTitle";

/**
 * The de-emphasized sub-line of a `SelectableList.Item`, rendered as
 * `Choice.Description` — wired to the row's checkbox via `aria-describedby`
 * (never a second label).
 *
 * @see https://mantle.ngrok.com/components/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Item value={option.value}>
 *   <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *   <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 * </SelectableList.Item>
 * ```
 */
const ItemDescription = forwardRef<
	ComponentRef<typeof Choice.Description>,
	ComponentProps<typeof Choice.Description>
>(({ className, ...props }, ref) => (
	<Choice.Description
		ref={ref}
		data-slot="selectable-list-item-description"
		className={className}
		{...props}
	/>
));
ItemDescription.displayName = "SelectableListItemDescription";

/**
 * The default row renderer: a title (and description, if present) from the
 * option. Used by a viewport when no render-prop child is supplied.
 */
function renderDefaultOption(option: SelectableListOption): ReactNode {
	return (
		<Item value={option.value}>
			<ItemTitle>{option.label}</ItemTitle>
			{option.description != null && <ItemDescription>{option.description}</ItemDescription>}
		</Item>
	);
}

/**
 * Map the filtered options into keyed `Item` rows, using the render-prop child
 * when supplied or the default title/description row otherwise. Each row is
 * re-keyed by its option `value` so composed rows stay stable across filtering,
 * and the option's `disabled` is surfaced onto the row element so the grid can
 * skip it during keyboard navigation without reading the (windowed) DOM. An
 * explicitly-disabled row from a render-prop stays disabled.
 *
 * Returns the rendered rows alongside the `options` that produced them, in the
 * same order. Non-element render-prop results (e.g. a conditional `null`) are
 * skipped from *both* arrays, so `options[i]` always corresponds to the rendered
 * `rows[i]` — and to the index the list primitive assigns that row (it derives
 * indices from the elements it renders via `Children.toArray`). The viewport
 * resolves grid activation/`rowId` by that index against `options`, so keeping
 * them aligned is what stops keyboard nav from toggling or labeling the wrong
 * option when a render-prop drops a row.
 */
function renderRows(
	filteredOptions: readonly SelectableListOption[],
	renderOption: (option: SelectableListOption) => ReactNode,
): { rows: ReactNode[]; options: SelectableListOption[] } {
	const rows: ReactNode[] = [];
	const options: SelectableListOption[] = [];
	for (const option of filteredOptions) {
		const row = renderOption(option);
		if (!isValidElement<{ disabled?: boolean }>(row)) {
			continue;
		}
		const disabled = row.props.disabled === true || option.disabled === true;
		rows.push(cloneElement(row, { key: option.value, disabled }));
		options.push(option);
	}
	return { rows, options };
}

type SelectableListViewportProps = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * Optional render-prop for custom row content, called per filtered option.
	 * Return a `SelectableList.Item` with your own layout. Defaults to a
	 * title + description row built from the option.
	 */
	children?: (option: SelectableListOption) => ReactNode;
};

/**
 * The scrollable body of a `SelectableList`: a `role="grid"` of `role="row"`
 * checkbox rows inside the bordered, rounded `bg-popover` viewport. Renders
 * **every** filtered row — the non-virtualized default; for long lists, swap in
 * `SelectableList.VirtualViewport`. Renders nothing when the filter matches
 * nothing — pair with `SelectableList.Empty`. Provide an `aria-label` (or
 * `aria-labelledby`) and **bound the height** (`max-h-*`, `h-*`, or
 * `min-h-0 flex-1`).
 *
 * @see https://mantle.ngrok.com/components/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
 * ```
 */
const Viewport = forwardRef<ComponentRef<"div">, SelectableListViewportProps>(
	({ children, ...props }, ref) => {
		const { filteredOptions, listId, toggle } = useSelectableListContext("Viewport");
		const renderOption = children ?? renderDefaultOption;
		// Memoized so a selection toggle (which leaves `filteredOptions` and the default
		// renderer untouched) doesn't re-map + re-clone every row. `rowOptions` are the
		// options that actually produced a rendered row, so resolving activation/`rowId`
		// by the primitive's row index against them stays aligned. A fresh inline
		// render-prop each render opts out of the memo — memoize it to keep the win.
		const { rows, options: rowOptions } = useMemo(
			() => renderRows(filteredOptions, renderOption),
			[filteredOptions, renderOption],
		);

		if (filteredOptions.length === 0) {
			return null;
		}

		return (
			<ListRoot
				ref={ref}
				data-slot="selectable-list-viewport"
				semantics="grid"
				{...props}
				aria-multiselectable
				onActivate={(index) => {
					const option = rowOptions[index];
					if (option != null) {
						toggle(option.value);
					}
				}}
				rowId={(index) => {
					const option = rowOptions[index];
					return option != null ? controlIdFor(listId, option.value) : "";
				}}
			>
				{rows}
			</ListRoot>
		);
	},
);
Viewport.displayName = "SelectableListViewport";

type SelectableListVirtualViewportProps = SelectableListViewportProps & {
	/** Estimated row height in px, used to seed the virtualizer before rows are measured. */
	estimateRowHeight?: number;
	/** Rows rendered beyond the visible window on each side. */
	overscan?: number;
};

/**
 * The windowed counterpart to `SelectableList.Viewport`: renders only the
 * visible slice of filtered rows via `@tanstack/react-virtual`, sharing the
 * same grid semantics and row layout. Authored identically to `Viewport` — same
 * `aria-label`, same optional render-prop — so opting into virtualization never
 * changes the call site. **Bound the height** so the virtualizer has a viewport.
 *
 * @see https://mantle.ngrok.com/components/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.VirtualViewport aria-label="Access keys" className="max-h-80" />
 * ```
 */
const VirtualViewport = forwardRef<ComponentRef<"div">, SelectableListVirtualViewportProps>(
	({ children, ...props }, ref) => {
		const { filteredOptions, listId, toggle } = useSelectableListContext("VirtualViewport");
		const renderOption = children ?? renderDefaultOption;
		// Only the windowed slice mounts, but without this every filtered option is
		// still re-mapped + cloned on each selection toggle — memoize past that.
		// `rowOptions` mirror the rendered rows (non-element results dropped) so the
		// index-based activation/`rowId` below can't drift from the mounted rows. A
		// fresh inline render-prop each render opts out of the memo — memoize it to keep
		// the win.
		const { rows, options: rowOptions } = useMemo(
			() => renderRows(filteredOptions, renderOption),
			[filteredOptions, renderOption],
		);

		if (filteredOptions.length === 0) {
			return null;
		}

		return (
			<ListVirtualRoot
				ref={ref}
				data-slot="selectable-list-viewport"
				semantics="grid"
				{...props}
				aria-multiselectable
				onActivate={(index) => {
					const option = rowOptions[index];
					if (option != null) {
						toggle(option.value);
					}
				}}
				rowId={(index) => {
					const option = rowOptions[index];
					return option != null ? controlIdFor(listId, option.value) : "";
				}}
			>
				{rows}
			</ListVirtualRoot>
		);
	},
);
VirtualViewport.displayName = "SelectableListVirtualViewport";

/**
 * Shown in place of the viewport when the active filter matches no options.
 * Renders its children (e.g. "No results found.") in muted, centered text;
 * renders nothing while there are matching options.
 *
 * @see https://mantle.ngrok.com/components/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Empty>No access keys found.</SelectableList.Empty>
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
 * A filterable, multi-select **grid** of checkbox rows — the inline
 * (non-popover) counterpart to `MultiSelect`/`Combobox`. Map your data into
 * `options` once; the list owns filtering, selection, and (optionally)
 * virtualization. Each row is an APG grid `role="row"` (`aria-selected`) whose
 * cells hold a real `Checkbox` and a `Choice`-laid-out title + description — the
 * pattern that lets a selectable row carry a real control and nested interactive
 * content. Non-virtualized by default; swap `Viewport` → `VirtualViewport` (same
 * props) for windowing. Built on the shared `list` primitive.
 *
 * Keyboard: the grid is a single tab stop — `Arrow`/`Home`/`End` move an active
 * row (tracked via `aria-activedescendant`, so navigation works across the full
 * option set even when virtualized) and `Space`/`Enter` toggles it.
 *
 * @see https://mantle.ngrok.com/components/selectable-list
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
const SelectableList = {
	/**
	 * Root: owns selection + filter state and the derived filtered options.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	 * </SelectableList.Root>
	 * ```
	 */
	Root,
	/**
	 * Optional filter/search box (mantle `Input` + magnifying-glass icon).
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Filter placeholder="Filter access keys…" />
	 * ```
	 */
	Filter,
	/**
	 * Optional tri-state "select all" header over the filtered options.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 * ```
	 */
	SelectAll,
	/**
	 * The scrollable grid of rows (non-virtualized). Give it an `aria-label`;
	 * pass a render-prop child for a custom row layout, or omit it for the default.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
	 * ```
	 */
	Viewport,
	/**
	 * The windowed grid of rows — same surface as `Viewport`, for long lists.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.VirtualViewport aria-label="Access keys" className="max-h-80" />
	 * ```
	 */
	VirtualViewport,
	/**
	 * A selectable grid row for custom viewport rendering. Reads its selection
	 * and disabled state from the list by `value`.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Item value={option.value}>
	 *   <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 *   <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 * </SelectableList.Item>
	 * ```
	 */
	Item,
	/**
	 * Emphasized title (`Choice.Label`) for a `SelectableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 * ```
	 */
	ItemTitle,
	/**
	 * De-emphasized sub-line (`Choice.Description`) for a `SelectableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 * ```
	 */
	ItemDescription,
	/**
	 * Shown when the filter matches no options.
	 *
	 * @see https://mantle.ngrok.com/components/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * ```
	 */
	Empty,
} as const;

export {
	//,
	filterSelectableOptions,
	isInteractiveRowTarget,
	SelectableList,
	summarizeSelection,
	toggleSelectionValue,
};

export type {
	//,
	SelectableListItemProps,
	SelectableListOption,
	SelectableListRootProps,
	SelectableListViewportProps,
	SelectableListVirtualViewportProps,
};
