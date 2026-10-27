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
import { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from "react";
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
import { Input, InputCapture } from "../input/input.js";
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
	key: "text-(--query-input-key-color,var(--shiki-token-attribute))",
	value: "text-(--query-input-value-color,var(--shiki-token-string))",
	invalid: "text-danger-600 underline decoration-wavy underline-offset-4",
	text: "text-strong",
	operator: "text-(--query-input-operator-color,var(--shiki-token-operator))",
	syntax: "text-muted",
	plain: "",
} as const satisfies Record<HighlightSegmentKind, string>;

/**
 * The state `QueryInput.Root` shares with its parts. It holds no `Item`
 * type: `Root` closes over the grammar and the items, so the parts need no
 * type argument.
 */
type QueryInputContextValue = {
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
	legendId: string;
	/** The id of the message that shows when no row matches. */
	emptyStateId: string;
	/** Handles a typed edit from the `<input>`. */
	reportTypedValue: (input: HTMLInputElement) => void;
	/** Records where the caret landed after anything that can move it. */
	syncCaret: (input: HTMLInputElement) => void;
	acceptSuggestion: (suggestion: FilterSuggestion) => void;
	/** Empties the query and moves focus back to the `<input>`. */
	clearValue: () => void;
	/** `QueryInput.Content` calls this on mount. It returns the cleanup. */
	registerContent: () => () => void;
};

const QueryInputContext = createContext<QueryInputContextValue | null>(null);

/** The elements `QueryInput.Root` reads in its handlers. A separate context keeps refs out of the render state. */
type QueryInputRefs = {
	anchorRef: RefObject<HTMLDivElement | null>;
	inputRef: RefObject<HTMLInputElement | null>;
};

const QueryInputRefsContext = createContext<QueryInputRefs | null>(null);

function useQueryInputRefs(part: string) {
	const refs = useContext(QueryInputRefsContext);
	invariant(refs, `${part} must be rendered inside QueryInput.Root.`);
	return refs;
}

function useQueryInputContext(part: string) {
	const context = useContext(QueryInputContext);
	invariant(context, `${part} must be rendered inside QueryInput.Root.`);
	return context;
}

/**
 * Clears the props `Field.Control` clones onto `QueryInput.Root`. They name the
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
 * The props for `QueryInput.Root`.
 */
type QueryInputRootProps<Item extends object> = Omit<ComponentProps<"div">, "defaultValue"> &
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
 * @see https://mantle.ngrok.com/components/forms/query-input#queryinputroot
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <QueryInput.Content />
 * </QueryInput.Root>
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
}: QueryInputRootProps<Item>) {
	const anchorRef = useRef<HTMLDivElement>(null);
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
	const fieldControl = useContext(FieldControlContext);

	// The value the field last reported. A `value` that differs came from the
	// caller, such as a clear button: the old active row and caret no longer apply.
	const [reportedValue, setReportedValue] = useState(value);
	if (value !== reportedValue) {
		setReportedValue(value);
		setActiveIndex(null);
		setCaretIndex(value.length);
	}

	const listboxId = useId();
	const refs = useMemo(() => ({ anchorRef, inputRef }), []);

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

	const context = useMemo((): QueryInputContextValue => {
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
			// With no rows, the popover stays open: its empty state and the legend
			// still tell the user what to type next.
			isListboxOpen: isOpen && hasContent,
			setIsOpen: setOpen,
			activeIndex,
			setActiveIndex,
			hoveredIndex,
			setHoveredIndex,
			listboxId,
			legendId: `${listboxId}-legend`,
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
		};
	}, [
		activeIndex,
		caretIndex,
		grammar,
		hasContent,
		hoveredIndex,
		isOpen,
		items,
		listboxId,
		onValueChange,
		registerContent,
		setOpen,
		value,
	]);

	const Comp = asChild ? Slot : "div";

	return (
		<QueryInputRefsContext.Provider value={refs}>
			<QueryInputContext.Provider value={context}>
				<Popover.Root open={context.isListboxOpen} onOpenChange={setOpen}>
					<Comp
						data-slot={joinDataSlot(dataSlot, "query-input")}
						className={cx("flex w-full items-center gap-2", className)}
						{...props}
						{...(fieldControl == null ? {} : clearedFieldControlProps)}
					>
						{children}
					</Comp>
				</Popover.Root>
			</QueryInputContext.Provider>
		</QueryInputRefsContext.Provider>
	);
}

/**
 * The props for `QueryInput.Field`.
 */
type QueryInputFieldProps = Omit<
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
 * suggestions show, the syntax legend joins the `<input>`'s description.
 *
 * While the query has text and the field is editable, a clear button shows
 * at the right edge. It empties the query and moves focus back to the field.
 * Children render after the text as inline actions, before the clear button,
 * in a `[data-slot="query-input-field-actions"]` wrapper with `display: contents`.
 *
 * **CSS variables:**
 *
 * | CSS Variable                   | Default                        | Description                     |
 * | ------------------------------ | ------------------------------ | ------------------------------- |
 * | `--query-input-key-color`      | `var(--shiki-token-attribute)` | The color of a qualifier key.   |
 * | `--query-input-value-color`    | `var(--shiki-token-string)`    | The color of a qualifier value. |
 * | `--query-input-operator-color` | `var(--shiki-token-operator)`  | The color of `OR` and `AND`.    |
 *
 * @see https://mantle.ngrok.com/components/forms/query-input#queryinputfield
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <QueryInput.Content />
 * </QueryInput.Root>
 * ```
 */
// Why no asChild: the field renders the anchor, the shell, the painted copy,
// and the `<input>` together, so there is no single element to swap.
function Field({
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
}: QueryInputFieldProps) {
	const context = useQueryInputContext("QueryInput.Field");
	const { anchorRef, inputRef } = useQueryInputRefs("QueryInput.Field");
	const fieldControl = useContext(FieldControlContext);
	const overlayRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(ref, inputRef);

	const ownDescription = describedBy ?? fieldControl?.["aria-describedby"];
	const hasNoRows = context.suggestions.items.length === 0;
	const describedByIds = [
		ownDescription,
		context.isListboxOpen && hasNoRows ? context.emptyStateId : undefined,
		context.isListboxOpen ? context.legendId : undefined,
	]
		.filter((value) => value != null && value !== "")
		.join(" ");

	// A field the user cannot edit offers no edits.
	const canSuggest = !disabled && !readOnly;
	const canClear = canSuggest && context.value !== "";

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
			const activeItem =
				context.activeIndex == null ? undefined : context.suggestions.items[context.activeIndex];
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
			data-slot={joinDataSlot(dataSlot, "query-input-field")}
			className={cx("min-w-0 flex-1", className)}
			style={style}
		>
			{/* Why the input props go to `Input`: it hands them to `InputCapture`
			    and also stamps its own chrome, such as `data-disabled` and the
			    validation border, from them. */}
			<Input
				autoCapitalize="off"
				{...props}
				aria-invalid={invalid ?? fieldControl?.["aria-invalid"]}
				autoComplete="off"
				disabled={disabled}
				name={name ?? fieldControl?.name}
				placeholder={placeholder}
				readOnly={readOnly}
				// A trailing inline action sits as far from the right edge as from the top and bottom.
				className="has-[>[data-slot=query-input-field-actions]>button:last-child]:pe-1.25"
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
						id={id ?? fieldControl?.id}
						role="combobox"
						aria-autocomplete="list"
						aria-controls={context.listboxId}
						aria-expanded={context.isListboxOpen}
						aria-activedescendant={
							context.isListboxOpen && context.activeIndex != null
								? optionId(context.listboxId, context.activeIndex)
								: undefined
						}
						aria-describedby={describedByIds === "" ? undefined : describedByIds}
						aria-errormessage={errorMessage ?? fieldControl?.["aria-errormessage"]}
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
				{(children != null || canClear) && (
					<span data-slot="query-input-field-actions" className="contents">
						{children}
						{canClear && <ClearButton label={clearLabel} onClear={context.clearValue} />}
					</span>
				)}
			</Input>
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
 * The props for `QueryInput.Content`.
 */
type QueryInputContentProps = Pick<ComponentProps<typeof Popover.Content>, "className" | "ref"> &
	WithDataSlot & {
		/** Content under the keyboard hints, such as a link to the filter docs. */
		children?: ReactNode;
		/**
		 * What Enter does, in the keyboard hints. Name the host's own action when
		 * Enter submits a form, such as `"select, or search"`.
		 *
		 * @default "select"
		 */
		enterHint?: string;
	};

/**
 * The suggestion popover: a listbox of keys and values for the token under
 * the caret, grouped under "Filter by", "Exclude", and "Values", then the
 * syntax legend. Focus never leaves the field; the active row is announced
 * through `aria-activedescendant`. The legend describes only the syntax the
 * grammar honors.
 *
 * When no row matches, an empty state above the legend says what the
 * field accepts there. Keyboard hints follow the legend; `enterHint` names
 * what Enter does. Children render under the hints, in a
 * `[data-slot="query-input-content-footer"]` `div`.
 *
 * @see https://mantle.ngrok.com/components/forms/query-input#queryinputcontent
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <QueryInput.Content />
 * </QueryInput.Root>
 * ```
 */
// Why no asChild: the part renders the listbox and the legend itself.
function Content({
	"data-slot": dataSlot,
	children,
	className,
	enterHint = "select",
	ref,
}: QueryInputContentProps) {
	const context = useQueryInputContext("QueryInput.Content");
	const { anchorRef } = useQueryInputRefs("QueryInput.Content");
	const { registerContent } = context;
	const rowCount = context.suggestions.items.length;

	// Why an effect: `Content` is a later sibling of `Field`, so the render pass
	// cannot hand its presence to the `<input>`'s `aria-expanded`. The server
	// renders the popover closed, so the first paint is the same.
	useIsomorphicLayoutEffect(registerContent, [registerContent]);

	return (
		<Popover.Content
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "query-input-content")}
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
			{/* Only the options scroll; the legend below stays pinned. */}
			<div className="max-h-72 overflow-y-auto">
				<SuggestionList />
				{rowCount === 0 && (
					<EmptySuggestions
						id={context.emptyStateId}
						keys={context.keys}
						valueKey={context.suggestions.key}
					/>
				)}
			</div>
			{/* It bleeds through the popover's `p-1`, so the border spans edge to edge. */}
			<div
				id={context.legendId}
				className="text-muted border-popover -mx-1 -mb-1 mt-1 border-t px-3 pt-2 pb-2 text-xs"
			>
				<SyntaxLegend keys={context.keys} syntax={context.syntax} />
				<KeyboardHints enterHint={enterHint} />
				{children != null && (
					<div data-slot="query-input-content-footer" className="mt-2">
						{children}
					</div>
				)}
			</div>
		</Popover.Content>
	);
}

/**
 * What the field accepts at the caret when no row matches, so a free-text
 * value or a typo does not leave the user with only the legend.
 */
function EmptySuggestions({
	id,
	keys,
	valueKey,
}: {
	id: string;
	keys: readonly RemoteFilterKeyDefinition[];
	valueKey: string | undefined;
}) {
	const definition = keys.find((candidate) => candidate.key === valueKey);
	const className = "text-body px-2 py-3 text-sm";

	// Each case is its own keyed `<p>`, so a switch replaces a whole element
	// and never a text node that a translation engine rewrote.
	if (definition == null) {
		return (
			<p key="text" id={id} className={className}>
				No filter matches. The words search as text.
			</p>
		);
	}
	if (definition.values == null) {
		return (
			<p key="free-value" id={id} className={className}>
				<SyntaxRule token={`${definition.key}:`}>
					{definition.description == null
						? "Any text matches."
						: `${definition.description}. Any text matches.`}
				</SyntaxRule>
			</p>
		);
	}
	return (
		<p key="listed-value" id={id} className={className}>
			<span>No value matches. Delete the value after</span>{" "}
			<Code className="text-xs">{definition.key}:</Code> <span>to see all values.</span>
		</p>
	);
}

/**
 * The syntax reminder under the suggestions. It describes only what the
 * grammar honors, so a remote grammar never advertises an `OR` its executor
 * refuses.
 */
function SyntaxLegend({
	keys,
	syntax,
}: {
	keys: readonly RemoteFilterKeyDefinition[];
	syntax: FilterSyntax;
}) {
	if (syntax === "qualifiers") {
		return (
			<p className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
		<p className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
			{rules.map((rule) => (
				<span key={rule.token} className="contents">
					<SyntaxRule token={rule.token}>{rule.text}</SyntaxRule>{" "}
				</span>
			))}
		</p>
	);
}

/** The keys the field answers to, under the syntax legend. */
function KeyboardHints({ enterHint }: { enterHint: string }) {
	return (
		<p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
 * Keeps the active option visible inside the scrolling listbox. Focus stays on
 * the input, so the browser never scrolls the option into view on its own.
 */
function scrollActiveOptionIntoView(element: HTMLDivElement | null) {
	element?.scrollIntoView({ block: "nearest" });
}

/** The suggestion listbox, grouped by section. */
function SuggestionList() {
	const context = useQueryInputContext("QueryInput.Content");
	const { activeIndex, hoveredIndex, listboxId } = context;

	const rowsBySection = new Map<
		FilterSuggestionSection,
		{ item: FilterSuggestion; index: number }[]
	>();
	context.suggestions.items.forEach((item, index) => {
		const rows = rowsBySection.get(item.section) ?? [];
		rows.push({ item, index });
		rowsBySection.set(item.section, rows);
	});

	return (
		<div role="listbox" id={listboxId} aria-label="Filter suggestions">
			{[...rowsBySection].map(([section, rows]) => (
				<div key={section} role="group" aria-label={sectionHeadings[section]}>
					<span aria-hidden className="text-muted block px-2 pt-2 pb-1 text-xs font-medium">
						{sectionHeadings[section]}
					</span>
					{rows.map(({ item, index }) => (
						// Why the rule is off: the keyboard contract of an
						// `aria-activedescendant` combobox lives on the input, which keeps
						// focus for the whole widget.
						// oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- the combobox input owns the keyboard contract
						<div
							key={item.label}
							role="option"
							id={optionId(listboxId, index)}
							// The ref attaches only while the row is active, so activation
							// scrolls it into view.
							ref={index === activeIndex ? scrollActiveOptionIntoView : null}
							tabIndex={-1}
							aria-selected={index === activeIndex}
							data-highlighted={
								index === activeIndex || (activeIndex == null && index === hoveredIndex)
									? ""
									: undefined
							}
							className="data-highlighted:bg-accent-500/10 flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded px-2 py-1.5 text-sm"
							// Keep focus in the input, so the caret never jumps on a click.
							onMouseDown={(event) => event.preventDefault()}
							onMouseMove={() => context.setHoveredIndex(index)}
							onMouseLeave={() => context.setHoveredIndex(null)}
							onClick={() => context.acceptSuggestion(item)}
						>
							<span translate="no" className="text-strong font-mono">
								{item.label}
							</span>
							{item.description != null && (
								<span className="text-muted text-xs">{item.description}</span>
							)}
							{item.matchCount != null && (
								<span className="text-muted ml-auto text-xs tabular-nums">{item.matchCount}</span>
							)}
						</div>
					))}
				</div>
			))}
		</div>
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
 * @see https://mantle.ngrok.com/components/forms/query-input
 *
 * @example
 * Composition:
 * ```
 * QueryInput.Root
 * ├── QueryInput.Field
 * └── QueryInput.Content
 * ```
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 *
 * <QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
 *   <QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
 *   <QueryInput.Content />
 * </QueryInput.Root>
 * ```
 */
const QueryInput = {
	/**
	 * The row and the state owner of a query input. It renders a `div` that lays
	 * out the field and any actions in one row, and it owns the caret, the open
	 * state, and the active suggestion.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query-input#queryinputroot
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <QueryInput.Content />
	 * </QueryInput.Root>
	 * ```
	 */
	Root,
	/**
	 * The query field: a real `<input role="combobox">` painted over by a colored
	 * copy of its own text, with a leading magnifier and a clear button.
	 * Children render after the text as inline actions.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query-input#queryinputfield
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <QueryInput.Content />
	 * </QueryInput.Root>
	 * ```
	 */
	Field,
	/**
	 * The suggestion popover: a listbox of keys and values for the token under
	 * the caret, then the syntax legend and the keyboard hints. Children render
	 * under the hints.
	 *
	 * @see https://mantle.ngrok.com/components/forms/query-input#queryinputcontent
	 *
	 * @example
	 * ```tsx
	 * const [query, setQuery] = useState("");
	 *
	 * <QueryInput.Root grammar={projectFilterGrammar} items={projects} value={query} onValueChange={setQuery}>
	 *   <QueryInput.Field aria-label="Filter projects" placeholder="Filter projects, or type a filter like is:shared" />
	 *   <QueryInput.Content />
	 * </QueryInput.Root>
	 * ```
	 */
	Content,
} as const;

export {
	//,
	QueryInput,
};

export type {
	//,
	QueryInputContentProps,
	QueryInputFieldProps,
	QueryInputRootProps,
};
