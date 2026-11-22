"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef } from "react";
import type { ComponentProps, ReactNode, Ref } from "react";
import invariant from "tiny-invariant";
import { useRadioGroup } from "../../behaviors/use-radio-group.js";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { FieldControlContext } from "../field/field-context.js";
import { RadioItemContext } from "./radio-item-context.js";

/**
 * The props of the radio group root that `RadioGroup` and `SegmentedControl`
 * share.
 */
type RootProps = Omit<ComponentProps<"div">, "defaultValue" | "ref"> & {
	/** The checked value. Pair it with `onValueChange`. */
	value?: string;
	/** The checked value on first render, for an uncontrolled group. A form reset returns to it. */
	defaultValue?: string;
	/** The event handler called with the value of the item that the user checks. */
	onValueChange?: (value: string) => void;
	/** Whether every item is disabled. */
	disabled?: boolean;
	/** The form field name. With a name, a form submits the checked value. */
	name?: string;
	/** The `id` of the form the radios belong to, when the group sits outside it. Needs a `name`. */
	form?: string;
	/** Whether a form submits only when an item is checked. Needs a `name`. */
	required?: boolean;
	ref?: Ref<HTMLElement>;
} & WithDataSlot;

type GroupContextValue = {
	radio: ReturnType<typeof useRadioGroup>;
	form: string | undefined;
	required: boolean;
};

const GroupContext = createContext<GroupContextValue | null>(null);

/**
 * The checked value of the radio group around the caller.
 *
 * @example
 * ```ts
 * const value = useRadioGroupValue(); // "free"
 * ```
 */
function useRadioGroupValue(): string | undefined {
	return useContext(GroupContext)?.radio.value;
}

/**
 * The radio group itself: a `role="radiogroup"` `<div>` around native
 * `<input type="radio">` items that share one `name`. The browser owns the one
 * Tab stop, Space, form submission, `required`, and form reset. The root moves
 * the arrow keys itself, because WebKit does not wrap at either end and does
 * not swap left and right in right-to-left text. The caller sets `data-slot`
 * and the styles.
 */
const Root = ({
	children,
	defaultValue,
	disabled,
	form,
	name,
	onKeyDown,
	onValueChange,
	ref,
	required = false,
	value,
	...props
}: RootProps) => {
	const radio = useRadioGroup({ name, value, defaultValue, onValueChange, disabled });
	const generatedId = useId();
	const groupRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(ref, groupRef);
	const forEachRadio = (update: (input: HTMLInputElement) => void) => {
		for (const input of groupRef.current?.querySelectorAll<HTMLInputElement>("input") ?? []) {
			if (input.type === "radio" && input.name === radio.name) {
				update(input);
			}
		}
	};
	const keepCheckedOnReset = useCallbackRef(() =>
		forEachRadio((input) => {
			input.defaultChecked = input.checked;
		}),
	);
	const finishReset = useCallbackRef(() => {
		radio.setValue(defaultValue);
		// Why: a parent `onReset` can set a new `value` before the browser resets the radios,
		// so the radios take the value React shows after the reset.
		const shown = value === undefined ? defaultValue : value;
		forEachRadio((input) => {
			input.checked = input.value === shown;
		});
	});

	// Why an effect: the form owner can sit outside the group, so no element of the group can own the listener in a ref callback.
	useEffect(() => {
		const group = groupRef.current;
		const formOwner =
			form == null ? group?.closest("form") : group?.ownerDocument.getElementById(form);
		let timer: number | undefined;
		const handleReset = (event: Event) => {
			// Why: the browser resets each radio to its `checked` attribute, which React sets
			// only on mount. The radios keep the value React shows until React sets the new one.
			keepCheckedOnReset();
			// Why a task: a reset handler later in the dispatch can cancel the reset, and
			// a reset button resets the radios after the microtasks of its click.
			timer = window.setTimeout(() => {
				if (!event.defaultPrevented) {
					finishReset();
				}
			});
		};
		formOwner?.addEventListener("reset", handleReset);
		return () => {
			formOwner?.removeEventListener("reset", handleReset);
			window.clearTimeout(timer);
		};
	}, [finishReset, form, keepCheckedOnReset]);

	const context = useMemo<GroupContextValue>(
		() => ({
			radio,
			// Why a form id that matches no element: the radios of a group with no `name` then
			// have no form owner, so a form never submits the generated name.
			form: name ? form : `${generatedId}-no-form`,
			required,
		}),
		[radio, name, form, generatedId, required],
	);

	return (
		<GroupContext.Provider value={context}>
			{/* oxlint-disable-next-line jsx-a11y/interactive-supports-focus -- Why: focus lives on the native radios, which share one tab stop. */}
			<div
				role="radiogroup"
				{...props}
				onKeyDown={(event) => {
					onKeyDown?.(event);
					const target = event.target;
					if (
						event.defaultPrevented ||
						event.altKey ||
						event.ctrlKey ||
						event.metaKey ||
						!(target instanceof HTMLInputElement) ||
						target.type !== "radio"
					) {
						return;
					}
					const next = arrowTarget({ radio: target, key: event.key, group: event.currentTarget });
					if (next != null) {
						event.preventDefault();
						next.focus();
						// Why click: it checks the radio and fires the same change event an arrow key does.
						next.click();
					}
				}}
				ref={composedRef}
			>
				{children}
			</div>
		</GroupContext.Provider>
	);
};

/**
 * The enabled radio of the same group that an arrow key moves to, or `null`
 * for another key. The move wraps at either end. In right-to-left text, left
 * and right swap.
 *
 * @example
 * ```ts
 * // On the last enabled radio of "plan", ArrowDown wraps to the first one.
 * arrowTarget({ radio: lastRadio, key: "ArrowDown", group }); // firstRadio
 * ```
 */
function arrowTarget({
	radio,
	key,
	group,
}: {
	radio: HTMLInputElement;
	key: string;
	group: HTMLElement;
}): HTMLInputElement | null {
	const rtl = getComputedStyle(radio).direction === "rtl";
	const forward = key === "ArrowDown" || key === (rtl ? "ArrowLeft" : "ArrowRight");
	const backward = key === "ArrowUp" || key === (rtl ? "ArrowRight" : "ArrowLeft");
	if (!forward && !backward) {
		return null;
	}
	const radios = Array.from(
		group.querySelectorAll<HTMLInputElement>("input[type=radio]:enabled"),
	).filter((candidate) => candidate.name === radio.name);
	const index = radios.indexOf(radio);
	if (index === -1) {
		return null;
	}
	return radios.at((index + (forward ? 1 : -1)) % radios.length) ?? null;
}

/** The state of one radio item that its parts read. */
type RadioStateContextValue = {
	checked: boolean;
	disabled: boolean;
};

const RadioStateContext = createContext<RadioStateContextValue>({
	checked: false,
	disabled: false,
});

/** Joins element ids into one IDREF list, or `undefined` when there are none. */
function joinIds(ids: readonly (string | undefined)[]): string | undefined {
	const present = ids.filter((id): id is string => id != null && id !== "");
	return present.length > 0 ? present.join(" ") : undefined;
}

/**
 * The props of a radio item that `RadioGroup` and `SegmentedControl` share.
 * `id`, `autoFocus`, `aria-label`, `aria-labelledby`, `aria-describedby`,
 * `aria-invalid`, and `aria-errormessage` go to the native radio. The rest go
 * to the `<label>` that wraps it.
 */
type ItemProps = Omit<ComponentProps<"label">, "children" | "htmlFor"> & {
	children?: ReactNode;
	/** Whether this item is disabled. */
	disabled?: boolean;
	/** The value the group takes when the user checks this item. */
	value: string;
	/** Focus this item's radio on mount. */
	autoFocus?: boolean;
} & WithDataSlot;

type PrimitiveItemProps = ItemProps & {
	/** The item's own `data-slot`. The wrapper of its children takes `<part>-label`. */
	part: string;
};

/**
 * One item of a `Root`: a `<label>` around a native `<input type="radio">`
 * and the item's children. A click anywhere on the label checks the radio.
 * The radio is invisible and covers the label, so assistive technology
 * outlines the whole item. The caller sets the styles; read the radio's state
 * with `has-[>input:checked]:`, `has-[>input:disabled]:`, and
 * `has-[>input:focus-visible]:`.
 */
const Item = ({
	"aria-describedby": ariaDescribedBy,
	"aria-errormessage": ariaErrorMessage,
	"aria-invalid": ariaInvalid,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	autoFocus,
	children,
	className,
	"data-slot": dataSlot,
	disabled: disabledProp = false,
	id,
	part,
	value,
	...props
}: PrimitiveItemProps) => {
	const group = useContext(GroupContext);
	invariant(group, "A radio item must be rendered inside a radio group root.");
	const fieldControl = useContext(FieldControlContext);
	const generatedId = useId();
	const radioId = id ?? generatedId;
	const titleId = `${generatedId}-title`;
	const descriptionId = `${generatedId}-description`;
	const {
		checked,
		disabled,
		onChange: check,
		...radioProps
	} = group.radio.getRadioProps({
		value,
		disabled: disabledProp,
	});
	const itemContext = useMemo(() => ({ titleId, descriptionId }), [titleId, descriptionId]);
	const state = useMemo(() => ({ checked, disabled }), [checked, disabled]);

	return (
		<RadioItemContext.Provider value={itemContext}>
			<RadioStateContext.Provider value={state}>
				<label
					data-slot={joinDataSlot(dataSlot, part)}
					className={cx("relative", className)}
					{...props}
					htmlFor={radioId}
				>
					<input
						// Why the IDREFs to parts that may not render: an IDREF list with no element in the DOM is ignored, so the name falls back to the label's text.
						aria-describedby={joinIds([
							fieldControl?.["aria-describedby"],
							ariaDescribedBy,
							descriptionId,
						])}
						// oxlint-disable-next-line jsx-a11y/role-supports-aria-props -- Why: a screen reader announces the invalid state when a radio takes focus, and it does not read the group's state there.
						aria-errormessage={fieldControl?.["aria-errormessage"] ?? ariaErrorMessage}
						// oxlint-disable-next-line jsx-a11y/role-supports-aria-props -- Why: see `aria-errormessage` above.
						aria-invalid={fieldControl?.["aria-invalid"] ?? ariaInvalid}
						aria-label={ariaLabel}
						aria-labelledby={ariaLabelledBy ?? titleId}
						// oxlint-disable-next-line jsx-a11y/no-autofocus -- Why: the item passes the consumer's own `autoFocus` to its radio.
						autoFocus={autoFocus}
						{...radioProps}
						checked={checked}
						onChange={check}
						className="pointer-events-none absolute inset-0 m-0 size-full opacity-0"
						disabled={disabled}
						form={group.form}
						id={radioId}
						// Why: a click before hydration, or a choice the browser restores, checks a
						// radio that React does not know about. React keeps it, so the value follows it.
						ref={(input) => {
							if (input?.checked && !checked) {
								check();
							}
						}}
						required={group.required}
					/>
					{/* Why a wrapper: a lone text child beside the radio would lose React's repair after a browser translation. */}
					<span data-slot={`${part}-label`} className="contents">
						{children}
					</span>
				</label>
			</RadioStateContext.Provider>
		</RadioItemContext.Provider>
	);
};

export {
	//,
	Item,
	RadioStateContext,
	Root,
	useRadioGroupValue,
};

export type {
	//,
	ItemProps,
	RadioStateContextValue,
	RootProps,
};
