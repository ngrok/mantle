"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { LockIcon } from "@phosphor-icons/react/Lock";
import { XIcon } from "@phosphor-icons/react/X";
import type { ComponentProps, KeyboardEvent, PropsWithChildren, ReactNode } from "react";
import { cloneElement, createContext, isValidElement, use, useId, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import { enterModal } from "../../behaviors/enter-modal.js";
import { useComboboxInput } from "../../behaviors/use-combobox.js";
import { useOption } from "../../behaviors/use-listbox.js";
import { useMultiSelect } from "../../behaviors/use-multi-select.js";
import type { MultiSelectBehavior, UseMultiSelectProps } from "../../behaviors/use-multi-select.js";
import { usePopup } from "../../behaviors/use-popup.js";
import type { WithAsChild } from "../../types/as-child.js";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { useLayerContainer } from "../../utils/layer-container/layer-container.js";
import { shakeElement } from "../../utils/shake.js";
import { FieldControlContext } from "../field/field-context.js";
import { parseValidation, useFieldValidation } from "../field/validation.js";
import type { AriaInvalid, WithValidation } from "../field/validation.js";
import { Icon } from "../icon/icon.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";
import invariant from "tiny-invariant";

const EMPTY_ARRAY: readonly string[] = [];

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
 * `MultiSelect.Content` renders at Tailwind `z-50`. Inside an open `Dialog`,
 * `AlertDialog`, or `Sheet`, it portals into that overlay's positioner and
 * paints above the overlay that owns it. Outside every overlay, it portals to
 * `document.body`, below the overlay tier (`z-60`).
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
	onMouseDown,
	ref,
	validation: _validation,
	...props
}: MultiSelectTriggerProps) => {
	const { inputRef, triggerRef } = useMultiSelectContext();
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
					"data-validation-success:border-success-600 data-validation-success:has-focus-within:border-success-600 data-validation-success:has-focus-within:ring-focus-success data-validation-success:has-aria-expanded:border-success-600 data-validation-success:has-aria-expanded:ring-focus-success",
					"data-validation-warning:border-warning-600 data-validation-warning:has-focus-within:border-warning-600 data-validation-warning:has-focus-within:ring-focus-warning data-validation-warning:has-aria-expanded:border-warning-600 data-validation-warning:has-aria-expanded:ring-focus-warning",
					"data-validation-error:border-danger-600 data-validation-error:has-focus-within:border-danger-600 data-validation-error:has-focus-within:ring-focus-danger data-validation-error:has-aria-expanded:border-danger-600 data-validation-error:has-aria-expanded:ring-focus-danger motion-safe:data-validation-error:animate-shake",
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
				ref={composeRefs(triggerRef, ref)}
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
 * inside the `role="list"` that `MultiSelect.TagValues` renders, and marks
 * itself `data-active` while it has focus.
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
 * | `data-active` | present while focused | The tag that keyboard navigation is on. |
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
	onBlur,
	onFocus,
	onKeyDown,
	ref,
	...props
}: TagProps) => {
	const internalRef = useRef<HTMLSpanElement | null>(null);
	// Why local state: the tag list has no listbox, so `aria-selected` is not
	// valid here, and `aria-current` names a current item, not focus. DOM focus
	// exposes the active tag; `data-active` drives its styling.
	const [isActive, setIsActive] = useState(false);

	return (
		<span
			ref={composeRefs(internalRef, ref)}
			role="listitem"
			tabIndex={-1}
			data-slot={joinDataSlot(dataSlot, "multi-select-tag")}
			data-active={isActive || undefined}
			data-locked={locked || undefined}
			className={cx(
				"cursor-default bg-neutral-500/10 border border-neutral-500/20 rounded-xs text-strong inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 text-sm font-normal motion-safe:data-shake:animate-shake",
				"focus-visible:border-accent-600/50 focus-visible:ring-3 focus-visible:focus-ring",
				className,
			)}
			onBlur={(event) => {
				setIsActive(false);
				onBlur?.(event);
			}}
			onFocus={(event) => {
				setIsActive(true);
				onFocus?.(event);
			}}
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
				<Icon svg={locked ? <LockIcon /> : <XIcon weight="bold" />} className="size-4" />
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
> & {
	/**
	 * Called with the raw string value whenever the input text changes.
	 * Use this to drive external filtering (e.g. with matchSorter) without
	 * having to unwrap the DOM event. A convenience alternative to `onChange`.
	 */
	onValueChange?: (value: string) => void;
} & WithDataSlot;

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
	onValueChange,
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
				onChange={composeHandlers(onChange, (event) => {
					onValueChange?.(event.target.value);
					inputProps.onChange(event);
				})}
				onClick={composeHandlers(onClick, inputProps.onClick)}
				onFocus={composeHandlers(onFocus, (event) => {
					// Why only from a tag: focus that returns from a tag keeps the list
					// open. Focus from outside, such as a dialog's autofocus, opens nothing.
					const trigger = event.currentTarget.closest('[data-slot~="multi-select-trigger"]');
					if (event.relatedTarget instanceof Node && trigger?.contains(event.relatedTarget)) {
						setOpen(true);
					}
				})}
				onBlur={composeHandlers(onBlur, (event) => {
					// Why: focus that moves to a tag or a remove button stays in the
					// component, so the list stays open.
					const trigger = event.currentTarget.closest('[data-slot~="multi-select-trigger"]');
					if (!(event.relatedTarget instanceof Node && trigger?.contains(event.relatedTarget))) {
						inputProps.onBlur();
					}
				})}
				onKeyDown={composeHandlers(onKeyDown, (event) => {
					// Why: the open list is modal, so focus stays until Escape closes it.
					if (event.key === "Tab" && multiSelect.open) {
						event.preventDefault();
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
				selected.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
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
 * `MultiSelect.Content` renders at Tailwind `z-50`. Inside an open `Dialog`,
 * `AlertDialog`, or `Sheet`, it portals into that overlay's positioner and
 * paints above the overlay that owns it. Outside every overlay, it portals to
 * `document.body`, below the overlay tier (`z-60`).
 *
 * The list is modal: while it is open, the page does not scroll, the rest of
 * the page is inert, and a press outside the trigger and the list closes it.
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
const Content = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	sameWidth = true,
	...props
}: MultiSelectContentProps) => {
	const { listbox, open, setOpen, triggerRef } = useMultiSelectContext();
	const { host, popupRef } = usePopup({
		open,
		anchorRef: triggerRef,
		container: useLayerContainer(),
		modal: enterModal,
	});
	const composedRef = useComposedRefs(ref, listbox.ref, popupRef);
	const Component = asChild ? Slot : "div";
	// Why `open`: a closed list renders no options, so a page of closed
	// pickers holds no option elements in memory.
	return (
		host != null &&
		open &&
		createPortal(
			<>
				{/* Why: a touch screen reader has no Escape key, and a pick keeps this list open. */}
				<button type="button" tabIndex={-1} className="sr-only" onClick={() => setOpen(false)}>
					Dismiss popup
				</button>
				<Component
					{...props}
					{...listbox.listboxProps}
					aria-multiselectable
					ref={composedRef}
					data-slot={joinDataSlot(dataSlot, "multi-select-content")}
					data-state="open"
					className={cx(
						"border-popover bg-popover relative z-50 max-h-96 max-h-(--available-height) min-w-32 scrollbar overflow-y-scroll overflow-x-hidden overscroll-y-none rounded-md border shadow-md pt-1 pb-1 has-data-content-footer:pb-0 font-sans flex flex-col gap-px outline-hidden",
						sameWidth && "w-(--anchor-width)",
						className,
					)}
					onKeyDown={(event) => {
						// Why: a focused control in the footer, such as a button, closes the list on Escape too.
						if (event.key === "Escape") {
							setOpen(false);
						}
					}}
				>
					{children}
				</Component>
			</>,
			host,
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
type MultiSelectItemProps = Omit<ComponentProps<"div">, "value"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether the item is inert.
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
	value,
	ref,
	...props
}: MultiSelectItemProps) => {
	const { listbox } = useMultiSelectContext();
	const { selected, optionProps } = useOption(listbox, { value, disabled });

	const check = selected && (
		<span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			<Icon svg={<CheckIcon weight="bold" />} className="size-4 text-accent-600" />
		</span>
	);

	let content: ReactNode;
	if (asChild) {
		// Why clone here: the consumer's element becomes the option, with the label
		// div and the check inside it, so both keep their places.
		invariant(
			isValidElement<PropsWithChildren>(children),
			"When using `asChild`, MultiSelect.Item must be passed a single child as a JSX tag.",
		);
		content = cloneElement(
			children,
			{},
			<>
				{renderItemLabel(children.props.children)}
				{check}
			</>,
		);
	} else {
		content = (
			<>
				{renderItemLabel(children)}
				{check}
			</>
		);
	}

	const Component = asChild ? Slot : "div";
	return (
		<Component
			{...props}
			{...optionProps}
			data-slot={joinDataSlot(dataSlot, "multi-select-item")}
			className={cx(
				"relative mx-1 cursor-pointer rounded-md pl-2 pr-8 py-1.5 text-strong text-sm font-normal flex min-w-0 items-center gap-2",
				"[[role=option]+&]:mt-px",
				"data-highlighted:bg-active-menu-item",
				"aria-disabled:opacity-50",
				"aria-selected:bg-selected-menu-item aria-selected:data-highlighted:bg-active-selected-menu-item",
				className,
			)}
			ref={ref}
		>
			{content}
		</Component>
	);
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
 * Renders a sticky footer pinned to the bottom inside `MultiSelect.Content`,
 * with a separator border at the top.
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
	return (
		<div
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "multi-select-content-footer")}
			data-content-footer
			className={cx("bg-popover sticky bottom-0 border-t border-popover", className)}
			{...props}
		>
			{children}
		</div>
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
