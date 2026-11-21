"use client";

import { createContext, use, useCallback, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type {
	ComponentProps,
	ElementType,
	FocusEvent,
	KeyboardEvent,
	MouseEvent,
	PointerEvent,
	PropsWithChildren,
	Ref,
} from "react";
import { createStore, useStoreValue } from "../../behaviors/store.js";
import type { Store } from "../../behaviors/store.js";
import { useControllableState } from "../../behaviors/use-controllable-state.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { FieldControlContext } from "../field/field-context.js";
import { RadioItemContext, type RadioItemContextValue } from "./radio-item-context.js";

/**
 * How the group tells two values apart: a key of an object value, or a
 * function. With neither, values compare with `Object.is`.
 */
type ByComparator<T> =
	| (NonNullable<T> extends object ? keyof NonNullable<T> & string : never)
	| ((a: T, b: T) => boolean);

/**
 * The props of the radio group root that `RadioGroup` and `SegmentedControl`
 * share.
 */
type RootProps<T = string> = PropsWithChildren<
	Omit<ComponentProps<"div">, "children" | "defaultValue" | "onChange" | "ref">
> & {
	/** The controlled value. Pair with `onChange`. */
	value?: T;
	/** The value on first render, for an uncontrolled group. A form reset returns to it. */
	defaultValue?: T;
	/** Event handler called when the user checks an item. */
	onChange?(value: T): void;
	/** How to compare two values. */
	by?: ByComparator<T>;
	/** Whether every item is inert. */
	disabled?: boolean;
	/** The name of a hidden input that submits the value with its form. */
	name?: string;
	/** The `id` of the form the hidden input belongs to, when the group sits outside it. */
	form?: string;
	ref?: Ref<HTMLElement>;
} & WithDataSlot;

/** The state of one radio item, which its parts read in place of CSS classes. */
type RadioStateContextValue = {
	autofocus: boolean;
	checked: boolean;
	disabled: boolean;
	focus: boolean;
	hover: boolean;
};

const RadioStateContext = createContext<RadioStateContextValue>({
	autofocus: false,
	checked: false,
	disabled: false,
	focus: false,
	hover: false,
});

type GroupContextValue = {
	isChecked: (value: unknown) => boolean;
	select: (value: unknown) => void;
	disabled: boolean;
	/** The `id` of the one item that takes Tab, which the DOM decides after each commit. */
	tabStop: Store<{ id: string | null }>;
	syncTabStop: (group: Element | null) => void;
	values: Map<Element, unknown>;
};

const GroupContext = createContext<GroupContextValue | null>(null);

const ENABLED_RADIO = '[role="radio"]:not([aria-disabled="true"])';

const getRadios = (group: Element): HTMLElement[] =>
	Array.from(group.querySelectorAll<HTMLElement>(ENABLED_RADIO)).filter(
		(radio) => radio.closest('[role="radiogroup"]') === group,
	);

const compareWith =
	<T,>(by: ByComparator<T> | undefined) =>
	(a: T, b: T): boolean => {
		if (typeof by === "function") {
			return by(a, b);
		}
		if (typeof by === "string" && a != null && b != null) {
			// Why the record view: `by` names a key of an object value.
			return Reflect.get(Object(a), by) === Reflect.get(Object(b), by);
		}
		return Object.is(a, b);
	};

/**
 * The radio group itself: the WAI-ARIA radio group pattern with one Tab stop,
 * arrow keys that move and check, and Space that checks. It renders a hidden
 * input for form submission when it has a `name`. The caller sets `data-slot`
 * and the styles.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 */
const Root = <T = string,>({
	by,
	children,
	defaultValue,
	disabled = false,
	form,
	name,
	// oxlint-disable-next-line typescript/unbound-method -- Why: method syntax keeps `onChange` bivariant, so a `(value: string) => void` fits; it never reads `this`.
	onChange,
	onKeyDown,
	ref,
	value: valueProp,
	...props
}: RootProps<T>) => {
	const [value, setValue] = useControllableState<T | undefined>({
		value: valueProp,
		defaultValue,
		onChange: (next) => {
			if (next !== undefined) {
				onChange?.(next);
			}
		},
	});
	const [tabStop] = useState(() => createStore<{ id: string | null }>({ id: null }));
	const [values] = useState<Map<Element, unknown>>(() => new Map());
	// Why the assertion: an item takes its value as `unknown`, because a context
	// cannot carry the group's type parameter, and each item value comes from the
	// same caller as the group's `T`.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Why: the context erases T, see above.
	const asValue = useCallback((candidate: unknown): T => candidate as T, []);
	const resetToDefault = () => setValue(defaultValue);

	const context = useMemo<GroupContextValue>(
		() => ({
			disabled,
			isChecked: (candidate) => value !== undefined && compareWith(by)(value, asValue(candidate)),
			// Why flushSync: a check is one discrete user action, and code that reads
			// `aria-checked` right after `click()`, such as the SegmentedControl drag,
			// sees the new state at once.
			select: (candidate) => flushSync(() => setValue(asValue(candidate))),
			tabStop,
			syncTabStop: (group) => {
				if (group == null) {
					return;
				}
				const radios = getRadios(group);
				const checked = radios.find((radio) => radio.getAttribute("aria-checked") === "true");
				tabStop.set({ id: (checked ?? radios[0])?.id ?? null });
			},
			values,
		}),
		[disabled, value, by, setValue, tabStop, values, asValue],
	);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		const radio =
			event.target instanceof HTMLElement
				? event.target.closest<HTMLElement>('[role="radio"]')
				: null;
		if (event.defaultPrevented || radio == null || event.altKey || event.ctrlKey || event.metaKey) {
			return;
		}
		const radios = getRadios(event.currentTarget);
		const index = radios.indexOf(radio);
		const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
		if (step != null) {
			event.preventDefault();
			const next = radios.at((index + step) % radios.length);
			next?.focus();
			if (next != null && values.has(next)) {
				setValue(asValue(values.get(next)));
			}
			return;
		}
		if (event.key === " " && index !== -1) {
			event.preventDefault();
			setValue(asValue(values.get(radio)));
			return;
		}
		if (event.key === "Enter") {
			radio.closest("form")?.requestSubmit();
		}
	};

	return (
		<GroupContext value={context}>
			{/* oxlint-disable-next-line jsx-a11y/interactive-supports-focus -- Why: focus lives on the radios, one Tab stop by roving tabindex. */}
			<div
				role="radiogroup"
				aria-disabled={disabled || undefined}
				data-disabled={disabled ? "" : undefined}
				{...props}
				onKeyDown={handleKeyDown}
				ref={(node) => {
					const cleanupRef = setForwardedRef(ref, node);
					// Why a ref callback: a form reset returns an uncontrolled group to
					// `defaultValue`, and the listener lives as long as the group.
					const owner =
						form == null ? node?.closest("form") : node?.ownerDocument.getElementById(form);
					owner?.addEventListener("reset", resetToDefault);
					return () => {
						owner?.removeEventListener("reset", resetToDefault);
						cleanupRef();
					};
				}}
			>
				{children}
			</div>
			{name != null && value != null && (
				<input type="hidden" name={name} form={form} value={String(value)} />
			)}
		</GroupContext>
	);
};

/** Sets a forwarded ref and returns how to clear it. */
const setForwardedRef = <E,>(ref: Ref<E> | undefined, node: E | null): (() => void) => {
	if (typeof ref === "function") {
		const cleanup = ref(node);
		return typeof cleanup === "function" ? cleanup : () => ref(null);
	}
	if (ref != null) {
		ref.current = node;
		return () => {
			ref.current = null;
		};
	}
	return () => {};
};

/** Joins element ids into one IDREF list, or `undefined` when there are none. */
function joinIds(ids: readonly (string | undefined)[]): string | undefined {
	const present = ids.filter((id): id is string => id != null && id !== "");
	return present.length > 0 ? present.join(" ") : undefined;
}

/**
 * A list of registered element ids and a stable callback that adds one and
 * returns the cleanup that removes it.
 */
function useRegisteredIds(): [readonly string[], (id: string) => () => void] {
	const [ids, setIds] = useState<readonly string[]>([]);
	const register = useCallback((id: string) => {
		setIds((current) => [...current, id]);
		return () => {
			setIds((current) => current.filter((candidate) => candidate !== id));
		};
	}, []);
	return [ids, register];
}

/**
 * The props of a radio item that `RadioGroup` and `SegmentedControl` share.
 */
type ItemProps = Omit<ComponentProps<"div">, "children" | "ref"> &
	PropsWithChildren & {
		/** The element to render. */
		as?: ElementType;
		/** Focus this item on mount. */
		autoFocus?: boolean;
		/** Whether this item is inert. */
		disabled?: boolean;
		/** The value the group takes when this item is checked. */
		value: unknown;
		ref?: Ref<HTMLDivElement>;
	} & WithDataSlot;

/**
 * One `role="radio"` item of a `Root`. It publishes its state through
 * {@link RadioStateContext}, and `RadioItemContext` so `Choice.Title` and
 * `Choice.Description` can name and describe it. It also takes
 * `aria-describedby`, `aria-invalid`, and `aria-errormessage` from a
 * surrounding `Field.Control`. The caller sets `data-slot` and the styles.
 */
const Item = ({
	as: Tag = "div",
	autoFocus = false,
	children,
	disabled: disabledProp = false,
	id: idProp,
	onBlur,
	onClick,
	onFocus,
	onPointerEnter,
	onPointerLeave,
	ref,
	value,
	...props
}: ItemProps) => {
	const group = use(GroupContext);
	if (group == null) {
		throw new Error("A radio item must be rendered inside a radio group root.");
	}
	const fallbackId = useId();
	const id = idProp ?? fallbackId;
	const fieldControl = use(FieldControlContext);
	const [labelIds, registerLabelId] = useRegisteredIds();
	const [descriptionIds, registerDescriptionId] = useRegisteredIds();
	const itemContext = useMemo<RadioItemContextValue>(
		() => ({ registerLabelId, registerDescriptionId }),
		[registerLabelId, registerDescriptionId],
	);
	const focusedOnMount = useRef(false);
	const [focus, setFocus] = useState(false);
	const [hover, setHover] = useState(false);
	const checked = group.isChecked(value);
	const disabled = group.disabled || disabledProp;
	const isTabStop = useStoreValue(group.tabStop, (state) => state.id === id);
	const state = useMemo<RadioStateContextValue>(
		() => ({
			autofocus: autoFocus,
			checked,
			disabled,
			focus: focus && !disabled,
			hover: hover && !disabled,
		}),
		[autoFocus, checked, disabled, focus, hover],
	);

	return (
		<Tag
			{...props}
			id={id}
			role="radio"
			aria-checked={checked}
			aria-disabled={disabled || undefined}
			tabIndex={!disabled && (checked || isTabStop) ? 0 : -1}
			data-checked={checked ? "" : undefined}
			data-disabled={disabled ? "" : undefined}
			data-focus={state.focus ? "" : undefined}
			data-hover={state.hover ? "" : undefined}
			data-autofocus={autoFocus ? "" : undefined}
			{...(fieldControl
				? {
						"aria-errormessage": fieldControl["aria-errormessage"],
						"aria-invalid": fieldControl["aria-invalid"],
					}
				: undefined)}
			aria-labelledby={joinIds(labelIds)}
			aria-describedby={joinIds([fieldControl?.["aria-describedby"], ...descriptionIds])}
			onClick={(event: MouseEvent<HTMLDivElement>) => {
				onClick?.(event);
				if (!disabled && !event.defaultPrevented) {
					group.select(value);
				}
			}}
			onFocus={(event: FocusEvent<HTMLDivElement>) => {
				onFocus?.(event);
				// Why focus-visible: the focus state draws a ring for keyboard focus only.
				setFocus(event.currentTarget.matches(":focus-visible"));
			}}
			onBlur={(event: FocusEvent<HTMLDivElement>) => {
				onBlur?.(event);
				setFocus(false);
			}}
			onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
				onPointerEnter?.(event);
				setHover(event.pointerType !== "touch");
			}}
			onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
				onPointerLeave?.(event);
				setHover(false);
			}}
			ref={(node: HTMLDivElement | null) => {
				const cleanupRef = setForwardedRef(ref, node);
				if (node == null) {
					return cleanupRef;
				}
				// Why a ref callback: the one Tab stop depends on which items are in the
				// DOM, checked, and enabled after this commit.
				const owner = node.closest('[role="radiogroup"]');
				if (autoFocus && !focusedOnMount.current) {
					focusedOnMount.current = true;
					node.focus();
				}
				group.values.set(node, value);
				group.syncTabStop(owner);
				return () => {
					group.values.delete(node);
					group.syncTabStop(owner);
					cleanupRef();
				};
			}}
		>
			<RadioItemContext value={itemContext}>
				<RadioStateContext value={state}>{children}</RadioStateContext>
			</RadioItemContext>
		</Tag>
	);
};

export {
	//,
	Item,
	RadioStateContext,
	Root,
};

export type {
	//,
	ItemProps,
	RadioStateContextValue,
	RootProps,
};
