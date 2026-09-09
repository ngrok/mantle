import { CircleNotchIcon } from "@phosphor-icons/react/CircleNotch";
import type { ComponentProps, ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/index.js";
import { parseBooleanish } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon } from "../icon/index.js";
import { Slot } from "../slot/index.js";
import { disabledChildProps } from "./button.js";
import type {
	IconButtonAppearance,
	IconButtonIntent,
	IconButtonVariants,
} from "./icon-button-variants.js";
import { iconButtonVariants } from "./icon-button-variants.js";

/**
 * The props for the `IconButton` component.
 */
type IconButtonProps = Omit<ComponentProps<"button">, "aria-label"> &
	WithAsChild &
	Omit<IconButtonVariants, "appearance" | "intent"> & {
		/**
		 * Not part of the API: `label` is the single way to name the button.
		 * Typed `never` rather than only omitted because TypeScript skips
		 * excess-attribute checks for hyphenated JSX attributes; the `never`
		 * type makes the JSX call site a compile error.
		 */
		"aria-label"?: never;
		/**
		 * The visual style of the IconButton. Required — there is no default,
		 * so every call site states the weight it means. The union matches
		 * `Button`'s without `link`.
		 *
		 * @enum
		 * - `"filled"`: solid fill; the heaviest visual weight
		 * - `"ghost"`: no border or fill until hovered
		 * - `"outlined"`: bordered on the form background
		 */
		appearance: IconButtonAppearance;
		/**
		 * The tone of the IconButton. Narrower than `Button`'s — `"neutral"` is
		 * the only tone `IconButton` draws, so the accent and danger tones are
		 * a type error here. Still required, so a call site reads the same on
		 * both components and keeps compiling if more tones land.
		 *
		 * @enum
		 * - `"neutral"`: the workhorse tone — routine and secondary actions
		 */
		intent: IconButtonIntent;
		/**
		 * The accessible name for the button, rendered as its `aria-label` (like
		 * the `alt` text on an `<img>`). Passing `aria-label` directly is a
		 * compile error, so this prop is the only way to name the button. Why an
		 * attribute and not hidden text: voice-control tools treat DOM text as a
		 * visible label, so they skip a button that hides one.
		 *
		 * Name the action, not the icon: `"Delete API key"`, not `"Trash"` or
		 * `"Trash icon"`. Keep it short: a voice-control user speaks the label
		 * to click the button. Keep it specific: `"Delete"` alone cannot tell
		 * two delete buttons on the same page apart. Never include the word
		 * "button": the role already announces it, so a screen reader would say
		 * "Delete button, button".
		 */
		label: string;
		/**
		 * An icon to render inside the button. When `isLoading` is `true`, a
		 * spinner replaces the icon.
		 */
		icon: ReactNode;
		/**
		 * The behavior of the button when activated. Defaults to `"button"`, so the
		 * button does not accidentally submit a surrounding `<form>` — pass
		 * `type="submit"` to submit a form, or `type="reset"` to reset it.
		 *
		 * When `asChild` is used, `type` has no effect and is not forwarded to the
		 * child, so a wrapped anchor never inherits a `button` `type`. See:
		 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#type
		 *
		 * @default "button"
		 * @enum
		 * - `"button"`: The button has no default behavior, and does nothing when pressed by default. It can have client-side scripts listen to the element's events, which are triggered when the events occur.
		 * - `"reset"`: The button resets all the controls to their initial values.
		 * - `"submit"`: The button submits the form data to the server.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#type
		 */
		type?: ComponentProps<"button">["type"];
	};

/**
 * A button that renders one icon and nothing else. Its required `label` prop
 * carries the accessible name.
 *
 * `appearance` (visual weight) and `intent` (tone) are required — every call
 * site states what it means; there are no implicit defaults.
 *
 * `IconButton` draws all three of `Button`'s box appearances, each in the
 * neutral tone only, and each one matches its `Button` twin. `link` stays off
 * the union — an icon-only link has no text to read as a link. The accent and
 * danger tones stay off `intent` — an icon carries no text to name the action
 * a tone colors.
 *
 * The border radius is driven by the `--icon-button-border-radius` CSS
 * variable (default: `0.375rem`). Wrappers can set it to slot icon buttons
 * into their chrome — e.g. `ButtonGroup`'s panel appearance tightens it to
 * `0.125rem`.
 *
 * **Disabled and loading.** A native `<button>` gets the `disabled` attribute.
 * Under `asChild`, the child gets no `disabled` attribute, because it is inert
 * on an `<a>`: the child gets `aria-disabled="true"`, leaves the tab order
 * with `tabIndex={-1}`, and a click on it is cancelled before any handler runs.
 * An explicit `disabled` wins over `isLoading`, so `disabled={false}` keeps a
 * loading button enabled. `aria-disabled={false}` cannot re-enable the button.
 *
 * | Data Attribute     | Value                                        | Description                                                            |
 * | ------------------ | -------------------------------------------- | ---------------------------------------------------------------------- |
 * | `data-slot`        | `"icon-button"`                              | On the button element, or on the `asChild` child.                      |
 * | `data-icon-button` | `"true"`                                     | Always present. Lets a wrapper style every icon button it contains.    |
 * | `data-appearance`  | `"filled"` \| `"ghost"` \| `"outlined"`       | The `appearance` prop.                                                 |
 * | `data-intent`      | `"neutral"`                                  | The `intent` prop.                                                     |
 * | `data-size`        | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"`  | The `size` prop.                                                       |
 * | `data-loading`     | `"true"` \| `"false"`                        | The `isLoading` prop.                                                  |
 * | `data-disabled`    | `"true"` \| `"false"`                        | `true` when `disabled`, `isLoading`, or `aria-disabled="true"` is set. |
 *
 * @see https://mantle.ngrok.com/components/actions/icon-button
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={<TrashIcon />}
 *   label="Delete item"
 *   appearance="ghost"
 *   intent="neutral"
 *   size="sm"
 *   onClick={handleDelete}
 * />
 * ```
 *
 * @example
 * Submit a form — opt in with `type="submit"` (the default `"button"` does not submit):
 * ```tsx
 * <IconButton
 *   type="submit"
 *   appearance="outlined"
 *   intent="neutral"
 *   icon={<MagnifyingGlassIcon />}
 *   label="Search"
 * />
 * ```
 */
const IconButton = ({
	"aria-disabled": _ariaDisabled,
	appearance,
	asChild = false,
	children,
	className,
	disabled: _disabled,
	icon: propIcon,
	intent,
	isLoading = false,
	label,
	ref,
	size = "md",
	type,
	...props
}: IconButtonProps) => {
	// Why `??` then `||`: an explicit `disabled` wins over `isLoading`, so
	// `disabled={false}` keeps a loading button enabled and focused (`Sandbar`
	// relies on it), and `aria-disabled={false}` cannot re-enable a disabled button.
	const disabled = parseBooleanish(_disabled ?? isLoading) || parseBooleanish(_ariaDisabled);
	const icon = isLoading ? <CircleNotchIcon className="animate-spin" /> : propIcon;

	const buttonProps = {
		"aria-disabled": disabled,
		"data-slot": "icon-button",
		className: cx(iconButtonVariants({ appearance, intent, isLoading, size }), className),
		"data-appearance": appearance,
		"data-disabled": disabled,
		"data-icon-button": true,
		"data-intent": intent,
		"data-loading": isLoading,
		"data-size": size,
		ref,
		...props,
		// Why after the spread: untyped JS can still put `aria-label` in props
		// at runtime, and a second name source would silently beat `label`.
		"aria-label": label,
	};

	const innerChildren = <Icon svg={icon} />;

	if (asChild) {
		invariant(
			isValidElement<{ onClickCapture?: unknown }>(children) && Children.only(children),
			"When using `asChild`, IconButton must be passed a single child as a JSX tag.",
		);

		return (
			<Slot {...buttonProps}>
				{cloneElement(children, disabled ? disabledChildProps : {}, innerChildren)}
			</Slot>
		);
	}

	return (
		// oxlint-disable-next-line react/button-has-type -- `type` defaults to "button" at runtime via the `?? "button"` fallback; the static analyzer can't resolve that expression.
		<button {...buttonProps} disabled={disabled} type={type ?? "button"}>
			{innerChildren}
		</button>
	);
};

export {
	//,
	IconButton,
	iconButtonVariants,
};

export type {
	//,
	IconButtonAppearance,
	IconButtonIntent,
	IconButtonProps,
};
