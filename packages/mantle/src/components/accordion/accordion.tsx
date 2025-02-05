"use client";

import { CaretDown } from "@phosphor-icons/react/CaretDown";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Icon, type IconProps } from "../icon/icon.js";

const Accordion = forwardRef<ElementRef<"div">, ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>>(
	({ className, ...props }, ref) => (
		<AccordionPrimitive.Root ref={ref} className={cx("w-full space-y-2.5", className)} {...props} />
	),
);
Accordion.displayName = "Accordion";

const AccordionItem = AccordionPrimitive.Item;
AccordionItem.displayName = "AccordionItem";

const AccordionHeading = forwardRef<ElementRef<"div">, ComponentPropsWithoutRef<typeof AccordionPrimitive.Header>>(
	({ className, ...props }, ref) => (
		<AccordionPrimitive.Header ref={ref} className={cx("flex items-center gap-2", className)} {...props} />
	),
);
AccordionHeading.displayName = "AccordionHeading";

const AccordionTrigger = forwardRef<ElementRef<"button">, ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>>(
	({ className, children, ...props }, ref) => (
		<AccordionPrimitive.Trigger ref={ref} className={cx("group flex items-center gap-1.5", className)} {...props}>
			{children}
		</AccordionPrimitive.Trigger>
	),
);
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionTriggerIcon = ({ className, ...props }: Omit<IconProps, "svg">) => (
	<Icon
		{...props}
		svg={<CaretDown weight="bold" />}
		className={cx("group-data-state-open:rotate-0 -rotate-90", className)}
	/>
);

const AccordionContent = forwardRef<ElementRef<"div">, ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>>(
	({ className, children, ...props }, ref) => (
		<AccordionPrimitive.Content
			ref={ref}
			className={cx(
				"data-state-closed:animate-accordion-up data-state-open:animate-accordion-down overflow-hidden pt-4",
				className,
			)}
			{...props}
		>
			{children}
		</AccordionPrimitive.Content>
	),
);
AccordionContent.displayName = "AccordionContent";

export {
	//,
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
	AccordionHeading,
	AccordionTriggerIcon,
};
