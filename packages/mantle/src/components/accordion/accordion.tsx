"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from "react";
import { cx } from "../../utils/cx/cx.js";
import { Icon, type IconProps } from "../icon/icon.js";

/**
 * A vertically stacked set of interactive headings that each reveal a section of content.
 * The root component that contains all accordion items.
 *
 * @see https://mantle.ngrok.com/components/accordion#api-accordion
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Heading>
 *       <Accordion.Trigger>
 *         <Accordion.TriggerIcon />
 *         Is it accessible?
 *       </Accordion.Trigger>
 *     </Accordion.Heading>
 *     <Accordion.Content>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Root = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
>(({ className, ...props }, ref) => (
	<AccordionPrimitive.Root
		ref={ref}
		data-slot="accordion"
		className={cx("w-full space-y-2.5", className)}
		{...props}
	/>
));
Root.displayName = "Accordion";

/**
 * Contains all the parts of a collapsible section.
 * A single accordion item that can be expanded or collapsed.
 *
 * @see https://mantle.ngrok.com/components/accordion#api-accordion-item
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Heading>
 *       <Accordion.Trigger>
 *         <Accordion.TriggerIcon />
 *         Is it accessible?
 *       </Accordion.Trigger>
 *     </Accordion.Heading>
 *     <Accordion.Content>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Item = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Item>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ ...props }, ref) => (
	<AccordionPrimitive.Item ref={ref} data-slot="accordion-item" {...props} />
));
Item.displayName = "AccordionItem";

/**
 * Wraps an AccordionTrigger.
 * Contains the accordion trigger and provides proper heading semantics.
 *
 * @see https://mantle.ngrok.com/components/accordion#api-accordion-heading
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Heading>
 *       <Accordion.Trigger>
 *         <Accordion.TriggerIcon />
 *         Is it accessible?
 *       </Accordion.Trigger>
 *     </Accordion.Heading>
 *     <Accordion.Content>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Heading = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Header>
>(({ className, ...props }, ref) => (
	<AccordionPrimitive.Header
		ref={ref}
		data-slot="accordion-heading"
		className={cx("flex items-center gap-2", className)}
		{...props}
	/>
));
Heading.displayName = "AccordionHeading";

/**
 * Toggles the collapsed state of its associated item.
 * The interactive element that expands or collapses the accordion content.
 *
 * @see https://mantle.ngrok.com/components/accordion#api-accordion-trigger
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Heading>
 *       <Accordion.Trigger>
 *         <Accordion.TriggerIcon />
 *         Is it accessible?
 *       </Accordion.Trigger>
 *     </Accordion.Heading>
 *     <Accordion.Content>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Trigger = forwardRef<
	ComponentRef<"button">,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Trigger
		ref={ref}
		data-slot="accordion-trigger"
		className={cx("group flex items-center gap-1.5", className)}
		{...props}
	>
		{children}
	</AccordionPrimitive.Trigger>
));
Trigger.displayName = "AccordionTrigger";

/**
 * An icon that indicates the expanded/collapsed state of the accordion trigger.
 * Rotates based on the accordion item state to provide visual feedback.
 *
 * @see https://mantle.ngrok.com/components/accordion#api-accordion-trigger-icon
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Heading>
 *       <Accordion.Trigger>
 *         <Accordion.TriggerIcon />
 *         Is it accessible?
 *       </Accordion.Trigger>
 *     </Accordion.Heading>
 *     <Accordion.Content>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const TriggerIcon = ({ className, ...props }: Omit<IconProps, "svg">) => (
	<Icon
		{...props}
		data-slot="accordion-trigger-icon"
		svg={<CaretDownIcon weight="fill" />}
		className={cx("group-data-[state=open]:rotate-0 -rotate-90", className)}
	/>
);
TriggerIcon.displayName = "AccordionTriggerIcon";

/**
 * Contains the collapsible content for an item.
 * The content area that is revealed when the accordion item is expanded.
 *
 * @see https://mantle.ngrok.com/components/accordion#api-accordion-content
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Heading>
 *       <Accordion.Trigger>
 *         <Accordion.TriggerIcon />
 *         Is it accessible?
 *       </Accordion.Trigger>
 *     </Accordion.Heading>
 *     <Accordion.Content>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Content = forwardRef<
	ComponentRef<"div">,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Content
		ref={ref}
		data-slot="accordion-content"
		className={cx(
			"data-state-closed:animate-accordion-up data-state-open:animate-accordion-down overflow-hidden *:first:mt-4",
			className,
		)}
		{...props}
	>
		{children}
	</AccordionPrimitive.Content>
));
Content.displayName = "AccordionContent";

/**
 * A vertically stacked set of interactive headings that each reveal a section of content.
 *
 * @see https://mantle.ngrok.com/components/accordion
 *
 * @example
 * Composition:
 * ```
 * Accordion.Root
 * ├── Accordion.Item
 * │   ├── Accordion.Heading
 * │   │   └── Accordion.Trigger
 * │   │       └── Accordion.TriggerIcon
 * │   └── Accordion.Content
 * ```
 *
 * @example
 * ```tsx
 * <Accordion.Root type="single" collapsible>
 *   <Accordion.Item value="item-1">
 *     <Accordion.Heading>
 *       <Accordion.Trigger>
 *         <Accordion.TriggerIcon />
 *         Is it accessible?
 *       </Accordion.Trigger>
 *     </Accordion.Heading>
 *     <Accordion.Content>
 *       Yes. It adheres to the WAI-ARIA design pattern.
 *     </Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
const Accordion = {
	/**
	 * A vertically stacked set of interactive headings that each reveal a section of content.
	 * The root component that contains all accordion items.
	 *
	 * @see https://mantle.ngrok.com/components/accordion#api-accordion
	 *
	 * @example
	 * ```tsx
	 * <Accordion.Root type="single" collapsible>
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Heading>
	 *       <Accordion.Trigger>
	 *         <Accordion.TriggerIcon />
	 *         Is it accessible?
	 *       </Accordion.Trigger>
	 *     </Accordion.Heading>
	 *     <Accordion.Content>
	 *       Yes. It adheres to the WAI-ARIA design pattern.
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 * ```
	 */
	Root,
	/**
	 * Contains the collapsible content for an item.
	 * The content area that is revealed when the accordion item is expanded.
	 *
	 * @see https://mantle.ngrok.com/components/accordion#api-accordion-content
	 *
	 * @example
	 * ```tsx
	 * <Accordion.Root type="single" collapsible>
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Heading>
	 *       <Accordion.Trigger>
	 *         <Accordion.TriggerIcon />
	 *         Is it accessible?
	 *       </Accordion.Trigger>
	 *     </Accordion.Heading>
	 *     <Accordion.Content>
	 *       Yes. It adheres to the WAI-ARIA design pattern.
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 * ```
	 */
	Content,
	/**
	 * Wraps an AccordionTrigger.
	 * Contains the accordion trigger and provides proper heading semantics.
	 *
	 * @see https://mantle.ngrok.com/components/accordion#api-accordion-heading
	 *
	 * @example
	 * ```tsx
	 * <Accordion.Root type="single" collapsible>
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Heading>
	 *       <Accordion.Trigger>
	 *         <Accordion.TriggerIcon />
	 *         Is it accessible?
	 *       </Accordion.Trigger>
	 *     </Accordion.Heading>
	 *     <Accordion.Content>
	 *       Yes. It adheres to the WAI-ARIA design pattern.
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 * ```
	 */
	Heading,
	/**
	 * Contains all the parts of a collapsible section.
	 * A single accordion item that can be expanded or collapsed.
	 *
	 * @see https://mantle.ngrok.com/components/accordion#api-accordion-item
	 *
	 * @example
	 * ```tsx
	 * <Accordion.Root type="single" collapsible>
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Heading>
	 *       <Accordion.Trigger>
	 *         <Accordion.TriggerIcon />
	 *         Is it accessible?
	 *       </Accordion.Trigger>
	 *     </Accordion.Heading>
	 *     <Accordion.Content>
	 *       Yes. It adheres to the WAI-ARIA design pattern.
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 * ```
	 */
	Item,
	/**
	 * Toggles the collapsed state of its associated item.
	 * The interactive element that expands or collapses the accordion content.
	 *
	 * @see https://mantle.ngrok.com/components/accordion#api-accordion-trigger
	 *
	 * @example
	 * ```tsx
	 * <Accordion.Root type="single" collapsible>
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Heading>
	 *       <Accordion.Trigger>
	 *         <Accordion.TriggerIcon />
	 *         Is it accessible?
	 *       </Accordion.Trigger>
	 *     </Accordion.Heading>
	 *     <Accordion.Content>
	 *       Yes. It adheres to the WAI-ARIA design pattern.
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 * ```
	 */
	Trigger,
	/**
	 * An icon that indicates the expanded/collapsed state of the accordion trigger.
	 * Rotates based on the accordion item state to provide visual feedback.
	 *
	 * @see https://mantle.ngrok.com/components/accordion#api-accordion-trigger-icon
	 *
	 * @example
	 * ```tsx
	 * <Accordion.Root type="single" collapsible>
	 *   <Accordion.Item value="item-1">
	 *     <Accordion.Heading>
	 *       <Accordion.Trigger>
	 *         <Accordion.TriggerIcon />
	 *         Is it accessible?
	 *       </Accordion.Trigger>
	 *     </Accordion.Heading>
	 *     <Accordion.Content>
	 *       Yes. It adheres to the WAI-ARIA design pattern.
	 *     </Accordion.Content>
	 *   </Accordion.Item>
	 * </Accordion.Root>
	 * ```
	 */
	TriggerIcon,
} as const;

export {
	//,
	Accordion,
};
