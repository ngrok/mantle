import type { ComponentProps, ComponentRef, ReactNode } from "react";
import { Children, cloneElement, forwardRef, isValidElement } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon } from "../icon/icon.js";
import { Slot } from "../slot/index.js";
import type { Rel } from "./types.js";

/**
 * The class names for the `Anchor` component which define the styles for the component.
 */
const anchorClassNames = (className?: string) =>
	cx(
		"cursor-pointer rounded bg-transparent text-accent-600 hover:underline focus:outline-hidden focus-visible:ring-3 focus-visible:ring-focus-accent",
		className,
	);

/**
 * The props for the `Anchor` component.
 */
type AnchorProps = Omit<ComponentProps<"a">, "rel"> &
	WithAsChild & {
		/**
		 * An icon to render inside the anchor
		 */
		icon?: ReactNode;
		/**
		 * The side that the icon will render on, if one is present
		 * @default "start"
		 */
		iconPlacement?: "start" | "end";
		/**
		 * The rel attribute defines the relationship between a linked resource and the current document.
		 *
		 * Every keyword within a space-separated value should be unique within that value.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel
		 */
		rel?: Rel | (string & {}) | undefined | (Rel | (string & {}) | undefined | null)[];
	};

/**
 * Fundamental component for rendering links to external addresses.
 *
 * @note If you need to link to an internal application route, prefer using the
 * [`react-router` `<Link>`](https://reactrouter.com/en/main/components/link)
 *
 * @see https://mantle.ngrok.com/components/anchor
 *
 * @example
 * ```tsx
 * <Anchor href="https://ngrok.com/">ngrok.com</Anchor>
 *
 * <Anchor href="https://ngrok.com/docs" target="_blank" icon={<Book />}>
 *   ngrok docs
 * </Anchor>
 * ```
 */
const Anchor = forwardRef<ComponentRef<"a">, AnchorProps>(
	(
		{ asChild, children, className, rel: propRel, icon, iconPlacement = "start", ...props },
		ref,
	) => {
		const rel = resolveRel(propRel);
		const componentProps = {
			"data-slot": "anchor",
			className: anchorClassNames(className),
			ref,
			rel,
			...props,
		};

		if (asChild) {
			const singleChild = Children.only(children);
			invariant(
				isValidElement<AnchorProps>(singleChild),
				"When using `asChild`, Anchor must be passed a single child as a JSX tag.",
			);
			const grandchildren = singleChild.props?.children;

			return (
				<Slot {...componentProps}>
					{cloneElement(
						singleChild,
						{},
						<>
							{icon && iconPlacement === "start" && (
								<Icon className="inline-block mr-1.5" svg={icon} />
							)}
							{grandchildren}
							{icon && iconPlacement === "end" && (
								<Icon className="inline-block ml-1.5" svg={icon} />
							)}
						</>,
					)}
				</Slot>
			);
		}

		return (
			<a {...componentProps}>
				{icon && iconPlacement === "start" && <Icon className="inline-block mr-1.5" svg={icon} />}
				{children}
				{icon && iconPlacement === "end" && <Icon className="inline-block ml-1.5" svg={icon} />}
			</a>
		);
	},
);
Anchor.displayName = "Anchor";

/**
 * Resolves the `rel` attribute to a string.
 *
 * If the value is an array, it will be filtered for empty values, ensure uniqueness, sorted, and joined with a space.
 */
function resolveRel(
	rel: Rel | (string & {}) | undefined | null | (Rel | (string & {}) | undefined | null)[],
) {
	if (Array.isArray(rel)) {
		const uniqueRel = new Set(rel);
		const result = [...uniqueRel]
			.map((item) => item?.trim())
			.filter(Boolean)
			.toSorted()
			.join(" ");
		return result || undefined;
	}

	return rel?.trim() || undefined;
}

export {
	//,
	Anchor,
	anchorClassNames,
	resolveRel,
};

export type {
	//,
	AnchorProps,
};
