import type { ComponentProps, ComponentRef } from "react";
import { forwardRef } from "react";
import type { WithAsChild } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

type DescriptionListProps = ComponentProps<"dl"> & WithAsChild;

/**
 * A semantically correct description list built on the HTML `<dl>` element.
 * Renders a list of label/value pairs with alternating row backgrounds,
 * commonly used in detail views to display metadata about a resource.
 *
 * @see https://mantle.ngrok.com/components/description-list#descriptionlistroot
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl
 *
 * @example
 * ```tsx
 * <DescriptionList.Root>
 *   <DescriptionList.Item>
 *     <DescriptionList.Label>Name</DescriptionList.Label>
 *     <DescriptionList.Value>my-api-key</DescriptionList.Value>
 *   </DescriptionList.Item>
 * </DescriptionList.Root>
 * ```
 */
const Root = forwardRef<ComponentRef<"dl">, DescriptionListProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
		const Component = asChild ? Slot : "dl";

		return (
			<Component
				ref={ref}
				data-slot="description-list"
				className={cx(
					"relative scrollbar overflow-x-auto overscroll-x-none rounded-lg border border-card grid grid-cols-[auto_1fr] gap-x-4 [&>*:nth-child(odd)]:bg-neutral-500/5 p-1",
					className,
				)}
				{...rest}
			>
				{children}
			</Component>
		);
	},
);
Root.displayName = "DescriptionList";

type DescriptionListItemProps = ComponentProps<"div"> & WithAsChild;

/**
 * A wrapper that groups a `DescriptionList.Label` and `DescriptionList.Value`
 * pair. Renders as a `<div>` inside the `<dl>` with a subgrid layout that
 * inherits column tracks from the root.
 *
 * @see https://mantle.ngrok.com/components/description-list#descriptionlistitem
 *
 * @example
 * ```tsx
 * <DescriptionList.Item>
 *   <DescriptionList.Label>ID</DescriptionList.Label>
 *   <DescriptionList.Value>aigk_2fKm9x8Hn3...</DescriptionList.Value>
 * </DescriptionList.Item>
 * ```
 */
const Item = forwardRef<ComponentRef<"div">, DescriptionListItemProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
		const Component = asChild ? Slot : "div";

		return (
			<Component
				ref={ref}
				data-slot="description-list-item"
				className={cx("rounded-sm col-span-full grid grid-cols-subgrid items-center", className)}
				{...rest}
			>
				{children}
			</Component>
		);
	},
);
Item.displayName = "DescriptionListItem";

type DescriptionListLabelProps = ComponentProps<"dt"> & WithAsChild;

/**
 * The label for a description list item. Renders as a `<dt>` element.
 *
 * @see https://mantle.ngrok.com/components/description-list#descriptionlistlabel
 *
 * @example
 * ```tsx
 * <DescriptionList.Label>Name</DescriptionList.Label>
 * ```
 */
const Label = forwardRef<ComponentRef<"dt">, DescriptionListLabelProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
		const Component = asChild ? Slot : "dt";

		return (
			<Component
				ref={ref}
				data-slot="description-list-label"
				className={cx("text-muted text-sm font-sans font-medium min-w-36 p-2", className)}
				{...rest}
			>
				{children}
			</Component>
		);
	},
);
Label.displayName = "DescriptionListLabel";

type DescriptionListValueProps = ComponentProps<"dd"> & WithAsChild;

/**
 * The value for a description list item. Renders as a `<dd>` element.
 * Compose any content inside — the component is intentionally "dumb" and
 * imposes no layout on its children.
 *
 * @see https://mantle.ngrok.com/components/description-list#descriptionlistvalue
 *
 * @example
 * ```tsx
 * <DescriptionList.Value>
 *   aigk_2fKm9x8Hn3QpYT7zKlR0vW5
 * </DescriptionList.Value>
 * ```
 */
const Value = forwardRef<ComponentRef<"dd">, DescriptionListValueProps>(
	({ asChild = false, className, children, ...rest }, ref) => {
		const Component = asChild ? Slot : "dd";

		return (
			<Component
				ref={ref}
				data-slot="description-list-value"
				className={cx("text-body font-mono text-mono py-2 px-3", className)}
				{...rest}
			>
				{children}
			</Component>
		);
	},
);
Value.displayName = "DescriptionListValue";

/**
 * A semantically correct description list built on the HTML `<dl>` element.
 * Renders a list of label/value pairs with alternating row backgrounds,
 * commonly used in detail views to display metadata about a resource
 * (e.g., API keys, secrets, domains).
 *
 * Compose with `DescriptionList.Item`, `DescriptionList.Label`, and
 * `DescriptionList.Value` as direct children.
 *
 * @see https://mantle.ngrok.com/components/description-list
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl
 *
 * @example
 * Composition:
 * ```
 * DescriptionList.Root
 * └── DescriptionList.Item
 *     ├── DescriptionList.Label
 *     └── DescriptionList.Value
 * ```
 *
 * @example
 * ```tsx
 * <DescriptionList.Root>
 *   <DescriptionList.Item>
 *     <DescriptionList.Label>Name</DescriptionList.Label>
 *     <DescriptionList.Value>my-api-key</DescriptionList.Value>
 *   </DescriptionList.Item>
 *   <DescriptionList.Item>
 *     <DescriptionList.Label>ID</DescriptionList.Label>
 *     <DescriptionList.Value>
 *       aigk_2fKm9x8Hn3QpYT7zKlR0vW5
 *     </DescriptionList.Value>
 *   </DescriptionList.Item>
 * </DescriptionList.Root>
 * ```
 */
const DescriptionList = {
	/**
	 * The root container for a description list. Renders a `<dl>` element.
	 *
	 * @see https://mantle.ngrok.com/components/description-list#descriptionlistroot
	 *
	 * @example
	 * ```tsx
	 * <DescriptionList.Root>
	 *   <DescriptionList.Item>
	 *     <DescriptionList.Label>Name</DescriptionList.Label>
	 *     <DescriptionList.Value>my-api-key</DescriptionList.Value>
	 *   </DescriptionList.Item>
	 * </DescriptionList.Root>
	 * ```
	 */
	Root,
	/**
	 * A wrapper that groups a label/value pair. Renders a `<div>` with a default
	 * subgrid layout.
	 *
	 * @see https://mantle.ngrok.com/components/description-list#descriptionlistitem
	 *
	 * @example
	 * ```tsx
	 * <DescriptionList.Item>
	 *   <DescriptionList.Label>ID</DescriptionList.Label>
	 *   <DescriptionList.Value>aigk_2fKm9x8Hn3...</DescriptionList.Value>
	 * </DescriptionList.Item>
	 * ```
	 */
	Item,
	/**
	 * The label for a description list item. Renders a `<dt>` element.
	 *
	 * @see https://mantle.ngrok.com/components/description-list#descriptionlistlabel
	 *
	 * @example
	 * ```tsx
	 * <DescriptionList.Label>Name</DescriptionList.Label>
	 * ```
	 */
	Label,
	/**
	 * The value for a description list item. Renders a `<dd>` element.
	 *
	 * @see https://mantle.ngrok.com/components/description-list#descriptionlistvalue
	 *
	 * @example
	 * ```tsx
	 * <DescriptionList.Value>
	 *   aigk_2fKm9x8Hn3QpYT7zKlR0vW5
	 * </DescriptionList.Value>
	 * ```
	 */
	Value,
} as const;

export {
	//,
	DescriptionList,
};

export type {
	//,
	DescriptionListProps,
};
