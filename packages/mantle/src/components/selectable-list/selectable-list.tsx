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
import type {
	ComponentProps,
	ComponentPropsWithoutRef,
	ComponentRef,
	ReactElement,
	ReactNode,
} from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import { Checkbox, selectAllChecked } from "../checkbox/checkbox.js";
import { Choice } from "../choice/choice.js";
import { Input, InputCapture } from "../input/input.js";
import { Root as ListRoot, Item as ListItem } from "../list/primitive.js";
import { VirtualRoot as ListVirtualRoot } from "../list/virtual.js";

/**
 * A single selectable row in a {@link SelectableList}. The list is data-driven:
 * map your domain objects into these options once, and the list owns filtering,
 * selection, and (optionally) virtualization. Item *rendering* stays composable —
 * pass a render-prop child to a viewport to draw your own layout.
 *
 * A `label` may be any ReactNode; when it isn't a plain string, `labelText` is
 * required so the default filter has text to match.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```ts
 * const option: SelectableListOption = {
 *   value: "key_123",
 *   label: "Onboarding key",
 *   description: "sk-…4f2a",
 * };
 * ```
 *
 * @example
 * ```tsx
 * // A rich label pairs with labelText (the filter's match target).
 * const option: SelectableListOption = {
 *   value: "key_123",
 *   label: (
 *     <>
 *       <KeyIcon /> Onboarding key
 *     </>
 *   ),
 *   labelText: "Onboarding key",
 * };
 * ```
 */
type SelectableListOption = {
	/** Stable, unique selection value. This is what flows through `value` / `onValueChange`. */
	value: string;
	/** Optional de-emphasized sub-line under the title in the default row (e.g. a masked identifier). */
	description?: ReactNode;
	/** When `true`, the row renders dimmed and cannot be toggled or selected by "select all". */
	disabled?: boolean;
} & (
	| {
			/**
			 * Plain-text title — rendered in the default row and, as the checkbox's
			 * `<label>`, its accessible name. Also what the default filter matches
			 * (override that with `labelText`).
			 */
			label: string;
			/** Optional plain-text override for what the default filter matches. */
			labelText?: string;
	  }
	| {
			/**
			 * A rich title (any ReactNode). Keep readable text inside — the rendered
			 * content is the checkbox's accessible name.
			 */
			label: ReactNode;
			/** The plain-text form of the label. Required for a rich label so the default filter has text to match. */
			labelText: string;
	  }
);

/**
 * The plain-text form of an option's label: `labelText` when provided,
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
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	/** Controlled filter query. Pair with `onQueryChange`. */
	query?: string;
	/** Initial filter query for the uncontrolled case. */
	defaultQuery?: string;
	/** Called with the next query whenever it changes (e.g. typing in `SelectableList.Filter`). */
	onQueryChange?: (query: string) => void;
	/**
	 * Custom filter predicate, called per option with the raw query; return
	 * `true` to keep the option. Defaults to a trimmed, case-insensitive
	 * substring match over each option's plain text (`labelText`, or a string
	 * `label`).
	 */
	filter?: (option: SelectableListOption, query: string) => boolean;
};

const EMPTY_SELECTION: readonly string[] = [];

/**
 * Root of a `SelectableList` — a filterable, multi-select **grid** of checkbox
 * rows. Owns selection state (controlled via `value`/`onValueChange` or
 * uncontrolled via `defaultValue`), the filter query (likewise controlled via
 * `query`/`onQueryChange` or uncontrolled via `defaultQuery`), and the derived
 * filtered options (a case-insensitive `label` substring match by default, or
 * your own `filter` predicate), and shares them with the parts below it.
 *
 * Compose it with `SelectableList.Filter` (optional search box),
 * `SelectableList.SelectAll` (optional tri-state header), a viewport
 * (`SelectableList.Viewport`, or the windowed `SelectableList.VirtualViewport`),
 * and `SelectableList.Empty` (shown when the filter matches nothing).
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	(
		{
			className,
			defaultQuery,
			defaultValue,
			filter,
			onQueryChange,
			onValueChange,
			options,
			query: queryProp,
			value,
			...props
		},
		ref,
	) => {
		const listId = useId();
		const isControlled = value != null;
		const [internalValue, setInternalValue] = useState<readonly string[]>(
			defaultValue ?? EMPTY_SELECTION,
		);
		const selectedValues = isControlled ? value : internalValue;
		const isQueryControlled = queryProp != null;
		const [internalQuery, setInternalQuery] = useState(defaultQuery ?? "");
		const query = isQueryControlled ? queryProp : internalQuery;

		const commitSelection = useCallback(
			(next: string[]) => {
				if (!isControlled) {
					setInternalValue(next);
				}
				onValueChange?.(next);
			},
			[isControlled, onValueChange],
		);
		const setQuery = useCallback(
			(next: string) => {
				if (!isQueryControlled) {
					setInternalQuery(next);
				}
				onQueryChange?.(next);
			},
			[isQueryControlled, onQueryChange],
		);

		const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
		const disabledSet = useMemo(
			() => new Set(options.filter((option) => option.disabled).map((option) => option.value)),
			[options],
		);
		const filteredOptions = useMemo(
			() =>
				filter != null
					? options.filter((option) => filter(option, query))
					: filterSelectableOptions(options, query),
			[options, query, filter],
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
			[
				listId,
				filteredOptions,
				query,
				setQuery,
				selectedValues,
				selectedSet,
				disabledSet,
				commitSelection,
			],
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
 * case-insensitive substring match over each option's plain text — `labelText`,
 * or a string `label`). Optional — omit it for a non-filterable list.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	Omit<
		ComponentPropsWithoutRef<typeof Input>,
		// The input is always controlled by the list's `query`, so `defaultValue`
		// would typecheck yet be silently ignored — omit it too.
		"value" | "defaultValue" | "onChange" | "type" | "children"
	>
>(({ "aria-label": ariaLabel = "Filter", ...props }, ref) => {
	const { query, setQuery } = useSelectableListContext("Filter");

	return (
		<Input
			ref={ref}
			type="text"
			data-slot="selectable-list-filter"
			aria-label={ariaLabel}
			value={query}
			onChange={(event) => setQuery(event.target.value)}
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
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	// `aria-activedescendant`/`itemId` all derive from this one function, so encoding
	// every call site keeps them equal and preserves the accessibility association.
	return `${listId}-control-${encodeURIComponent(value)}`;
}

/**
 * Props for `SelectableList.Item`. Extends `<div>` props with the option
 * `value` the row represents; selection and disabled state are read from the
 * list by that value (`options[].disabled` is the single source of truth).
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Item value={option.value}>
 *   <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *   <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 * </SelectableList.Item>
 * ```
 */
type SelectableListItemProps = Omit<ComponentProps<"div">, "children" | "id"> & {
	/** The option's selection value. Selection state is read from, and toggled in, the list. */
	value: string;
	/**
	 * Item content — typically `SelectableList.ItemTitle` over a
	 * `SelectableList.ItemDescription`, or any layout you like. It fills the row's
	 * content `gridcell`; nested interactive content (links, buttons) is allowed.
	 */
	children: ReactNode;
};

/**
 * A single selectable grid row. Renders a `role="row"` (via the `list`
 * primitive) laid out with `Choice` — a `role="gridcell"` holding a real
 * `Checkbox`, and a `role="gridcell"` holding the title + description. The whole
 * row is click-to-toggle: the enclosing grid forwards a bare click anywhere on
 * the row to activation, while clicks on the checkbox, the title label, or any
 * nested interactive content are left to those controls (no double-toggle).
 * Selection and disabled state are read from the list by `value`.
 *
 * Render it from a viewport's render-prop child for a custom row layout; the
 * default row (title + description) uses it under the hood.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80">
 *     {(option) => (
 *       <SelectableList.Item value={option.value}>
 *         <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *         <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 *       </SelectableList.Item>
 *     )}
 *   </SelectableList.Viewport>
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const Item = forwardRef<ComponentRef<"div">, SelectableListItemProps>(
	({ children, className, value, ...props }, ref) => {
		const { listId, selectedSet, disabledSet, toggle } = useSelectableListContext("Item");
		const controlId = controlIdFor(listId, value);
		const selected = selectedSet.has(value);
		const disabled = disabledSet.has(value);

		// Click-to-toggle lives on the enclosing grid (the list primitive's
		// click-to-activate → the viewport's `onActivate` → `toggle`), which already
		// defers to the checkbox/label/nested controls and skips disabled rows. A
		// consumer `onClick` spread onto the row composes naturally: it runs first
		// in the bubble and can `preventDefault` to opt out of the toggle.
		return (
			<ListItem
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
				data-slot="selectable-list-item"
				data-value={value}
			>
				<Choice.Root id={controlId} disabled={disabled}>
					<Choice.Indicator role="gridcell">
						{/* tabIndex -1: the grid collection is the single tab stop; Space/Enter there
						    activates the active row. The checkbox stays click-toggleable. */}
						<Checkbox checked={selected} onChange={() => toggle(value)} tabIndex={-1} />
					</Choice.Indicator>
					<Choice.Content role="gridcell">{children}</Choice.Content>
				</Choice.Root>
			</ListItem>
		);
	},
);
Item.displayName = "SelectableListItem";

/**
 * The emphasized title of a `SelectableList.Item`, rendered as `Choice.Label` —
 * a real `<label>` wired to the row's checkbox, so clicking it toggles the row
 * and it supplies the checkbox's accessible name.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80">
 *     {(option) => (
 *       <SelectableList.Item value={option.value}>
 *         <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *         <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 *       </SelectableList.Item>
 *     )}
 *   </SelectableList.Viewport>
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const ItemTitle = forwardRef<
	ComponentRef<typeof Choice.Label>,
	ComponentProps<typeof Choice.Label>
>((props, ref) => <Choice.Label ref={ref} data-slot="selectable-list-item-title" {...props} />);
ItemTitle.displayName = "SelectableListItemTitle";

/**
 * The de-emphasized sub-line of a `SelectableList.Item`, rendered as
 * `Choice.Description` — wired to the row's checkbox via `aria-describedby`
 * (never a second label).
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80">
 *     {(option) => (
 *       <SelectableList.Item value={option.value}>
 *         <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
 *         <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
 *       </SelectableList.Item>
 *     )}
 *   </SelectableList.Viewport>
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const ItemDescription = forwardRef<
	ComponentRef<typeof Choice.Description>,
	ComponentProps<typeof Choice.Description>
>((props, ref) => (
	<Choice.Description ref={ref} data-slot="selectable-list-item-description" {...props} />
));
ItemDescription.displayName = "SelectableListItemDescription";

/**
 * The default row renderer: a title (and description, if present) from the
 * option. Used by a viewport when no render-prop child is supplied.
 */
function renderDefaultOption(option: SelectableListOption): ReactElement {
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
 * re-keyed by its option `value` so composed rows stay stable across filtering.
 *
 * Returns the rendered items alongside the `options` that produced them, in the
 * same order. Non-element render-prop results (e.g. a conditional `null`) are
 * skipped from *both* arrays, so `options[i]` always corresponds to the rendered
 * `items[i]` — and to the index the list primitive assigns that item (it derives
 * indices from the elements it renders via `Children.toArray`). The viewport
 * resolves activation, `itemId`, and disabled state by that index against
 * `options`, so keeping them aligned is what stops keyboard nav from toggling
 * or labeling the wrong option when a render-prop drops a row.
 */
function renderItems(
	filteredOptions: readonly SelectableListOption[],
	renderOption: (option: SelectableListOption) => ReactElement | null,
): { items: ReactNode[]; options: SelectableListOption[] } {
	const items: ReactNode[] = [];
	const options: SelectableListOption[] = [];
	for (const option of filteredOptions) {
		const item = renderOption(option);
		if (!isValidElement(item)) {
			continue;
		}
		items.push(cloneElement(item, { key: option.value }));
		options.push(option);
	}
	return { items, options };
}

/**
 * The shared body of `Viewport` / `VirtualViewport`: memoizes the rendered
 * items and the option array that stays index-aligned with them, plus the
 * index-based callbacks (`onActivate`, `itemId`, `isItemDisabled`) the list
 * primitive consumes. One implementation so the item/option alignment contract
 * keyboard navigation depends on exists once — and the callbacks are
 * identity-stable so the primitive's item-level render bail-outs hold across
 * unrelated re-renders.
 */
function useViewportItems(
	part: string,
	renderPropChild: ((option: SelectableListOption) => ReactElement | null) | undefined,
): {
	isEmpty: boolean;
	isItemDisabled: (index: number) => boolean;
	onActivate: (index: number) => void;
	itemId: (index: number) => string;
	items: ReactNode[];
} {
	const { filteredOptions, listId, toggle } = useSelectableListContext(part);
	const renderOption = renderPropChild ?? renderDefaultOption;
	// Memoized so a selection toggle (which leaves `filteredOptions` and the
	// renderer untouched) doesn't re-map + re-clone every row. A fresh inline
	// render-prop each render opts out of the memo — memoize it to keep the win.
	const { items, options: itemOptions } = useMemo(
		() => renderItems(filteredOptions, renderOption),
		[filteredOptions, renderOption],
	);
	const onActivate = useCallback(
		(index: number) => {
			const option = itemOptions[index];
			if (option != null) {
				toggle(option.value);
			}
		},
		[itemOptions, toggle],
	);
	const itemId = useCallback(
		(index: number) => {
			const option = itemOptions[index];
			return option != null ? controlIdFor(listId, option.value) : "";
		},
		[itemOptions, listId],
	);
	const isItemDisabled = useCallback(
		(index: number) => itemOptions[index]?.disabled === true,
		[itemOptions],
	);

	// Emptiness is measured by the rows that actually rendered, not the filtered
	// options: a render-prop that returns `null` for every match would otherwise
	// leave an empty, keyboard-focusable grid chrome mounted.
	return { isEmpty: items.length === 0, isItemDisabled, onActivate, itemId, items };
}

/**
 * Props for `SelectableList.Viewport`. Extends `<div>` props (the scroll
 * viewport) with an optional render-prop child for custom row layouts.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Viewport aria-label="Access keys" className="max-h-80" />
 * ```
 */
type SelectableListViewportProps = Omit<ComponentProps<"div">, "children"> & {
	/**
	 * Optional render-prop for custom row content, called per filtered option.
	 * Return a `SelectableList.Item` with your own layout, or `null` to skip
	 * the row. Non-element returns are dropped at runtime, so the type requires
	 * an element (or `null`) rather than any `ReactNode`. Defaults to a
	 * title + description row built from the option.
	 */
	children?: (option: SelectableListOption) => ReactElement | null;
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
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
		const { isEmpty, isItemDisabled, onActivate, itemId, items } = useViewportItems(
			"Viewport",
			children,
		);

		if (isEmpty) {
			return null;
		}

		return (
			<ListRoot
				ref={ref}
				data-slot="selectable-list-viewport"
				semantics="grid"
				{...props}
				aria-multiselectable
				isItemDisabled={isItemDisabled}
				onActivate={onActivate}
				itemId={itemId}
			>
				{items}
			</ListRoot>
		);
	},
);
Viewport.displayName = "SelectableListViewport";

/**
 * Props for `SelectableList.VirtualViewport` — the `Viewport` props plus the
 * virtualizer knobs.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.VirtualViewport aria-label="Access keys" className="max-h-80" estimateItemHeight={44} />
 * ```
 */
type SelectableListVirtualViewportProps = SelectableListViewportProps & {
	/** Estimated item height in px, used to seed the virtualizer before items are measured. */
	estimateItemHeight?: number;
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
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
 *
 * @example
 * ```tsx
 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
 *   <SelectableList.Filter placeholder="Filter access keys…" />
 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
 *   <SelectableList.VirtualViewport aria-label="Access keys" className="max-h-80" />
 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
 * </SelectableList.Root>
 * ```
 */
const VirtualViewport = forwardRef<ComponentRef<"div">, SelectableListVirtualViewportProps>(
	({ children, ...props }, ref) => {
		const { isEmpty, isItemDisabled, onActivate, itemId, items } = useViewportItems(
			"VirtualViewport",
			children,
		);

		if (isEmpty) {
			return null;
		}

		return (
			<ListVirtualRoot
				ref={ref}
				data-slot="selectable-list-viewport"
				semantics="grid"
				{...props}
				aria-multiselectable
				isItemDisabled={isItemDisabled}
				onActivate={onActivate}
				itemId={itemId}
			>
				{items}
			</ListVirtualRoot>
		);
	},
);
VirtualViewport.displayName = "SelectableListVirtualViewport";

/**
 * Shown in place of the viewport when the active filter matches no options.
 * Renders its children (e.g. "No results found.") in muted, centered text.
 * It is a polite `role="status"` live region that stays mounted (visually
 * hidden while there are matches), so screen-reader users hear the message
 * when their filter empties the list instead of the grid silently vanishing.
 *
 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	({ children, className, ...props }, ref) => {
		const { filteredOptions } = useSelectableListContext("Empty");
		const isEmpty = filteredOptions.length === 0;

		return (
			// Always mounted: a live region only announces reliably when it exists in
			// the tree *before* its content changes. While options match, it renders
			// empty and `sr-only` (absolutely positioned, so it adds no layout gap).
			<div
				ref={ref}
				data-slot="selectable-list-empty"
				role="status"
				className={cx(
					!isEmpty && "sr-only",
					isEmpty &&
						"text-muted border-popover bg-popover flex items-center justify-center rounded-md border px-3 py-8 text-center text-sm",
					className,
				)}
				{...props}
			>
				{isEmpty ? children : null}
			</div>
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
const SelectableList = {
	/**
	 * Root: owns selection + filter state and the derived filtered options.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	 * The scrollable grid of rows (non-virtualized). Give it an `aria-label`;
	 * pass a render-prop child for a custom row layout, or omit it for the default.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	 * The windowed grid of rows — same surface as `Viewport`, for long lists.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.VirtualViewport aria-label="Access keys" className="max-h-80" />
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	VirtualViewport,
	/**
	 * A selectable grid row for custom viewport rendering. Reads its selection
	 * and disabled state from the list by `value`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80">
	 *     {(option) => (
	 *       <SelectableList.Item value={option.value}>
	 *         <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 *         <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 *       </SelectableList.Item>
	 *     )}
	 *   </SelectableList.Viewport>
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	Item,
	/**
	 * Emphasized title (`Choice.Label`) for a `SelectableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80">
	 *     {(option) => (
	 *       <SelectableList.Item value={option.value}>
	 *         <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 *         <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 *       </SelectableList.Item>
	 *     )}
	 *   </SelectableList.Viewport>
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	ItemTitle,
	/**
	 * De-emphasized sub-line (`Choice.Description`) for a `SelectableList.Item`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
	 *
	 * @example
	 * ```tsx
	 * <SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
	 *   <SelectableList.Filter placeholder="Filter access keys…" />
	 *   <SelectableList.SelectAll>Select all</SelectableList.SelectAll>
	 *   <SelectableList.Viewport aria-label="Access keys" className="max-h-80">
	 *     {(option) => (
	 *       <SelectableList.Item value={option.value}>
	 *         <SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
	 *         <SelectableList.ItemDescription>{option.description}</SelectableList.ItemDescription>
	 *       </SelectableList.Item>
	 *     )}
	 *   </SelectableList.Viewport>
	 *   <SelectableList.Empty>No access keys found.</SelectableList.Empty>
	 * </SelectableList.Root>
	 * ```
	 */
	ItemDescription,
	/**
	 * Shown when the filter matches no options — a polite `role="status"` live
	 * region, so the empty state is announced as the filter narrows.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/selectable-list
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
	optionLabelText,
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
