"use client";

import type { ComponentProps, KeyboardEvent, PropsWithChildren, ReactNode } from "react";
import { cloneElement, createContext, isValidElement, use, useId, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import { useComboboxInput, useComboboxPopup } from "../../behaviors/use-combobox.js";
import { childId, useOption } from "../../behaviors/use-listbox.js";
import { useMultiSelect } from "../../behaviors/use-multi-select.js";
import type { MultiSelectBehavior, UseMultiSelectProps } from "../../behaviors/use-multi-select.js";
import { usePopup } from "../../behaviors/use-popup.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { observeScrollEdges } from "../../utils/scroll-edges.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { hasPopoverApi } from "../../utils/float/use-float.js";
import { shakeElement } from "../../utils/shake.js";
import { FieldControlContext } from "../field/field-context.js";
import { LiveRegion } from "../live-region/live-region.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { AriaInvalid, WithValidation } from "../field/validation.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";
import { OptionSlot } from "../slot/option-slot.js";
import type { OptionRender } from "../slot/option-slot.js";
import invariant from "tiny-invariant";

const EMPTY_ARRAY: readonly string[] = [];

/** Phosphor's `Lock` (regular) and `X` (bold) paths, for the tag's remove button. */
const LOCK_PATH =
	"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z";
const X_PATH =
	"M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z";

/** Whether two arrays hold the same items in the same order. */
const haveSameItems = (first: readonly string[], second: readonly string[]): boolean =>
	first.length === second.length && first.every((item, index) => item === second[index]);

const MultiSelectContext = createContext<MultiSelectBehavior | null>(null);

const useMultiSelectContext = (): MultiSelectBehavior => {
	const context = use(MultiSelectContext);
	if (context == null) {
		throw new Error("MultiSelect parts must be rendered inside MultiSelect.Root.");
	}
	return context;
};

/**
 * The `aria-invalid` that `Trigger` resolves from its `validation` and `aria-invalid` props.
 * The trigger is presentational, so `Input` carries the state for assistive technology.
 */
const TriggerAriaInvalidContext = createContext<AriaInvalid>(undefined);

/** The element after the listbox in the open popup, where `MultiSelect.ContentFooter` renders. */
const FooterHostContext = createContext<HTMLElement | null>(null);

/** The `id` of the closest `MultiSelect.Group`'s label. */
const GroupLabelContext = createContext<string | undefined>(undefined);

/** Shakes the tag of `value` to show that a removal is blocked. */
const shakeTag = (tags: Map<string, HTMLElement>, value: string) => {
	const tag = tags.get(value);
	if (tag != null) {
		shakeElement(tag);
	}
};

type MultiSelectProps = UseMultiSelectProps & {
	children?: ReactNode;
};

/**
 * Root component for a multi-select combobox. Owns the selected values and the
 * typeahead query.
 *
 * Use MultiSelect when the user can choose multiple values from a list, with selected
 * items rendered as removable tags/chips. For single selection, use Combobox (with search)
 * or Select (without).
 *
 * When composing with `Field.Item`, wrap `MultiSelect.Root` in `Field.Control`.
 * `Field.Control` flows the generated `id`, `aria-describedby`,
 * `aria-errormessage`, and `aria-invalid` through to the focusable
 * `MultiSelect.Input` via `FieldControlContext`. The field `name` flows through
 * too, but lands on one hidden input per selected value rather than on the
 * combobox input, so a native form submit sends the selected values, not the
 * typeahead filter text.
 *
 * `MultiSelect.Content` is a `popover="manual"` element in the top layer, so it paints
 * above the page and every overlay. It portals into the overlay or float that
 * holds it, such as an open `Dialog` or `Popover.Content`, else into
 * `document.body`. In a browser with no popover API, it is a fixed box at
 * Tailwind `z-50`.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectroot
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     <MultiSelect.Item value="banana">Banana</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Root = ({ children, ...props }: MultiSelectProps) => {
	const multiSelect = useMultiSelect(props);
	return <MultiSelectContext value={multiSelect}>{children}</MultiSelectContext>;
};

type MultiSelectTriggerProps = ComponentProps<"div"> & WithValidation & WithDataSlot;

/**
 * The trigger container for the multi-select. Wraps the input and selected
 * value tags in a styled container that looks like a form input. It is
 * `role="presentation"`: the `MultiSelect.Input` combobox and the
 * `MultiSelect.TagValues` list carry the semantics, and the input's label
 * (`Field.Label` or `aria-label`) names the whole control.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselecttrigger
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Trigger = ({
	"data-slot": dataSlot,
	"aria-invalid": _ariaInvalid,
	className,
	children,
	onBlur,
	onKeyDown,
	onMouseDown,
	ref,
	validation: _validation,
	...props
}: MultiSelectTriggerProps) => {
	const { inputRef, listbox, open, setOpen, tags, triggerRef } = useMultiSelectContext();
	// Why a hook: a new ref callback on each render would run the caller's callback ref again.
	const composedRef = useComposedRefs(triggerRef, ref);
	const inTag = (target: EventTarget) =>
		target instanceof Node && [...tags.values()].some((tag) => tag.contains(target));
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});

	return (
		<TriggerAriaInvalidContext value={ariaInvalid}>
			<div
				// Why presentation: the handlers below only forward focus to the input;
				// the container itself is not a control, and the input and the tag list
				// carry the semantics.
				role="presentation"
				data-slot={joinDataSlot(dataSlot, "multi-select-trigger")}
				className={cx(
					"cursor-text select-none font-sans text-sm",
					"border-form bg-form text-strong flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-3 py-1 has-data-[slot=multi-select-tag]:px-1",
					"has-focus-within:focus-ring has-aria-expanded:focus-ring",
					"has-focus-within:border-accent-600 has-aria-expanded:border-accent-600",
					"data-[validation=success]:border-success-600 data-[validation=success]:has-focus-within:border-success-600 data-[validation=success]:has-focus-within:ring-focus-success data-[validation=success]:has-aria-expanded:border-success-600 data-[validation=success]:has-aria-expanded:ring-focus-success",
					"data-[validation=warning]:border-warning-600 data-[validation=warning]:has-focus-within:border-warning-600 data-[validation=warning]:has-focus-within:ring-focus-warning data-[validation=warning]:has-aria-expanded:border-warning-600 data-[validation=warning]:has-aria-expanded:ring-focus-warning",
					"data-[validation=error]:border-danger-600 data-[validation=error]:has-focus-within:border-danger-600 data-[validation=error]:has-focus-within:ring-focus-danger data-[validation=error]:has-aria-expanded:border-danger-600 data-[validation=error]:has-aria-expanded:ring-focus-danger motion-safe:data-[validation=error]:animate-shake",
					className,
				)}
				data-validation={validation || undefined}
				onMouseDown={(event) => {
					// When clicking on non-interactive areas (padding, flex gaps between tags), prevent the
					// default mousedown behavior (which would cause text selection) and explicitly focus the
					// input. Clicks on buttons, the input itself, or tag spans are handled by those elements.
					if (
						event.target instanceof HTMLElement &&
						!event.target.closest("button, input, [data-slot='multi-select-tag']")
					) {
						event.preventDefault();
						inputRef.current?.focus();
					}
					onMouseDown?.(event);
				}}
				// Why on the trigger: a tag keeps the list open while it has focus, so
				// the trigger closes it when a tag gets Escape or focus leaves the
				// component. The input handles both for itself.
				onKeyDown={composeHandlers(onKeyDown, (event) => {
					if (event.key === "Escape" && open && inTag(event.target)) {
						event.preventDefault();
						setOpen(false);
					}
				})}
				onBlur={composeHandlers(onBlur, (event) => {
					const { relatedTarget } = event;
					// Why the listbox id and not a ref: the compiler's pass forbids a ref read in
					// a handler built during render. Focus in this list's footer stays inside.
					const popup =
						relatedTarget instanceof Element
							? relatedTarget.closest('[data-slot="multi-select-popup"]')
							: null;
					const inside =
						(relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) ||
						popup?.querySelector(`[id="${listbox.id}"]`) != null;
					if (inTag(event.target) && !inside) {
						setOpen(false);
					}
				})}
				ref={composedRef}
				{...props}
			>
				{children}
			</div>
		</TriggerAriaInvalidContext>
	);
};

type TagProps = Omit<ComponentProps<"span">, "children"> & {
	/**
	 * The value to display in the tag label.
	 */
	value: string;
	/**
	 * Called when the remove button is clicked. `MultiSelect.TagValues` passes
	 * one through its render props that removes the value from the selection.
	 */
	onRemove?: () => void;
	/**
	 * When true, the tag cannot be removed. The remove button is disabled and
	 * Delete/Backspace key presses are ignored while the tag is focused.
	 */
	locked?: boolean;
} & WithDataSlot;

/**
 * The default tag rendered inside `MultiSelect.TagValues` for each selected value.
 * Displays the value label with a remove button. Renders a `role="listitem"`
 * inside the `role="list"` that `MultiSelect.TagValues` renders. The tag that
 * keyboard navigation is on has DOM focus; style it with `focus-visible:`.
 *
 * Arrow-key navigation and Backspace/Delete removal come from the
 * `MultiSelect.TagValues` render props; spread them onto the tag to get them.
 * On its own, `Tag` only blocks Backspace and Delete on a locked tag.
 *
 * Use this when building a custom `TagValues`-like component and you want the
 * default tag chrome with consistent styling.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-locked` | present when `locked` | The tag cannot be removed. |
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselecttag
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues>
 *       {(props) => <MultiSelect.Tag key={props.value} {...props} />}
 *     </MultiSelect.TagValues>
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Tag = ({
	"data-slot": dataSlot,
	className,
	value,
	onRemove,
	locked = false,
	onKeyDown,
	ref,
	...props
}: TagProps) => {
	const internalRef = useRef<HTMLSpanElement | null>(null);
	// Why a hook: the tags re-render on each keystroke, and a new ref callback would run the caller's callback ref again.
	const composedRef = useComposedRefs(internalRef, ref);

	return (
		<span
			ref={composedRef}
			role="listitem"
			tabIndex={-1}
			data-slot={joinDataSlot(dataSlot, "multi-select-tag")}
			data-locked={locked || undefined}
			className={cx(
				"cursor-default bg-neutral-500/10 border border-neutral-500/20 rounded-xs text-strong inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 text-sm font-normal motion-safe:data-shake:animate-shake",
				"focus-visible:border-accent-600/50 focus-visible:ring-3 focus-visible:focus-ring",
				className,
			)}
			onKeyDown={(event) => {
				if (locked && (event.key === "Backspace" || event.key === "Delete")) {
					event.preventDefault();
					shakeElement(event.currentTarget);
					return;
				}
				onKeyDown?.(event);
			}}
			{...props}
		>
			{value}
			<button
				type="button"
				aria-label={`Remove ${value}`}
				tabIndex={-1}
				aria-disabled={locked || undefined}
				className={cx(
					"cursor-pointer text-strong/40 hover:bg-neutral-500/15 hover:text-strong rounded-xs p-0.5",
					"aria-disabled:cursor-default aria-disabled:hover:bg-transparent aria-disabled:hover:text-strong/40",
				)}
				onClick={(event) => {
					// Prevent the click from bubbling to the trigger, which would reopen or refocus the combobox
					event.stopPropagation();
					if (locked) {
						// Shake the tag to signal that removal is blocked
						const tagElement = internalRef.current;
						if (tagElement) {
							shakeElement(tagElement);
						}
						return;
					}
					onRemove?.();
				}}
				onMouseDown={(event) => {
					// Prevent the input from losing focus on click, which would close the popover before the remove fires
					event.preventDefault();
				}}
			>
				{/* Why inline svgs: one host element in place of four parts for each tag. */}
				<svg
					aria-hidden
					data-slot="icon svg-only"
					viewBox="0 0 256 256"
					fill="currentColor"
					className="size-4 shrink-0"
				>
					<path d={locked ? LOCK_PATH : X_PATH} />
				</svg>
			</button>
		</span>
	);
};

/**
 * Props passed to the children render function of `MultiSelect.TagValues`.
 * Spread these onto `MultiSelect.Tag` (or your own tag component) to
 * get the value, remove handler, locked state, and ref-based keyboard-nav
 * registration all wired up automatically.
 *
 * Pre-wired handlers included:
 * - `onKeyDown`: arrow-key nav between tags, Backspace/Delete to remove
 * - `onClick`: focuses the tag and opens the popover, or keeps it open
 */
type TagRenderProps = TagProps & {
	/** Ref callback. Forward it to the tag element to register it for keyboard navigation between tags. */
	ref: (node: HTMLSpanElement | null) => void;
};

type TagRendererProps = TagRenderProps & {
	/** The `TagValues` render function. */
	render: (props: TagRenderProps) => ReactNode;
};

/**
 * Calls the `TagValues` render function from a child component, so the ref callback and the
 * handlers reach it as props. Why not a call inside `TagValues`: those closures read refs. A
 * function that receives them during render could call them during render, so the React
 * Compiler skips `TagValues` while the call is there.
 */
const TagRenderer = ({ render, ...props }: TagRendererProps) => render(props);

type MultiSelectTagValuesProps = {
	/**
	 * The accessible name of the tag list.
	 *
	 * @default "Selected values"
	 */
	"aria-label"?: string;
	/**
	 * Values that cannot be removed. Locked tags have their remove button disabled,
	 * respond to Backspace/Delete key presses with a shake animation, and shake when
	 * Backspace is pressed on an empty input.
	 *
	 * The `locked` state is also forwarded to the render function via `props.locked`
	 * so custom tag components receive it automatically.
	 */
	lockedValues?: readonly string[];
	/**
	 * Optional render function for each tag. Receives `{ value, onRemove, locked, ref, onKeyDown, onClick }`.
	 * Spread these onto `MultiSelect.Tag` (or your own element) for full keyboard-nav support.
	 * When omitted, the default `MultiSelect.Tag` is rendered for each selected value.
	 * A custom tag must be a `role="listitem"`: the tags render inside a `role="list"`.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.TagValues lockedValues={["global"]}>
	 *   {(props) => (
	 *     <MultiSelect.Tag key={props.value} {...props} />
	 *   )}
	 * </MultiSelect.TagValues>
	 * ```
	 */
	children?: (props: TagRenderProps) => ReactNode;
};

/**
 * Renders the selected values as removable tags. Place this inside
 * `MultiSelect.Trigger`, followed by `MultiSelect.Input`.
 *
 * The tags render inside a `role="list"` named "Selected values" (override it
 * with `aria-label`), and each default tag is a `role="listitem"`. The list
 * uses `display: contents`, so the tags keep the trigger's flex layout.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselecttagvalues
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const TagValues = ({
	"aria-label": ariaLabel = "Selected values",
	children,
	lockedValues = EMPTY_ARRAY,
}: MultiSelectTagValuesProps) => {
	const multiSelect = useMultiSelectContext();
	const { inputRef, listbox, locked, remove, selected, setOpen, tags } = multiSelect;

	const focusTag = (index: number) => {
		const value = selected[index];
		const tag = value == null ? null : tags.get(value);
		if (tag != null) {
			tag.focus();
			// Keep the list open while a tag has focus.
			setOpen(true);
		}
	};

	const focusInput = () => {
		inputRef.current?.focus();
	};

	/**
	 * Removes the value at `index`, or shakes its tag when it is locked, then
	 * focuses the tag at `next` in the new list, else the input.
	 */
	const removeAt = (index: number, next: (remaining: number) => number) => {
		const value = selected[index];
		if (value == null) {
			return;
		}
		// Why flushSync: the next tag to focus exists only once React commits the removal.
		let removed = false;
		flushSync(() => {
			removed = remove(value);
		});
		if (!removed) {
			shakeTag(tags, value);
			return;
		}
		const remaining = selected.length - 1;
		const target = next(remaining);
		const targetValue = selected.filter((item) => item !== value)[target];
		const tag = targetValue == null ? null : tags.get(targetValue);
		if (tag == null) {
			focusInput();
			return;
		}
		tag.focus();
		setOpen(true);
	};

	const handleTagKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
		switch (event.key) {
			case "ArrowLeft": {
				event.preventDefault();
				if (index > 0) {
					focusTag(index - 1);
				}
				break;
			}
			case "ArrowRight": {
				event.preventDefault();
				if (index < selected.length - 1) {
					focusTag(index + 1);
				} else {
					focusInput();
				}
				break;
			}
			case "Backspace": {
				event.preventDefault();
				// Focus the previous tag, or the new first tag.
				removeAt(index, () => Math.max(index - 1, 0));
				break;
			}
			case "Delete": {
				event.preventDefault();
				// The next tag slides into this index.
				removeAt(index, () => index);
				break;
			}
			case "ArrowUp":
			case "ArrowDown": {
				// Don't scroll the page. Move the highlight in the list instead.
				event.preventDefault();
				focusInput();
				// Why flushSync: a closed list renders no options until React commits.
				flushSync(() => {
					setOpen(true);
				});
				listbox.move(event.key === "ArrowDown" ? "next" : "previous");
				break;
			}
			default: {
				// If a printable character is typed while a tag is focused, jump to input
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
					focusInput();
				}
				break;
			}
		}
	};

	if (selected.length === 0) {
		return null;
	}

	return (
		// Why `contents`: the list must not take the tags out of the trigger's
		// flex `gap`; the element exists for the `role="list"` alone.
		<span
			role="list"
			aria-label={ariaLabel}
			data-slot="multi-select-tag-list"
			className="contents"
			ref={() => {
				// Why a ref callback: the locks live in the store while this list is
				// mounted, and `Item` reads them in another branch of the tree. The
				// store keeps the old array when the items match, so an inline
				// `lockedValues` literal re-renders no `Item`.
				if (!haveSameItems(locked.get().values, lockedValues)) {
					locked.set({ values: lockedValues });
				}
				return () => {
					locked.set({ values: EMPTY_ARRAY });
				};
			}}
		>
			{selected.map((value, index) => {
				const isLocked = lockedValues.includes(value);
				const tagOptionProps: TagRenderProps = {
					value,
					locked: isLocked,
					onRemove: () => {
						// Respect locked values: shake instead of removing when locked.
						// This guards custom tag renderers that call onRemove directly.
						if (isLocked) {
							shakeTag(tags, value);
							return;
						}
						remove(value);
					},
					ref: (node: HTMLSpanElement | null) => {
						if (node == null) {
							return;
						}
						tags.set(value, node);
						return () => {
							tags.delete(value);
						};
					},
					onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => handleTagKeyDown(event, index),
					// A tag click opens the list, or keeps it open, including when the
					// component was fully blurred before the click.
					onClick: () => focusTag(index),
				};

				if (children) {
					return <TagRenderer key={value} render={children} {...tagOptionProps} />;
				}

				return <Tag key={value} {...tagOptionProps} />;
			})}
		</span>
	);
};

type MultiSelectInputProps = Omit<
	ComponentProps<"input">,
	"value" | "defaultValue" | "autoComplete"
> &
	WithDataSlot;

/**
 * The combobox input for filtering items. Place this inside `MultiSelect.Trigger`,
 * after `MultiSelect.TagValues`.
 *
 * `MultiSelect.Input` is the focusable element of the multi-select. When the
 * surrounding `MultiSelect.Root` is wrapped in `Field.Control`, the generated
 * `id`, `aria-invalid`, `aria-describedby`, and `aria-errormessage` flow onto
 * the input here via `FieldControlContext`.
 *
 * A `name` (passed directly or flowed from `Field.Control`) is not set on this
 * input. Its value is the typeahead filter text, so naming it would submit what
 * the user typed. The name is applied to one hidden input per selected value
 * instead, which is what a native form submit sends.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectinput
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Input = ({
	"data-slot": dataSlot,
	className,
	name: nameProp,
	onBlur,
	onChange,
	onClick,
	onFocus,
	onKeyDown,
	onKeyDownCapture,
	onKeyUp,
	placeholder,
	ref,
	...props
}: MultiSelectInputProps) => {
	const multiSelect = useMultiSelectContext();
	const { locked, remove, selected, setOpen, tags } = multiSelect;
	const inputProps = useComboboxInput(multiSelect, { autoSelect: true });
	const composedRef = useComposedRefs(ref, inputProps.ref);
	const fieldControl = use(FieldControlContext);
	const triggerAriaInvalid = use(TriggerAriaInvalidContext);
	const name = fieldControl?.name ?? nameProp;

	return (
		<>
			<input
				aria-invalid={triggerAriaInvalid}
				{...props}
				{...inputProps}
				ref={composedRef}
				data-slot={joinDataSlot(dataSlot, "multi-select-input")}
				className={cx(
					"pointer-coarse:text-base min-w-20 flex-1 select-text border-0 bg-transparent text-sm outline-hidden",
					"placeholder:select-none placeholder:text-placeholder",
					className,
				)}
				placeholder={selected.length > 0 ? undefined : placeholder}
				onChange={composeHandlers(onChange, inputProps.onChange)}
				onClick={composeHandlers(onClick, inputProps.onClick)}
				onKeyUp={composeHandlers(onKeyUp, inputProps.onKeyUp)}
				onKeyDownCapture={(event) => {
					onKeyDownCapture?.(event);
					inputProps.onKeyDownCapture();
				}}
				onFocus={composeHandlers(onFocus, (event) => {
					inputProps.onFocus();
					// Why only from a tag: focus that returns from a tag keeps the list
					// open. Focus from outside, such as a dialog's autofocus, opens nothing.
					const trigger = event.currentTarget.closest('[data-slot~="multi-select-trigger"]');
					if (event.relatedTarget instanceof Node && trigger?.contains(event.relatedTarget)) {
						setOpen(true);
					}
				})}
				onBlur={composeHandlers(onBlur, (event) => {
					// Why: focus that moves to a tag or a remove button stays in the
					// component, so the list stays open. The input handles the popup itself.
					const trigger = event.currentTarget.closest('[data-slot~="multi-select-trigger"]');
					const { relatedTarget } = event;
					if (!(relatedTarget instanceof Node && trigger?.contains(relatedTarget))) {
						inputProps.onBlur(event);
					}
				})}
				onKeyDown={composeHandlers(onKeyDown, (event) => {
					// Why: an input method uses these keys for its own candidates.
					if (event.nativeEvent.isComposing) {
						return;
					}
					const input = event.currentTarget;
					const last = selected.at(-1);
					if (
						event.key === "ArrowLeft" &&
						input.selectionStart === 0 &&
						input.selectionEnd === 0 &&
						last != null &&
						tags.has(last)
					) {
						event.preventDefault();
						tags.get(last)?.focus();
						setOpen(true);
						return;
					}
					// Why `tags.has`: Backspace removes a tag only while the tag list renders it.
					if (event.key === "Backspace" && input.value === "" && last != null && tags.has(last)) {
						if (locked.get().values.includes(last) || !remove(last)) {
							shakeTag(tags, last);
						}
						return;
					}
					inputProps.onKeyDown(event);
				})}
				{...(fieldControl
					? {
							"aria-describedby": fieldControl["aria-describedby"],
							"aria-errormessage": fieldControl["aria-errormessage"],
							"aria-invalid": fieldControl["aria-invalid"],
							id: fieldControl.id,
						}
					: undefined)}
			/>
			{name != null &&
				selected.map((value) => (
					<input
						key={value}
						type="hidden"
						name={name}
						value={value}
						form={props.form}
						disabled={props.disabled}
					/>
				))}
			{/* Why: a removed tag leaves no focus or option to describe the change, so
			    nothing else tells a screen reader which value went. */}
			<LiveRegion>{multiSelect.removal}</LiveRegion>
		</>
	);
};

type MultiSelectContentProps = ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether the list is as wide as the trigger. When `false`, it takes the
		 * width of its widest item.
		 * @default true
		 */
		sameWidth?: boolean;
	};

/**
 * Renders a popover that contains multi-select content, such as items, groups,
 * and separators. Opens below the trigger.
 *
 * `MultiSelect.Content` is a `popover="manual"` element in the top layer, so it paints
 * above the page and every overlay. It portals into the overlay or float that
 * holds it, such as an open `Dialog` or `Popover.Content`, else into
 * `document.body`. In a browser with no popover API, it is a fixed box at
 * Tailwind `z-50`.
 *
 * As with a native select, the page stays live while the list is open: it
 * scrolls, and assistive technology can reach it. A press outside the trigger
 * and the list closes the list, and its click does not reach the page.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectcontent
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     <MultiSelect.Item value="banana">Banana</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Content = (props: MultiSelectContentProps) =>
	useMultiSelectContext().open && <OpenContent {...props} />;

/** The open list. A closed multi-select mounts none of it: no popup, store, or listener. */
const OpenContent = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	sameWidth = true,
	...props
}: MultiSelectContentProps) => {
	const multiSelect = useMultiSelectContext();
	const { inputRef, listbox, setOpen, triggerRef } = multiSelect;
	const { portalTarget, popupRef } = usePopup({
		anchorRef: triggerRef,
		ownerRef: inputRef,
		onOutsidePress: () => setOpen(false),
	});
	const { footerRef, ...popupProps } = useComboboxPopup(multiSelect, { anchorRef: triggerRef });
	const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
	const hostRef = useComposedRefs(setFooterHost, footerRef);
	const boxRef = useComposedRefs(popupRef, multiSelect.popupRef);
	const listRef = useComposedRefs(ref, listbox.listboxProps.ref, observeScrollEdges);
	const List = asChild ? Slot : "div";
	return (
		portalTarget != null &&
		createPortal(
			<>
				{/* Why: a touch screen reader has no Escape key, and a pick keeps this list open. */}
				<button type="button" tabIndex={-1} className="sr-only" onClick={() => setOpen(false)}>
					Dismiss popup
				</button>
				<div
					{...popupProps}
					// Why presentation: the handlers only catch keys and focus from the footer's
					// controls. The listbox inside and the controls carry the semantics.
					role="presentation"
					popover={hasPopoverApi ? "manual" : undefined}
					ref={boxRef}
					data-slot="multi-select-popup"
					data-mantle-popup=""
					data-open=""
					className={cx(
						"border-popover bg-popover pointer-events-auto fixed inset-auto z-50 m-0 text-inherit max-h-(--available-height) flex flex-col overflow-hidden box-border rounded-md border shadow-md font-sans",
					)}
				>
					<FooterHostContext value={footerHost}>
						<List
							{...props}
							{...listbox.listboxProps}
							onMouseDown={composeHandlers(props.onMouseDown, (event) => {
								// Why: the footer is in this list's React tree, so its presses reach this handler.
								if (event.target instanceof Node && event.currentTarget.contains(event.target)) {
									listbox.listboxProps.onMouseDown(event);
								}
							})}
							aria-multiselectable
							ref={listRef}
							data-float-scroll=""
							data-slot={joinDataSlot(dataSlot, "multi-select-content")}
							// Why: an enclosing Dialog reads `data-open` on the `aria-controls` target to leave Escape to this list.
							data-open=""
							className={cx(
								"relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none [&::-webkit-scrollbar]:hidden overscroll-y-none min-w-32 scroll-cue-y before:-top-1 after:-bottom-1 scroll-py-6 py-1 flex flex-col between:mbe-px outline-hidden",
								// Why less 2px: the popup's border sits outside the listbox, and the popup matches the anchor.
								sameWidth && "w-[calc(var(--anchor-width)-2px)]",
								className,
							)}
						>
							{children}
						</List>
					</FooterHostContext>
					{/* Why a host: the footer's controls must sit outside the listbox, wherever the footer is written. */}
					<div ref={hostRef} className="contents" />
				</div>
			</>,
			portalTarget,
		)
	);
};

/**
 * The label wrapper `MultiSelect.Item` renders around the consumer's children.
 *
 * Why the label div: decisions/2026-08-04-translation-safe-label-wrappers.md
 * Why a div and not a span: the docs point a custom option layout at
 * `MediaObject`, whose root is a `<div>`, which a `<span>` may not contain.
 */
const renderItemLabel = (label: ReactNode) => (
	<div data-slot="multi-select-item-label" className="contents">
		{label}
	</div>
);

/**
 * Props for `MultiSelect.Item`.
 */
type MultiSelectItemProps = Omit<ComponentProps<"div">, "children" | "value"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The item's label. A function renders the item as the element it returns,
		 * with the item's props and `{ highlighted }`: spread `props` on that
		 * element and write the label inside it.
		 */
		children?: ReactNode | OptionRender;
		/**
		 * Whether the item is inert.
		 * A disabled item runs no click handler, and an `asChild` link does not navigate.
		 */
		disabled?: boolean;
		/**
		 * The value that the item adds to or removes from the selection.
		 */
		value: string;
	};

/**
 * Renders a selectable item inside a `MultiSelect.Content` component.
 * Items display a checkbox indicator when selected.
 *
 * **Structure.** `children` render inside a
 * `<div data-slot="multi-select-item-label">`. The selected-state check is a
 * permanent element sibling, so without the wrapper a bare text label is never a
 * lone child: a browser translation engine reparents that text node, and the
 * removal React runs when the label changes shape or goes away throws. The
 * wrapper is a `<div>` because a custom option layout is often a `MediaObject`,
 * whose root is a `<div>` that a `<span>` may not contain. It is
 * `display: contents`, so a child of your own stays a flex item of the option
 * and any `flex-1` on it still resolves.
 *
 * **`asChild`.** Your single child becomes the option element. The label div
 * and the check move inside it, so the guarantee above holds on both paths.
 *
 * **Function child.** `(props, { highlighted }) => element` renders the option as
 * the element it returns. Spread `props` on it and write the label inside it.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"multi-select-item"` | On the option element. |
 * | `data-slot` | `"multi-select-item-label"` | On the `<div>` wrapping `children`. |
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectitem
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     <MultiSelect.Item value="banana">Banana</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Item = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	disabled,
	onClick,
	onPointerMove,
	value,
	ref,
	...props
}: MultiSelectItemProps) => {
	const { listbox } = useMultiSelectContext();
	const { selected, optionProps } = useOption(listbox, {
		value,
		disabled,
		id: childId({ asChild, children, id: props.id }),
	});

	const check = selected && (
		<span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			<svg
				aria-hidden
				data-slot="icon svg-only"
				viewBox="0 0 256 256"
				fill="currentColor"
				className="size-4 shrink-0 text-accent-600"
			>
				<path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
			</svg>
		</span>
	);

	const renderContent = (inner: ReactNode) => (
		<>
			{renderItemLabel(inner)}
			{check}
		</>
	);
	const elementProps = {
		...props,
		...optionProps,
		onClick: composeHandlers(onClick, optionProps.onClick),
		onPointerMove: composeHandlers(onPointerMove, optionProps.onPointerMove),
		"data-slot": joinDataSlot(dataSlot, "multi-select-item"),
		className: cx(
			"relative mx-1 cursor-pointer rounded-md pl-2 pr-8 py-1.5 text-strong text-sm font-normal flex min-w-0 items-center gap-2",
			"[[role=option]+&]:mt-px",
			"data-highlighted:bg-active-menu-item",
			"aria-disabled:cursor-default aria-disabled:opacity-50",
			"aria-selected:bg-selected-menu-item aria-selected:data-highlighted:bg-active-selected-menu-item",
			className,
		),
		ref,
	};
	if (typeof children === "function") {
		return (
			<OptionSlot
				{...elementProps}
				listbox={listbox}
				render={children}
				renderContent={renderContent}
			/>
		);
	}
	if (asChild) {
		// Why clone here: the consumer's element becomes the option, with the label
		// div and the check inside it, so both keep their places.
		invariant(
			isValidElement<PropsWithChildren>(children),
			"When using `asChild`, MultiSelect.Item must be passed a single child as a JSX tag.",
		);
		return (
			<Slot {...elementProps}>
				{cloneElement(children, {}, renderContent(children.props.children))}
			</Slot>
		);
	}
	return <div {...elementProps}>{renderContent(children)}</div>;
};

type MultiSelectGroupProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * Renders a group for MultiSelect.Item elements.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectgroup
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Group>
 *       <MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
 *       <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *       <MultiSelect.Item value="banana">Banana</MultiSelect.Item>
 *     </MultiSelect.Group>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Group = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	...props
}: MultiSelectGroupProps) => {
	const labelId = useId();
	const Component = asChild ? Slot : "div";
	return (
		<GroupLabelContext value={labelId}>
			<Component
				role="group"
				aria-labelledby={labelId}
				data-slot={joinDataSlot(dataSlot, "multi-select-group")}
				className={cx("mx-1", className)}
				ref={ref}
				{...props}
			>
				{children}
			</Component>
		</GroupLabelContext>
	);
};

type MultiSelectGroupLabelProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * Renders a label in a multi-select group.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectgrouplabel
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Group>
 *       <MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
 *       <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     </MultiSelect.Group>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const GroupLabel = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	...props
}: MultiSelectGroupLabelProps) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			id={use(GroupLabelContext)}
			data-slot={joinDataSlot(dataSlot, "multi-select-group-label")}
			className={cx("text-muted px-2 py-1 text-xs font-medium", className)}
			ref={ref}
			{...props}
		>
			{children}
		</Component>
	);
};

type MultiSelectGroupDescriptionProps = ComponentProps<"p"> & WithDataSlot;

/**
 * Renders a description below a `MultiSelect.GroupLabel` inside a `MultiSelect.Group`.
 * States the group's purpose or constraints.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectgroupdescription
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select regions..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Group>
 *       <MultiSelect.GroupLabel>Regional Aliases</MultiSelect.GroupLabel>
 *       <MultiSelect.GroupDescription>
 *         Include all points of presence that are geographically within the region.
 *       </MultiSelect.GroupDescription>
 *       <MultiSelect.Item value="global">global</MultiSelect.Item>
 *     </MultiSelect.Group>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const GroupDescription = ({
	"data-slot": dataSlot,
	className,
	children,
	ref,
	...props
}: MultiSelectGroupDescriptionProps) => {
	return (
		<p
			data-slot={joinDataSlot(dataSlot, "multi-select-group-description")}
			className={cx("text-muted px-2 pb-1 text-xs", className)}
			ref={ref}
			{...props}
		>
			{children}
		</p>
	);
};

/**
 * Renders a separator between MultiSelect.Items or MultiSelect.Groups.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectseparator
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Group>
 *       <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     </MultiSelect.Group>
 *     <MultiSelect.Separator />
 *     <MultiSelect.Group>
 *       <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
 *     </MultiSelect.Group>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const MultiSelectSeparatorComponent = ({
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<typeof Separator> & WithDataSlot) => (
	<Separator
		data-slot={joinDataSlot(dataSlot, "multi-select-separator")}
		ref={ref}
		className={cx("my-1 w-auto", className)}
		{...props}
	/>
);

type MultiSelectEmptyProps = ComponentProps<"div"> & WithDataSlot;

/**
 * Renders a message when no items match the current filter.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectempty
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     {matches.length === 0 && (
 *       <MultiSelect.Empty>No results found</MultiSelect.Empty>
 *     )}
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const Empty = ({
	"data-slot": dataSlot,
	className,
	children,
	ref,
	...props
}: MultiSelectEmptyProps) => {
	return (
		<div
			data-slot={joinDataSlot(dataSlot, "multi-select-empty")}
			className={cx("mx-1 text-muted px-2 py-6 text-center text-sm", className)}
			ref={ref}
			role="presentation"
			{...props}
		>
			{children}
		</div>
	);
};

type MultiSelectContentFooterProps = ComponentProps<"div"> & WithDataSlot;

/**
 * Renders a footer at the bottom of the open `MultiSelect.Content`, after the
 * listbox and not in it, with a separator border at the top. Tab from the input
 * moves to its first control, and the list stays open. Shift+Tab from that
 * control returns to the input, and Escape closes the list.
 *
 * @see https://mantle.ngrok.com/components/forms/multi-select#multiselectcontentfooter
 *
 * @example
 * ```tsx
 * <MultiSelect.Root>
 *   <MultiSelect.Trigger>
 *     <MultiSelect.TagValues />
 *     <MultiSelect.Input placeholder="Select items..." />
 *   </MultiSelect.Trigger>
 *   <MultiSelect.Content>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     <MultiSelect.ContentFooter>
 *       <p>Upgrade to unlock more options.</p>
 *       <Button appearance="filled" intent="accent">Upgrade</Button>
 *     </MultiSelect.ContentFooter>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const ContentFooter = ({
	"data-slot": dataSlot,
	className,
	children,
	ref,
	...props
}: MultiSelectContentFooterProps) => {
	const host = use(FooterHostContext);
	return (
		host != null &&
		createPortal(
			<div
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "multi-select-content-footer")}
				data-content-footer
				// Why contain-inline-size: the footer takes the popup's width and never widens it.
				className={cx("bg-popover border-popover shrink-0 border-t contain-inline-size", className)}
				{...props}
			>
				{children}
			</div>,
			host,
		)
	);
};

export {
	//,
	Root,
	Trigger,
	TagValues,
	Input,
	Tag,
	Content,
	ContentFooter,
	Item,
	Group,
	GroupLabel,
	GroupDescription,
	MultiSelectSeparatorComponent,
	Empty,
};
