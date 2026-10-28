"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { XIcon } from "@phosphor-icons/react/X";
import type {
	ComponentProps,
	Dispatch,
	KeyboardEvent,
	ReactNode,
	RefObject,
	SetStateAction,
} from "react";
import {
	cloneElement,
	createContext,
	isValidElement,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	type FilterGrammar,
	type FilterSyntax,
	type RemoteFilterKeyDefinition,
	getFilterSyntax,
} from "../../utils/query-filter/grammar.js";
import {
	type HighlightSegment,
	type HighlightSegmentKind,
	getHighlightSegments,
} from "../../utils/query-filter/highlight.js";
import {
	type FilterSuggestion,
	type FilterSuggestionSection,
	type FilterSuggestions,
	getFilterSuggestions,
} from "../../utils/query-filter/suggestions.js";
import { IconButton } from "../button/icon-button.js";
import { Code } from "../code/code.js";
import { FieldControlContext, type FieldControlAriaProps } from "../field/field-context.js";
import type { WithValidation } from "../field/validation.js";
import { Input as InputShell, InputCapture } from "../input/input.js";
import { Kbd } from "../kbd/kbd.js";
import { Popover } from "../popover/popover.js";
import { Slot } from "../slot/index.js";
import { Tooltip, TooltipProvider } from "../tooltip/tooltip.js";

/** Headings for the suggestion groups. */
const sectionHeadings = {
	filters: "Filter by",
	exclusions: "Exclude",
	values: "Values",
} as const satisfies Record<FilterSuggestionSection, string>;

/**
 * Text color per highlighted run of the query. Keys, values, and operators
 * default to the `CodeBlock` colors for attributes, strings, and operators,
 * so a query reads like the code on the same page.
 */
const segmentClassNames = {
	key: "text-(--query-key-color,var(--shiki-token-attribute))",
	value: "text-(--query-value-color,var(--shiki-token-string))",
	invalid: "text-danger-600 underline decoration-wavy underline-offset-4",
	text: "text-strong",
	operator: "text-(--query-operator-color,var(--shiki-token-operator))",
	syntax: "text-muted",
	plain: "",
} as const satisfies Record<HighlightSegmentKind, string>;

/**
 * The state `Query.Root` shares with its parts. It holds no `Item`
 * type: `Root` closes over the grammar and the items, so the parts need no
 * type argument.
 */
type QueryContextValue = {
	/** The query, exactly as typed. */
	value: string;
	/** The syntax the grammar honors. */
	syntax: FilterSyntax;
	/** The grammar's qualifier keys, without their client-side matchers. */
	keys: readonly RemoteFilterKeyDefinition[];
	/** The suggestion rows for the token under the caret. */
	suggestions: FilterSuggestions;
	/** The colored runs the field paints over its own text. */
	segments: HighlightSegment[];
	/** Whether the suggestion popover shows. */
	isListboxOpen: boolean;
	setIsOpen: (open: boolean) => void;
	/** Index of the row `aria-activedescendant` points at. */
	activeIndex: number | null;
	setActiveIndex: Dispatch<SetStateAction<number | null>>;
	/** Index of the row under the pointer. It is highlighted but not active. */
	hoveredIndex: number | null;
	setHoveredIndex: (index: number | null) => void;
	listboxId: string;
	/** The id of `Query.Footer`, which joins the `<input>`'s description while the list shows. */
	footerId: string;
	/** The id of the message that shows when no row matches. */
	emptyStateId: string;
	/** Handles a typed edit from the `<input>`. */
	reportTypedValue: (input: HTMLInputElement) => void;
	/** Records where the caret landed after anything that can move it. */
	syncCaret: (input: HTMLInputElement) => void;
	acceptSuggestion: (suggestion: FilterSuggestion) => void;
	/** Empties the query and moves focus back to the `<input>`. */
	clearValue: () => void;
	/** `Query.Content` calls this on mount. It returns the cleanup. */
	registerContent: () => () => void;
	/** Whether `Query.List` shows. Without it, Enter has no row to accept. */
	hasList: boolean;
	/** `Query.List` calls this on mount. It returns the cleanup. */
	registerList: () => () => void;
};

const QueryContext = createContext<QueryContextValue | null>(null);

/** The index of the row `Query.List` renders, so each `Query.Item` gets it without a scan. */
const QueryRowIndexContext = createContext<number | null>(null);

/** The elements `Query.Root` reads in its handlers. A separate context keeps refs out of the render state. */
type QueryRefs = {
	anchorRef: RefObject<HTMLDivElement | null>;
	contentRef: RefObject<HTMLDivElement | null>;
	inputRef: RefObject<HTMLInputElement | null>;
};

const QueryRefsContext = createContext<QueryRefs | null>(null);

function useQueryRefs(part: string) {
	const refs = useContext(QueryRefsContext);
	invariant(refs, `${part} must be rendered inside Query.Root.`);
	return refs;
}

function useQueryContext(part: string) {
	const context = useContext(QueryContext);
	invariant(context, `${part} must be rendered inside Query.Root.`);
	return context;
}

/**
 * Clears the props `Field.Control` clones onto `Query.Root`. They name the
 * `<input>`, which reads them from context; on the row they duplicate its `id`.
 */
const clearedFieldControlProps = {
	id: undefined,
	name: undefined,
	"aria-describedby": undefined,
	"aria-errormessage": undefined,
	"aria-invalid": undefined,
} as const satisfies Record<keyof FieldControlAriaProps, undefined>;

function optionId(listboxId: string, index: number) {
	return `${listboxId}-option-${index}`;
}

/**
 * The props for `Query.Root`.
 */
type QueryRootProps<Item extends object> = Omit<ComponentProps<"div">, "defaultValue"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The grammar of this surface's filter language. Declare it as a module
		 * constant: the engine caches its alias tables per grammar object.
		 */
		grammar: FilterGrammar<Item>;
		/**
		 * The unfiltered items, for the live match counts. Pass the same array the
		 * surface renders from. Omit when another system runs the query; the
		 * suggestions then carry no counts.
		 */
		items?: Item[];
		/** The query, exactly as typed. The caller owns it; there is no uncontrolled form. */
		value: string;
		/** Called with the whole query on every edit, typed or inserted. */
		onValueChange: (value: string) => void;
	};

/**
 * The row and the state owner of a query input. It renders a `div` that lays
 * out the field and any actions in one row, and it owns the caret, the open
 * state, and the active suggestion.
 *
 * @see https://mantle.ngrok.com/components/forms/query#queryroot
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
function Root<Item extends object>({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	grammar,
	items,
	onValueChange,
	value,
	...props
}: QueryRootProps<Item>) {
	const anchorRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	// The value the last typed edit reported. `reportInsertedText` reads it to report an edit once.
	const reportedValueRef = useRef<string | null>(null);

	const [caretIndex, setCaretIndex] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	// No option is active until an arrow key makes one active. The list is
	// already live-filtered, so Enter on a passive list only dismisses it.
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// The pointer only highlights a row. A pointer at rest over the list must
	// not arm Enter, or Enter inserts that row instead of submitting the query.
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [hasContent, setHasContent] = useState(false);
	const [hasList, setHasList] = useState(false);
	const fieldControl = useContext(FieldControlContext);

	// The value the field last reported. A `value` that differs came from the
	// caller, such as a clear button: the old active row and caret no longer apply.
	const [reportedValue, setReportedValue] = useState(value);
	if (value !== reportedValue) {
		setReportedValue(value);
		setActiveIndex(null);
		setCaretIndex(value.length);
	}

	// New items rebuild the suggestions, so the active index can name another
	// row. Enter must never accept a row the user did not pick.
	const [suggestedItems, setSuggestedItems] = useState(items);
	if (items !== suggestedItems) {
		setSuggestedItems(items);
		setActiveIndex(null);
		setHoveredIndex(null);
	}

	const listboxId = useId();
	const refs = useMemo(() => ({ anchorRef, contentRef, inputRef }), []);

	// A closed list keeps no active or hovered row, so a reopened list starts
	// passive and Enter cannot accept a row the user did not pick again.
	const setOpen = useCallback((open: boolean) => {
		setIsOpen(open);
		if (!open) {
			setActiveIndex(null);
			setHoveredIndex(null);
		}
	}, []);

	const registerContent = useCallback(() => {
		setHasContent(true);
		return () => setHasContent(false);
	}, []);

	const registerList = useCallback(() => {
		setHasList(true);
		return () => setHasList(false);
	}, []);

	const context = useMemo((): QueryContextValue => {
		const suggestions = getFilterSuggestions({ grammar, query: value, caretIndex, items });

		/**
		 * A moved caret rebuilds the suggestions, so it also retires the active
		 * option: Enter must never accept a row from a list the user did not see.
		 * The retirement is conditional because React replays `select` on keydown,
		 * and an unconditional reset would wipe the arrow keys' own activation.
		 */
		function syncCaret(input: HTMLInputElement) {
			const nextCaretIndex = input.selectionStart ?? input.value.length;
			if (nextCaretIndex !== caretIndex) {
				setActiveIndex(null);
			}
			setCaretIndex(nextCaretIndex);
		}

		/**
		 * Reports text that `setRangeText` wrote, once. In a browser,
		 * `setRangeText` skips React's value tracker, so React drops the next edit
		 * that brings the input back to the tracked value. The `input` event makes
		 * React read the new value. When the tracker already has the value, as in
		 * happy-dom, React ignores the event, and this function reports the value.
		 */
		function reportInsertedText(input: HTMLInputElement) {
			reportedValueRef.current = null;
			input.dispatchEvent(new Event("input", { bubbles: true }));
			if (reportedValueRef.current !== input.value) {
				setReportedValue(input.value);
				onValueChange(input.value);
			}
			syncCaret(input);
			setActiveIndex(null);
		}

		return {
			value,
			syntax: getFilterSyntax(grammar),
			keys: grammar.keys,
			suggestions,
			segments: getHighlightSegments(grammar, value),
			// With no rows, the popover stays open: its empty state and the footer
			// still tell the user what to type next.
			isListboxOpen: isOpen && hasContent,
			setIsOpen: setOpen,
			activeIndex,
			setActiveIndex,
			hoveredIndex,
			setHoveredIndex,
			listboxId,
			footerId: `${listboxId}-footer`,
			emptyStateId: `${listboxId}-empty`,
			syncCaret,
			reportTypedValue: (input) => {
				reportedValueRef.current = input.value;
				setReportedValue(input.value);
				onValueChange(input.value);
				syncCaret(input);
				setActiveIndex(null);
				setHoveredIndex(null);
				setIsOpen(true);
			},
			acceptSuggestion: (suggestion) => {
				const input = inputRef.current;
				if (input == null) {
					return;
				}

				// Why `setRangeText`: it keeps the browser's undo stack, which a value write clears.
				input.setRangeText(
					suggestion.insertText,
					suggestions.replaceStart,
					suggestions.replaceEnd,
					"end",
				);

				// Why an explicit caret: DOM runtimes do not apply `selectionMode` the same way.
				const caret = suggestions.replaceStart + suggestion.insertText.length;
				input.setSelectionRange(caret, caret);

				// A finished filter gets a trailing space, so the next token starts clean.
				// A bare `key:` keeps the caret at the colon, ready for its value.
				const nextCharacter = input.value.charAt(caret);
				if (suggestion.completes && nextCharacter !== " " && nextCharacter !== ",") {
					input.setRangeText(" ", caret, caret, "end");
					input.setSelectionRange(caret + 1, caret + 1);
				}

				reportInsertedText(input);
				input.focus();
			},
			clearValue: () => {
				onValueChange("");
				// The clear button unmounts with the text, so focus goes back to the field.
				inputRef.current?.focus();
			},
			registerContent,
			hasList,
			registerList,
		};
	}, [
		activeIndex,
		caretIndex,
		grammar,
		hasContent,
		hasList,
		hoveredIndex,
		isOpen,
		items,
		listboxId,
		onValueChange,
		registerContent,
		registerList,
		setOpen,
		value,
	]);

	const Comp = asChild ? Slot : "div";

	return (
		<QueryRefsContext.Provider value={refs}>
			<QueryContext.Provider value={context}>
				<Popover.Root open={context.isListboxOpen} onOpenChange={setOpen}>
					<Comp
						data-slot={joinDataSlot(dataSlot, "query")}
						className={cx("flex w-full items-center gap-2", className)}
						{...props}
						{...(fieldControl == null ? {} : clearedFieldControlProps)}
					>
						{children}
					</Comp>
				</Popover.Root>
			</QueryContext.Provider>
		</QueryRefsContext.Provider>
	);
}

/**
 * The props for `Query.Input`.
 */
type QueryInputProps = Omit<
	ComponentProps<"input">,
	| "aria-activedescendant"
	| "aria-autocomplete"
	| "aria-controls"
	| "aria-expanded"
	| "autoComplete"
	| "children"
	| "defaultValue"
	| "list"
	| "multiple"
	| "onChange"
	| "placeholder"
	| "role"
	| "type"
	| "value"
> &
	WithValidation &
	WithDataSlot & {
		/**
		 * Inline actions inside the field at its right edge, before the clear
		 * button. Pass ghost `xs` icon buttons.
		 */
		children?: ReactNode;
		/**
		 * The accessible name and tooltip of the clear button.
		 *
		 * @default "Clear filter"
		 */
		clearLabel?: string;
		/**
		 * Called after the clear button empties the query. Use it for work that
		 * only a clear does, such as applying the empty query at once.
		 */
		onClear?: () => void;
		/** Placeholder copy. Name one example filter the grammar accepts. Required on purpose. */
		placeholder: string;
		/**
		 * Whether focus alone opens the suggestions. Set `false` when the host
		 * moves focus into the field for the user, as on a dialog open. The list
		 * then waits for a click, a keystroke, or an arrow key.
		 *
		 * @default true
		 */
		suggestOnFocus?: boolean;
	};

/**
 * The query field: a real `<input role="combobox">` painted over by a colored
 * copy of its own text, with a leading magnifier. The caret, the selection,
 * IME composition, paste, and undo stay native, because the text the user
 * edits is a plain `<input>`, not a contenteditable.
 *
 * `className` and `style` go to the field's outer element, as on `Input`.
 * All other props, such as `ref`, `id`, `name`, `disabled`, `required`,
 * `readOnly`, the `aria-*` props, and the event handlers, go to the
 * `<input>`. A disabled or read-only field shows no suggestions. Inside
 * `Field.Item`, the field reads its `id`, `name`, `aria-describedby`,
 * `aria-errormessage`, and `aria-invalid` from `Field.Control`. While the
 * suggestions show, `Query.Footer` joins the `<input>`'s description.
 *
 * While the query has text and the field is editable, a clear button shows
 * at the right edge. It empties the query and moves focus back to the field.
 * Children render after the text as inline actions, before the clear button,
 * in a `[data-slot="query-input-actions"]` wrapper with `display: contents`.
 * The clear button sits after that wrapper, not inside it.
 *
 * **CSS variables:**
 *
 * | CSS Variable             | Default                        | Description                     |
 * | ------------------------ | ------------------------------ | ------------------------------- |
 * | `--query-key-color`      | `var(--shiki-token-attribute)` | The color of a qualifier key.   |
 * | `--query-value-color`    | `var(--shiki-token-string)`    | The color of a qualifier value. |
 * | `--query-operator-color` | `var(--shiki-token-operator)`  | The color of `OR` and `AND`.    |
 *
 * **Data attributes:**
 *
 * | Attribute         | Value                                  | Description                                  |
 * | ----------------- | -------------------------------------- | -------------------------------------------- |
 * | `data-slot`       | `"query-input"`                        | On the field's outer element.                |
 * | `data-slot`       | `"query-input-actions"`                | On the `span` that wraps the children.       |
 * | `data-slot`       | `"input"`                              | On the field's chrome, as on `Input`.        |
 * | `data-disabled`   | present                                | On the chrome while the field is disabled.   |
 * | `data-validation` | `"error"` \| `"success"` \| `"warning"` | On the chrome. Omitted when unset.           |
 *
 * @see https://mantle.ngrok.com/components/forms/query#queryinput
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
// Why no asChild: the field renders the anchor, the shell, the painted copy,
// and the `<input>` together, so there is no single element to swap.
function Input({
	"aria-describedby": describedBy,
	"aria-errormessage": errorMessage,
	"aria-invalid": invalid,
	"data-slot": dataSlot,
	children,
	className,
	clearLabel = "Clear filter",
	disabled,
	id,
	name,
	onBlur,
	onClear,
	onClick,
	onFocus,
	onKeyDown,
	onScroll,
	onSelect,
	placeholder,
	readOnly,
	ref,
	style,
	suggestOnFocus = true,
	...props
}: QueryInputProps) {
	const context = useQueryContext("Query.Input");
	const { anchorRef, contentRef, inputRef } = useQueryRefs("Query.Input");
	const fieldControl = useContext(FieldControlContext);
	const overlayRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(ref, inputRef);

	// Field.Item owns the id, name, and ARIA wiring, as it does for `Select.Trigger`,
	// so a prop on the input cannot drop the field's description or error.
	const ownDescription = fieldControl ? fieldControl["aria-describedby"] : describedBy;
	const hasNoRows = context.suggestions.items.length === 0;
	const describedByIds = [
		ownDescription,
		context.isListboxOpen && hasNoRows ? context.emptyStateId : undefined,
		context.isListboxOpen ? context.footerId : undefined,
	]
		.filter((value) => value != null && value !== "")
		.join(" ");

	// A field the user cannot edit offers no edits.
	const canSuggest = !disabled && !readOnly;
	const canClear = canSuggest && context.value !== "";

	// Why an effect: `disabled` and `readOnly` are props of this part, and the
	// open state lives in `Root`. A field that turns read-only must not keep a
	// list whose rows still edit the query.
	const { setIsOpen } = context;
	useEffect(() => {
		if (!canSuggest) {
			setIsOpen(false);
		}
	}, [canSuggest, setIsOpen]);

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		onKeyDown?.(event);
		// An IME owns these keys while it composes: Enter commits a candidate and
		// the arrows move through candidates.
		if (event.defaultPrevented || !canSuggest || event.nativeEvent.isComposing) {
			return;
		}

		if (event.key === "Escape") {
			context.setIsOpen(false);
			return;
		}

		const rowCount = context.suggestions.items.length;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			// With no rows, an arrow key still opens the empty state.
			if (rowCount === 0) {
				context.setIsOpen(true);
				return;
			}
			event.preventDefault();
			context.setIsOpen(true);
			context.setHoveredIndex(null);
			const lastIndex = rowCount - 1;
			if (event.key === "ArrowDown") {
				context.setActiveIndex((current) =>
					current == null || current === lastIndex ? 0 : current + 1,
				);
			} else {
				context.setActiveIndex((current) =>
					current == null || current === 0 ? lastIndex : current - 1,
				);
			}
			return;
		}

		if (event.key === "Enter" && context.isListboxOpen) {
			// Without `Query.List`, the active row is not on screen, so Enter cannot accept it.
			const activeItem =
				!context.hasList || context.activeIndex == null
					? undefined
					: context.suggestions.items[context.activeIndex];
			if (activeItem != null) {
				event.preventDefault();
				context.acceptSuggestion(activeItem);
				return;
			}
			// Enter on a passive list closes it and leaves the query alone. The
			// event keeps going, so a hosting form still submits.
			context.setIsOpen(false);
		}
	}

	return (
		<Popover.Anchor
			ref={anchorRef}
			data-slot={joinDataSlot(dataSlot, "query-input")}
			className={cx("min-w-0 flex-1", className)}
			style={style}
		>
			{/* Why the input props go to `InputShell` (mantle's `Input`): it hands them to `InputCapture`
			    and also stamps its own chrome, such as `data-disabled` and the
			    validation border, from them. */}
			<InputShell
				autoCapitalize="off"
				{...props}
				aria-invalid={fieldControl ? fieldControl["aria-invalid"] : invalid}
				autoComplete="off"
				disabled={disabled}
				name={fieldControl ? fieldControl.name : name}
				placeholder={placeholder}
				readOnly={readOnly}
				// A trailing inline action sits as far from the right edge as from the top and bottom.
				className="has-[>button:last-child]:pe-1.25 has-[>[data-slot=query-input-actions]:last-child>button:last-child]:pe-1.25"
			>
				<MagnifyingGlassIcon aria-hidden />
				{/* One box for the input and its painted copy, so the copy ends where
				    the input ends, before any inline action. */}
				<div className="relative flex min-w-0 flex-1 self-stretch">
					{/* The painted copy covers the input, whose own text is transparent.
					    It spans the shell's `py-2` too, so its clip keeps the wavy
					    underline on an invalid token. A translated copy would drift out
					    of line with the caret, so it is `translate="no"`. */}
					<div
						aria-hidden
						translate="no"
						ref={overlayRef}
						className="pointer-events-none absolute inset-x-0 -inset-y-2 flex items-center overflow-hidden"
					>
						<span className="whitespace-pre">
							{context.segments.map((segment) => (
								<span key={segment.start} className={segmentClassNames[segment.kind]}>
									{segment.text}
								</span>
							))}
						</span>
					</div>
					<InputCapture
						ref={composedRef}
						id={fieldControl ? fieldControl.id : id}
						role="combobox"
						aria-autocomplete="list"
						aria-controls={context.hasList ? context.listboxId : undefined}
						aria-expanded={context.isListboxOpen}
						aria-activedescendant={
							context.isListboxOpen && context.hasList && context.activeIndex != null
								? optionId(context.listboxId, context.activeIndex)
								: undefined
						}
						aria-describedby={describedByIds === "" ? undefined : describedByIds}
						aria-errormessage={fieldControl ? fieldControl["aria-errormessage"] : errorMessage}
						className="caret-(--text-color-strong) text-transparent"
						value={context.value}
						onChange={(event) => context.reportTypedValue(event.target)}
						onSelect={(event) => {
							onSelect?.(event);
							context.syncCaret(event.currentTarget);
						}}
						onFocus={(event) => {
							onFocus?.(event);
							context.setIsOpen(suggestOnFocus && canSuggest);
						}}
						onClick={(event) => {
							onClick?.(event);
							context.setIsOpen(canSuggest);
						}}
						onBlur={(event) => {
							onBlur?.(event);
							// Focus that moves into the popover, such as a press on a
							// footer link, keeps the list open, or the link unmounts
							// before its click. Radix closes the list when focus leaves it.
							const target = event.relatedTarget;
							if (event.defaultPrevented || contentRef.current?.contains(target) === true) {
								return;
							}
							context.setIsOpen(false);
						}}
						onKeyDown={handleKeyDown}
						onScroll={(event) => {
							onScroll?.(event);
							const overlay = overlayRef.current;
							if (overlay != null) {
								overlay.scrollLeft = event.currentTarget.scrollLeft;
							}
						}}
					/>
				</div>
				{/* Why the clear button sits outside the wrapper: the consumer's
				    children need a host node of their own, or the button's mount
				    lands beside a text node that a translation engine reparented. */}
				{children != null && (
					<span data-slot="query-input-actions" className="contents">
						{children}
					</span>
				)}
				{canClear && (
					<ClearButton
						label={clearLabel}
						onClear={() => {
							context.clearValue();
							onClear?.();
						}}
					/>
				)}
			</InputShell>
		</Popover.Anchor>
	);
}

/**
 * The clear button at the right edge of the field. It shows only while the
 * query has text.
 */
function ClearButton({ label, onClear }: { label: string; onClear: () => void }) {
	// Why a local provider: Radix throws for a tooltip with no provider above it,
	// and the field must not ask the app to mount one.
	return (
		<TooltipProvider>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						size="xs"
						label={label}
						icon={<XIcon />}
						// Keep focus in the input, so a click does not close the suggestions.
						onMouseDown={(event) => event.preventDefault()}
						onClick={onClear}
					/>
				</Tooltip.Trigger>
				<Tooltip.Content>{label}</Tooltip.Content>
			</Tooltip.Root>
		</TooltipProvider>
	);
}

/**
 * The props for `Query.Content`.
 */
type QueryContentProps = Omit<
	ComponentProps<typeof Popover.Content>,
	// The part owns these: focus stays in the input, and the listbox inside is the popup.
	| "align"
	| "asChild"
	| "children"
	| "onCloseAutoFocus"
	| "onInteractOutside"
	| "onOpenAutoFocus"
	| "preferredWidth"
	| "role"
> &
	WithDataSlot & {
		/** The parts of the popover: `Query.List`, `Query.Empty`, and `Query.Footer`. */
		children: ReactNode;
	};

/**
 * The suggestion popover. It holds the parts you compose into it, and it
 * keeps focus in the field: the active row is announced through
 * `aria-activedescendant`. It accepts the `Popover.Content` props except the
 * ones it owns.
 *
 * **Data attributes:**
 *
 * | Attribute    | Value                  | Description                                 |
 * | ------------ | ---------------------- | ------------------------------------------- |
 * | `data-slot`  | `"query-content"`      | On the popover, beside `"popover-content"`. |
 * | `data-state` | `"open"` \| `"closed"` | On the popover, from Radix.                 |
 * | `data-side`  | `"top"` \| `"bottom"`  | On the popover: the side it opened on.      |
 * | `data-align` | `"start"`              | On the popover.                             |
 *
 * @see https://mantle.ngrok.com/components/forms/query#querycontent
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
// Why no asChild: the part wraps `Popover.Content`, whose element Radix positions.
function Content({ "data-slot": dataSlot, children, className, ref, ...props }: QueryContentProps) {
	const context = useQueryContext("Query.Content");
	const { anchorRef, contentRef } = useQueryRefs("Query.Content");
	const composedRef = useComposedRefs(ref, contentRef);
	const { registerContent } = context;

	// Why an effect: `Content` is a later sibling of `Input`, so the render pass
	// cannot hand its presence to the `<input>`'s `aria-expanded`. The server
	// renders the popover closed, so the first paint is the same.
	useIsomorphicLayoutEffect(registerContent, [registerContent]);

	return (
		<Popover.Content
			{...props}
			ref={composedRef}
			data-slot={joinDataSlot(dataSlot, "query-content")}
			align="start"
			className={cx("w-(--radix-popover-trigger-width) p-1", className)}
			preferredWidth="max-w-none"
			// Why presentation: the popup is the listbox inside, which the `<input>`
			// controls. Radix's default `role="dialog"` adds an unnamed dialog around it.
			role="presentation"
			// Focus never leaves the input: the active option is announced through
			// `aria-activedescendant` instead.
			onOpenAutoFocus={(event) => event.preventDefault()}
			onCloseAutoFocus={(event) => event.preventDefault()}
			onInteractOutside={(event) => {
				// The input sits outside the popover, so Radix reads a click into it
				// as an outside interaction. Radix reports a mouse press after the
				// click, so the clear button can be gone by then: a detached target
				// is a control that the press itself removed.
				const target = event.detail.originalEvent.target;
				if (
					target instanceof Node &&
					(!target.isConnected || anchorRef.current?.contains(target) === true)
				) {
					event.preventDefault();
				}
			}}
		>
			{children}
		</Popover.Content>
	);
}

/**
 * The props for `Query.List`.
 */
type QueryListProps = Omit<ComponentProps<"div">, "children" | "id" | "role"> &
	WithDataSlot & {
		/**
		 * Renders one suggestion. Return a `Query.Item` for it, and do not skip a
		 * suggestion: the arrow keys move through every one. The list calls it for
		 * each suggestion under the caret, in order.
		 */
		children: (suggestion: FilterSuggestion) => ReactNode;
	};

/**
 * The suggestion listbox for the token under the caret. It groups the rows
 * under "Filter by", "Exclude", and "Values", and it scrolls when the rows
 * do not fit. `aria-label` names the listbox and defaults to
 * `"Filter suggestions"`.
 *
 * **Data attributes:**
 *
 * | Attribute   | Value          | Description          |
 * | ----------- | -------------- | -------------------- |
 * | `data-slot` | `"query-list"` | On the listbox.      |
 *
 * @see https://mantle.ngrok.com/components/forms/query#querylist
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
// Why no asChild: the part renders the section groups and their headings itself.
function List({ "data-slot": dataSlot, children, className, ...props }: QueryListProps) {
	const context = useQueryContext("Query.List");
	const { registerList } = context;

	// Why an effect: the `<input>` is an earlier sibling, so the render pass
	// cannot tell it that the rows exist.
	useIsomorphicLayoutEffect(registerList, [registerList]);

	const rowsBySection = new Map<
		FilterSuggestionSection,
		{ suggestion: FilterSuggestion; index: number }[]
	>();
	for (const [index, suggestion] of context.suggestions.items.entries()) {
		const rows = rowsBySection.get(suggestion.section) ?? [];
		rows.push({ suggestion, index });
		rowsBySection.set(suggestion.section, rows);
	}

	return (
		<div
			role="listbox"
			aria-label="Filter suggestions"
			{...props}
			id={context.listboxId}
			data-slot={joinDataSlot(dataSlot, "query-list")}
			className={cx("max-h-72 overflow-y-auto", className)}
		>
			{[...rowsBySection].map(([section, rows]) => (
				<div key={section} role="group" aria-label={sectionHeadings[section]}>
					<span aria-hidden className="text-muted block px-2 pt-2 pb-1 text-xs font-medium">
						{sectionHeadings[section]}
					</span>
					{rows.map(({ suggestion, index }) => (
						<QueryRowIndexContext.Provider key={suggestion.label} value={index}>
							{children(suggestion)}
						</QueryRowIndexContext.Provider>
					))}
				</div>
			))}
		</div>
	);
}

/**
 * Keeps the active option visible inside the scrolling listbox. Focus stays on
 * the input, so the browser never scrolls the option into view on its own.
 */
function scrollActiveOptionIntoView(element: HTMLDivElement | null) {
	element?.scrollIntoView({ block: "nearest" });
}

/**
 * The props for `Query.Item`.
 */
type QueryItemProps = Omit<ComponentProps<"div">, "aria-selected" | "id" | "role" | "tabIndex"> &
	WithDataSlot & {
		/** The suggestion this row inserts. Pass the one `Query.List` hands its render function. */
		suggestion: FilterSuggestion;
		/**
		 * The row's content. When omitted, the row shows the suggestion's label,
		 * its description, and its match count.
		 */
		children?: ReactNode;
	};

/**
 * One suggestion row: a `role="option"` that inserts its suggestion on a
 * click. The arrow keys in the field make a row active, and Enter inserts it.
 * A click keeps focus and the caret in the field.
 *
 * **Data attributes:**
 *
 * | Attribute          | Value          | Description                                                       |
 * | ------------------ | -------------- | ----------------------------------------------------------------- |
 * | `data-slot`        | `"query-item"` | On the option.                                                    |
 * | `data-highlighted` | present        | While the row is active, or under the pointer with no active row. |
 *
 * @see https://mantle.ngrok.com/components/forms/query#queryitem
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
// Why no asChild: the input names the row through `aria-activedescendant`, so the row stays an option.
function Item({
	"data-slot": dataSlot,
	children,
	className,
	onClick,
	onMouseDown,
	onMouseLeave,
	onMouseMove,
	ref,
	suggestion,
	...props
}: QueryItemProps) {
	const context = useQueryContext("Query.Item");
	const index = useContext(QueryRowIndexContext);
	invariant(
		index != null && context.suggestions.items[index] === suggestion,
		"Query.Item takes a suggestion from the Query.List render function.",
	);
	const isActive = index === context.activeIndex;
	// The scroll ref attaches only while the row is active, so activation scrolls it into view.
	const composedRef = useComposedRefs(ref, isActive ? scrollActiveOptionIntoView : null);
	const isHighlighted = isActive || (context.activeIndex == null && index === context.hoveredIndex);

	return (
		// Why the rule is off: the keyboard contract of an `aria-activedescendant`
		// combobox lives on the input, which keeps focus for the whole widget.
		// oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- the combobox input owns the keyboard contract
		<div
			{...props}
			ref={composedRef}
			role="option"
			id={optionId(context.listboxId, index)}
			tabIndex={-1}
			aria-selected={isActive}
			data-highlighted={isHighlighted ? "" : undefined}
			data-slot={joinDataSlot(dataSlot, "query-item")}
			className={cx(
				"data-highlighted:bg-accent-500/10 flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded px-2 py-1.5 text-sm",
				className,
			)}
			onMouseDown={(event) => {
				onMouseDown?.(event);
				// Keep focus in the input, so the caret never jumps on a click.
				event.preventDefault();
			}}
			onMouseMove={(event) => {
				onMouseMove?.(event);
				if (!event.defaultPrevented) {
					context.setHoveredIndex(index);
				}
			}}
			onMouseLeave={(event) => {
				onMouseLeave?.(event);
				if (!event.defaultPrevented) {
					context.setHoveredIndex(null);
				}
			}}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					context.acceptSuggestion(suggestion);
				}
			}}
		>
			{children ?? (
				<>
					<span translate="no" className="text-strong font-mono">
						{suggestion.label}
					</span>
					{suggestion.description != null && (
						<span className="text-muted text-xs">{suggestion.description}</span>
					)}
					{suggestion.matchCount != null && (
						<span className="text-muted ml-auto text-xs tabular-nums">{suggestion.matchCount}</span>
					)}
				</>
			)}
		</div>
	);
}

/**
 * The props for `Query.Empty`.
 */
type QueryEmptyProps = Omit<ComponentProps<"div">, "id"> &
	WithDataSlot & {
		/**
		 * The message. When omitted, the part says what the field accepts at the
		 * caret, from the grammar.
		 */
		children?: ReactNode;
	};

/**
 * The message that shows in place of the rows when no suggestion matches. The
 * popover stays open, so a free-text value or a typo does not leave the user
 * with only the legend. While it shows, it joins the `<input>`'s description.
 *
 * **Data attributes:**
 *
 * | Attribute   | Value           | Description      |
 * | ----------- | --------------- | ---------------- |
 * | `data-slot` | `"query-empty"` | On the message.  |
 *
 * @see https://mantle.ngrok.com/components/forms/query#queryempty
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
// Why no asChild: the default message is a choice of elements, so there is no single child to merge onto.
function Empty({ "data-slot": dataSlot, children, className, ...props }: QueryEmptyProps) {
	const context = useQueryContext("Query.Empty");
	if (context.suggestions.items.length > 0) {
		return null;
	}

	return (
		<div
			{...props}
			id={context.emptyStateId}
			data-slot={joinDataSlot(dataSlot, "query-empty")}
			className={cx("text-body px-2 py-3 text-sm", className)}
		>
			{children ?? (
				<EmptyMessage
					keys={context.keys}
					syntax={context.syntax}
					valueKey={context.suggestions.key}
				/>
			)}
		</div>
	);
}

/** What the field accepts at the caret, from the grammar. */
function EmptyMessage({
	keys,
	syntax,
	valueKey,
}: {
	keys: readonly RemoteFilterKeyDefinition[];
	syntax: FilterSyntax;
	valueKey: string | undefined;
}) {
	const definition = keys.find((candidate) => candidate.key === valueKey);

	// Each case is its own keyed `<p>`, so a switch replaces a whole element
	// and never a text node that a translation engine rewrote.
	// A conjunction executor reads no free text, so the words cannot search.
	if (definition == null && syntax === "conjunction") {
		return (
			<p key="qualifiers-only">No filter matches. This search reads only key:value filters.</p>
		);
	}
	if (definition == null) {
		return <p key="text">No filter matches. The words search as text.</p>;
	}
	if (definition.values == null) {
		return (
			<p key="free-value">
				<SyntaxRule token={`${definition.key}:`}>
					{definition.description == null
						? "Any text matches."
						: `${definition.description}. Any text matches.`}
				</SyntaxRule>
			</p>
		);
	}
	return (
		<p key="listed-value">
			<span>No value matches. Delete the value after</span>{" "}
			<Code className="text-xs">{definition.key}:</Code> <span>to see all values.</span>
		</p>
	);
}

/**
 * The props for `Query.Footer`.
 */
type QueryFooterProps = Omit<ComponentProps<"div">, "id"> & WithAsChild & WithDataSlot;

/**
 * The area under the rows, pinned while the rows scroll. Compose
 * `Query.Legend`, `Query.KeyboardHints`, and your own content, such as a link
 * to the filter docs. While the popover is open, the footer joins the
 * `<input>`'s description. With `asChild`, the footer replaces the child's `id`
 * with its own, so the description keeps its link.
 *
 * **Data attributes:**
 *
 * | Attribute   | Value            | Description     |
 * | ----------- | ---------------- | --------------- |
 * | `data-slot` | `"query-footer"` | On the footer.  |
 *
 * @see https://mantle.ngrok.com/components/forms/query#queryfooter
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
function Footer({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	...props
}: QueryFooterProps) {
	const context = useQueryContext("Query.Footer");
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			{...props}
			id={context.footerId}
			data-slot={joinDataSlot(dataSlot, "query-footer")}
			// It bleeds through the popover's `p-1`, so the border spans edge to edge.
			className={cx(
				"text-muted border-popover -mx-1 -mb-1 mt-1 flex flex-col gap-2 border-t px-3 py-2 text-xs",
				className,
			)}
		>
			{/* Why the clone: `Slot` lets the child's own `id` win, and the `<input>`'s
			description names the footer by this id. */}
			{asChild && isValidElement<{ id?: string }>(children)
				? cloneElement(children, { id: context.footerId })
				: children}
		</Comp>
	);
}

/**
 * The props for `Query.Legend`.
 */
type QueryLegendProps = Omit<ComponentProps<"p">, "children"> & WithDataSlot;

/**
 * The syntax reminder. It describes only what the grammar honors, so a
 * remote grammar never advertises an `OR` its executor refuses.
 *
 * **Data attributes:**
 *
 * | Attribute   | Value            | Description     |
 * | ----------- | ---------------- | --------------- |
 * | `data-slot` | `"query-legend"` | On the legend.  |
 *
 * @see https://mantle.ngrok.com/components/forms/query#querylegend
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
// Why no asChild: the part renders its rules from the grammar.
function Legend({ "data-slot": dataSlot, className, ...props }: QueryLegendProps) {
	const { keys, syntax } = useQueryContext("Query.Legend");
	const rowClassName = cx("flex flex-wrap items-center gap-x-4 gap-y-1.5", className);
	const slot = joinDataSlot(dataSlot, "query-legend");

	if (syntax === "qualifiers") {
		return (
			<p {...props} data-slot={slot} className={rowClassName}>
				<SyntaxRule token="key:value">narrows the search</SyntaxRule>{" "}
				<span>Other words search as text.</span>
			</p>
		);
	}

	const excludes = keys.some((definition) => definition.negatable !== false);
	const rules = [
		excludes && { token: "-key:value", text: "excludes" },
		{ token: "key:a,b", text: "matches either" },
		syntax === "full" && { token: "OR", text: "joins filters" },
		{ token: '"quotes"', text: "keep spaces" },
	].filter((rule) => rule !== false);

	// The space after each rule is whitespace text: the flex layout drops it, and
	// the accessible description keeps it, so assistive tech reads separate rules.
	// Each rule and its space share a wrapper, so no rule mounts in front of bare text.
	return (
		<p {...props} data-slot={slot} className={rowClassName}>
			{rules.map((rule) => (
				<span key={rule.token} className="contents">
					<SyntaxRule token={rule.token}>{rule.text}</SyntaxRule>{" "}
				</span>
			))}
		</p>
	);
}

/**
 * The props for `Query.KeyboardHints`.
 */
type QueryKeyboardHintsProps = Omit<ComponentProps<"p">, "children"> &
	WithDataSlot & {
		/**
		 * What Enter does. Name the host's own action when Enter submits a form,
		 * such as `"select, or search"`.
		 *
		 * @default "select"
		 */
		enterHint?: string;
	};

/**
 * The keys the field answers to: the arrows, Enter, and Escape.
 *
 * **Data attributes:**
 *
 * | Attribute   | Value                    | Description    |
 * | ----------- | ------------------------ | -------------- |
 * | `data-slot` | `"query-keyboard-hints"` | On the hints.  |
 *
 * @see https://mantle.ngrok.com/components/forms/query#querykeyboardhints
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
// Why no asChild: the part renders its own key chips.
function KeyboardHints({
	"data-slot": dataSlot,
	className,
	enterHint = "select",
	...props
}: QueryKeyboardHintsProps) {
	useQueryContext("Query.KeyboardHints");

	return (
		<p
			{...props}
			data-slot={joinDataSlot(dataSlot, "query-keyboard-hints")}
			className={cx("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}
		>
			<span className="inline-flex items-center gap-1">
				<Kbd>
					<span className="sr-only">Up arrow</span>
					<span aria-hidden>↑</span>
				</Kbd>
				<Kbd>
					<span className="sr-only">Down arrow</span>
					<span aria-hidden>↓</span>
				</Kbd>{" "}
				<span>pick a suggestion</span>
			</span>{" "}
			<span className="inline-flex items-center gap-1">
				<Kbd>
					<span className="sr-only">Enter</span>
					<span aria-hidden>↵</span>
				</Kbd>{" "}
				<span>{enterHint}</span>
			</span>{" "}
			<span className="inline-flex items-center gap-1">
				{/* The chip is square by default, which clips a three-letter key. */}
				<Kbd className="w-auto px-1">esc</Kbd> <span>close</span>
			</span>
		</p>
	);
}

/** One rule in the syntax legend: the token as code, then what it does. */
function SyntaxRule({ token, children }: { token: string; children: ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1.5">
			<Code className="text-xs">{token}</Code> <span>{children}</span>
		</span>
	);
}

/**
 * A single-line filter field where free text and `key:value` qualifiers
 * interleave. The tokens are colored in place, and a suggestion popover
 * completes keys and values while the caret stays in the field. The grammar from
 * `@ngrok/mantle/query-filter` decides the vocabulary.
 *
 * The typed string is the only state, and the caller owns it. Inside a
 * `<form>`, Enter submits the form unless it accepts an active suggestion.
 *
 * @useWhen Filter a list with a typed query of free text and `key:value` qualifiers.
 *
 * @siblings
 * - `Input`: a plain search box with no query language.
 * - `Combobox`: pick one value from a filtered list of options.
 * - `MultiSelect`: pick several values, shown as tags.
 * - `Command`: a palette that runs an action or navigates.
 *
 * @see https://mantle.ngrok.com/components/forms/query
 *
 * @example
 * Composition:
 * ```
 * Query.Root
 * ├── Query.Input
 * └── Query.Content
 *     ├── Query.List
 *     │   └── Query.Item
 *     ├── Query.Empty
 *     └── Query.Footer
 *         ├── Query.Legend
 *         └── Query.KeyboardHints
 * ```
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <Query.Content>
 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
 *     <Query.Empty />
 *     <Query.Footer>
 *       <Query.Legend />
 *       <Query.KeyboardHints />
 *     </Query.Footer>
 *   </Query.Content>
 * </Query.Root>
 * ```
 */
const Query = {
	/**
	 * The row and the state owner of a query input. It renders a `div` that lays
	 * out the field and any actions in one row, and it owns the caret, the open
	 * state, and the active suggestion.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#queryroot
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	Root,
	/**
	 * The query field: a real `<input role="combobox">` painted over by a colored
	 * copy of its own text, with a leading magnifier and a clear button.
	 * Children render after the text as inline actions.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#queryinput
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	Input,
	/**
	 * The suggestion popover. It holds the parts you compose into it, and it
	 * keeps focus in the field.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#querycontent
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	Content,
	/**
	 * The suggestion listbox for the token under the caret, grouped by section.
	 * Its children render one suggestion each.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#querylist
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	List,
	/**
	 * One suggestion row: a `role="option"` that inserts its suggestion on a click.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#queryitem
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	Item,
	/**
	 * The message that shows in place of the rows when no suggestion matches.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#queryempty
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	Empty,
	/**
	 * The area under the rows, pinned while the rows scroll.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#queryfooter
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	Footer,
	/**
	 * The syntax reminder. It describes only what the grammar honors.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#querylegend
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	Legend,
	/**
	 * The keys the field answers to: the arrows, Enter, and Escape.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query#querykeyboardhints
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <Query.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <Query.Input aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <Query.Content>
	 *     <Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
	 *     <Query.Empty />
	 *     <Query.Footer>
	 *       <Query.Legend />
	 *       <Query.KeyboardHints />
	 *     </Query.Footer>
	 *   </Query.Content>
	 * </Query.Root>
	 * ```
	 */
	KeyboardHints,
} as const;

export {
	//,
	Query,
};

export type {
	//,
	QueryContentProps,
	QueryEmptyProps,
	QueryFooterProps,
	QueryInputProps,
	QueryItemProps,
	QueryKeyboardHintsProps,
	QueryLegendProps,
	QueryListProps,
	QueryRootProps,
};
