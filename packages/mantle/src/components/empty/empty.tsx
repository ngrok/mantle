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
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No results found</Empty.Title>
 *   <Empty.Description>Try adjusting your search or filters.</Empty.Description>
 *   <Empty.Actions>
 *     <Button appearance="outlined" intent="neutral">Clear filters</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Root = ({ asChild, children, className, ...props }: ComponentProps<"div"> & WithAsChild) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot="empty"
			// isolate: Empty.Scrim sits at -z-10 so it paints under the content.
			// Without a stacking context here that would put it under the backdrop
			// the empty state is layered over, and the scrim would never be seen.
			className={cx(
				"relative isolate mx-auto flex max-w-lg flex-col items-center p-6 text-center",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A soft wash that sits behind the empty state's content, so the copy stays
 * readable over a busy backdrop. Compose it as the first child of
 * `Empty.Root`; it paints an ellipse of the surface color that fades to
 * nothing well before the container's edge, and it takes no space.
 *
 * **It is paint, and nothing else.** The scrim is `aria-hidden`, never a tab
 * stop, and inert to pointer events, so it reaches neither assistive
 * technology nor the hit area of the actions beside it. Those three hold even
 * when a consumer spreads their own values over the part. It takes no
 * children: content nested here would render inside an `aria-hidden` subtree,
 * which is how copy goes silently missing from the accessibility tree.
 *
 * `Empty.Root` positions it — the root carries `relative isolate`, and the
 * scrim paints at `-z-10` inside that stacking context. The isolation is what
 * keeps the scrim between the content and the backdrop instead of behind both.
 *
 * **Compose it whenever the empty state sits over anything but a flat
 * surface** — a [decorative chart](https://mantle.ngrok.com/components/charts/bar-chart#decorative-charts),
 * an image, a pattern. `Empty.Description` sits on `text-muted`, which
 * measures 4.88:1 on a bare light card — 0.38 over the 4.5:1 floor for 14px
 * text. Anything tinted under that text spends the headroom and drops it
 * under WCAG AA. The scrim restores the flat surface locally, so the message
 * measures what it would on a bare card.
 *
 * | CSS Variable          | Default                          | Description                                                                                            |
 * | --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
 * | `--empty-scrim-color` | `var(--background-color-card)`   | The color the wash paints. Set it to the surface the empty state actually sits on — `var(--background-color-popover)` inside a popover. |
 *
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * ```tsx
 * <div className="relative w-full">
 *   <BarChart.Root data={placeholderUsage} xKey="day" decorative>
 *     <BarChart.Bar dataKey="value" />
 *   </BarChart.Root>
 *   <Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
 *     <Empty.Scrim />
 *     <Empty.Title>No usage yet</Empty.Title>
 *     <Empty.Description>
 *       <p>Traffic will appear here once your endpoints start receiving requests.</p>
 *     </Empty.Description>
 *   </Empty.Root>
 * </div>
 * ```
 */
/**
 * The scrim paints; it never holds content. Children are unrepresentable
 * rather than discouraged: anything nested here would render inside an
 * `aria-hidden` subtree, which is how copy goes silently missing from the
 * accessibility tree.
 */
type EmptyScrimProps = Omit<ComponentProps<"div">, "children"> & { children?: never };

const Scrim = ({ className, ...props }: EmptyScrimProps) => {
	return (
		<div
			data-slot="empty-scrim"
			// A blurred ellipse, not a radial gradient: a gradient's alpha ramps
			// linearly and leaves a visible shoulder where it meets the backdrop,
			// while a blur is Gaussian and has none. The core stays fully opaque —
			// blur(24px) is a 12px sigma, and the copy sits several sigma inside the
			// edge — which is what keeps the contrast math in
			// chart/recession-contrast.test.tsx honest.
			className={cx(
				"pointer-events-none absolute -inset-6 -z-10 rounded-[50%] blur-xl",
				"bg-[var(--empty-scrim-color,var(--background-color-card))]",
				className,
			)}
			{...props}
			// After the spread on purpose: the decorative contract is not a default
			// a consumer can spread over. `aria-hidden` keeps a shape that carries
			// no information out of the accessibility tree, and clearing `tabIndex`
			// keeps it out of the tab order — a focusable `aria-hidden` element is
			// a WCAG failure in its own right, because focus lands somewhere the
			// screen reader cannot announce.
			aria-hidden
			tabIndex={undefined}
		/>
	);
};

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
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Icon = ({ className, svg, ...props }: EmptyIconProps) => {
	return (
		<SvgOnly
			data-slot="empty-icon"
			className={cx("mb-1 size-10 text-neutral-400", className)}
			svg={svg}
			{...props}
		/>
	);
};

/**
 * The heading text for the empty state. Renders as an `h3` by default. Use the
 * `asChild` prop to render as a different heading level (e.g. `h1`, `h2`).
 *
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
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
			className={cx("text-strong text-sm font-medium font-sans", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * Supporting descriptive text below the title. Renders as a `div` with
 * `space-y-4` so multiple paragraphs can be placed inside. Use the `asChild`
 * prop to render as a different element.
 *
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
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
			className={cx("text-muted space-y-4 text-sm font-sans", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A container for action buttons or links in the empty state.
 *
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
 *   <Empty.Actions>
 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
 *     <Button appearance="outlined" intent="neutral">Go back</Button>
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

/**
 * Compound component for rendering empty states. Use with `Empty.Root`,
 * `Empty.Icon`, `Empty.Title`, `Empty.Description`, and `Empty.Actions`.
 *
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * Composition:
 * ```
 * Empty.Root
 * ├── Empty.Scrim
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
 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Empty = {
	/**
	 * The root container for an empty state. Centers content vertically and
	 * horizontally with consistent padding and max-width.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 * ```
	 */
	Root,
	/**
	 * A soft wash behind the content, so the copy stays readable over a busy
	 * backdrop. Compose it as the first child of `Empty.Root` whenever the empty
	 * state sits over anything but a flat surface — a decorative chart, an
	 * image, a pattern.
	 *
	 * | CSS Variable          | Default                        | Description                                                                  |
	 * | --------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
	 * | `--empty-scrim-color` | `var(--background-color-card)` | The color the wash paints. Set it to the surface the empty state sits on. |
	 *
	 * @see https://mantle.ngrok.com/components/feedback/empty
	 *
	 * @example
	 * ```tsx
	 * <div className="relative w-full">
	 *   <BarChart.Root data={placeholderUsage} xKey="day" decorative>
	 *     <BarChart.Bar dataKey="value" />
	 *   </BarChart.Root>
	 *   <Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
	 *     <Empty.Scrim />
	 *     <Empty.Title>No usage yet</Empty.Title>
	 *     <Empty.Description>
	 *       <p>Traffic will appear here once your endpoints start receiving requests.</p>
	 *     </Empty.Description>
	 *   </Empty.Root>
	 * </div>
	 * ```
	 */
	Scrim,
	/**
	 * Renders a large icon for the empty state. Pass a single SVG icon element
	 * via the `svg` prop.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 * ```
	 */
	Icon,
	/**
	 * The heading text for the empty state. Renders as an `h3` by default.
	 * Use `asChild` to render as a different heading level.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
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
	 * @see https://mantle.ngrok.com/components/feedback/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
	 *   </Empty.Actions>
	 * </Empty.Root>
	 * ```
	 */
	Description,
	/**
	 * A container for action buttons or links in the empty state.
	 *
	 * @see https://mantle.ngrok.com/components/feedback/empty
	 *
	 * @example
	 * ```tsx
	 * <Empty.Root>
	 *   <Empty.Icon svg={<GhostIcon />} />
	 *   <Empty.Title>No endpoints yet</Empty.Title>
	 *   <Empty.Description>Create your first endpoint to get started.</Empty.Description>
	 *   <Empty.Actions>
	 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
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
