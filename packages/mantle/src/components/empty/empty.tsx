import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { SvgOnly } from "../icon/svg-only.js";
import type { SvgAttributes } from "../icon/types.js";
import { Slot } from "../slot/index.js";

/**
 * The root container for an empty state. Centers content horizontally
 * with consistent vertical padding and max-width.
 *
 * @see https://mantle.ngrok.com/components/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No results found</Empty.Title>
 *   <Empty.Description>Try adjusting your search or filters.</Empty.Description>
 *   <Empty.Actions>
 *     <Button>Clear filters</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Root = ({ asChild, children, className, ...props }: ComponentProps<"div"> & WithAsChild) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="empty"
			className={cx("mx-auto flex max-w-lg flex-col items-center py-14 text-center", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Root.displayName = "Empty";

type EmptyIconProps = Omit<SvgAttributes, "children"> & {
	/**
	 * A single SVG icon element.
	 */
	svg: ReactNode;
};

/**
 * Renders a large icon for the empty state. Pass a single SVG icon element
 * via the `svg` prop (e.g. from `@phosphor-icons/react`).
 *
 * @see https://mantle.ngrok.com/components/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button>Create endpoint</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Icon = ({ className, svg, ...props }: EmptyIconProps) => {
	return (
		<SvgOnly
			data-slot="empty-icon"
			className={cx("mb-2 size-16 text-muted", className)}
			svg={svg}
			{...props}
		/>
	);
};
Icon.displayName = "EmptyIcon";

/**
 * The heading text for the empty state. Renders as an `h3` by default. Use the
 * `asChild` prop to render as a different heading level (e.g. `h1`, `h2`).
 *
 * @see https://mantle.ngrok.com/components/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button>Create endpoint</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 *
 * <Empty.Title asChild>
 *   <h2>No results found</h2>
 * </Empty.Title>
 * ```
 */
const Title = ({
	asChild,
	children,
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement> & WithAsChild) => {
	const Comp = asChild ? Slot : "h3";

	return (
		<Comp
			data-slot="empty-title"
			className={cx("text-strong text-xl font-medium", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Title.displayName = "EmptyTitle";

/**
 * Supporting descriptive text below the title. Renders as a `div` with
 * `space-y-4` so multiple paragraphs can be placed inside. Use the `asChild`
 * prop to render as a different element.
 *
 * @see https://mantle.ngrok.com/components/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button>Create endpoint</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 *
 * <Empty.Description>
 *   <p>Something went wrong.</p>
 *   <p>Please try again in a few minutes.</p>
 * </Empty.Description>
 * ```
 */
const Description = ({
	asChild,
	children,
	className,
	...props
}: ComponentProps<"div"> & WithAsChild) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="empty-description"
			className={cx("text-body mt-1 space-y-4 text-sm", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Description.displayName = "EmptyDescription";

/**
 * A container for action buttons or links in the empty state.
 *
 * @see https://mantle.ngrok.com/components/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button>Create endpoint</Button>
 *     <Button appearance="outlined">Go back</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Actions = ({
	asChild,
	children,
	className,
	...props
}: ComponentProps<"div"> & WithAsChild) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="empty-actions"
			className={cx("mt-4 flex items-center gap-2", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Actions.displayName = "EmptyActions";

/**
 * Compound component for rendering empty states. Use with `Empty.Root`,
 * `Empty.Icon`, `Empty.Title`, `Empty.Description`, and `Empty.Actions`.
 *
 * @see https://mantle.ngrok.com/components/empty
 *
 * @example
 * Composition:
 * ```
 * Empty.Root
 * ├── Empty.Icon
 * ├── Empty.Title
 * ├── Empty.Description
 * └── Empty.Actions
 * ```
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>
 *     Create your first endpoint to get started.
 *   </Empty.Description>
 *   <Empty.Actions>
 *     <Button>Create endpoint</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Empty = {
	/**
	 * The root container for an empty state. Centers content vertically and
	 * horizontally with consistent padding and max-width.
	 *
	 * @see https://mantle.ngrok.com/components/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button>Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 * ```
	 */
	Root,
	/**
	 * Renders a large icon for the empty state. Pass a single SVG icon element
	 * via the `svg` prop.
	 *
	 * @see https://mantle.ngrok.com/components/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button>Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 * ```
	 */
	Icon,
	/**
	 * The heading text for the empty state. Renders as an `h3` by default.
	 * Use `asChild` to render as a different heading level.
	 *
	 * @see https://mantle.ngrok.com/components/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button>Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 *
	 * <Empty.Title asChild>
	 *   <h2>No results found</h2>
	 * </Empty.Title>
	 * ```
	 */
	Title,
	/**
	 * Supporting descriptive text below the title. Renders as a `div` with
	 * `space-y-4` for multiple paragraphs. Use `asChild` to render as a
	 * different element.
	 *
	 * @see https://mantle.ngrok.com/components/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button>Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 * ```
	 */
	Description,
	/**
	 * A container for action buttons or links in the empty state.
	 *
	 * @see https://mantle.ngrok.com/components/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button>Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 * ```
	 */
	Actions,
} as const;

export {
	//,
	Empty,
};
