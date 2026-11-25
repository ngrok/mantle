import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The toolbar band that `Panel.Header` and `AppLayout.Header` share, so the two
 * rows and the sidebar header's switcher row center on one line. Standalone the
 * band is `h-14`. With a `Sidebar.Header` in an `AppLayout` shell, the height
 * derives from the sidebar's `--sidebar-header-height` token, except when the
 * sidebar is the mobile sheet (`data-mobile`), which sits above the page
 * instead of beside the header. The row sits below the card's gutter and its
 * 1px border, so center parity needs the band minus twice each. The band is
 * the sidebar header's first row, so a header that stacks a second row leaves
 * this height alone. Set `--sidebar-header-height` on a common ancestor (for
 * example `AppLayout.Root`) and every row moves together.
 */
const headerBandClassName =
	"h-14 group-has-[[data-slot~=sidebar-header]:not([data-mobile]_*)]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-2*var(--app-layout-card-gutter,0.5rem)-2px)]";

/**
 * The props for `Panel.Root`: an `<aside>`'s props, `asChild`, and `data-slot`.
 *
 * @see https://mantle.ngrok.com/components/structure/panel#panelroot
 *
 * @example
 * ```tsx
 * <Panel.Root aria-label="Assistant" className="h-120">
 *   <Panel.Header>
 *     <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *     <IconButton type="button" appearance="ghost" intent="neutral" icon={<XIcon />} label="Close" />
 *   </Panel.Header>
 *   <Panel.Body>
 *     <AssistantConversation />
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <AssistantComposer />
 *   </Panel.Footer>
 * </Panel.Root>
 * ```
 */
type PanelRootProps = ComponentProps<"aside"> & WithAsChild & WithDataSlot;

/**
 * The props for `Panel.Header`, `Panel.Body`, and `Panel.Footer`: a `<div>`'s
 * props, `asChild`, and `data-slot`.
 *
 * @see https://mantle.ngrok.com/components/structure/panel#api-reference
 *
 * @example
 * ```tsx
 * <Panel.Root aria-label="Assistant" className="h-120">
 *   <Panel.Header>
 *     <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *     <IconButton type="button" appearance="ghost" intent="neutral" icon={<XIcon />} label="Close" />
 *   </Panel.Header>
 *   <Panel.Body>
 *     <AssistantConversation />
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <AssistantComposer />
 *   </Panel.Footer>
 * </Panel.Root>
 * ```
 */
type PanelPartProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The card surface of a panel: a column with the card background, a muted
 * hairline border, rounded corners, and a small shadow, which clips its
 * children to the corners. Renders an `<aside>`, so it is the `complementary`
 * landmark; name it with `aria-label`. Compose a `<div>` with `asChild` when the
 * panel is not a landmark, such as inside another `<aside>`. A `<section>` named
 * by its heading is a `region` landmark.
 *
 * It has no size and no open state. The caller sets the height, and the
 * header, the body, and the footer split it: the body takes what is left and
 * scrolls. It is `relative`, so an absolute control inside stays in the card,
 * and `min-h-0 min-w-0`, so it shrinks as a flex item instead of growing to its
 * content.
 *
 * @see https://mantle.ngrok.com/components/structure/panel#panelroot
 *
 * @example
 * ```tsx
 * <Panel.Root aria-label="Assistant" className="h-120">
 *   <Panel.Header>
 *     <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *     <IconButton type="button" appearance="ghost" intent="neutral" icon={<XIcon />} label="Close" />
 *   </Panel.Header>
 *   <Panel.Body>
 *     <AssistantConversation />
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <AssistantComposer />
 *   </Panel.Footer>
 * </Panel.Root>
 * ```
 */
const Root = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: PanelRootProps) => {
	const Comp = asChild ? Slot : "aside";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "panel")}
			className={cx(
				"bg-card border-card-muted relative flex min-h-0 min-w-0 flex-col rounded-xl border shadow-sm",
				// clip, not hidden: `hidden` makes a scroll container, and a sticky
				// child would stick to the panel instead of to the body.
				"overflow-clip",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The toolbar row at the top of `Panel.Root`: the title at the start and the
 * controls at the end, with a close control last. Render it as the **first
 * child of `Panel.Root`**. A flex row with a separator line under it, on the same
 * band as `AppLayout.Header`, so the two rows center on one line. Give the
 * title `min-w-0 flex-1 truncate`, so it gives up width before a control does.
 * Merge `border-b-0` for a header with no rule under it.
 *
 * It also stands alone as the header row of a full-page surface, such as a
 * chat page, so that page and a panel share one header.
 *
 * Renders a `<div>`: the row is a toolbar, not the panel's introduction. A
 * `<header>` inside the `<aside>` scopes to the panel and claims no landmark,
 * so if the row introduces the panel, compose a `<header>` with `asChild`.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--sidebar-header-height` | `4.5rem` | Read, not owned: `Sidebar.Header` owns this token. In an `AppLayout` shell with a sidebar header, this row derives its height from it, the same way `AppLayout.Header` does. |
 * | `--app-layout-card-gutter` | `0.5rem` | Read, not owned: `AppLayout.Content` owns this token. The derived height subtracts twice its value. |
 *
 * @see https://mantle.ngrok.com/components/structure/panel#panelheader
 *
 * @example
 * ```tsx
 * <Panel.Root aria-label="Assistant" className="h-120">
 *   <Panel.Header>
 *     <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *     <IconButton type="button" appearance="ghost" intent="neutral" icon={<XIcon />} label="Close" />
 *   </Panel.Header>
 *   <Panel.Body>
 *     <AssistantConversation />
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <AssistantComposer />
 *   </Panel.Footer>
 * </Panel.Root>
 * ```
 */
const Header = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: PanelPartProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "panel-header")}
			className={cx(
				"border-separator flex shrink-0 items-center gap-2 border-b px-4",
				headerBandClassName,
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The scroll region of `Panel.Root`, and the only part of the panel that
 * scrolls. Render it after `Panel.Header`. It takes the height the header and
 * the footer leave, and it has no landmark. It is block inside, so a child that
 * asks for `h-full` fills it, and `mx-auto max-w-*` still centers.
 *
 * @see https://mantle.ngrok.com/components/structure/panel#panelbody
 *
 * @example
 * ```tsx
 * <Panel.Root aria-label="Assistant" className="h-120">
 *   <Panel.Header>
 *     <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *     <IconButton type="button" appearance="ghost" intent="neutral" icon={<XIcon />} label="Close" />
 *   </Panel.Header>
 *   <Panel.Body>
 *     <AssistantConversation />
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <AssistantComposer />
 *   </Panel.Footer>
 * </Panel.Root>
 * ```
 */
const Body = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: PanelPartProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "panel-body")}
			className={cx(
				"scrollbar scrollbar-gutter-stable relative min-h-0 w-full flex-1 overflow-y-auto overscroll-none",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The bar pinned to the bottom of `Panel.Root`: a composer, a save row, a
 * status line. Render it after `Panel.Body`. A column outside the scroll
 * region, so the body scrolls under it and it never scrolls away. It draws no
 * rule above itself: the composer frame inside it is the edge. Merge
 * `flex-row justify-end` for an action row. Optional.
 *
 * @see https://mantle.ngrok.com/components/structure/panel#panelfooter
 *
 * @example
 * ```tsx
 * <Panel.Root aria-label="Assistant" className="h-120">
 *   <Panel.Header>
 *     <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *     <IconButton type="button" appearance="ghost" intent="neutral" icon={<XIcon />} label="Close" />
 *   </Panel.Header>
 *   <Panel.Body>
 *     <AssistantConversation />
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <AssistantComposer />
 *   </Panel.Footer>
 * </Panel.Root>
 * ```
 */
const Footer = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: PanelPartProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "panel-footer")}
			className={cx("flex shrink-0 flex-col gap-2 px-3 pb-3", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

export {
	//,
	Root,
	Header,
	Body,
	Footer,
	headerBandClassName,
};
export type {
	//,
	PanelPartProps,
	PanelRootProps,
};
