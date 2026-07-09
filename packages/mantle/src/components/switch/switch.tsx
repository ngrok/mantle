import { Root as SwitchPrimitiveRoot, Thumb as SwitchPrimitiveThumb } from "@radix-ui/react-switch";
import clsx from "clsx";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { parseBooleanish } from "../../types/booleanish.js";
import { cx } from "../../utils/cx/cx.js";

type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitiveRoot> & {
	/**
	 * Makes the switch immutable, meaning the user can not edit the control.
	 */
	readOnly?: boolean;
};

/**
 * A form control that allows the user to toggle between checked and not checked.
 *
 * @see https://mantle.ngrok.com/components/switch
 *
 * @example
 * ```tsx
 * <form>
 *   <Label htmlFor="airplane-mode" className="flex items-center gap-2">
 *     Airplane Mode
 *     <Switch name="airplane-mode" id="airplane-mode" />
 *   </Label>
 * </form>
 * ```
 */
const Switch = forwardRef<ComponentRef<typeof SwitchPrimitiveRoot>, SwitchProps>(
	({ "aria-readonly": _ariaReadOnly, className, readOnly: _readOnly, onClick, ...props }, ref) => {
		const readOnly = parseBooleanish(_readOnly ?? _ariaReadOnly);

		return (
			<SwitchPrimitiveRoot
				data-slot="switch"
				aria-readonly={readOnly}
				className={cx(
					"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full outline-hidden",
					"disabled:cursor-default disabled:opacity-50",
					"focus-visible:border-accent-600 focus-visible:ring-focus-accent focus-visible:outline-hidden focus-visible:ring-4",
					"data-state-checked:bg-accent-600 data-state-unchecked:bg-gray-400",
					className,
				)}
				onClick={(event) => {
					if (readOnly) {
						event.preventDefault();
						event.stopPropagation();
						return;
					}
					onClick?.(event);
				}}
				ref={ref}
				{...props}
			>
				<SwitchPrimitiveThumb
					className={clsx(
						"pointer-events-none block size-4 rounded-full bg-[#fff] shadow-md ring-0 transition-transform",
						"data-state-checked:translate-x-4.5 data-state-unchecked:translate-x-0.5",
					)}
				/>
			</SwitchPrimitiveRoot>
		);
	},
);
Switch.displayName = "Switch";

export {
	//
	Switch,
};
