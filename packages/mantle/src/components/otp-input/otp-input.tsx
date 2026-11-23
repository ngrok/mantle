"use client";

import { MinusIcon } from "@phosphor-icons/react/Minus";
import type { ComponentProps, ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
import invariant from "tiny-invariant";
import { useControllableState } from "../../behaviors/use-controllable-state.js";
import type { WithAsChild } from "../../types/as-child.js";
import { $cssProperties } from "../../types/index.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { FieldControlContext } from "../field/field-context.js";
import { passwordManagerIgnoreProps } from "../input/password-manager-ignore.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { Validation, WithValidation } from "../field/validation.js";
import { Slot as AsChildSlot } from "../slot/index.js";
import type { OtpSelection } from "./otp-selection.js";
import { isSlotActive, otpState, slotSelection } from "./otp-selection.js";

/**
 * The color token name (`danger` / `success` / `warning`) that backs each
 * validation value. The `Validation` vocabulary (`"error"` / `"success"` /
 * `"warning"`) doesn't exactly match the color-token vocabulary: the
 * `error` validation maps to the `danger` color hue.
 */
type ValidationHue = "danger" | "success" | "warning";

const validationHues = {
	error: "danger",
	success: "success",
	warning: "warning",
} as const satisfies Record<Exclude<Validation, false>, ValidationHue>;

const validationBorderColor = (hue: ValidationHue) => `var(--color-${hue}-600)`;

const validationRingColor = (hue: ValidationHue) => `var(--ring-color-focus-${hue})`;

const textAlignClasses = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
} as const;

/** The value and selection that each `OtpInput.Slot` reads. */
type OtpInputContextValue = {
	value: string;
	selection: OtpSelection | null;
};

const OtpInputContext = createContext<OtpInputContextValue | null>(null);

/** The width of the gutter for a password manager badge beside the last slot, in px. */
const BADGE_GUTTER = 40;

/**
 * Whether the badge gutter fits between `box` and the nearest ancestor that
 * clips or scrolls horizontally, or the viewport. A gutter that does not fit
 * adds a scrollbar, or puts the badge in a clipped area.
 */
const fitsBadgeGutter = (box: HTMLElement): boolean => {
	const right = box.getBoundingClientRect().right;
	for (let element: HTMLElement | null = box; element != null; element = element.parentElement) {
		if (getComputedStyle(element).overflowX !== "visible") {
			return (
				element.getBoundingClientRect().left + element.clientLeft + element.clientWidth - right >=
				BADGE_GUTTER
			);
		}
	}
	return document.documentElement.clientWidth - right >= BADGE_GUTTER;
};

type OtpInputRootProps = Omit<
	ComponentProps<"input">,
	"children" | "maxLength" | "onChange" | "value"
> &
	WithValidation & {
		children?: ReactNode;
		/**
		 * The class of the element that holds the slots and the input.
		 */
		containerClassName?: string;
		/**
		 * The total number of character slots.
		 */
		maxLength: number;
		/**
		 * The CSS that shows the input when JavaScript is off, in a `<noscript>`. It
		 * selects the input with `[data-input-otp]`. When omitted, the input shows
		 * with mantle's form colors. `null` turns the fallback off.
		 */
		noScriptCSSFallback?: string | null;
		/**
		 * The new value, after each change.
		 */
		onChange?: (value: string) => void;
		/**
		 * The full value, when the value grows to `maxLength` characters: the user
		 * fills the final slot, or a parent sets the full value.
		 */
		onComplete?: (value: string) => void;
		/**
		 * Rewrites the pasted text before the input reads it, for example to remove
		 * dashes and spaces.
		 */
		pasteTransformer?: (pasted: string) => string;
		/**
		 * `"increase-width"` makes the input reach a 40px gutter past the last slot
		 * when the gutter fits, so a password manager draws its badge there and
		 * not over the last character. `"none"` keeps the input on the slots.
		 *
		 * @default "increase-width"
		 */
		pushPasswordManagerStrategy?: "increase-width" | "none";
		/**
		 * The text alignment of the input, which moves its invisible caret.
		 *
		 * @default "left"
		 */
		textAlign?: keyof typeof textAlignClasses;
		/**
		 * The controlled value.
		 */
		value?: string;
	} & WithDataSlot;

/**
 * The root of the OTP input. Renders one native `<input>` over the slots: it
 * takes the keystrokes, the paste, the SMS and password manager fill, and the
 * focus, and each `OtpInput.Slot` shows one character of its value.
 *
 * Pass `validation="error"` (or `"success"` / `"warning"`) to recolor each
 * group's outer borders and the active focus ring with the matching validation hue.
 * `validation="error"` also sets `aria-invalid` on the underlying input so
 * assistive tech announces the failure state.
 *
 * When composing with `Field.Item`, wrap `OtpInput.Root` in `Field.Control`.
 * `Field.Control` flows the generated `id`, `aria-invalid`, `aria-describedby`,
 * and `aria-errormessage` through to the underlying focusable input via
 * `FieldControlContext`.
 *
 * **Accessibility.** The input needs an accessible name. Inside a `Field.Item`,
 * `Field.Label` supplies it. On its own, pass `aria-label`.
 *
 * **Password managers.** The input sets `autocomplete="one-time-code"`, so
 * 1Password, Bitwarden, Dashlane, and Proton Pass can fill the code. Each can
 * also show its badge beside the last slot. Do not add their ignore
 * attributes: an ignore attribute also stops the fill. LastPass does not fill
 * one-time codes, so the input carries `data-lpignore`.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
// Why no asChild: the root owns the input that every slot reads its state from,
// and the element under the slots that takes the pointer.
const Root = ({
	"aria-invalid": ariaInvalid,
	"data-slot": dataSlot,
	autoComplete,
	children,
	className,
	containerClassName,
	defaultValue,
	inputMode = "numeric",
	maxLength,
	noScriptCSSFallback,
	onBlur,
	onChange,
	onComplete,
	onFocus,
	onPaste,
	pasteTransformer,
	pattern,
	placeholder,
	pushPasswordManagerStrategy = "increase-width",
	ref,
	spellCheck = false,
	style,
	textAlign = "left",
	validation: _validation,
	value: valueProp,
	...props
}: OtpInputRootProps) => {
	const fieldValidation = useFieldValidation();
	const fieldControl = useContext(FieldControlContext);
	const { ariaInvalid: resolvedAriaInvalid, validation } = parseValidation({
		"aria-invalid": ariaInvalid,
		defaultAriaInvalid: false,
		validation: _validation ?? fieldValidation,
	});
	const [value, setValue] = useControllableState({
		value: valueProp,
		defaultValue: typeof defaultValue === "string" ? defaultValue : "",
		onChange,
	});
	// Why `null` while blurred: no slot is active then, so focus is part of the selection.
	const [selection, setSelection] = useState<OtpSelection | null>(null);
	const [pushesBadge, setPushesBadge] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	// Why a ref: `slotSelection` reads the last selection to tell which way the caret moved.
	const lastSelection = useRef<OtpSelection | null>(null);
	const lastValue = useRef(value);
	const composedRef = useComposedRefs(ref, inputRef);

	// Why `useCallback`: the `selectionchange` listener effect depends on it.
	const syncSelection = useCallback((input: HTMLInputElement) => {
		const next = slotSelection({
			selection: {
				start: input.selectionStart ?? 0,
				end: input.selectionEnd ?? 0,
				direction: input.selectionDirection ?? "none",
			},
			length: input.value.length,
			maxLength: input.maxLength,
			previous: lastSelection.current,
		});
		if (next.start !== input.selectionStart || next.end !== input.selectionEnd) {
			input.setSelectionRange(next.start, next.end, next.direction);
		}
		lastSelection.current = next;
		setSelection((current) =>
			current?.start === next.start && current.end === next.end ? current : next,
		);
	}, []);

	// Why `pattern` here: a native `pattern` only marks the value invalid, and the slots
	// must never show a character it rejects.
	const measureBadgeGutter = (input: HTMLInputElement) => {
		if (pushPasswordManagerStrategy === "increase-width" && input.parentElement != null) {
			setPushesBadge(fitsBadgeGutter(input.parentElement));
		}
	};

	const changeValue = (next: string): boolean => {
		if (next.length > 0 && pattern != null && !new RegExp(pattern).test(next)) {
			return false;
		}
		setValue(next);
		return true;
	};

	const focused = selection != null;
	// Why a document listener in the capture phase: a browser fires `selectionchange` at the
	// input for a click, an arrow key, a select-all, and a script that moves the selection.
	useEffect(() => {
		const input = inputRef.current;
		if (!focused || input == null) {
			return;
		}
		const handleSelectionChange = () => {
			if (document.activeElement === input) {
				syncSelection(input);
			} else {
				setSelection(null);
			}
		};
		document.addEventListener("selectionchange", handleSelectionChange, { capture: true });
		return () => {
			document.removeEventListener("selectionchange", handleSelectionChange, { capture: true });
		};
	}, [focused, syncSelection]);

	// Why after each render: React reports none of the DOM changes this reads. Before
	// hydration, the input keeps what the user typed, what the browser restored, and the focus.
	// A browser fires no `selectionchange` when a new value is empty.
	useEffect(() => {
		const input = inputRef.current;
		if (input == null) {
			return;
		}
		if (input.value !== value) {
			changeValue(input.value.slice(0, maxLength));
		}
		// Why here and not in `onChange`: a parent that sets the full value also completes the code.
		if (value !== lastValue.current) {
			if (value.length === maxLength && lastValue.current.length < maxLength) {
				onComplete?.(value);
			}
			lastValue.current = value;
		}
		if (selection == null) {
			if (document.activeElement === input && document.hasFocus()) {
				measureBadgeGutter(input);
				syncSelection(input);
			}
		} else if (input.selectionStart !== selection.start || input.selectionEnd !== selection.end) {
			syncSelection(input);
		}
	});

	const context = useMemo(() => ({ value, selection }), [value, selection]);

	const hue = validation ? validationHues[validation] : undefined;
	// Descendant slot and group classes read these variables, so one class covers each hue.
	const validationStyle = hue
		? $cssProperties({
				"--otp-validation-border": validationBorderColor(hue),
				"--otp-validation-ring": validationRingColor(hue),
			})
		: undefined;

	return (
		<>
			{noScriptCSSFallback != null && (
				<noscript>
					{/* Why the layer: it lets the fallback win over the `!important` rules of `otp-input-overlay`. */}
					<style>{`@layer utilities{${noScriptCSSFallback}}`}</style>
				</noscript>
			)}
			<div
				className={cx(
					"pointer-events-none relative flex items-center gap-2 select-none has-disabled:opacity-50",
					containerClassName,
				)}
				data-input-otp-container
				translate="no"
			>
				<OtpInputContext value={context}>
					{/* Why `display: contents`: the element keeps the `group/otp` selectors working and adds no layout box. */}
					<div
						className="group/otp contents"
						data-otp-state={otpState({ selection, maxLength })}
						data-validation={validation || undefined}
						style={validationStyle}
					>
						{children}
					</div>
				</OtpInputContext>
				{/* Why a size container: the input's font size follows the slot height.
				Why `*:pointer-events-auto!`: a password manager badge beside the input
				takes the pointer. A `+*` rule makes Chromium restyle a whole subtree
				each time a node is inserted before another one, anywhere on the page. */}
				<div className="pointer-events-none absolute inset-0 [container-type:size] *:pointer-events-auto!">
					<input
						autoComplete={autoComplete || "one-time-code"}
						aria-invalid={resolvedAriaInvalid}
						aria-placeholder={placeholder}
						data-slot={joinDataSlot(dataSlot, "otp-input")}
						// Why the `data-input-otp` attributes: a `noScriptCSSFallback` or a page style can select them.
						data-input-otp
						data-input-otp-mss={selection?.start}
						data-input-otp-mse={selection?.end}
						data-input-otp-placeholder-shown={value.length === 0 || undefined}
						// LastPass does not fill one-time codes, so only its badge is kept off.
						data-lpignore={passwordManagerIgnoreProps["data-lpignore"]}
						inputMode={inputMode}
						spellCheck={spellCheck}
						{...props}
						{...(fieldControl
							? {
									"aria-describedby": fieldControl["aria-describedby"],
									"aria-errormessage": fieldControl["aria-errormessage"],
									id: fieldControl.id,
									name: fieldControl.name,
								}
							: undefined)}
						ref={composedRef}
						className={cx(
							"otp-input-overlay disabled:cursor-not-allowed",
							noScriptCSSFallback === undefined &&
								"noscript:rounded-md! noscript:border! noscript:border-form! noscript:bg-form! noscript:text-center! noscript:text-base! noscript:tracking-[.25em]! noscript:text-strong! noscript:caret-current!",
							textAlignClasses[textAlign],
							className,
						)}
						style={
							pushesBadge && pushPasswordManagerStrategy === "increase-width"
								? { ...style, ...$cssProperties({ "--_otp-badge-gutter": `${BADGE_GUTTER}px` }) }
								: style
						}
						maxLength={maxLength}
						pattern={pattern}
						value={value}
						onBlur={(event) => {
							setSelection(null);
							onBlur?.(event);
						}}
						onChange={(event) => {
							const input = event.currentTarget;
							// Why the focus check: a password manager or a script can fill the input
							// without focus, and then no slot is active.
							if (
								changeValue(input.value.slice(0, maxLength)) &&
								document.activeElement === input
							) {
								syncSelection(input);
							}
						}}
						onFocus={(event) => {
							const input = event.currentTarget;
							const length = input.value.length;
							input.setSelectionRange(Math.min(length, maxLength - 1), length);
							measureBadgeGutter(input);
							syncSelection(input);
							onFocus?.(event);
						}}
						onPaste={(event) => {
							onPaste?.(event);
							const input = event.currentTarget;
							// Why iOS: a native paste into this input fails in iOS Safari.
							if (
								event.defaultPrevented ||
								input.readOnly ||
								(pasteTransformer == null && !CSS.supports?.("-webkit-touch-callout", "none"))
							) {
								return;
							}
							event.preventDefault();
							const pasted = event.clipboardData.getData("text/plain");
							const content = pasteTransformer ? pasteTransformer(pasted) : pasted;
							const next = (
								value.slice(0, input.selectionStart ?? value.length) +
								content +
								value.slice(input.selectionEnd ?? value.length)
							).slice(0, maxLength);
							// Why `flushSync`: the selection goes after the value that React commits, and a
							// controlled parent can keep its own value.
							flushSync(() => changeValue(next));
							const length = input.value.length;
							input.setSelectionRange(Math.min(length, maxLength - 1), length);
							syncSelection(input);
						}}
					/>
				</div>
			</div>
		</>
	);
};

type OtpInputGroupProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * Groups one or more `OtpInput.Slot` parts into a visually-connected segment.
 * Slots inside a group share rounded corners on the outer edges and join with
 * shared borders between adjacent slots.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
const Group = ({
	"data-slot": dataSlot,
	asChild,
	children,
	className,
	ref,
	...props
}: OtpInputGroupProps) => {
	const Comp = asChild ? AsChildSlot : "div";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "otp-input-group")}
			className={cx(
				"relative flex items-center rounded-md",
				// A "range" selection within this group means two or more
				// slots are simultaneously active. CSS `:has()` with the
				// general sibling combinator catches that without us
				// having to count: if any active slot is preceded by
				// another active slot at the same nesting level, the
				// group has at least 2 actives → draw the ring.
				"has-[[data-active]~[data-active]]:ring-focus-accent has-[[data-active]~[data-active]]:ring-4",
				// Validation override for the group-level range/all ring.
				// `OtpInput.Root` sets `--otp-validation-ring` based on
				// the validation value, so a single class covers
				// error/success/warning instead of one per hue.
				"group-data-validation/otp:has-[[data-active]~[data-active]]:ring-(--otp-validation-ring)",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

type OtpInputSlotProps = Omit<ComponentProps<"div">, "translate"> & {
	/**
	 * The zero-based index of the character slot to render. Must be a valid
	 * index within the parent `OtpInput.Root`'s `maxLength`.
	 */
	index: number;
} & WithDataSlot;

/**
 * Renders a single character slot for the OTP input. Reads its display state
 * (the typed character, active/focused state, and fake caret position) from
 * the nearest `OtpInput.Root` via context, so this part must always be
 * rendered inside an `OtpInput.Root`.
 *
 * **Translation.** The slot always carries `translate="no"`, so a browser
 * translation engine skips the character inside it. A translated passcode
 * character is wrong. The engine also wraps that character's text node in a
 * `<font>`, which detaches the node React holds. The next keystroke then makes
 * React remove a node its parent no longer owns, and the DOM raises
 * `NotFoundError`. The `translate` prop is omitted from the type, so no call
 * site can turn the guard off.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
// Why no asChild: the slot renders its character, its active state, and the
// caret into a fixed structure, and a swapped element would lose the caret and
// the active ring.
const OtpInputSlotImpl = ({
	"data-slot": dataSlot,
	className,
	index,
	ref,
	...props
}: OtpInputSlotProps) => {
	const context = useContext(OtpInputContext);
	invariant(context != null, "OtpInput.Slot must be rendered inside OtpInput.Root.");
	const char = context.value[index];
	const isActive = isSlotActive({ selection: context.selection, index });

	return (
		<div
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "otp-input-slot")}
			data-active={isActive ? "" : undefined}
			className={cx(
				"border-form bg-form text-strong relative flex h-10 w-10 items-center justify-center border-y border-e text-sm shadow-sm outline-hidden transition-all duration-150 ease-out",
				"first:rounded-s-md first:border-s last:rounded-e-md",
				// When this slot is immediately followed by the caret
				// slot, hide our `border-e` so the active slot's
				// `border-s` is the only line at the boundary. Without
				// this, the two adjacent 1px borders read as a doubled
				// edge. We use an arbitrary `&:has(+ ...)` variant
				// because Tailwind's `has-[...]` shorthand doesn't
				// parse the nested bracketed attribute selector here.
				"[&:has(+[data-active])]:group-data-[otp-state=caret]/otp:border-e-transparent",
				// Per-slot ring renders only in `caret` state (single
				// active slot). When more than one slot is active, the
				// surrounding `OtpInput.Group` draws a single ring
				// around the whole group (see Group's `:has()` rule).
				// We also recolor the slot's own borders to accent and
				// fill in `border-s` (groups normally only render
				// `border-s` on `:first-child`), so the slot reads as
				// one cohesive highlighted box rather than a ring with
				// a gray box inside.
				"data-active:group-data-[otp-state=caret]/otp:border-accent-600",
				"data-active:group-data-[otp-state=caret]/otp:border-s",
				"data-active:group-data-[otp-state=caret]/otp:ring-focus-accent",
				"data-active:group-data-[otp-state=caret]/otp:z-20",
				"data-active:group-data-[otp-state=caret]/otp:ring-4",
				// Select-all: tint *every* border on the slot accent.
				// Tinting only the outside edges leaves the internal
				// vertical divider (gray `border-e`) meeting the
				// accent top/bottom borders at the corner, producing a
				// visible 1px miter spike. Coloring all borders the
				// same accent-600 hue removes the spike while still
				// keeping the slot grid readable at full opacity.
				"group-data-[otp-state=all]/otp:border-accent-600",
				// Validation overrides. Only the *outer* edges of the
				// group are tinted (top + bottom on every slot, the start
				// edge of the first slot, the end edge of the last slot) so adjacent
				// slots still join with a neutral divider. This matches how
				// `Input` tints the container border, not the internal
				// elements. The all-state and caret-active overrides
				// still recolor every border so a fully-active slot or
				// select-all reads as a solid tinted box. `OtpInput.Root`
				// sets `--otp-validation-{border,ring}` per validation
				// value, so a single set of classes covers
				// error/success/warning.
				"group-data-validation/otp:border-y-(--otp-validation-border)",
				"group-data-validation/otp:first:border-s-(--otp-validation-border)",
				"group-data-validation/otp:last:border-e-(--otp-validation-border)",
				"group-data-validation/otp:data-active:group-data-[otp-state=caret]/otp:border-(--otp-validation-border)",
				"group-data-validation/otp:data-active:group-data-[otp-state=caret]/otp:ring-(--otp-validation-ring)",
				"group-data-validation/otp:group-data-[otp-state=all]/otp:border-(--otp-validation-border)",
				className,
			)}
			{...props}
			// Why after the spread: a wider props object can still carry `translate`
			// past the type, and a translated passcode character is wrong at every
			// call site.
			translate="no"
		>
			{char}
			{isActive && char == null && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="bg-strong h-4 w-px animate-pulse" />
				</div>
			)}
		</div>
	);
};

type OtpInputSeparatorProps = ComponentProps<"div"> &
	WithAsChild & {
		/**
		 * If `true`, the separator renders with `role="separator"` so assistive
		 * tech announces it as a divider between OTP groups.
		 * If `false`, the separator is purely decorative and is removed from
		 * the accessibility tree. Prefer `false` inside an OTP control where the
		 * minus icon is visual chrome between slot groups.
		 *
		 * @default false
		 */
		semantic?: boolean;
	} & WithDataSlot;

/**
 * A visual separator between two `OtpInput.Group` segments. Renders a minus
 * icon by default; pass `children` to override the visual.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
const Separator = ({
	"data-slot": dataSlot,
	asChild,
	children,
	className,
	ref,
	semantic = false,
	...props
}: OtpInputSeparatorProps) => {
	const Comp = asChild ? AsChildSlot : "div";
	const semanticProps = semantic ? { role: "separator" } : { "aria-hidden": true, role: "none" };

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "otp-input-separator")}
			className={cx("text-separator flex items-center", className)}
			{...semanticProps}
			{...props}
		>
			{children ?? <MinusIcon weight="bold" />}
		</Comp>
	);
};

export {
	//,
	Root,
	Group,
	OtpInputSlotImpl,
	Separator,
};
