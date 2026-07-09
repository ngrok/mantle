import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { cx } from "../../utils/cx/cx.js";

type LabelProps = ComponentPropsWithoutRef<"label"> & {
	/**
	 * If set, the label will appear disabled.
	 */
	disabled?: boolean;
};

/**
 * A Label represents a caption for an item in a user interface. It is used to
 * provide a description or title for a form control, such as an input field,
 * checkbox, radio button, etc. The label is typically displayed next to the
 * form control and helps users understand its purpose.
 *
 * @see https://mantle.ngrok.com/components/label
 *
 * @example
 * ```tsx
 * <Label htmlFor="name">
 *   Name: <Input type="text" id="name" />
 * </Label>
 *
 * <div className="flex items-center gap-2">
 *   <Label htmlFor="name-2">Name:</Label>
 *   <Input type="text" id="name-2" />
 * </div>
 * ```
 */
const Label = forwardRef<ComponentRef<"label">, LabelProps>(
	(
		{ "aria-disabled": _ariaDisabled, children, className, disabled, onMouseDown, ...props },
		ref,
	) => (
		// biome-ignore lint/a11y/noLabelWithoutControl: this is a composable label component
		<label
			aria-disabled={disabled ?? _ariaDisabled}
			data-slot="label"
			className={cx(
				"text-strong cursor-pointer text-sm peer-disabled:cursor-default has-disabled:cursor-default aria-disabled:cursor-default font-sans",
				className,
			)}
			onMouseDown={(event) => {
				// only prevent text selection if clicking inside the label itself
				const target = event.target as HTMLElement;
				if (target.closest("button, input, select, textarea")) {
					return;
				}

				onMouseDown?.(event);

				// prevent text selection when double clicking label
				if (!event.defaultPrevented && event.detail > 1) {
					event.preventDefault();
				}
			}}
			ref={ref}
			{...props}
		>
			{children}
		</label>
	),
);
Label.displayName = "Label";

export {
	//
	Label,
};
