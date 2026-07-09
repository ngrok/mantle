import type { ComponentProps, ComponentRef, HTMLAttributes } from "react";
import { createContext, forwardRef, useContext } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { Slot } from "../slot/index.js";

const orientations = ["horizontal", "vertical"] as const;
type Orientation = (typeof orientations)[number];

type SeparatorGroupContextShape = {
	orientation?: Orientation;
};

const SeparatorGroupContext = createContext<SeparatorGroupContextShape>({});

/**
 * A container to layout a group of horizontal separators and other children.
 * Overrides all children `Separator`s to be `orientation="horizontal"`.
 *
 * @see https://mantle.ngrok.com/components/separator
 *
 * @example
 * ```tsx
 * <HorizontalSeparatorGroup>
 *   <Separator />
 *   <h3>ngrok mantle</h3>
 *   <Separator />
 * </HorizontalSeparatorGroup>
 *
 * <HorizontalSeparatorGroup>
 *   <h3>ngrok mantle</h3>
 *   <Separator />
 * </HorizontalSeparatorGroup>
 *
 * <HorizontalSeparatorGroup>
 *   <Separator />
 *   <h3>ngrok mantle</h3>
 * </HorizontalSeparatorGroup>
 * ```
 */
const HorizontalSeparatorGroup = ({
	className,
	children,
	asChild,
	...props
}: HTMLAttributes<HTMLDivElement> & WithAsChild) => {
	const Comp = asChild ? Slot : "div";

	return (
		<SeparatorGroupContext.Provider value={{ orientation: "horizontal" }}>
			<Comp
				data-slot="horizontal-separator-group"
				data-horizontal-separator-group
				className={cx(
					"group flex items-center gap-2 [&_*:not([data-separator])]:shrink-0",
					className,
				)}
				{...props}
			>
				{children}
			</Comp>
		</SeparatorGroupContext.Provider>
	);
};
HorizontalSeparatorGroup.displayName = "HorizontalSeparatorGroup";

type SeparatorProps = ComponentProps<"div"> &
	WithAsChild & {
		/**
		 * Either `horizontal` or `vertical`.
		 *
		 * @default "horizontal"
		 */
		orientation?: Orientation;
		/**
		 * If `true`, the separator will be rendered with all accessibility-related attributes and role="separator".
		 * If `false`, the separator is purely decorative and all accessibility-related attributes
		 * are updated so that that the rendered element is removed from the accessibility tree.
		 *
		 * @default false
		 */
		semantic?: boolean;
	};

/**
 * Visually or semantically separates content.
 *
 * @see https://mantle.ngrok.com/components/separator
 *
 * @example
 * ```tsx
 * <Separator className="my-4" />
 *
 * <Separator className="my-4" semantic />
 *
 * <div className="flex h-5 items-center gap-4 text-sm">
 *   Blog
 *   <Separator orientation="vertical" />
 *   Docs
 *   <Separator orientation="vertical" />
 *   Source
 * </div>
 * ```
 */
const Separator = forwardRef<ComponentRef<"div">, SeparatorProps>(
	(
		{
			asChild = false,
			children,
			className,
			orientation: propOrientation,
			semantic = false,
			...props
		},
		ref,
	) => {
		const Component = asChild ? Slot : "div";
		const ctx = useContext(SeparatorGroupContext);
		// Prefer the orientation from the context if it's set, else fallback to the prop and then to "horizontal".
		const orientation =
			ctx.orientation ?? (isOrientation(propOrientation) ? propOrientation : "horizontal");
		// `aria-orientation` defaults to `horizontal` so we only need it if `orientation` is vertical
		const ariaOrientation = orientation === "vertical" ? orientation : undefined;
		const semanticProps = semantic
			? { "aria-orientation": ariaOrientation, role: "separator" }
			: { role: "none" };

		return (
			<Component
				data-slot="separator"
				className={cx(
					"separator",
					"dark-high-contrast:bg-black high-contrast:bg-black bg-gray-500/20 dark:bg-gray-600/20",
					orientation === "horizontal"
						? "h-px w-full group-data-horizontal-separator-group:flex-1"
						: "h-full w-px",
					className,
				)}
				data-orientation={orientation}
				data-separator
				{...semanticProps}
				ref={ref}
				{...(asChild ? { children } : {})} // only pass children if asChild is true
				{...props}
			/>
		);
	},
);
Separator.displayName = "Separator";

export {
	//,
	HorizontalSeparatorGroup,
	Separator,
};

function isOrientation(value: unknown): value is Orientation {
	return typeof value === "string" && orientations.includes(value as Orientation);
}
