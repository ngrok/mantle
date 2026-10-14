import { SidebarSimpleIcon } from "@phosphor-icons/react/SidebarSimple";
import type { ComponentProps, ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsHydratedAfterPaint } from "../../hooks/use-is-hydrated-after-paint.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { IconButtonProps } from "../button/icon-button.js";
import { IconButton } from "../button/icon-button.js";
import { Main } from "../main/main.js";
import { Slot } from "../slot/index.js";
import { Tooltip } from "../tooltip/index.js";

/**
 * The outer frame of an application shell. Renders a `<div>` with
 * `relative isolate flex h-full w-full flex-col overflow-clip`, so
 * it fills its nearest sized ancestor — which makes it embeddable in docs
 * demos and tests. Real app shells pin it to the viewport by merging
 * `className="fixed inset-0"` (mantle `cx` is tailwind-merge-backed, so the
 * override is deterministic); the shell itself never scrolls — only
 * `AppLayout.Body` does.
 *
 * It clips with `overflow-clip` rather than `overflow-hidden` for the same
 * reason `AppLayout.Content` does: `hidden` **is** a scroll container that
 * paints no scrollbar, so anything wider than the frame lets focus scroll the
 * entire shell sideways — translating the notice, the rail, and the card out of
 * view with no scrollbar and no gesture to bring them back. On a frame pinned
 * with `fixed inset-0` that is the whole window. `clip` is not a scroll
 * container at all.
 *
 * When the shell owns the document, render a `SkipToMainLink` as its first
 * child. `AppLayout.Body` is the `Main` landmark, so the link sends keyboard
 * users past the sidebar and the toolbar straight into the scrolling page
 * region.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutroot
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Root = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout")}
			className={cx(
				// group/app-layout lets descendant parts adapt to what the shell
				// contains (AppLayout.Header derives its height from the sidebar
				// header's token when one is composed — see AppLayout.Header).
				"group/app-layout bg-base relative isolate flex h-full w-full flex-col",
				// clip, not hidden — the same trap AppLayout.Content avoids, one
				// level up: `hidden` is a scroll container that paints no scrollbar,
				// so anything overflowing the frame lets focus scroll the whole shell
				// sideways with no way back. On `fixed inset-0` that is the window.
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
 * A full-window-width strip pinned above everything else in the shell —
 * including any sidebar — for maintenance notices, environment warnings,
 * and similar app-wide messaging. It is a vertical composition slot: place a
 * maintenance banner and an `AlertCenter.Bar` here, and each contributes its
 * own row while the slot pushes the shell down. Renders an unstyled `<div>`
 * (`flex w-full shrink-0 flex-col`): its children bring their own colors and
 * layout, and the part collapses to nothing when empty. Deliberately not named
 * `Banner` so it never reads as the ARIA `banner` landmark — it claims no
 * landmark at all.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutnotice
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>
 *       {isUnderMaintenance && (
 *         <div className="bg-red-500 text-on-filled flex items-center gap-2 px-4 py-1 text-xs">
 *           The dashboard is read-only until {maintenanceEndsAt}.
 *         </div>
 *       )}
 *     </AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Notice = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-notice")}
			className={cx("flex w-full shrink-0 flex-col", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The region where the user actually works: everything below
 * `AppLayout.Notice`, laid out as a row of columns. Place a `Sidebar.Nav` (or
 * any other rail, on either side) beside an `AppLayout.Content` card, and an
 * `AppLayout.SidePanel` after the card. A flex row
 * (`relative mx-auto flex min-h-0 w-full min-w-0 flex-1`) whose `min-h-0` is
 * what lets `AppLayout.Body` scroll instead of the page.
 *
 * It owns no gutter, deliberately: the card insets itself with its own margin,
 * so a rail stays flush against the window edge and a collapsed icon rail keeps
 * its flush geometry.
 *
 * On a wide screen the row caps at `--app-layout-max-width` and centers in the
 * frame, so the rail, the card, and the side panel stay one group instead of a
 * card that stretches across an ultrawide monitor. `AppLayout.Root` still paints
 * `bg-base` edge to edge, and `AppLayout.Notice` still spans the full window.
 * Merge `className="ml-0"` to pin the group to the start edge instead, and set
 * the variable to `none` to let the row fill any width.
 *
 * It is `relative`, so a floating `AppLayout.SidePanel` resolves against the row
 * and covers the card, never the notice above it.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--app-layout-max-width` | `128rem` | The widest the row gets (2048px): a 13rem rail, a `max-w-7xl` page with its padding, and an open side panel at its 27rem cap, each at full size with nothing stretched. Set it on `AppLayout.Root` or on this part. `none` removes the cap. |
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutworkspace
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Workspace = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-workspace")}
			className={cx(
				"flex min-h-0 flex-1",
				// Why min-w-0: when a consumer nests the row inside another flex row,
				// `min-width: auto` would add the panel's full basis and the page's
				// content width together and push the panel off the window edge.
				"min-w-0",
				// Why relative: a floating `AppLayout.SidePanel` resolves against the
				// row, so it covers the card and never the notice above it.
				"relative",
				// Why w-full with mx-auto: auto cross-axis margins turn a stretched
				// flex item into a shrink-to-fit one, so the width is stated outright
				// and the margins only center the row once the cap applies.
				"mx-auto w-full max-w-(--app-layout-max-width,128rem)",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The content card of the shell: a rounded, bordered `bg-card` surface beside
 * the sidebar, holding `AppLayout.Header` and `AppLayout.Body`. A flex column
 * that fills the remaining width of
 * `AppLayout.Workspace` and insets itself from the window edge and the rail with
 * its own margin (`--app-layout-card-gutter`, default `0.5rem`) — the gutter
 * belongs to the card so a rail stays flush against the window edge.
 *
 * The card does **not** scroll: `AppLayout.Body` does. `Content` is
 * `overflow-clip`, which does two jobs — it keeps a full-bleed page background
 * from painting square corners over the card's `rounded-xl`, and it is
 * deliberately `clip` rather than `hidden` because `hidden` is a scroll
 * container with no scrollbar: a long toolbar would let focus scroll the card
 * sideways, dragging the header and the page with it, and nothing could scroll
 * it back.
 *
 * It is also `relative`, so page content positioned with `absolute` resolves
 * against the card instead of escaping to `AppLayout.Root` and painting across
 * the sidebar rail.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--app-layout-card-gutter` | `0.5rem` | The gap between the card and the window edge, the notice above it, and the rail beside it (8px). `AppLayout.Header` subtracts twice this value when deriving its height, so overriding it keeps the toolbar aligned with the sidebar header's band. |
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutcontent
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Content = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-content")}
			className={cx(
				"bg-card border-card-muted relative flex min-w-0 flex-1 flex-col rounded-xl border shadow-sm",
				// The gutter is the card's own margin rather than a wrapper's padding:
				// the only element that could hold padding is Workspace, which also
				// contains the rail, so padding there would inset the sidebar off the
				// window edge and break the flush collapsed icon rail.
				"m-(--app-layout-card-gutter,0.5rem)",
				// clip, not hidden: `hidden` is a scroll container that paints no
				// scrollbar, so a long toolbar lets focus scroll the card sideways —
				// translating the header and the page off-screen with no way back.
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
 * The toolbar band `AppLayout.Header` and `AppLayout.SidePanelHeader` share, so
 * the two rows and the sidebar header's switcher row center on one line.
 * Standalone the band is `h-14`. With a `Sidebar.Header` in the shell, the
 * height derives from the sidebar's `--sidebar-header-height` token: the row
 * sits below the card's gutter and its 1px border, so center parity needs the
 * band minus twice each. The band is the sidebar header's first row, so a header
 * that stacks a second row leaves this height alone. Set
 * `--sidebar-header-height` on a common ancestor (e.g. `AppLayout.Root`) and
 * every row moves together.
 */
const headerBandClassName =
	"h-14 group-has-data-[slot~=sidebar-header]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-2*var(--app-layout-card-gutter,0.5rem)-2px)]";

/**
 * The toolbar row at the top of the content card. Render it as the **first
 * child of `AppLayout.Content`**, and compose its three slots in order:
 * `AppLayout.HeaderStart` for the `Sidebar.Trigger`, `AppLayout.HeaderContent`
 * for the `Breadcrumb` trail, and `AppLayout.HeaderActions` for the page's
 * actions. The slots carry the flex (`shrink-0`, `min-w-0 flex-1`, and
 * `ml-auto shrink-0`), so no call site sets it. The row's `gap-2` spaces the
 * three slots, and each slot repeats it between its own children.
 *
 * It is pinned by construction, not by `sticky`: as a `shrink-0` flex sibling
 * *outside* the scrolling `AppLayout.Body`, it cannot scroll away, cannot be
 * overlapped by a page's own `sticky top-0`, and does not translate sideways
 * when the page scrolls horizontally. It also no longer steals height from a
 * page that asks for `h-full`.
 *
 * Renders a `<div>`, not a `<header>`: `AppLayout.Body` is the `main` landmark
 * and this row is its sibling, so a `<header>` here would have no sectioning
 * ancestor and would become the ARIA `banner` landmark, which a card toolbar is
 * not. Compose your own element with `asChild` if you need one.
 *
 * **Sidebar alignment is an invariant, not a coincidence:** standalone, the
 * toolbar is `h-14`. When the shell contains a `Sidebar.Header` (detected via
 * `:has()` from `AppLayout.Root`), the toolbar instead derives its height from
 * the sidebar's public `--sidebar-header-height` token, subtracting twice the
 * card gutter and twice the card's hairline border — which keeps this toolbar's
 * vertical center on the band that token names, by construction, for any band
 * height. The band belongs to the sidebar header's first row, so a header that
 * stacks a second row grows downward and this toolbar keeps matching the
 * switcher row alone. Override `--sidebar-header-height` on a common ancestor
 * (e.g. `AppLayout.Root`'s `className`) and both rows move together.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--sidebar-header-height` | `4.5rem` | Read, not owned: `Sidebar.Header` owns this token — the band its first row sits on — and `AppLayout.Header` derives its own height from it whenever a sidebar header is present in the shell. Set it on a common ancestor of both rows (e.g. `AppLayout.Root`), never on one of them, since custom properties only inherit downward. |
 * | `--app-layout-card-gutter` | `0.5rem` | Read, not owned: `AppLayout.Content` owns this token. The derived height subtracts twice its value, so changing the card gutter keeps the two rows aligned instead of drifting. |
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheader
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Header = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-header")}
			className={cx(
				"border-card-muted flex shrink-0 items-center gap-2 border-b px-4",
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
 * The leading slot of `AppLayout.Header`: the home of `Sidebar.Trigger`, or of
 * the control that opens the row in a shell with no sidebar. Renders a `<div>`
 * that is `shrink-0`, so it takes only the width its children need and keeps
 * the row's start while `AppLayout.HeaderContent` gives up width beside it. It
 * is a flex row with the header's own `gap-2`, so a second control sits beside
 * the first at the same spacing.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheaderstart
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const HeaderStart = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-header-start")}
			className={cx("flex shrink-0 items-center gap-2", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The slot that fills `AppLayout.Header`: the home of the `Breadcrumb` trail,
 * or of a page title in a shell with no trail. Renders a `<div>` that is
 * `min-w-0 flex-1`, so it takes every pixel `AppLayout.HeaderStart` and
 * `AppLayout.HeaderActions` leave, and it gives width back before either of
 * them does. The `min-w-0` is what lets a `Breadcrumb.List` inside it scroll
 * sideways instead of pushing the actions off the card. It is a flex row with
 * the header's own `gap-2`.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheadercontent
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const HeaderContent = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-header-content")}
			className={cx("flex min-w-0 flex-1 items-center gap-2", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The trailing slot of `AppLayout.Header`: the page's actions, aligned to the
 * row's end. Renders a `<div>` that is `ml-auto shrink-0`, so it takes only the
 * width its children need, grows to the left as actions are added, and stays at
 * the end even when the header renders no `AppLayout.HeaderContent`. It is a
 * flex row with the header's own `gap-2`.
 *
 * Keep it to three actions or fewer, and collapse them into one `DropdownMenu`
 * behind a single `IconButton` below the sidebar's mobile breakpoint; the docs
 * show the shape. Which actions render is the route's decision: derive them
 * from the matched route chain, the way the breadcrumb trail is derived, and
 * never from a context a page writes into from an effect.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheaderactions
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const HeaderActions = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-header-actions")}
			className={cx("ml-auto flex shrink-0 items-center gap-2", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The page region of the content card, and the shell's **only** scroll
 * container (`overflow-y-auto overscroll-none`) — the page body never scrolls
 * and scroll never bounces the shell. Render it after `AppLayout.Header` inside
 * `AppLayout.Content`.
 *
 * It renders mantle's `Main` landmark: `<main id="main" tabIndex={-1}>` with
 * `data-slot="app-layout-body main"`. Pair it with a `SkipToMainLink` as the
 * first child of `AppLayout.Root`; the link's default `targetId` matches
 * `Main`'s `id`. The focused landmark **is** the scroll container, so arrows,
 * `Space`, and `PageDown` scroll the page as soon as the jump lands, and the
 * skip clears the sidebar *and* the toolbar. `id` and `tabIndex` are not props,
 * for the same reason they are not props on `Main`.
 *
 * When the surrounding document already owns the `main` landmark (a docs demo,
 * a test, a shell embedded in a page), pass `asChild` and render a plain
 * `<div>`. The part then adds its classes and its `data-slot` to your element
 * and no landmark.
 *
 * It is a flex **item** that is **block inside**, and each half does a job:
 *
 * - `min-h-0 flex-1` gives it a definite height, so a page that asks for
 *   `h-full` fills exactly the card interior instead of overflowing it by the
 *   toolbar's height.
 * - block layout inside — not flex — is why `mx-auto max-w-7xl` still centers a
 *   page at its max width. As a *flex child*, auto margins beat
 *   `align-items: stretch` and the same container shrink-to-fits, getting
 *   *narrower* as the viewport gets wider.
 * - `w-full` states the width outright instead of leaning on the flex
 *   container's cross-axis `stretch`, so an `mx-auto` merged onto `Body` still
 *   leaves it full width — auto cross-axis margins would otherwise turn a
 *   stretched item into a shrink-to-fit one. It is no floor, though: `cx` is
 *   tailwind-merge-backed and the consumer's `className` wins, so a merged
 *   `w-*` replaces it outright, while a merged `max-w-*` — a separate conflict
 *   group — survives beside it and clamps the scrollport. Constrain the *page*
 *   inside `Body`, not `Body` itself.
 *
 * It is `relative` too, so page content positioned with `absolute` is contained
 * by the scrollport the route author is already reasoning about.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutbody
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Body = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: Omit<ComponentProps<"main">, "id" | "tabIndex"> & WithAsChild & WithDataSlot) => {
	// Why `Main`: the body is the shell's only scroll container, and the skip
	// link must land on the element that scrolls. `Main` stamps the `id` and
	// `tabIndex` the link needs; `asChild` hands the element to the consumer.
	const Comp = asChild ? Slot : Main;

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-body")}
			className={cx(
				"scrollbar relative min-h-0 w-full flex-1 overflow-y-auto overscroll-none",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The viewport width below which `AppLayout.SidePanel` floats over the card
 * instead of taking width beside it. Tailwind's `sm` (40rem), `md` (48rem), and
 * `lg` (64rem) breakpoints, the same set `Sidebar.Root` accepts.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanel
 *
 * @example
 * ```tsx
 * <AppLayout.SidePanel aria-label="Assistant" mobileBreakpoint="md">…</AppLayout.SidePanel>
 * ```
 */
type AppLayoutSidePanelMobileBreakpoint = "sm" | "md" | "lg";

/**
 * Maps each supported `mobileBreakpoint` to the classes that float the panel
 * over the card below it, and to the closed treatment on each side of it.
 * Below the breakpoint the panel leaves the row, pins to the row's end edge
 * inside the card gutter, takes a fixed width that leaves a strip of the page
 * visible, and slides off the end edge when closed. One breakpoint lower it
 * covers the card from gutter to gutter, because a strip of page beside a
 * 24rem panel is no page at all on a phone. At or above the breakpoint, the
 * closed panel drops its hairline border, or a two-pixel seam stays beside the
 * card. A complete `Record` (not cva) so a breakpoint without its classes is a
 * compile error.
 */
const sidePanelFloatClassName: Record<AppLayoutSidePanelMobileBreakpoint, string> = {
	sm: "max-sm:absolute max-sm:inset-y-(--app-layout-card-gutter,0.5rem) max-sm:left-(--app-layout-card-gutter,0.5rem) max-sm:right-(--app-layout-card-gutter,0.5rem) max-sm:z-20 max-sm:m-0 max-sm:shadow-lg max-sm:[--_side-panel-content-width:100%] max-sm:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] sm:data-state-closed:border-0",
	md: "max-md:absolute max-md:inset-y-(--app-layout-card-gutter,0.5rem) max-md:right-(--app-layout-card-gutter,0.5rem) max-md:z-20 max-md:m-0 max-md:w-[min(24rem,calc(100vw-5rem))] max-md:shadow-lg max-md:[--_side-panel-content-width:100%] max-md:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] md:data-state-closed:border-0 max-sm:left-(--app-layout-card-gutter,0.5rem) max-sm:w-auto",
	lg: "max-lg:absolute max-lg:inset-y-(--app-layout-card-gutter,0.5rem) max-lg:right-(--app-layout-card-gutter,0.5rem) max-lg:z-20 max-lg:m-0 max-lg:w-[min(24rem,calc(100vw-5rem))] max-lg:shadow-lg max-lg:[--_side-panel-content-width:100%] max-lg:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] lg:data-state-closed:border-0 max-md:left-(--app-layout-card-gutter,0.5rem) max-md:w-auto",
};

/**
 * The state and actions shared by every part under an
 * `AppLayout.SidePanelRoot`, returned by {@link useSidePanel}. Use it to build
 * a custom trigger, a close control, or close-on-navigate behavior.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#usesidepanel
 *
 * @example
 * ```tsx
 * function CloseAssistantOnNavigate() {
 *   const { setOpen } = useSidePanel();
 *   const location = useLocation();
 *   useEffect(() => {
 *     setOpen(false);
 *   }, [location.pathname, setOpen]);
 *   return null;
 * }
 * ```
 */
type AppLayoutSidePanelState = {
	/**
	 * Whether the panel is on screen. Mirrored as `data-state="open" | "closed"`
	 * on `AppLayout.SidePanel` and `AppLayout.SidePanelTrigger`.
	 */
	open: boolean;
	/**
	 * Set the open state. Calls `onOpenChange` and, when uncontrolled, updates
	 * the internal state. Closing while focus is inside the panel moves focus to
	 * the first `AppLayout.SidePanelTrigger` outside it.
	 */
	setOpen: (open: boolean) => void;
	/**
	 * Flip the open state. This is what `AppLayout.SidePanelTrigger` calls.
	 */
	toggle: () => void;
	/**
	 * The generated id of the panel's `<aside>`. `AppLayout.SidePanelTrigger`
	 * references it with `aria-controls`; reuse it in a custom trigger.
	 */
	panelId: string;
};

const SidePanelContext = createContext<AppLayoutSidePanelState | null>(null);

/**
 * Read the nearest `AppLayout.SidePanelRoot` state. Throws when called
 * outside one, so misuse fails loudly. Use it to build a custom trigger, a
 * close control, or close-on-navigate behavior.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#usesidepanel
 *
 * @example
 * ```tsx
 * function CloseAssistantOnNavigate() {
 *   const { setOpen } = useSidePanel();
 *   const location = useLocation();
 *   useEffect(() => {
 *     setOpen(false);
 *   }, [location.pathname, setOpen]);
 *   return null;
 * }
 * ```
 */
function useSidePanel(): AppLayoutSidePanelState {
	const context = useContext(SidePanelContext);
	invariant(context, "useSidePanel must be used within AppLayout.SidePanelRoot.");
	return context;
}

/**
 * Read the nearest {@link SidePanelContext} for an internal part. Throws with
 * a part-specific message when rendered outside `AppLayout.SidePanelRoot`.
 */
function useSidePanelContext(part: string): AppLayoutSidePanelState {
	const context = useContext(SidePanelContext);
	invariant(context, `AppLayout.${part} must be rendered inside AppLayout.SidePanelRoot.`);
	return context;
}

/**
 * The props for `AppLayout.SidePanelRoot`: the open state, controlled or
 * uncontrolled, the same shape as `Sidebar.Root`.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelroot
 */
type AppLayoutSidePanelRootProps = {
	children?: ReactNode;
	/**
	 * Whether the panel starts open, when uncontrolled. Read once at mount, so
	 * pass the value the server read from a cookie here and the first paint
	 * carries the right state.
	 *
	 * @default false
	 */
	defaultOpen?: boolean;
	/**
	 * Controlled open state. Pair with `onOpenChange`.
	 */
	open?: boolean;
	/**
	 * Called with the next open state whenever it changes. Write the cookie
	 * here with `serializeSidePanelStateCookie`.
	 */
	onOpenChange?: (open: boolean) => void;
};

/**
 * The state owner for `AppLayout.SidePanel` and `AppLayout.SidePanelTrigger`.
 * Renderless: it only holds whether the panel is open, controlled (`open` +
 * `onOpenChange`) or uncontrolled (`defaultOpen`), and hands it to the parts
 * below through {@link useSidePanel}. Wrap `AppLayout.Workspace` with it, or
 * anything above both the trigger and the panel. Closed by default: a side
 * panel is a surface the user opens.
 *
 * To persist the state across visits with no first-frame correction, read
 * `extractSidePanelStateCookie` in the server loader, pass the result to
 * `defaultOpen`, and write `serializeSidePanelStateCookie` from
 * `onOpenChange`. The server HTML then carries the right `data-state`, the
 * same way `Sidebar.Root` persists the rail.
 *
 * When the panel closes while focus is inside it, the root moves focus to the
 * first `AppLayout.SidePanelTrigger` outside the panel. A closed panel is
 * `inert` and cannot hold focus, so without this the browser drops focus to
 * the document.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelroot
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.SidePanelRoot>
 *       <AppLayout.Workspace>
 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *         <AppLayout.Content>
 *           <AppLayout.Header>
 *             <AppLayout.HeaderStart>
 *               <Sidebar.Trigger />
 *             </AppLayout.HeaderStart>
 *             <AppLayout.HeaderContent>
 *               <Breadcrumbs />
 *             </AppLayout.HeaderContent>
 *             <AppLayout.HeaderActions>
 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
 *             </AppLayout.HeaderActions>
 *           </AppLayout.Header>
 *           <AppLayout.Body>
 *             <Outlet />
 *           </AppLayout.Body>
 *         </AppLayout.Content>
 *         <AppLayout.SidePanel aria-label="Assistant">
 *           <AppLayout.SidePanelHeader>
 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 *           </AppLayout.SidePanelHeader>
 *           <AppLayout.SidePanelBody>
 *             <AssistantConversation />
 *           </AppLayout.SidePanelBody>
 *           <AppLayout.SidePanelFooter>
 *             <AssistantComposer />
 *           </AppLayout.SidePanelFooter>
 *         </AppLayout.SidePanel>
 *       </AppLayout.Workspace>
 *     </AppLayout.SidePanelRoot>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const SidePanelRoot = ({
	children,
	defaultOpen = false,
	onOpenChange,
	open: openProp,
}: AppLayoutSidePanelRootProps) => {
	const panelId = useId();
	const isControlled = openProp != null;
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const open = isControlled ? openProp : internalOpen;

	// Why a ref: the close handler reads where focus is before React commits
	// `inert`, and the browser drops focus to `<body>` inside that commit.
	const shouldReturnFocus = useRef(false);

	const setOpen = useCallback(
		(next: boolean) => {
			if (!next) {
				const panel = document.getElementById(panelId);
				shouldReturnFocus.current = panel != null && panel.contains(document.activeElement);
			}
			if (!isControlled) {
				setInternalOpen(next);
			}
			onOpenChange?.(next);
		},
		[isControlled, onOpenChange, panelId],
	);

	const toggle = useCallback(() => {
		setOpen(!open);
	}, [open, setOpen]);

	// Why a layout effect: focus moves in the same commit that made the panel
	// `inert`, so no frame paints with focus on `<body>`.
	useLayoutEffect(() => {
		if (open || !shouldReturnFocus.current) {
			return;
		}
		shouldReturnFocus.current = false;
		const panel = document.getElementById(panelId);
		const triggers = document.querySelectorAll<HTMLElement>(`[aria-controls="${panelId}"]`);
		for (const trigger of triggers) {
			if (panel == null || !panel.contains(trigger)) {
				trigger.focus();
				return;
			}
		}
	}, [open, panelId]);

	const contextValue = useMemo<AppLayoutSidePanelState>(
		() => ({ open, panelId, setOpen, toggle }),
		[open, panelId, setOpen, toggle],
	);

	return <SidePanelContext.Provider value={contextValue}>{children}</SidePanelContext.Provider>;
};

/**
 * The props for `AppLayout.SidePanel`: an `<aside>`'s props except `id`, and
 * the breakpoint the panel owns.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanel
 */
type AppLayoutSidePanelProps = Omit<ComponentProps<"aside">, "id"> &
	WithDataSlot & {
		/**
		 * The viewport width below which the panel floats over the card instead
		 * of taking width beside it. Match it to `Sidebar.Root`'s
		 * `mobileBreakpoint`, so the rail and the panel change presentation at
		 * one width.
		 *
		 * @default "lg"
		 */
		mobileBreakpoint?: AppLayoutSidePanelMobileBreakpoint;
	};

// Why no `asChild`: the panel renders a fixed two-element structure (a basis
// animator clipping an inner column at the open width), so there is no single
// default element a Slot swap could replace. Compose a different landmark by
// changing what the inner parts render.
/**
 * A second card beside `AppLayout.Content`, for an assistant, a details pane, or
 * any surface that opens next to the page and closes again. Render it as the
 * **last child of `AppLayout.Workspace`**, after the card, inside an
 * `AppLayout.SidePanelRoot` that owns whether it is open. Renders an
 * `<aside>`, so it is the `complementary` landmark; name it with `aria-label`.
 * `id` is not a prop: the root generates it, and `AppLayout.SidePanelTrigger`
 * points `aria-controls` at it.
 *
 * It takes the same card treatment as `AppLayout.Content` (`bg-card
 * border-card-muted rounded-xl border shadow-sm overflow-clip`) and reads like
 * a `Sheet` with no focus trap and no backdrop, because the page beside it
 * stays usable: `AppLayout.SidePanelHeader` for the title and the close
 * control, `AppLayout.SidePanelBody` for the scroll region, and an optional
 * `AppLayout.SidePanelFooter` for a composer or an action row. The header sits
 * on the same band as `AppLayout.Header`, so the two rows center on one line.
 * It keeps the card gutter on its top, end, and bottom edges and none on its
 * start edge, so the card's own end margin is the gap between the two, one
 * gutter wide.
 *
 * It opens and closes the way `Sidebar.Nav` collapses. The `<aside>` is a clip
 * box whose `flex-basis` and end margin animate between the open width and
 * zero over 200ms (`ease-linear`), and an inner column inside it stays at the open width,
 * anchored to the end edge, so the content never reflows: the card's edge
 * sweeps across it. A CSS transition reverses from wherever it is, so a second
 * click mid-flight turns the panel around. `motion-reduce:transition-none`
 * turns the slide into a cut, and `not-data-hydrated:transition-none` holds
 * the transition until one frame after hydration, so a state the client
 * corrects after the server render snaps instead of sliding on page load. The
 * `transition-*` and `duration-*` utilities are bare, so a merged
 * `transition-none` or `duration-*` replaces them through tailwind-merge.
 *
 * Closed, the box is `basis-0 mr-0 border-0 pointer-events-none` and `inert`,
 * so nothing inside it is focusable, clickable, or read by assistive
 * technology, and its children stay mounted: a conversation keeps its scroll
 * position, its focus target, and its in-flight reply across a close and a
 * reopen.
 *
 * Below `mobileBreakpoint` the panel floats over the card instead of taking
 * width from it: `absolute`, pinned to the row's end edge inside the card
 * gutter, `min(24rem, 100vw - 5rem)` wide, with a larger shadow and `z-20` so
 * it paints above a page's own sticky rows. Closed, it slides off the end edge
 * instead of collapsing. Two cards side by side in 900px are two unusable
 * cards.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--app-layout-side-panel-width` | `clamp(21rem, 24vw, 27rem)` | The panel's width beside the card: a quarter of the viewport, never narrower than 336px and never wider than 432px. Set it on `AppLayout.Root` or on this part. |
 * | `--app-layout-card-gutter` | `0.5rem` | Read, not owned: `AppLayout.Content` owns this token. The panel keeps it on its top, end, and bottom edges, and the floating panel insets itself by it. |
 *
 * **Data attributes (public API):**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-state` | `"open"` \| `"closed"` | Mirrors the root's open state. The collapse and the transition key off it in CSS, and consumers style against it. |
 * | `data-hydrated` | present one frame after hydration | Presence-only. The transition keys off its absence in CSS (`not-data-hydrated:transition-none`), so a state correction after the server render snaps instead of animating. |
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanel
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.SidePanelRoot>
 *       <AppLayout.Workspace>
 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *         <AppLayout.Content>
 *           <AppLayout.Header>
 *             <AppLayout.HeaderStart>
 *               <Sidebar.Trigger />
 *             </AppLayout.HeaderStart>
 *             <AppLayout.HeaderContent>
 *               <Breadcrumbs />
 *             </AppLayout.HeaderContent>
 *             <AppLayout.HeaderActions>
 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
 *             </AppLayout.HeaderActions>
 *           </AppLayout.Header>
 *           <AppLayout.Body>
 *             <Outlet />
 *           </AppLayout.Body>
 *         </AppLayout.Content>
 *         <AppLayout.SidePanel aria-label="Assistant">
 *           <AppLayout.SidePanelHeader>
 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 *           </AppLayout.SidePanelHeader>
 *           <AppLayout.SidePanelBody>
 *             <AssistantConversation />
 *           </AppLayout.SidePanelBody>
 *           <AppLayout.SidePanelFooter>
 *             <AssistantComposer />
 *           </AppLayout.SidePanelFooter>
 *         </AppLayout.SidePanel>
 *       </AppLayout.Workspace>
 *     </AppLayout.SidePanelRoot>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const SidePanel = ({
	children,
	className,
	"data-slot": dataSlot,
	mobileBreakpoint = "lg",
	...props
}: AppLayoutSidePanelProps) => {
	const { open, panelId } = useSidePanelContext("SidePanel");
	const isHydrated = useIsHydratedAfterPaint();

	return (
		<aside
			data-slot={joinDataSlot(dataSlot, "app-layout-side-panel")}
			className={cx(
				"bg-card border-card-muted relative min-w-0 rounded-xl border shadow-sm",
				// Why isolate: a page's sticky rows carry their own z-index, and the
				// panel's children must stack inside the panel, not against them.
				"isolate",
				// clip, not hidden: the same trap AppLayout.Content avoids. It is also
				// what hides the inner column as the basis sweeps across it.
				"overflow-clip",
				// The width the inner column lays out at, as one private variable: the
				// open width minus the two hairline borders in the row, and the whole
				// padding box once the panel floats.
				"[--_side-panel-content-width:calc(var(--app-layout-side-panel-width,clamp(21rem,24vw,27rem))-2px)]",
				// A fixed basis, never a share of the row: `flex-1` cannot interpolate
				// to a width, so a lane that animates never uses it. The card beside
				// it is the one that absorbs the change.
				"grow-0 shrink-0 basis-[calc(var(--_side-panel-content-width)+2px)]",
				// The gutter on three edges: the card's own end margin is the gap on
				// the start edge, so the inner gap and the outer inset are one number.
				"my-(--app-layout-card-gutter,0.5rem) mr-(--app-layout-card-gutter,0.5rem) ml-0",
				// Why one negated gate: a state the client corrects after the server
				// render must snap, not slide, on page load. Why bare utilities: a
				// consumer `transition-none` or `duration-*` replaces the default
				// through tailwind-merge.
				"transition-[flex-basis,margin,translate] duration-200 ease-linear motion-reduce:transition-none not-data-hydrated:transition-none",
				// Why mr-0 and not m-0: the vertical margins stay, or the box starts a
				// gutter taller than the card on open and shrinks into place.
				"data-state-closed:basis-0 data-state-closed:mr-0 data-state-closed:pointer-events-none",
				sidePanelFloatClassName[mobileBreakpoint],
				className,
			)}
			{...props}
			// Why after the spread: a wider props object can carry `id`,
			// `data-state`, `data-hydrated`, or `inert` past the type, and a consumer
			// value would break the trigger's `aria-controls`, desync the collapse
			// from the root, release the transition gate, or leave a closed panel in
			// the tab order.
			id={panelId}
			data-state={open ? "open" : "closed"}
			data-hydrated={isHydrated ? "" : undefined}
			inert={!open}
		>
			{/* The inner column holds the open width while the box around it
			    animates, so the header, the body, and the footer keep their layout
			    and the card's edge sweeps across them instead of reflowing them. */}
			<div className="absolute inset-y-0 right-0 flex w-(--_side-panel-content-width) flex-col">
				{children}
			</div>
		</aside>
	);
};

/**
 * The props for `AppLayout.SidePanelTrigger`. `IconButton`'s props, except the
 * parts the trigger owns: `asChild` and `children` are removed (the trigger
 * renders only its icon and `aria-label`; build a custom trigger with
 * `useSidePanel` instead), and `appearance`, `icon`, `intent`, and `label`
 * become optional with side panel defaults.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepaneltrigger
 */
type AppLayoutSidePanelTriggerProps = Omit<
	IconButtonProps,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label"
> &
	WithDataSlot & {
		/**
		 * The visual style of the trigger `IconButton`.
		 *
		 * @default "ghost"
		 */
		appearance?: IconButtonProps["appearance"];
		/**
		 * The icon rendered inside the trigger.
		 *
		 * @default <SidebarSimpleIcon mirrored />
		 */
		icon?: ReactNode;
		/**
		 * The color intent of the trigger `IconButton`.
		 *
		 * @default "neutral"
		 */
		intent?: IconButtonProps["intent"];
		/**
		 * The accessible name of the trigger, also shown in its tooltip.
		 *
		 * @default "Toggle side panel"
		 */
		label?: string;
	};

const defaultSidePanelTriggerIcon = <SidebarSimpleIcon mirrored />;

// Why no `asChild`: the trigger renders a fully wired mantle IconButton (icon +
// aria-label + aria-expanded/aria-controls); a custom trigger composes the
// same behavior from `useSidePanel()` instead of slot-swapping this one.
/**
 * The button that toggles `AppLayout.SidePanel`, the way `Sidebar.Trigger`
 * toggles the rail. Renders a ghost neutral `IconButton` with `aria-expanded`
 * and `aria-controls` wired to the panel's `<aside>`. Place one in
 * `AppLayout.HeaderActions` to open the panel, and one more in
 * `AppLayout.SidePanelHeader` with a close icon to close it from inside: when
 * that one closes the panel, the root moves focus to the one outside.
 *
 * The button is icon-only, so it always renders a tooltip showing `label`.
 * **That means it requires a `TooltipProvider` ancestor, like any
 * `Tooltip.Root`, and throws without one.** Mount a single provider at your app
 * root.
 *
 * **Data attributes (public API):**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-state` | `"open"` \| `"closed"` | Mirrors the root's open state. Pairs with `aria-expanded`. |
 * | `data-slot` | `"app-layout-side-panel-trigger-tooltip"` | On the tooltip surface, not the button: the styling hook for the label popup this part renders. |
 * | `data-appearance` | `"filled"` \| `"ghost"` \| `"outlined"` | Read, not stamped: the underlying `IconButton` reflects its `appearance`, which this part defaults to `"ghost"`. |
 * | `data-intent` | `"neutral"` | Read, not stamped: the underlying `IconButton` reflects its `intent`, which this part defaults to `"neutral"`. |
 * | `data-size` | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | Read, not stamped: the underlying `IconButton` reflects its `size` and its own `"md"` default. |
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepaneltrigger
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.SidePanelRoot>
 *       <AppLayout.Workspace>
 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *         <AppLayout.Content>
 *           <AppLayout.Header>
 *             <AppLayout.HeaderStart>
 *               <Sidebar.Trigger />
 *             </AppLayout.HeaderStart>
 *             <AppLayout.HeaderContent>
 *               <Breadcrumbs />
 *             </AppLayout.HeaderContent>
 *             <AppLayout.HeaderActions>
 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
 *             </AppLayout.HeaderActions>
 *           </AppLayout.Header>
 *           <AppLayout.Body>
 *             <Outlet />
 *           </AppLayout.Body>
 *         </AppLayout.Content>
 *         <AppLayout.SidePanel aria-label="Assistant">
 *           <AppLayout.SidePanelHeader>
 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 *           </AppLayout.SidePanelHeader>
 *           <AppLayout.SidePanelBody>
 *             <AssistantConversation />
 *           </AppLayout.SidePanelBody>
 *           <AppLayout.SidePanelFooter>
 *             <AssistantComposer />
 *           </AppLayout.SidePanelFooter>
 *         </AppLayout.SidePanel>
 *       </AppLayout.Workspace>
 *     </AppLayout.SidePanelRoot>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const SidePanelTrigger = ({
	appearance = "ghost",
	"data-slot": dataSlot,
	icon = defaultSidePanelTriggerIcon,
	intent = "neutral",
	label = "Toggle side panel",
	onClick,
	...props
}: AppLayoutSidePanelTriggerProps) => {
	const { open, panelId, toggle } = useSidePanelContext("SidePanelTrigger");

	return (
		// The label is not gated on the panel state: the trigger is an icon-only
		// button, so a pointer user has nothing else to read. Requires a
		// `TooltipProvider` ancestor, like any `Tooltip.Root`.
		<Tooltip.Root>
			<Tooltip.Trigger asChild>
				<IconButton
					appearance={appearance}
					aria-controls={panelId}
					aria-expanded={open}
					data-slot={joinDataSlot(dataSlot, "app-layout-side-panel-trigger")}
					data-state={open ? "open" : "closed"}
					icon={icon}
					intent={intent}
					label={label}
					onClick={(event) => {
						onClick?.(event);
						if (!event.defaultPrevented) {
							toggle();
						}
					}}
					{...props}
				/>
			</Tooltip.Trigger>
			<Tooltip.Content data-slot="app-layout-side-panel-trigger-tooltip">{label}</Tooltip.Content>
		</Tooltip.Root>
	);
};

/**
 * The toolbar row at the top of `AppLayout.SidePanel`: the panel's title at the
 * start and its controls at the end, with the close control last. Render it as
 * the **first child of `AppLayout.SidePanel`**. A flex row (`flex shrink-0
 * items-center gap-2 border-b px-4`) on the same band as `AppLayout.Header`, so
 * the two rows and a sidebar header's switcher row center on one line, by the
 * same derivation (`h-14` standalone, the sidebar header's band minus twice the
 * card gutter and twice the hairline border with a `Sidebar.Header` in the
 * shell). Give the title `min-w-0 flex-1 truncate`, so it gives up width before
 * a control does. Merge `border-b-0` for a header with no rule under it.
 *
 * Renders a `<div>`, not a `<header>`: the panel is an `<aside>`, so a
 * `<header>` here would be a sectioning root's header and read as one more
 * landmark-like region. Compose your own element with `asChild` if you need
 * one.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--sidebar-header-height` | `4.5rem` | Read, not owned: `Sidebar.Header` owns this token. With a sidebar header in the shell, this row derives its height from it, the same way `AppLayout.Header` does. |
 * | `--app-layout-card-gutter` | `0.5rem` | Read, not owned: `AppLayout.Content` owns this token. The derived height subtracts twice its value. |
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelheader
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.SidePanelRoot>
 *       <AppLayout.Workspace>
 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *         <AppLayout.Content>
 *           <AppLayout.Header>
 *             <AppLayout.HeaderStart>
 *               <Sidebar.Trigger />
 *             </AppLayout.HeaderStart>
 *             <AppLayout.HeaderContent>
 *               <Breadcrumbs />
 *             </AppLayout.HeaderContent>
 *             <AppLayout.HeaderActions>
 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
 *             </AppLayout.HeaderActions>
 *           </AppLayout.Header>
 *           <AppLayout.Body>
 *             <Outlet />
 *           </AppLayout.Body>
 *         </AppLayout.Content>
 *         <AppLayout.SidePanel aria-label="Assistant">
 *           <AppLayout.SidePanelHeader>
 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 *           </AppLayout.SidePanelHeader>
 *           <AppLayout.SidePanelBody>
 *             <AssistantConversation />
 *           </AppLayout.SidePanelBody>
 *           <AppLayout.SidePanelFooter>
 *             <AssistantComposer />
 *           </AppLayout.SidePanelFooter>
 *         </AppLayout.SidePanel>
 *       </AppLayout.Workspace>
 *     </AppLayout.SidePanelRoot>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const SidePanelHeader = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-side-panel-header")}
			className={cx(
				"border-card-muted flex shrink-0 items-center gap-2 border-b px-4",
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
 * The scroll region of `AppLayout.SidePanel`, and the only part of the panel
 * that scrolls (`scrollbar relative min-h-0 w-full flex-1 overflow-y-auto
 * overscroll-none`). Render it after `AppLayout.SidePanelHeader`. It is the
 * same box as `AppLayout.Body` with no landmark: the page's body already owns
 * `main`, and a second scroll region beside it is plain content. It is block
 * inside, so a child that asks for `h-full` fills the panel between the header
 * and the footer, and `mx-auto max-w-*` still centers.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelbody
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.SidePanelRoot>
 *       <AppLayout.Workspace>
 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *         <AppLayout.Content>
 *           <AppLayout.Header>
 *             <AppLayout.HeaderStart>
 *               <Sidebar.Trigger />
 *             </AppLayout.HeaderStart>
 *             <AppLayout.HeaderContent>
 *               <Breadcrumbs />
 *             </AppLayout.HeaderContent>
 *             <AppLayout.HeaderActions>
 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
 *             </AppLayout.HeaderActions>
 *           </AppLayout.Header>
 *           <AppLayout.Body>
 *             <Outlet />
 *           </AppLayout.Body>
 *         </AppLayout.Content>
 *         <AppLayout.SidePanel aria-label="Assistant">
 *           <AppLayout.SidePanelHeader>
 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 *           </AppLayout.SidePanelHeader>
 *           <AppLayout.SidePanelBody>
 *             <AssistantConversation />
 *           </AppLayout.SidePanelBody>
 *           <AppLayout.SidePanelFooter>
 *             <AssistantComposer />
 *           </AppLayout.SidePanelFooter>
 *         </AppLayout.SidePanel>
 *       </AppLayout.Workspace>
 *     </AppLayout.SidePanelRoot>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const SidePanelBody = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-side-panel-body")}
			className={cx(
				"scrollbar relative min-h-0 w-full flex-1 overflow-y-auto overscroll-none",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The bar pinned to the bottom of `AppLayout.SidePanel`: a composer, a save
 * row, a status line. Render it after `AppLayout.SidePanelBody`. A `shrink-0`
 * column (`flex shrink-0 flex-col gap-2 border-t p-4`) outside the scroll
 * region, so the body scrolls under it and it never scrolls away. Merge
 * `flex-row justify-end` for an action row, and `border-t-0` for a bar with no
 * rule above it. Optional.
 *
 * The panel has a footer part where `AppLayout.Content` has none, because the
 * panel's author owns its whole subtree: no route renders through an
 * `<Outlet />` inside it, so a bar here is always the panel's own.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelfooter
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.SidePanelRoot>
 *       <AppLayout.Workspace>
 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *         <AppLayout.Content>
 *           <AppLayout.Header>
 *             <AppLayout.HeaderStart>
 *               <Sidebar.Trigger />
 *             </AppLayout.HeaderStart>
 *             <AppLayout.HeaderContent>
 *               <Breadcrumbs />
 *             </AppLayout.HeaderContent>
 *             <AppLayout.HeaderActions>
 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
 *             </AppLayout.HeaderActions>
 *           </AppLayout.Header>
 *           <AppLayout.Body>
 *             <Outlet />
 *           </AppLayout.Body>
 *         </AppLayout.Content>
 *         <AppLayout.SidePanel aria-label="Assistant">
 *           <AppLayout.SidePanelHeader>
 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 *           </AppLayout.SidePanelHeader>
 *           <AppLayout.SidePanelBody>
 *             <AssistantConversation />
 *           </AppLayout.SidePanelBody>
 *           <AppLayout.SidePanelFooter>
 *             <AssistantComposer />
 *           </AppLayout.SidePanelFooter>
 *         </AppLayout.SidePanel>
 *       </AppLayout.Workspace>
 *     </AppLayout.SidePanelRoot>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const SidePanelFooter = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-side-panel-footer")}
			className={cx("flex shrink-0 flex-col gap-2 px-3 pb-3", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A viewport-locked application shell: an optional full-width
 * `AppLayout.Notice` strip on top, then an `AppLayout.Workspace` row holding the
 * app's columns, typically a `Sidebar.Nav` beside an `AppLayout.Content` card
 * whose `AppLayout.Body` is the only thing that scrolls, and an optional
 * `AppLayout.SidePanel` that opens beside the card. It owns structure only
 * and is deliberately unaware of any sidebar: compose `Sidebar.Root` around it
 * and place `Sidebar.Trigger` in `AppLayout.Header` to connect the two.
 *
 * Reach for it when a signed-in application needs navigation chrome that
 * persists across routes. When the page is a single centered task surface with
 * no rail — sign in, sign up, onboarding, a standalone flow, a 404 — compose
 * [`CenteredLayout`](https://mantle.ngrok.com/layouts/centered-layout) instead.
 *
 * The card reads exactly like the column beside it and like every other mantle
 * surface — `Content > Header + Body`, the same shape as `Sidebar.Nav`,
 * `Dialog.Content`, `Sheet.Content`, and `Card.Root`.
 *
 * There is deliberately no `Footer` part: a route rendering through an
 * `<Outlet />` inside `AppLayout.Body` could never reach one, and a page-owned
 * bottom bar is exactly what most consumers want. Make the page's root a flex
 * column instead — see the docs' "Sizing a page to the card".
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * Composition:
 * ```
 * AppLayout.Root
 * ├── AppLayout.Notice
 * └── AppLayout.SidePanelRoot
 *     └── AppLayout.Workspace
 *         ├── AppLayout.Content
 *         │   ├── AppLayout.Header
 *         │   │   ├── AppLayout.HeaderStart
 *         │   │   ├── AppLayout.HeaderContent
 *         │   │   └── AppLayout.HeaderActions
 *         │   │       └── AppLayout.SidePanelTrigger
 *         │   └── AppLayout.Body
 *         └── AppLayout.SidePanel
 *             ├── AppLayout.SidePanelHeader
 *             ├── AppLayout.SidePanelBody
 *             └── AppLayout.SidePanelFooter
 * ```
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
 *     <AppLayout.Workspace>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderStart>
 *             <Sidebar.Trigger />
 *           </AppLayout.HeaderStart>
 *           <AppLayout.HeaderContent>
 *             <Breadcrumbs />
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <PageActions />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const AppLayout = {
	/**
	 * The outer frame. Fills its nearest sized ancestor; merge
	 * `className="fixed inset-0"` to pin a real app shell to the viewport.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutroot
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Root,
	/**
	 * A full-window-width strip above everything (maintenance notices,
	 * environment warnings). Unstyled; collapses when empty.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutnotice
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Notice,
	/**
	 * The row below the notice where the user works — place a `Sidebar.Nav`
	 * beside an `AppLayout.Content` card here.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutworkspace
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Workspace,
	/**
	 * The rounded `bg-card` surface beside the sidebar, holding the toolbar and
	 * the page region. Insets itself with `--app-layout-card-gutter`; does not
	 * scroll — `AppLayout.Body` does.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutcontent
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Content,
	/**
	 * The toolbar row at the top of the content card — `AppLayout.Content`'s
	 * first child, with `Sidebar.Trigger` in its top-left followed by
	 * breadcrumbs. Pinned by `shrink-0`, not `sticky`.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheader
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Header,
	/**
	 * The header's leading slot, `shrink-0`: the home of `Sidebar.Trigger`.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheaderstart
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	HeaderStart,
	/**
	 * The header's filling slot, `min-w-0 flex-1`: the home of the
	 * `Breadcrumb` trail, whose list scrolls instead of pushing the actions
	 * off the card.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheadercontent
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	HeaderContent,
	/**
	 * The header's trailing slot, `ml-auto shrink-0`: the page's actions,
	 * aligned to the row's end. Three or fewer; collapse them into one
	 * `DropdownMenu` below the mobile breakpoint.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutheaderactions
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	HeaderActions,
	/**
	 * The page region and the shell's only scroll container, rendered as the
	 * `Main` landmark. A flex item that is block inside, so `h-full` pages fit the
	 * card and `mx-auto max-w-7xl` pages still center. Pass `asChild` with a
	 * `<div>` when the document already owns a `main`.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutbody
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.Workspace>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Content>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderStart>
	 *             <Sidebar.Trigger />
	 *           </AppLayout.HeaderStart>
	 *           <AppLayout.HeaderContent>
	 *             <Breadcrumbs />
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <PageActions />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Body,
	/**
	 * The renderless state owner for the side panel: `open`, `defaultOpen`,
	 * `onOpenChange`. Wrap `AppLayout.Workspace` with it.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelroot
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.SidePanelRoot>
	 *       <AppLayout.Workspace>
	 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *         <AppLayout.Content>
	 *           <AppLayout.Header>
	 *             <AppLayout.HeaderStart>
	 *               <Sidebar.Trigger />
	 *             </AppLayout.HeaderStart>
	 *             <AppLayout.HeaderContent>
	 *               <Breadcrumbs />
	 *             </AppLayout.HeaderContent>
	 *             <AppLayout.HeaderActions>
	 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
	 *             </AppLayout.HeaderActions>
	 *           </AppLayout.Header>
	 *           <AppLayout.Body>
	 *             <Outlet />
	 *           </AppLayout.Body>
	 *         </AppLayout.Content>
	 *         <AppLayout.SidePanel aria-label="Assistant">
	 *           <AppLayout.SidePanelHeader>
	 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
	 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
	 *           </AppLayout.SidePanelHeader>
	 *           <AppLayout.SidePanelBody>
	 *             <AssistantConversation />
	 *           </AppLayout.SidePanelBody>
	 *           <AppLayout.SidePanelFooter>
	 *             <AssistantComposer />
	 *           </AppLayout.SidePanelFooter>
	 *         </AppLayout.SidePanel>
	 *       </AppLayout.Workspace>
	 *     </AppLayout.SidePanelRoot>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	SidePanelRoot,
	/**
	 * A second card after `AppLayout.Content`, for an assistant or a details
	 * pane. Controlled by a required `open`: it slides in at
	 * `--app-layout-side-panel-width`, collapses to nothing and goes `inert`
	 * when closed, and floats over the card below `mobileBreakpoint`.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanel
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.SidePanelRoot>
	 *       <AppLayout.Workspace>
	 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *         <AppLayout.Content>
	 *           <AppLayout.Header>
	 *             <AppLayout.HeaderStart>
	 *               <Sidebar.Trigger />
	 *             </AppLayout.HeaderStart>
	 *             <AppLayout.HeaderContent>
	 *               <Breadcrumbs />
	 *             </AppLayout.HeaderContent>
	 *             <AppLayout.HeaderActions>
	 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
	 *             </AppLayout.HeaderActions>
	 *           </AppLayout.Header>
	 *           <AppLayout.Body>
	 *             <Outlet />
	 *           </AppLayout.Body>
	 *         </AppLayout.Content>
	 *         <AppLayout.SidePanel aria-label="Assistant">
	 *           <AppLayout.SidePanelHeader>
	 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
	 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
	 *           </AppLayout.SidePanelHeader>
	 *           <AppLayout.SidePanelBody>
	 *             <AssistantConversation />
	 *           </AppLayout.SidePanelBody>
	 *           <AppLayout.SidePanelFooter>
	 *             <AssistantComposer />
	 *           </AppLayout.SidePanelFooter>
	 *         </AppLayout.SidePanel>
	 *       </AppLayout.Workspace>
	 *     </AppLayout.SidePanelRoot>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	SidePanel,
	/**
	 * The ghost `IconButton` that toggles the panel, with `aria-expanded` and
	 * `aria-controls` wired to it. Needs a `TooltipProvider` ancestor.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepaneltrigger
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.SidePanelRoot>
	 *       <AppLayout.Workspace>
	 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *         <AppLayout.Content>
	 *           <AppLayout.Header>
	 *             <AppLayout.HeaderStart>
	 *               <Sidebar.Trigger />
	 *             </AppLayout.HeaderStart>
	 *             <AppLayout.HeaderContent>
	 *               <Breadcrumbs />
	 *             </AppLayout.HeaderContent>
	 *             <AppLayout.HeaderActions>
	 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
	 *             </AppLayout.HeaderActions>
	 *           </AppLayout.Header>
	 *           <AppLayout.Body>
	 *             <Outlet />
	 *           </AppLayout.Body>
	 *         </AppLayout.Content>
	 *         <AppLayout.SidePanel aria-label="Assistant">
	 *           <AppLayout.SidePanelHeader>
	 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
	 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
	 *           </AppLayout.SidePanelHeader>
	 *           <AppLayout.SidePanelBody>
	 *             <AssistantConversation />
	 *           </AppLayout.SidePanelBody>
	 *           <AppLayout.SidePanelFooter>
	 *             <AssistantComposer />
	 *           </AppLayout.SidePanelFooter>
	 *         </AppLayout.SidePanel>
	 *       </AppLayout.Workspace>
	 *     </AppLayout.SidePanelRoot>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	SidePanelTrigger,
	/**
	 * The panel's toolbar row, its first child: the title at the start, the
	 * close control at the end, on the same band as `AppLayout.Header`.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelheader
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.SidePanelRoot>
	 *       <AppLayout.Workspace>
	 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *         <AppLayout.Content>
	 *           <AppLayout.Header>
	 *             <AppLayout.HeaderStart>
	 *               <Sidebar.Trigger />
	 *             </AppLayout.HeaderStart>
	 *             <AppLayout.HeaderContent>
	 *               <Breadcrumbs />
	 *             </AppLayout.HeaderContent>
	 *             <AppLayout.HeaderActions>
	 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
	 *             </AppLayout.HeaderActions>
	 *           </AppLayout.Header>
	 *           <AppLayout.Body>
	 *             <Outlet />
	 *           </AppLayout.Body>
	 *         </AppLayout.Content>
	 *         <AppLayout.SidePanel aria-label="Assistant">
	 *           <AppLayout.SidePanelHeader>
	 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
	 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
	 *           </AppLayout.SidePanelHeader>
	 *           <AppLayout.SidePanelBody>
	 *             <AssistantConversation />
	 *           </AppLayout.SidePanelBody>
	 *           <AppLayout.SidePanelFooter>
	 *             <AssistantComposer />
	 *           </AppLayout.SidePanelFooter>
	 *         </AppLayout.SidePanel>
	 *       </AppLayout.Workspace>
	 *     </AppLayout.SidePanelRoot>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	SidePanelHeader,
	/**
	 * The panel's scroll region, after the header: the same box as
	 * `AppLayout.Body` with no landmark.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelbody
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.SidePanelRoot>
	 *       <AppLayout.Workspace>
	 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *         <AppLayout.Content>
	 *           <AppLayout.Header>
	 *             <AppLayout.HeaderStart>
	 *               <Sidebar.Trigger />
	 *             </AppLayout.HeaderStart>
	 *             <AppLayout.HeaderContent>
	 *               <Breadcrumbs />
	 *             </AppLayout.HeaderContent>
	 *             <AppLayout.HeaderActions>
	 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
	 *             </AppLayout.HeaderActions>
	 *           </AppLayout.Header>
	 *           <AppLayout.Body>
	 *             <Outlet />
	 *           </AppLayout.Body>
	 *         </AppLayout.Content>
	 *         <AppLayout.SidePanel aria-label="Assistant">
	 *           <AppLayout.SidePanelHeader>
	 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
	 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
	 *           </AppLayout.SidePanelHeader>
	 *           <AppLayout.SidePanelBody>
	 *             <AssistantConversation />
	 *           </AppLayout.SidePanelBody>
	 *           <AppLayout.SidePanelFooter>
	 *             <AssistantComposer />
	 *           </AppLayout.SidePanelFooter>
	 *         </AppLayout.SidePanel>
	 *       </AppLayout.Workspace>
	 *     </AppLayout.SidePanelRoot>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	SidePanelBody,
	/**
	 * The bar pinned to the panel's bottom edge, after the body: a composer or
	 * an action row, outside the scroll region. Optional.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelfooter
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isUnderMaintenance && <MaintenanceBanner />}</AppLayout.Notice>
	 *     <AppLayout.SidePanelRoot>
	 *       <AppLayout.Workspace>
	 *         <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *         <AppLayout.Content>
	 *           <AppLayout.Header>
	 *             <AppLayout.HeaderStart>
	 *               <Sidebar.Trigger />
	 *             </AppLayout.HeaderStart>
	 *             <AppLayout.HeaderContent>
	 *               <Breadcrumbs />
	 *             </AppLayout.HeaderContent>
	 *             <AppLayout.HeaderActions>
	 *               <AppLayout.SidePanelTrigger icon={<SparkleIcon />} label="Toggle the assistant" />
	 *             </AppLayout.HeaderActions>
	 *           </AppLayout.Header>
	 *           <AppLayout.Body>
	 *             <Outlet />
	 *           </AppLayout.Body>
	 *         </AppLayout.Content>
	 *         <AppLayout.SidePanel aria-label="Assistant">
	 *           <AppLayout.SidePanelHeader>
	 *             <p className="text-strong min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
	 *             <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
	 *           </AppLayout.SidePanelHeader>
	 *           <AppLayout.SidePanelBody>
	 *             <AssistantConversation />
	 *           </AppLayout.SidePanelBody>
	 *           <AppLayout.SidePanelFooter>
	 *             <AssistantComposer />
	 *           </AppLayout.SidePanelFooter>
	 *         </AppLayout.SidePanel>
	 *       </AppLayout.Workspace>
	 *     </AppLayout.SidePanelRoot>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	SidePanelFooter,
} as const;

export {
	//,
	AppLayout,
	useSidePanel,
};
export type {
	//,
	AppLayoutSidePanelMobileBreakpoint,
	AppLayoutSidePanelProps,
	AppLayoutSidePanelRootProps,
	AppLayoutSidePanelState,
	AppLayoutSidePanelTriggerProps,
};
