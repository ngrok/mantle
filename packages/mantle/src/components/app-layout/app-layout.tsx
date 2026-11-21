// Why "use no memo": a server component can render this file. A stateless part gains little from
// the compiler, and its cache hook would make the build mark the chunk "use client".
"use no memo";

import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Main } from "../main/main.js";
import { Slot } from "../slot/index.js";
import { headerBandClassName } from "./header-band.js";

/**
 * The outer frame of an application shell. Renders a `<div>` with
 * `relative isolate flex h-full w-full flex-col overflow-clip`, so
 * it fills its nearest sized ancestor. That makes it embeddable in docs
 * demos and tests. Real app shells pin it to the viewport by merging
 * `className="fixed inset-0"` (mantle `cx` is tailwind-merge-backed, so the
 * override is deterministic); the shell itself never scrolls. Only
 * `AppLayout.Body` does.
 *
 * It clips with `overflow-clip` rather than `overflow-hidden` for the same
 * reason `AppLayout.Content` does: `hidden` **is** a scroll container that
 * paints no scrollbar, so anything wider than the frame lets focus scroll the
 * entire shell sideways. That translates the notice, the sidebar, and the card out
 * of view with no scrollbar and no gesture to bring them back. On a frame pinned
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
				// header's token when one is composed; see AppLayout.Header).
				"group/app-layout bg-base relative isolate flex h-full w-full flex-col",
				// clip, not hidden: the same trap AppLayout.Content avoids, one
				// level up. `hidden` is a scroll container that paints no scrollbar,
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
 * A full-window-width strip pinned above everything else in the shell
 * (including any sidebar) for maintenance notices, environment warnings,
 * and similar app-wide messaging. It is a vertical composition slot: place a
 * maintenance banner and an `AlertCenter.Bar` here, and each contributes its
 * own row while the slot pushes the shell down. Renders an unstyled `<div>`
 * (`flex w-full shrink-0 flex-col`): its children bring their own colors and
 * layout, and the part collapses to nothing when empty. Deliberately not named
 * `Banner` so it never reads as the ARIA `banner` landmark: it claims no
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
 * any other sidebar, on either side) beside an `AppLayout.Content` card, and an
 * `AppLayout.SidePanel` after the card. A flex row
 * (`relative flex min-h-0 min-w-0 flex-1`) whose `min-h-0` is
 * what lets `AppLayout.Body` scroll instead of the page.
 *
 * It owns no gutter, deliberately: the card insets itself with its own margin,
 * so a sidebar stays flush against the window edge and a collapsed sidebar keeps
 * its flush geometry.
 *
 * It is `relative`, so a floating `AppLayout.SidePanel` resolves against the row
 * and covers the card, never the notice above it. It is also the container
 * named `app-layout-workspace`: the panel floats when the row is narrower than
 * the lane it needs, so a page is never narrower than the panel beside it. The
 * lane is `--container-side-panel-lane` while a direct child of the row is an
 * expanded `Sidebar.Nav`, and `--container-side-panel-lane-collapsed` with a
 * collapsed sidebar or none.
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
				// Why a named container: `AppLayout.SidePanel` floats when this row is
				// narrower than the lane it needs, whatever the viewport is.
				"@container/app-layout-workspace",
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
 * `AppLayout.Workspace` and insets itself from the window edge and the sidebar with
 * its own margin (`--app-layout-card-gutter`, default `0.5rem`). The gutter
 * belongs to the card so a sidebar stays flush against the window edge.
 *
 * The card does **not** scroll: `AppLayout.Body` does. `Content` is
 * `overflow-clip`, which does two jobs: it keeps a full-bleed page background
 * from painting square corners over the card's `rounded-xl`, and it is
 * deliberately `clip` rather than `hidden` because `hidden` is a scroll
 * container with no scrollbar: a long toolbar would let focus scroll the card
 * sideways, dragging the header and the page with it, and nothing could scroll
 * it back.
 *
 * It is also `relative`, so page content positioned with `absolute` resolves
 * against the card instead of escaping to `AppLayout.Root` and painting across
 * the sidebar.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--app-layout-card-gutter` | `0.5rem` | The gap between the card and the window edge, the notice above it, and the sidebar beside it (8px). `AppLayout.Header` subtracts twice this value when deriving its height, so overriding it keeps the toolbar aligned with the sidebar header's band. Set it on `AppLayout.Root` or another common ancestor, not on this part: `AppLayout.SidePanel` and `AppLayout.SidePanelHeader` read it too, and custom properties inherit downward only. |
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
				// contains the sidebar, so padding there would inset the sidebar off the
				// window edge and break the flush collapsed sidebar.
				"m-(--app-layout-card-gutter,0.5rem)",
				// clip, not hidden: `hidden` is a scroll container that paints no
				// scrollbar, so a long toolbar lets focus scroll the card sideways.
				// That translates the header and the page off-screen with no way back.
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
 * when the page scrolls horizontally. It takes no height from a page that asks
 * for `h-full`.
 *
 * Renders a `<div>`, not a `<header>`: `AppLayout.Body` is the `main` landmark
 * and this row is its sibling, so a `<header>` here would have no sectioning
 * ancestor and would become the ARIA `banner` landmark, which a card toolbar is
 * not. If you need one, compose your own element with `asChild`.
 *
 * **Sidebar alignment is an invariant, not a coincidence:** standalone, the
 * toolbar is `h-14`. When the shell contains a `Sidebar.Header` (detected via
 * `:has()` from `AppLayout.Root`), the toolbar instead derives its height from
 * the sidebar's public `--sidebar-header-height` token, subtracting twice the
 * card gutter and twice the card's hairline border. That keeps this toolbar's
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
 * | `--sidebar-header-height` | `4.5rem` | Read, not owned: `Sidebar.Header` owns this token (the band its first row sits on), and `AppLayout.Header` derives its own height from it whenever a sidebar header is present in the shell. Set it on a common ancestor of both rows (e.g. `AppLayout.Root`), never on one of them, since custom properties only inherit downward. |
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
 * container (`overflow-y-auto overscroll-none`). The page body never scrolls,
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
 * - block layout inside (not flex) is why `mx-auto max-w-7xl` still centers a
 *   page at its max width. As a *flex child*, auto margins beat
 *   `align-items: stretch` and the same container shrink-to-fits, getting
 *   *narrower* as the viewport gets wider.
 * - `w-full` states the width outright instead of leaning on the flex
 *   container's cross-axis `stretch`, so an `mx-auto` merged onto `Body` still
 *   leaves it full width. Auto cross-axis margins would otherwise turn a
 *   stretched item into a shrink-to-fit one. It is no floor, though: `cx` is
 *   tailwind-merge-backed and the consumer's `className` wins, so a merged
 *   `w-*` replaces it outright, while a merged `max-w-*` (a separate conflict
 *   group) survives beside it and clamps the scrollport. Constrain the *page*
 *   inside `Body`, not `Body` itself.
 *
 * It is `relative` too, so page content positioned with `absolute` is contained
 * by the scrollport the route author is already reasoning about.
 *
 * `scrollbar-gutter-stable` keeps space for the scrollbar when the page does
 * not overflow, so the page does not move sideways when it starts to scroll.
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
 * The scroll region of `AppLayout.SidePanel`, and the only part of the panel
 * that scrolls (`scrollbar scrollbar-gutter-stable relative min-h-0 w-full
 * flex-1 overflow-y-auto overscroll-none`). Render it after
 * `AppLayout.SidePanelHeader`. It is the
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
 * The bar pinned to the bottom of `AppLayout.SidePanel`: a composer, a save
 * row, a status line. Render it after `AppLayout.SidePanelBody`. A `shrink-0`
 * column (`flex shrink-0 flex-col gap-2 px-3 pb-3`) outside the scroll
 * region, so the body scrolls under it and it never scrolls away. It draws no
 * rule above itself: the composer frame inside it is the edge. Merge
 * `flex-row justify-end` for an action row. Optional.
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

export {
	//,
	Root,
	Notice,
	Workspace,
	Content,
	Header,
	HeaderStart,
	HeaderContent,
	HeaderActions,
	Body,
	SidePanelBody,
	SidePanelFooter,
};
