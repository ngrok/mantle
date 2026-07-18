import type { ComponentProps, ReactNode } from "react";
import { Children, cloneElement, isValidElement } from "react";
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
 * A styled hyperlink — a native `<a>` with mantle's link styling, focus
 * treatment, optional leading/trailing icon, and a safer default for the
 * `rel` attribute. Use for links that point _outside_ the current
 * application.
 *
 * **When to use**
 * - External URLs (docs, marketing pages, third-party sites).
 * - Links to files or `mailto:` / `tel:` destinations.
 *
 * **When not to use**
 * - Internal application routes — prefer the framework router's link
 *   primitive ({@link https://reactrouter.com/en/main/components/link `react-router` `<Link>`})
 *   so client-side navigation kicks in. You can keep mantle's styling by
 *   composing: `<Anchor asChild><Link to="/foo">…</Link></Anchor>`.
 * - For triggering an action — use a {@link https://mantle.ngrok.com/components/actions/button Button}
 *   instead. If it doesn't navigate, it's not a link.
 *
 * **Icons.** Pass `icon` (a phosphor or custom SVG) and optionally
 * `iconPlacement` (`"start"` default, or `"end"`) to render a small inline
 * icon — useful for "external link" or "download" affordances. Icons are
 * decorative; the link text must still describe the destination on its own.
 *
 * **Security.** When `target="_blank"`, `rel` should include
 * `"noopener noreferrer"`. The `rel` prop accepts an array — duplicates
 * are de-duped and sorted, so it's safe to merge token sets.
 *
 * **Accessibility.** Link text must be self-describing — avoid "click
 * here" / "read more". For purely decorative icons, no extra labeling is
 * needed; for icon-only links, provide an `aria-label`.
 *
 * @see https://mantle.ngrok.com/components/navigation/anchor
 *
 * @example
 * ```tsx
 * import { Anchor } from "@ngrok/mantle/anchor";
 * import { BookIcon } from "@phosphor-icons/react/Book";
 * import { Link } from "react-router";
 *
 * // Basic external link.
 * <Anchor href="https://ngrok.com/">ngrok.com</Anchor>
 *
 * // External link in a new tab with a leading icon.
 * <Anchor
 *   href="https://ngrok.com/docs"
 *   target="_blank"
 *   rel={["noopener", "noreferrer"]}
 *   icon={<BookIcon />}
 * >
 *   ngrok docs
 * </Anchor>
 *
 * // Compose Anchor styling onto a react-router Link for internal navigation.
 * <Anchor asChild>
 *   <Link to="/dashboard">Open dashboard</Link>
 * </Anchor>
 * ```
 */
const Anchor = ({
	asChild,
	children,
	className,
	rel: propRel,
	icon,
	iconPlacement = "start",
	ref,
	...props
}: AnchorProps) => {
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
						{icon && iconPlacement === "end" && <Icon className="inline-block ml-1.5" svg={icon} />}
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
};

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
