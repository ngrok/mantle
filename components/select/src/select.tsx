import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretUp } from "@phosphor-icons/react/CaretUp";
import { Check } from "@phosphor-icons/react/Check";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementRef, SelectHTMLAttributes } from "react";
import { createContext, forwardRef, useContext } from "react";
import { cx } from "../../core";
import { Separator } from "../../separator";
import type { VariantProps } from "../../types/src/variant-props";

const SelectAriaInvalidContext = createContext<SelectHTMLAttributes<HTMLSelectElement>["aria-invalid"]>(undefined);

type SelectProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Root> &
	Pick<SelectHTMLAttributes<HTMLSelectElement>, "aria-invalid">;

const Select = ({ children, ...props }: SelectProps) => {
	return (
		<SelectPrimitive.Root {...props}>
			<SelectAriaInvalidContext.Provider value={props["aria-invalid"]}>{children}</SelectAriaInvalidContext.Provider>
		</SelectPrimitive.Root>
	);
};

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
	"flex h-11 w-full items-center justify-between rounded-md border border-form bg-form px-3 py-2 placeholder:text-placeholder hover:bg-form-hover focus:outline-none focus:ring-4 disabled:pointer-events-none disabled:opacity-50 aria-expanded:ring-4 sm:h-9 sm:text-sm [&>span]:line-clamp-1 [&>span]:text-left",
	{
		variants: {
			state: {
				danger:
					"border-danger-600 focus:border-danger-600 focus:ring-focus-danger aria-expanded:border-danger-600 aria-expanded:ring-focus-danger",
				default:
					"text-strong placeholder:text-placeholder hover:border-neutral-400 focus:border-accent-600 focus:ring-focus-accent aria-expanded:border-accent-600 aria-expanded:ring-focus-accent",
			},
		},
		defaultVariants: {
			state: "default",
		},
	},
);

type SelectTriggerVariants = VariantProps<typeof selectTriggerVariants>;

const SelectTrigger = forwardRef<
	ElementRef<typeof SelectPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
	const ariaInvalidContext = useContext(SelectAriaInvalidContext);
	const ariaInvalid = props["aria-invalid"] ?? ariaInvalidContext;
	const state = ariaInvalid ? "danger" : ("default" satisfies SelectTriggerVariants["state"]);

	return (
		<SelectPrimitive.Trigger
			ref={ref}
			className={cx(selectTriggerVariants({ state }), className)}
			{...props}
			aria-invalid={ariaInvalid}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<CaretDown className="size-4 shrink-0" weight="bold" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
});
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = forwardRef<
	ElementRef<typeof SelectPrimitive.ScrollUpButton>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cx("flex cursor-default items-center justify-center py-1", className)}
		{...props}
	>
		<CaretUp className="size-4" weight="bold" />
	</SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = forwardRef<
	ElementRef<typeof SelectPrimitive.ScrollDownButton>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cx("flex cursor-default items-center justify-center py-1", className)}
		{...props}
	>
		<CaretDown className="size-4" weight="bold" />
	</SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

type SelectContentProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
	width?: "trigger" | "content";
};

const SelectContent = forwardRef<ElementRef<typeof SelectPrimitive.Content>, SelectContentProps>(
	({ className, children, position = "popper", width, ...props }, ref) => (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				ref={ref}
				className={cx(
					"relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-popover shadow-md data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95",
					"bg-popover",
					position === "popper" &&
						"max-h-[var(--radix-select-content-available-height)] data-side-bottom:translate-y-2 data-side-left:-translate-x-2 data-side-right:translate-x-2 data-side-top:-translate-y-2",
					width === "trigger" && "w-[var(--radix-select-trigger-width)]",
					className,
				)}
				position={position}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cx("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full")}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	),
);
SelectContent.displayName = "SelectContent";

const SelectLabel = forwardRef<
	ElementRef<typeof SelectPrimitive.Label>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label ref={ref} className={cx("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = forwardRef<
	ElementRef<typeof SelectPrimitive.Item>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cx(
			"relative flex w-full cursor-pointer select-none items-center rounded py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-popover-hover data-state-checked:bg-filled-accent data-state-checked:text-on-filled data-disabled:pointer-events-none data-disabled:opacity-50",
			className,
		)}
		{...props}
	>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		<SelectPrimitive.ItemIndicator className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			<Check className="size-4" weight="bold" />
		</SelectPrimitive.ItemIndicator>
	</SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = forwardRef<ElementRef<typeof Separator>, ComponentPropsWithoutRef<typeof Separator>>(
	({ className, ...props }, ref) => (
		<Separator ref={ref} className={cx("-mx-1 my-1 h-px w-auto", className)} {...props} />
	),
);
SelectSeparator.displayName = "SelectSeparator";

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
};
