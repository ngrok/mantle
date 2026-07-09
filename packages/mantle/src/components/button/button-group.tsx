import { cva } from "class-variance-authority";
import { type ComponentProps, type ComponentRef, forwardRef } from "react";
import type { VariantProps } from "../../types/index.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

const buttonGroupVariants = cva("border-form inline-flex items-center rounded-md", {
	variants: {
		/**
		 * Defines the visual style of the ButtonGroup.
		 */
		appearance: {
			panel:
				"bg-form gap-0.5 border p-0.75 [--icon-button-border-radius:0.125rem] [&>.separator]:mx-px",
			ghost: "gap-0.5",
			outlined: "", // TODO(cody): implement me
		},
	},
});

type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>;

type ButtonGroupProps = ComponentProps<"div"> & ButtonGroupVariants & WithAsChild;

/**
 * A contained group of related buttons.
 *
 * @see https://mantle.ngrok.com/components/button-group#api-button-group
 *
 * @example
 * ```tsx
 * <ButtonGroup appearance="panel">
 *   <IconButton icon={<Bold />} label="Bold" />
 *   <IconButton icon={<Italic />} label="Italic" />
 *   <IconButton icon={<Underline />} label="Underline" />
 * </ButtonGroup>
 * ```
 */
const ButtonGroup = forwardRef<ComponentRef<"div">, ButtonGroupProps>(
	({ appearance, asChild, className, children, ...props }, ref) => {
		const Comp = asChild ? Slot : "div";
		return (
			<Comp
				data-slot="button-group"
				className={cx(buttonGroupVariants({ appearance }), className)}
				ref={ref}
				{...props}
			>
				{children}
			</Comp>
		);
	},
);
ButtonGroup.displayName = "ButtonGroup";

export {
	//,
	ButtonGroup,
};

export type {
	//,
	ButtonGroupProps,
};
