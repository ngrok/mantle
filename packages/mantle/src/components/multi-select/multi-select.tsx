"use client";

import * as Primitive from "@ariakit/react";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { LockIcon } from "@phosphor-icons/react/Lock";
import { XIcon } from "@phosphor-icons/react/X";
import type {
	ComponentProps,
	ComponentPropsWithoutRef,
	ComponentRef,
	KeyboardEvent,
	ReactNode,
	RefObject,
} from "react";
import {
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon } from "../icon/icon.js";
import type { WithValidation } from "../input/types.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";

/** Type guard to safely narrow Ariakit store state to `string[]` without `as` assertions. */
const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string");

/** Stable empty array used as a fallback for `selectedValues` to avoid creating new arrays on every render. */
const EMPTY_ARRAY: string[] = [];

const TriggerRefContext = createContext<RefObject<HTMLDivElement | null>>({ current: null });

/**
 * Shared ref for locked values. Written by `TagValues` during render so that `Item` can read
 * it synchronously and prevent deselection of locked values from the popover.
 * Using a ref (instead of state) avoids re-renders and keeps the write safe in render.
 */
const LockedValuesContext = createContext<{ current: string[] }>({ current: [] });

/**
 * Bridges keyboard-nav state between `TagValues` and `Input`, which are siblings in the tree
 * and cannot communicate via a context that either one provides — it must come from a shared
 * ancestor (`Root`). Both refs are written by one side and read by the other:
 *   - `onInputKeyDownRef`: written by `TagValues`, called by `Input` on keydown
 *   - `inputRef`: written by `Input` (registers its DOM node), read by `TagValues` (to focus it)
 */
type TagBridgeContextValue = {
	onInputKeyDownRef: { current: ((event: KeyboardEvent<HTMLInputElement>) => void) | undefined };
	inputRef: { current: HTMLInputElement | null };
};

const TagBridgeContext = createContext<TagBridgeContextValue>({
	onInputKeyDownRef: { current: undefined },
	inputRef: { current: null },
});

type MultiSelectProps = Primitive.ComboboxProviderProps<string[]>;

/**
 * Root component for a multi-select combobox. Provides state management for
 * selecting multiple values with typeahead filtering.
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
const Root = ({ children, defaultSelectedValue = [], ...props }: MultiSelectProps) => {
	const triggerRef = useRef<HTMLDivElement | null>(null);
	const onInputKeyDownRef = useRef<((event: KeyboardEvent<HTMLInputElement>) => void) | undefined>(
		undefined,
	);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const lockedValuesRef = useRef<string[]>([]);
	const tagBridge = useMemo(() => ({ onInputKeyDownRef, inputRef }), []);

	return (
		<TriggerRefContext.Provider value={triggerRef}>
			<TagBridgeContext.Provider value={tagBridge}>
				<LockedValuesContext.Provider value={lockedValuesRef}>
					<Primitive.ComboboxProvider<string[]>
						defaultSelectedValue={defaultSelectedValue}
						{...props}
					>
						{children}
					</Primitive.ComboboxProvider>
				</LockedValuesContext.Provider>
			</TagBridgeContext.Provider>
		</TriggerRefContext.Provider>
	);
};
Root.displayName = "MultiSelect";

type MultiSelectTriggerProps = ComponentPropsWithoutRef<"div"> & WithValidation;

/**
 * The trigger container for the multi-select. Wraps the input and selected
 * value tags in a styled container that looks like a form input.
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
const Trigger = forwardRef<HTMLDivElement, MultiSelectTriggerProps>(
	(
		{
			"aria-invalid": _ariaInvalid,
			className,
			children,
			onKeyDown,
			onMouseDown,
			validation: _validation,
			...props
		},
		ref,
	) => {
		const triggerRef = useContext(TriggerRefContext);
		const { inputRef } = useContext(TagBridgeContext);
		const store = Primitive.useComboboxContext();
		const isInvalid = _ariaInvalid != null && _ariaInvalid !== "false";
		const validation = isInvalid
			? "error"
			: typeof _validation === "function"
				? _validation()
				: _validation;

		return (
			<div
				role="group"
				data-slot="multi-select-trigger"
				className={cx(
					"cursor-text select-none font-sans text-sm",
					"border-form bg-form text-strong flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-3 py-1 has-[[data-slot=multi-select-tag]]:px-1",
					"has-focus:outline-hidden has-focus-within:ring-4 has-aria-expanded:ring-4",
					"has-focus-within:border-accent-600 has-focus-within:ring-focus-accent has-aria-expanded:border-accent-600 has-aria-expanded:ring-focus-accent",
					"data-validation-success:border-success-600 data-validation-success:has-focus-within:border-success-600 data-validation-success:has-focus-within:ring-focus-success data-validation-success:has-aria-expanded:border-success-600 data-validation-success:has-aria-expanded:ring-focus-success",
					"data-validation-warning:border-warning-600 data-validation-warning:has-focus-within:border-warning-600 data-validation-warning:has-focus-within:ring-focus-warning data-validation-warning:has-aria-expanded:border-warning-600 data-validation-warning:has-aria-expanded:ring-focus-warning",
					"data-validation-error:border-danger-600 data-validation-error:has-focus-within:border-danger-600 data-validation-error:has-focus-within:ring-focus-danger data-validation-error:has-aria-expanded:border-danger-600 data-validation-error:has-aria-expanded:ring-focus-danger",
					className,
				)}
				data-validation={validation || undefined}
				onKeyDown={(event) => {
					if (event.key === "Escape" && store?.getState().open) {
						event.preventDefault();
						store.hide();
					}
					onKeyDown?.(event);
				}}
				onMouseDown={(event) => {
					// When clicking on non-interactive areas (padding, flex gaps between tags), prevent the
					// default mousedown behavior (which would cause text selection) and explicitly focus the
					// input. Clicks on buttons, the input itself, or tag spans are handled by those elements.
					if (
						event.target instanceof HTMLElement &&
						!event.target.closest("button, input, [role='option']")
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
		);
	},
);
Trigger.displayName = "MultiSelectTrigger";

type TagProps = Omit<ComponentProps<"span">, "children"> & {
	/**
	 * The value to display in the tag label.
	 */
	value: string;
	/**
	 * Called when the remove button is clicked.
	 */
	onRemove?: () => void;
	/**
	 * When true, the tag cannot be removed. The remove button is disabled and
	 * Delete/Backspace key presses are ignored while the tag is focused.
	 */
	locked?: boolean;
};

/**
 * The default tag rendered inside `MultiSelect.TagValues` for each selected value.
 * Displays the value label with a remove button and full keyboard navigation support.
 *
 * Use this when building a custom `TagValues`-like component and you want the
 * default tag chrome with consistent styling.
 *
 * @example
 * ```tsx
 * <MultiSelect.Tag value="apple" />
 * ```
 */
const Tag = forwardRef<HTMLSpanElement, TagProps>(
	({ className, value, onRemove, locked = false, onKeyDown, ...props }, ref) => {
		const internalRef = useRef<HTMLSpanElement | null>(null);

		return (
			<span
				ref={composeRefs(internalRef, ref)}
				role="option"
				aria-selected
				tabIndex={-1}
				data-slot="multi-select-tag"
				data-locked={locked || undefined}
				className={cx(
					"cursor-default bg-neutral-500/10 border border-neutral-500/20 rounded-xs text-strong inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 text-sm font-normal",
					"focus-visible:outline-hidden focus-visible:border-accent-600/50 focus-visible:ring-3 focus-visible:ring-focus-accent",
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
					<Icon svg={locked ? <LockIcon /> : <XIcon weight="bold" />} className="size-4" />
				</button>
			</span>
		);
	},
);
Tag.displayName = "MultiSelectTag";

/**
 * Props passed to the children render function of `MultiSelect.TagValues`.
 * Spread these onto `MultiSelect.Tag` (or your own tag component) to
 * get the value, remove handler, locked state, and ref-based keyboard-nav
 * registration all wired up automatically.
 *
 * Pre-wired handlers included:
 * - `onKeyDown` — arrow-key nav between tags, Backspace/Delete to remove
 * - `onClick` — focuses the tag and ensures the popover opens/stays open
 */
type TagRenderProps = TagProps & {
	/** Ref callback — forward this to the tag element to enable keyboard navigation between tags. */
	ref: (node: HTMLSpanElement | null) => void;
};

type MultiSelectTagValuesProps = {
	/**
	 * Values that cannot be removed. Locked tags have their remove button disabled,
	 * respond to Backspace/Delete key presses with a shake animation, and shake when
	 * Backspace is pressed on an empty input.
	 *
	 * The `locked` state is also forwarded to the render function via `props.locked`
	 * so custom tag components receive it automatically.
	 */
	lockedValues?: string[];
	/**
	 * Optional render function for each tag. Receives `{ value, onRemove, locked, ref }` —
	 * spread these onto `MultiSelect.Tag` (or your own element) for full keyboard-nav support.
	 * When omitted, the default `MultiSelect.Tag` is rendered for each selected value.
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
const TagValues = ({ children, lockedValues = [] }: MultiSelectTagValuesProps) => {
	const store = Primitive.useComboboxContext();
	const rawSelectedValue = Primitive.useStoreState(store, "selectedValue");
	const selectedValues = isStringArray(rawSelectedValue) ? rawSelectedValue : undefined;
	const selectedArray = selectedValues ?? EMPTY_ARRAY;
	// Keep refs in sync so requestAnimationFrame callbacks always read fresh state
	// instead of closing over stale values from the render they were scheduled in.
	const selectedArrayRef = useRef<string[]>(selectedArray);
	selectedArrayRef.current = selectedArray;
	// Use the shared LockedValuesContext ref so Item can also read locked values
	// without a separate prop. Writing a ref during render is safe here because
	// refs are mutable and don't trigger re-renders.
	const lockedValuesRef = useContext(LockedValuesContext);
	lockedValuesRef.current = lockedValues;
	const lockedValuesSet = useMemo(() => new Set(lockedValues), [lockedValues]);
	const tagRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
	const { onInputKeyDownRef, inputRef } = useContext(TagBridgeContext);
	// Track pending rAF IDs so we can cancel them on unmount and avoid calling
	// focus() on detached DOM nodes if the component unmounts mid-frame.
	const pendingRafsRef = useRef<Set<number>>(new Set());
	useEffect(
		() => () => {
			pendingRafsRef.current.forEach(cancelAnimationFrame);
		},
		[],
	);
	const raf = (callback: () => void): void => {
		let id: number;
		id = requestAnimationFrame(() => {
			// Remove the id once the rAF has fired so the set doesn't grow unbounded.
			pendingRafsRef.current.delete(id);
			callback();
		});
		pendingRafsRef.current.add(id);
	};

	const removeValue = (value: string) => {
		if (store) {
			const selected = store.getState().selectedValue;
			if (!isStringArray(selected)) {
				return;
			}
			store.setSelectedValue(selected.filter((v) => v !== value));
		}
	};

	const focusTag = (index: number) => {
		const value = selectedArrayRef.current[index];
		if (value == null) {
			return;
		}
		const tagElement = tagRefs.current.get(value);
		if (tagElement) {
			tagElement.focus();
			// Keep the popover open while a tag is focused. Ariakit closes the
			// popover when the combobox input loses focus, so we reopen it here.
			store?.show();
		}
	};

	const focusInput = () => {
		inputRef.current?.focus();
	};

	const handleTagKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
		const value = selectedArray[index];
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
				if (index < selectedArray.length - 1) {
					focusTag(index + 1);
				} else {
					focusInput();
				}
				break;
			}
			case "Backspace":
			case "Delete": {
				event.preventDefault();
				if (value != null) {
					// Respect locked values: shake instead of removing when locked.
					if (lockedValuesSet.has(value)) {
						const tagElement = tagRefs.current.get(value);
						if (tagElement) {
							shakeElement(tagElement);
						}
						break;
					}
					removeValue(value);
					// After removal, the array shifts. Focus the next logical tag or the input.
					if (event.key === "Backspace") {
						if (index > 0) {
							// Focus the previous tag (will have same index - 1 after removal)
							// We need to wait for the next render, so use requestAnimationFrame
							const prevIndex = index - 1;
							raf(() => focusTag(prevIndex));
						} else {
							raf(() => {
								if (selectedArrayRef.current.length > 0) {
									focusTag(0);
								} else {
									focusInput();
								}
							});
						}
					} else {
						// Delete: move focus right
						raf(() => {
							// index stays the same since the item at `index` was removed and the next one slides in
							if (index < selectedArrayRef.current.length) {
								focusTag(index);
							} else {
								focusInput();
							}
						});
					}
				}
				break;
			}
			case "ArrowUp":
			case "ArrowDown": {
				// Don't scroll the page. Instead, focus the input and forward the key
				// to Ariakit so it navigates the popover list.
				event.preventDefault();
				focusInput();
				inputRef.current?.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: event.key,
						bubbles: true,
						cancelable: true,
						shiftKey: event.shiftKey,
						ctrlKey: event.ctrlKey,
						metaKey: event.metaKey,
						altKey: event.altKey,
					}),
				);
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

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (
			event.key === "ArrowLeft" &&
			event.currentTarget.selectionStart === 0 &&
			event.currentTarget.selectionEnd === 0 &&
			selectedArray.length > 0
		) {
			event.preventDefault();
			focusTag(selectedArray.length - 1);
			return;
		}
		if (event.key === "Backspace" && event.currentTarget.value === "" && selectedArray.length > 0) {
			const lastValue = selectedArray[selectedArray.length - 1];
			if (lastValue != null) {
				if (lockedValuesRef.current.includes(lastValue)) {
					// The last tag is locked — shake it to signal that removal is blocked.
					const tagElement = tagRefs.current.get(lastValue);
					if (tagElement) {
						shakeElement(tagElement);
					}
				} else {
					removeValue(lastValue);
				}
			}
		}
	};

	// Write the latest handler into the bridge ref so Input can call it via onKeyDown.
	// Assigned directly during render (safe — refs are mutable and don't trigger re-renders).
	onInputKeyDownRef.current = handleInputKeyDown;

	return (
		<>
			{selectedArray.map((value, index) => {
				const tagOptionProps: TagRenderProps = {
					value,
					locked: lockedValuesSet.has(value),
					onRemove: () => {
						// Respect locked values: shake instead of removing when locked.
						// This guards custom tag renderers that call onRemove directly.
						if (lockedValuesSet.has(value)) {
							const tagElement = tagRefs.current.get(value);
							if (tagElement) {
								shakeElement(tagElement);
							}
							return;
						}
						removeValue(value);
					},
					ref: (node: HTMLSpanElement | null) => {
						if (node) {
							tagRefs.current.set(value, node);
						} else {
							tagRefs.current.delete(value);
						}
					},
					onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => handleTagKeyDown(event, index),
					// Ensure the popover opens/stays open when a tag is clicked,
					// including when the component was fully blurred before the click.
					onClick: () => focusTag(index),
				};

				if (children) {
					return children(tagOptionProps);
				}

				return <Tag key={value} {...tagOptionProps} />;
			})}
		</>
	);
};
TagValues.displayName = "MultiSelectTagValues";

type MultiSelectInputProps = Omit<Primitive.ComboboxProps, "render"> & {
	/**
	 * Called with the raw string value whenever the input text changes.
	 * Use this to drive external filtering (e.g. with matchSorter) without
	 * having to unwrap the DOM event. A convenience alternative to `onChange`.
	 */
	onValueChange?: (value: string) => void;
};

/**
 * The combobox input for filtering items. Place this inside `MultiSelect.Trigger`,
 * after `MultiSelect.TagValues`.
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
const Input = forwardRef<ComponentRef<"input">, MultiSelectInputProps>(
	(
		{ className, onBlur, onChange, onFocus, onKeyDown, onValueChange, placeholder, ...props },
		ref,
	) => {
		const store = Primitive.useComboboxContext();
		const { onInputKeyDownRef, inputRef } = useContext(TagBridgeContext);
		const rawSelectedValue = Primitive.useStoreState(store, "selectedValue");
		const selectedValues = isStringArray(rawSelectedValue) ? rawSelectedValue : undefined;
		const hasSelectedValues = (selectedValues?.length ?? 0) > 0;

		return (
			<Primitive.Combobox
				autoSelect
				data-slot="multi-select-input"
				className={cx(
					"pointer-coarse:text-base min-w-20 flex-1 select-text border-0 bg-transparent text-sm outline-hidden",
					"placeholder:select-none placeholder:text-placeholder",
					className,
				)}
				onChange={(event) => {
					onValueChange?.(event.target.value);
					onChange?.(event);
				}}
				onKeyDown={(event) => {
					onInputKeyDownRef.current?.(event);
					onKeyDown?.(event);
				}}
				onBlur={(event) => {
					// When focus moves from the input to a tag, Ariakit would normally
					// close the popover because the combobox input lost focus. Keep it
					// open so the user can see the list while navigating tags.
					if (
						event.relatedTarget instanceof HTMLElement &&
						event.relatedTarget.closest('[data-slot="multi-select-tag"]')
					) {
						store?.show();
					}
					onBlur?.(event);
				}}
				onFocus={(event) => {
					// Ariakit doesn't always open the popover on focus when the input is
					// already mounted (e.g. returning focus from a tag). Force it open.
					store?.show();
					onFocus?.(event);
				}}
				placeholder={hasSelectedValues ? undefined : placeholder}
				// Register the input's DOM node in the bridge so TagValues can focus it for keyboard nav.
				ref={composeRefs(inputRef, ref)}
				{...props}
			/>
		);
	},
);
Input.displayName = "MultiSelectInput";

type MultiSelectContentProps = Omit<Primitive.ComboboxPopoverProps, "render"> & WithAsChild;

/**
 * Renders a popover that contains multi-select content, such as items, groups,
 * and separators. Opens below the trigger.
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
const Content = forwardRef<ComponentRef<"div">, MultiSelectContentProps>(
	(
		{
			asChild = false,
			backdrop = false,
			children,
			className,
			modal = true,
			portalElement,
			sameWidth = true,
			unmountOnHide = true,
			...props
		},
		ref,
	) => {
		const triggerRef = useContext(TriggerRefContext);

		const getAnchorRect = useCallback(() => {
			return triggerRef.current?.getBoundingClientRect() ?? null;
		}, [triggerRef]);

		const getPortalElement = useCallback(
			(element: HTMLElement) => {
				if (typeof portalElement === "function") {
					return portalElement(element);
				}

				return (
					portalElement ??
					triggerRef.current?.closest<HTMLElement>("[data-mantle-modal-content]") ??
					element.ownerDocument.body
				);
			},
			[portalElement, triggerRef],
		);

		const hideOnInteractOutside = useCallback(
			(event: Event) => {
				// Keep the popover open when interacting with any part of the trigger
				// (tags, buttons, input, padding). Ariakit would otherwise close on any
				// mousedown outside the popover — including tag clicks.
				if (event.target instanceof Node && triggerRef.current?.contains(event.target)) {
					return false;
				}
				return true;
			},
			[triggerRef],
		);

		return (
			<Primitive.ComboboxPopover
				data-slot="multi-select-content"
				className={cx(
					"border-popover bg-popover relative z-50 max-h-96 min-w-32 scrollbar overflow-y-scroll overflow-x-hidden overscroll-y-none rounded-md border shadow-md pt-1 pb-1 has-data-content-footer:pb-0 font-sans flex flex-col gap-px focus:outline-hidden",
					className,
				)}
				backdrop={backdrop}
				getAnchorRect={getAnchorRect}
				gutter={4}
				hideOnInteractOutside={hideOnInteractOutside}
				modal={modal}
				portalElement={getPortalElement}
				ref={ref}
				render={
					asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined
				}
				sameWidth={sameWidth}
				unmountOnHide={unmountOnHide}
				{...props}
			>
				{children}
			</Primitive.ComboboxPopover>
		);
	},
);
Content.displayName = "MultiSelectContent";

type MultiSelectItemProps = Omit<Primitive.ComboboxItemProps, "render"> & WithAsChild;

/**
 * Renders a selectable item inside a `MultiSelect.Content` component.
 * Items display a checkbox indicator when selected.
 *
 * @example
 * ```tsx
 * <MultiSelect.Content>
 *   <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   <MultiSelect.Item value="banana">Banana</MultiSelect.Item>
 * </MultiSelect.Content>
 * ```
 */
const Item = forwardRef<ComponentRef<"div">, MultiSelectItemProps>(
	(
		{ asChild = false, children, className, focusOnHover = true, value, onClick, ...props },
		ref,
	) => {
		const lockedValuesRef = useContext(LockedValuesContext);
		const isLocked = value != null && lockedValuesRef.current.includes(value);

		return (
			<Primitive.ComboboxItem
				data-slot="multi-select-item"
				className={cx(
					"relative mx-1 cursor-pointer rounded-md pl-2 pr-8 py-1.5 text-strong text-sm font-normal flex min-w-0 items-center gap-2",
					"[[role=option]+&]:mt-px",
					"data-active-item:bg-active-menu-item",
					"aria-disabled:opacity-50",
					"aria-selected:bg-selected-menu-item aria-selected:data-active-item:bg-active-selected-menu-item",
					className,
				)}
				focusOnHover={focusOnHover}
				onClick={(event) => {
					// Prevent Ariakit from toggling off a locked value.
					// Ariakit checks event.defaultPrevented before executing its selection logic.
					if (isLocked) {
						event.preventDefault();
						return;
					}
					onClick?.(event);
				}}
				ref={ref}
				render={
					asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined
				}
				resetValueOnSelect
				value={value}
				{...props}
			>
				{children}
				<Primitive.ComboboxItemCheck className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
					<Icon svg={<CheckIcon weight="bold" />} className="size-4 text-accent-600" />
				</Primitive.ComboboxItemCheck>
			</Primitive.ComboboxItem>
		);
	},
);
Item.displayName = "MultiSelectItem";

type MultiSelectGroupProps = Omit<Primitive.ComboboxGroupProps, "render"> & WithAsChild;

/**
 * Renders a group for MultiSelect.Item elements.
 *
 * @example
 * ```tsx
 * <MultiSelect.Content>
 *   <MultiSelect.Group>
 *     <MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *     <MultiSelect.Item value="banana">Banana</MultiSelect.Item>
 *   </MultiSelect.Group>
 * </MultiSelect.Content>
 * ```
 */
const Group = forwardRef<ComponentRef<"div">, MultiSelectGroupProps>(
	({ asChild = false, children, ...props }, ref) => {
		return (
			<Primitive.ComboboxGroup
				data-slot="multi-select-group"
				className="mx-1"
				ref={ref}
				render={
					asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined
				}
				{...props}
			>
				{children}
			</Primitive.ComboboxGroup>
		);
	},
);
Group.displayName = "MultiSelectGroup";

type MultiSelectGroupLabelProps = Omit<Primitive.ComboboxGroupLabelProps, "render"> & WithAsChild;

/**
 * Renders a label in a multi-select group.
 *
 * @example
 * ```tsx
 * <MultiSelect.Content>
 *   <MultiSelect.Group>
 *     <MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   </MultiSelect.Group>
 * </MultiSelect.Content>
 * ```
 */
const GroupLabel = forwardRef<ComponentRef<"div">, MultiSelectGroupLabelProps>(
	({ asChild = false, children, className, ...props }, ref) => {
		return (
			<Primitive.ComboboxGroupLabel
				data-slot="multi-select-group-label"
				className={cx("text-muted px-2 py-1 text-xs font-medium", className)}
				ref={ref}
				render={
					asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined
				}
				{...props}
			>
				{children}
			</Primitive.ComboboxGroupLabel>
		);
	},
);
GroupLabel.displayName = "MultiSelectGroupLabel";

type MultiSelectGroupDescriptionProps = ComponentPropsWithoutRef<"p">;

/**
 * Renders a description below a `MultiSelect.GroupLabel` inside a `MultiSelect.Group`.
 * Provides context about the group's purpose or constraints.
 *
 * @example
 * ```tsx
 * <MultiSelect.Group>
 *   <MultiSelect.GroupLabel>Regional Aliases</MultiSelect.GroupLabel>
 *   <MultiSelect.GroupDescription>
 *     Include all points of presence that are geographically within the region.
 *   </MultiSelect.GroupDescription>
 *   <MultiSelect.Item value="global">global</MultiSelect.Item>
 * </MultiSelect.Group>
 * ```
 */
const GroupDescription = forwardRef<HTMLParagraphElement, MultiSelectGroupDescriptionProps>(
	({ className, children, ...props }, ref) => {
		return (
			<p
				data-slot="multi-select-group-description"
				className={cx("text-muted px-2 pb-1 text-xs", className)}
				ref={ref}
				{...props}
			>
				{children}
			</p>
		);
	},
);
GroupDescription.displayName = "MultiSelectGroupDescription";

/**
 * Renders a separator between MultiSelect.Items or MultiSelect.Groups.
 *
 * @example
 * ```tsx
 * <MultiSelect.Content>
 *   <MultiSelect.Group>
 *     <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   </MultiSelect.Group>
 *   <MultiSelect.Separator />
 *   <MultiSelect.Group>
 *     <MultiSelect.Item value="carrot">Carrot</MultiSelect.Item>
 *   </MultiSelect.Group>
 * </MultiSelect.Content>
 * ```
 */
const MultiSelectSeparatorComponent = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
	<Separator
		data-slot="multi-select-separator"
		ref={ref}
		className={cx("my-1 w-auto", className)}
		{...props}
	/>
));
MultiSelectSeparatorComponent.displayName = "MultiSelectSeparator";

type MultiSelectEmptyProps = ComponentPropsWithoutRef<"div">;

/**
 * Renders a message when no items match the current filter.
 *
 * @example
 * ```tsx
 * <MultiSelect.Content>
 *   {matches.length === 0 && (
 *     <MultiSelect.Empty>No results found</MultiSelect.Empty>
 *   )}
 * </MultiSelect.Content>
 * ```
 */
const Empty = forwardRef<HTMLDivElement, MultiSelectEmptyProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div
				data-slot="multi-select-empty"
				className={cx("mx-1 text-muted px-2 py-6 text-center text-sm", className)}
				ref={ref}
				role="presentation"
				{...props}
			>
				{children}
			</div>
		);
	},
);
Empty.displayName = "MultiSelectEmpty";

type MultiSelectContentFooterProps = ComponentPropsWithoutRef<"div">;

/**
 * Renders a sticky footer pinned to the bottom inside `MultiSelect.Content`,
 * with a separator border at the top.
 *
 * @example
 * ```tsx
 * <MultiSelect.Content>
 *   <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
 *   <MultiSelect.ContentFooter>
 *     <p>Upgrade to unlock more options.</p>
 *     <Button>Upgrade</Button>
 *   </MultiSelect.ContentFooter>
 * </MultiSelect.Content>
 * ```
 */
const ContentFooter = forwardRef<HTMLDivElement, MultiSelectContentFooterProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				data-slot="multi-select-content-footer"
				data-content-footer
				className={cx("bg-popover sticky bottom-0 border-t border-popover", className)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
ContentFooter.displayName = "MultiSelectContentFooter";

/**
 * A multi-select combobox that allows users to select multiple values with
 * typeahead filtering. Selected values are displayed as removable tags.
 *
 * Built on top of Ariakit's Combobox primitives with full keyboard support
 * and WAI-ARIA compliance.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 * @see https://ariakit.org/components/combobox
 *
 * @example
 * Composition:
 * ```
 * MultiSelect.Root
 * ├── MultiSelect.Trigger
 * │   ├── MultiSelect.TagValues
 * │   └── MultiSelect.Input
 * └── MultiSelect.Content
 *     ├── MultiSelect.Group
 *     │   ├── MultiSelect.GroupLabel
 *     │   ├── MultiSelect.GroupDescription
 *     │   └── MultiSelect.Item
 *     ├── MultiSelect.Separator
 *     ├── MultiSelect.Empty
 *     └── MultiSelect.ContentFooter
 * ```
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
 *     <MultiSelect.Item value="cherry">Cherry</MultiSelect.Item>
 *   </MultiSelect.Content>
 * </MultiSelect.Root>
 * ```
 */
const MultiSelect = {
	/**
	 * Root component for a multi-select combobox. Provides state management for
	 * selecting multiple values with typeahead filtering.
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
	Root,
	/**
	 * The trigger container for the multi-select. Wraps the tags and input
	 * in a styled container.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Trigger>
	 *   <MultiSelect.TagValues />
	 *   <MultiSelect.Input placeholder="Select items..." />
	 * </MultiSelect.Trigger>
	 * ```
	 */
	Trigger,
	/**
	 * Renders the selected values as removable tags. Place this inside
	 * `MultiSelect.Trigger`, followed by `MultiSelect.Input`.
	 *
	 * Use `lockedValues` to prevent specific tags from being removed. Locked tags
	 * have their remove button disabled and shake when Backspace is pressed.
	 *
	 * @example
	 * ```tsx
	 * // Default tags with locking
	 * <MultiSelect.TagValues lockedValues={["global"]} />
	 *
	 * // Custom tags via children render function — locked is forwarded via props
	 * <MultiSelect.TagValues lockedValues={["global"]}>
	 *   {(props) => (
	 *     <MultiSelect.Tag key={props.value} {...props} />
	 *   )}
	 * </MultiSelect.TagValues>
	 * ```
	 */
	TagValues,
	/**
	 * The combobox input for filtering items. Place this inside
	 * `MultiSelect.Trigger`, after `MultiSelect.TagValues`.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Input placeholder="Select items..." />
	 * ```
	 */
	Input,
	/**
	 * The default tag rendered inside `MultiSelect.TagValues` for each selected value.
	 * Displays the value label with a remove button and keyboard navigation support.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Tag
	 *   value="apple"
	 *   onRemove={() => removeValue("apple")}
	 * />
	 * ```
	 */
	Tag,
	/**
	 * Renders a popover that contains multi-select content.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Content>
	 *   <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
	 * </MultiSelect.Content>
	 * ```
	 */
	Content,
	/**
	 * Renders a sticky footer pinned to the bottom inside `MultiSelect.Content`,
	 * with a separator border at the top.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.ContentFooter>
	 *   <p>Upgrade to unlock more options.</p>
	 * </MultiSelect.ContentFooter>
	 * ```
	 */
	ContentFooter,
	/**
	 * Renders a selectable item with a checkbox indicator inside a `MultiSelect.Content`.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
	 * ```
	 */
	Item,
	/**
	 * Renders a group for MultiSelect.Item elements.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Group>
	 *   <MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
	 *   <MultiSelect.Item value="apple">Apple</MultiSelect.Item>
	 * </MultiSelect.Group>
	 * ```
	 */
	Group,
	/**
	 * Renders a label in a multi-select group.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.GroupLabel>Fruits</MultiSelect.GroupLabel>
	 * ```
	 */
	GroupLabel,
	/**
	 * Renders a description below a `MultiSelect.GroupLabel` inside a `MultiSelect.Group`.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.GroupDescription>
	 *   Include all points of presence within the region.
	 * </MultiSelect.GroupDescription>
	 * ```
	 */
	GroupDescription,
	/**
	 * Renders a separator between items or groups.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Separator />
	 * ```
	 */
	Separator: MultiSelectSeparatorComponent,
	/**
	 * Renders a message when no items match the current filter.
	 *
	 * @example
	 * ```tsx
	 * <MultiSelect.Empty>No results found</MultiSelect.Empty>
	 * ```
	 */
	Empty,
} as const;

export {
	//,
	MultiSelect,
};

/**
 * Shakes an element left-right to signal that an action was blocked
 * (e.g. pressing Backspace/Delete on a locked tag). No-ops when the user
 * has enabled reduced motion in their OS/browser accessibility settings.
 */
function shakeElement(element: HTMLElement): void {
	// Skip the animation when the user has opted into reduced motion.
	// Called from event handlers only, so reading the media query imperatively
	// is safe and gives the freshest value without any hook plumbing.
	if (getPrefersReducedMotion()) {
		return;
	}

	element.animate(
		[
			{ transform: "translateX(0)" },
			{ transform: "translateX(-4px)" },
			{ transform: "translateX(4px)" },
			{ transform: "translateX(-4px)" },
			{ transform: "translateX(4px)" },
			{ transform: "translateX(0)" },
		],
		{ duration: 300, easing: "ease-in-out" },
	);
}
