import { CaretUpDownIcon } from "@phosphor-icons/react/CaretUpDown";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ComponentRef, ReactNode } from "react";
import { cx } from "../../utils/cx/cx.js";

type Product = {
	/**
	 * Stable product identifier. Used as the radio item value and as the React
	 * key.
	 */
	id: string;
	/**
	 * Human-readable label for the product (e.g. "Universal Gateway").
	 */
	label: string;
	/**
	 * Icon rendered to the left of the label. Pass an SVG element (typically a
	 * Phosphor icon).
	 */
	icon: ReactNode;
};

type ProductSwitcherTriggerProps = Omit<ComponentPropsWithoutRef<"button">, "children" | "type"> & {
	/**
	 * The product currently displayed in the sidebar's body. Drives the trigger
	 * row's icon and label. When `undefined`, a placeholder dash is shown.
	 */
	currentProduct: Product | undefined;
};

/**
 * The visual trigger row for a product switcher (Option A — single column
 * layout). Renders the current product's icon and label with a chevron, and is
 * designed to be used as a `DropdownMenu.Trigger` via `asChild`.
 *
 * Splitting trigger from menu lets the consumer compose any items they like
 * inside the dropdown — typically a `Sidebar.ProductSwitcherRadioGroup`.
 *
 * @example
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Sidebar.ProductSwitcherTrigger currentProduct={current} />
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <Sidebar.ProductSwitcherRadioGroup
 *       products={products}
 *       value={current.id}
 *       onValueChange={setCurrentProductId}
 *     />
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const SidebarProductSwitcherTrigger = forwardRef<
	ComponentRef<"button">,
	ProductSwitcherTriggerProps
>(({ className, currentProduct, ...props }, ref) => (
	<button
		ref={ref}
		className={cx(
			"text-strong hover:bg-popover-hover ring-focus-accent flex w-full items-center justify-between gap-1.5 rounded-lg px-1.5 py-1.5 transition-none focus:outline-hidden focus-visible:ring-4",
			className,
		)}
		{...props}
		type="button"
	>
		<span className="flex min-w-0 flex-1 items-center gap-2">
			<span className="text-muted [&>svg]:size-5 [&>svg]:shrink-0">{currentProduct?.icon}</span>
			<span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
				{currentProduct?.label ?? "—"}
			</span>
		</span>
		<CaretUpDownIcon className="text-muted size-4 shrink-0" aria-hidden="true" />
	</button>
));
SidebarProductSwitcherTrigger.displayName = "SidebarProductSwitcherTrigger";

type ProductSwitcherRadioGroupProps = Omit<
	ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>,
	"children"
> & {
	/**
	 * The list of products available to the current account. Order is preserved.
	 */
	products: ReadonlyArray<Product>;
};

/**
 * A pre-styled radio group of products for use inside a `DropdownMenu.Content`.
 * Each row shows a product icon and label; the active product is highlighted
 * via the design system's selected-menu-item background.
 *
 * Built on `@radix-ui/react-dropdown-menu` directly so it can be embedded in
 * either the design system's `DropdownMenu` or any consumer-built Radix menu.
 *
 * @example
 * ```tsx
 * <DropdownMenu.Content>
 *   <Sidebar.ProductSwitcherRadioGroup
 *     products={products}
 *     value={currentProductId}
 *     onValueChange={setCurrentProductId}
 *   />
 * </DropdownMenu.Content>
 * ```
 */
const SidebarProductSwitcherRadioGroup = forwardRef<
	ComponentRef<typeof DropdownMenuPrimitive.RadioGroup>,
	ProductSwitcherRadioGroupProps
>(({ className, products, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioGroup ref={ref} className={cx("space-y-px", className)} {...props}>
		{products.map((product) => (
			<DropdownMenuPrimitive.RadioItem
				key={product.id}
				value={product.id}
				className={cx(
					"group/sidebar-product-switcher-item",
					"text-strong relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal outline-none",
					"data-highlighted:bg-active-menu-item",
					"aria-checked:bg-selected-menu-item",
					"data-highlighted:aria-checked:bg-active-selected-menu-item!",
					"data-disabled:pointer-events-none data-disabled:opacity-50",
					"[&>svg]:size-5 [&>svg]:shrink-0",
				)}
			>
				<span className="text-muted [&>svg]:size-5 [&>svg]:shrink-0">{product.icon}</span>
				<span className="min-w-0 flex-1 truncate">{product.label}</span>
			</DropdownMenuPrimitive.RadioItem>
		))}
	</DropdownMenuPrimitive.RadioGroup>
));
SidebarProductSwitcherRadioGroup.displayName = "SidebarProductSwitcherRadioGroup";

export type {
	//,
	Product,
};

export {
	//,
	SidebarProductSwitcherTrigger,
	SidebarProductSwitcherRadioGroup,
};
