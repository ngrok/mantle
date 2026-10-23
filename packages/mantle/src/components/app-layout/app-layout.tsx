"use client";

import { SidebarSimpleIcon } from "@phosphor-icons/react/SidebarSimple";
import type { ComponentProps, ReactNode, RefObject } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useFocusTrap } from "../../hooks/use-focus-trap.js";
import { useInertSiblings } from "../../hooks/use-inert-siblings.js";
import { useIsHydratedAfterPaint } from "../../hooks/use-is-hydrated-after-paint.js";
import { useMatchesMediaQuery } from "../../hooks/use-matches-media-query.js";
import { useSwipeToDismiss } from "../../hooks/use-swipe-to-dismiss.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { isTabbable } from "../alert/tabbable-neighbors.js";
import type { IconButtonProps } from "../button/icon-button.js";
import { escapeBelongsToNestedPopup } from "../dialog/primitive.js";
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
 * (`relative flex min-h-0 min-w-0 flex-1`) whose `min-h-0` is
 * what lets `AppLayout.Body` scroll instead of the page.
 *
 * It owns no gutter, deliberately: the card insets itself with its own margin,
 * so a rail stays flush against the window edge and a collapsed icon rail keeps
 * its flush geometry.
 *
 * It is `relative`, so a floating `AppLayout.SidePanel` resolves against the row
 * and covers the card, never the notice above it. It is also the container
 * named `app-layout-workspace`: the panel floats when the row is narrower than
 * the lane it needs, so a page is never narrower than the panel beside it. The
 * lane is `--container-side-panel-lane` while a direct child of the row is an
 * expanded `Sidebar.Nav`, and `--container-side-panel-lane-icon-rail` with a
 * collapsed rail or none.
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
 * | `--app-layout-card-gutter` | `0.5rem` | The gap between the card and the window edge, the notice above it, and the rail beside it (8px). `AppLayout.Header` subtracts twice this value when deriving its height, so overriding it keeps the toolbar aligned with the sidebar header's band. Set it on `AppLayout.Root` or another common ancestor, not on this part: `AppLayout.SidePanel` and `AppLayout.SidePanelHeader` read it too, and custom properties inherit downward only. |
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
 * visible, and slides off the end edge when closed. The lane's closed
 * `basis-0` is gated to the breakpoint and up: an absolutely positioned box
 * ignores `flex-basis`, so an ungated one runs an inert transition on every
 * close and open. Closed, the floating box is also
 * `invisible`: when a consumer narrows the row inside the frame, the row's
 * end edge sits inside the frame too, and a panel past that edge would still
 * paint beside the row. `visibility` rides the transition, so the
 * panel stays visible through the slide and hides the instant it ends. One
 * breakpoint lower it covers the card from gutter to gutter, because a strip
 * of page beside a 24rem panel is no page at all on a phone. The floating box
 * takes the card's rounding and a larger shadow itself, because its inner
 * card fills it edge to edge there. A complete `Record` (not cva) so a
 * breakpoint without its classes is a compile error.
 *
 * The lane's `basis-0` is also gated to a row that holds the lane, because
 * {@link sidePanelLaneFloatClassName} and
 * {@link sidePanelExpandedRailLaneFloatClassName} float the box below that
 * too. A row holds the lane at `--container-side-panel-lane` and up, or at
 * `--container-side-panel-lane-icon-rail` and up when no direct child is an
 * expanded `Sidebar.Nav`. The second gate is the arbitrary variant written
 * out in each string: Tailwind reads class names from the source, so no
 * constant can hold the prefix.
 */
const sidePanelFloatClassName: Record<AppLayoutSidePanelMobileBreakpoint, string> = {
	sm: "sm:@min-side-panel-lane/app-layout-workspace:data-state-closed:basis-0 sm:[[data-slot~=app-layout-workspace]:not(:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed])))_&]:@min-side-panel-lane-icon-rail/app-layout-workspace:data-state-closed:basis-0 max-sm:absolute max-sm:inset-y-(--app-layout-card-gutter,0.5rem) max-sm:left-(--app-layout-card-gutter,0.5rem) max-sm:right-(--app-layout-card-gutter,0.5rem) max-sm:z-20 max-sm:my-0 max-sm:rounded-xl max-sm:shadow-lg max-sm:[--_side-panel-content-width:100%] max-sm:[--_side-panel-content-inset:0px] max-sm:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] max-sm:data-state-closed:invisible",
	md: "md:@min-side-panel-lane/app-layout-workspace:data-state-closed:basis-0 md:[[data-slot~=app-layout-workspace]:not(:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed])))_&]:@min-side-panel-lane-icon-rail/app-layout-workspace:data-state-closed:basis-0 max-md:absolute max-md:inset-y-(--app-layout-card-gutter,0.5rem) max-md:right-(--app-layout-card-gutter,0.5rem) max-md:z-20 max-md:my-0 max-md:w-[min(24rem,calc(100cqw-5rem))] max-md:rounded-xl max-md:shadow-lg max-md:[--_side-panel-content-width:100%] max-md:[--_side-panel-content-inset:0px] max-md:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] max-md:data-state-closed:invisible max-sm:left-(--app-layout-card-gutter,0.5rem) max-sm:w-auto",
	lg: "lg:@min-side-panel-lane/app-layout-workspace:data-state-closed:basis-0 lg:[[data-slot~=app-layout-workspace]:not(:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed])))_&]:@min-side-panel-lane-icon-rail/app-layout-workspace:data-state-closed:basis-0 max-lg:absolute max-lg:inset-y-(--app-layout-card-gutter,0.5rem) max-lg:right-(--app-layout-card-gutter,0.5rem) max-lg:z-20 max-lg:my-0 max-lg:w-[min(24rem,calc(100cqw-5rem))] max-lg:rounded-xl max-lg:shadow-lg max-lg:[--_side-panel-content-width:100%] max-lg:[--_side-panel-content-inset:0px] max-lg:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] max-lg:data-state-closed:invisible max-md:left-(--app-layout-card-gutter,0.5rem) max-md:w-auto",
};

/**
 * Floats the panel when the `AppLayout.Workspace` row is narrower than
 * `--container-side-panel-lane-icon-rail`, whatever the viewport and the rail
 * are. The row is the named container, so this reads the width the rail
 * leaves, and the page is never narrower than the panel beside it. Everything
 * the strip and the cover share lives here; the strip's width is in
 * {@link sidePanelLaneStripWidthClassName}, because the phone cover sets no
 * width and a width from this rule would outrank it.
 */
const sidePanelLaneFloatClassName =
	"@max-side-panel-lane-icon-rail/app-layout-workspace:absolute @max-side-panel-lane-icon-rail/app-layout-workspace:inset-y-(--app-layout-card-gutter,0.5rem) @max-side-panel-lane-icon-rail/app-layout-workspace:right-(--app-layout-card-gutter,0.5rem) @max-side-panel-lane-icon-rail/app-layout-workspace:z-20 @max-side-panel-lane-icon-rail/app-layout-workspace:my-0 @max-side-panel-lane-icon-rail/app-layout-workspace:rounded-xl @max-side-panel-lane-icon-rail/app-layout-workspace:shadow-lg @max-side-panel-lane-icon-rail/app-layout-workspace:[--_side-panel-content-width:100%] @max-side-panel-lane-icon-rail/app-layout-workspace:[--_side-panel-content-inset:0px] @max-side-panel-lane-icon-rail/app-layout-workspace:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] @max-side-panel-lane-icon-rail/app-layout-workspace:data-state-closed:invisible";

/**
 * The same float as {@link sidePanelLaneFloatClassName}, up to
 * `--container-side-panel-lane`, while a direct child of the row is an
 * expanded `Sidebar.Nav`. The arbitrary variant keys the row through `:has()`
 * on the rail's `data-slot` and `data-state`, so collapsing the rail returns
 * the panel to the lane at the narrower threshold.
 */
const sidePanelExpandedRailLaneFloatClassName =
	"[[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:absolute [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:inset-y-(--app-layout-card-gutter,0.5rem) [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:right-(--app-layout-card-gutter,0.5rem) [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:z-20 [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:my-0 [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:rounded-xl [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:shadow-lg [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:[--_side-panel-content-width:100%] [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:[--_side-panel-content-inset:0px] [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:data-state-closed:translate-x-[calc(100%+var(--app-layout-card-gutter,0.5rem))] [[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:data-state-closed:invisible";

/**
 * The strip width for the row-driven float, gated to the viewports above the
 * cover tier of each `mobileBreakpoint`: `md` and up for `lg`, `sm` and up
 * for the other two. Below that tier {@link sidePanelFloatClassName} pins
 * both edges and sets `w-auto`, and this width must not apply over it. Each
 * string carries the width twice: below the icon-rail threshold for every
 * row, and below the lane threshold for a row with an expanded rail. The
 * width reads the row through `cqw`, not the viewport, so a row narrower
 * than 24rem plus the strip never holds a panel wider than itself.
 */
const sidePanelLaneStripWidthClassName: Record<AppLayoutSidePanelMobileBreakpoint, string> = {
	sm: "sm:@max-side-panel-lane-icon-rail/app-layout-workspace:w-[min(24rem,calc(100cqw-5rem))] sm:[[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:w-[min(24rem,calc(100cqw-5rem))]",
	md: "sm:@max-side-panel-lane-icon-rail/app-layout-workspace:w-[min(24rem,calc(100cqw-5rem))] sm:[[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:w-[min(24rem,calc(100cqw-5rem))]",
	lg: "md:@max-side-panel-lane-icon-rail/app-layout-workspace:w-[min(24rem,calc(100cqw-5rem))] md:[[data-slot~=app-layout-workspace]:has(>[data-slot~=sidebar-nav]:not([data-state~=collapsed]))_&]:@max-side-panel-lane/app-layout-workspace:w-[min(24rem,calc(100cqw-5rem))]",
};

/**
 * The viewport range in which the panel covers the row from gutter to gutter,
 * per `mobileBreakpoint`: the range Tailwind compiles the cover tier's `max-*`
 * variant to, so the modal behavior starts on the width the cover does. With
 * `"sm"` the cover is the float itself, so the range is the float's.
 */
const sidePanelCoverQuery: Record<AppLayoutSidePanelMobileBreakpoint, string> = {
	sm: "(width < 40rem)",
	md: "(width < 40rem)",
	lg: "(width < 48rem)",
};

/**
 * Whether `panel` floats over the card right now. The float is CSS, decided
 * by the viewport, the row, and the rail together, so the computed position
 * is the one truth. A panel in the lane is a docked pane: it ignores `Escape`,
 * and a swipe shrinks it instead of sliding it.
 */
function isSidePanelFloating(panel: HTMLElement | null): boolean {
	return panel != null && getComputedStyle(panel).position === "absolute";
}

/**
 * Parses a computed `transition-duration` or `transition-delay` list into
 * seconds, one entry per comma. An entry that does not parse is `0`.
 */
function toSeconds(times: string): number[] {
	return times.split(",").map((time) => Number.parseFloat(time) || 0);
}

/**
 * The milliseconds until every transition on `panel` ends: the longest
 * duration plus delay of one `transition-property` entry. The duration and
 * delay lists repeat to the length of the property list, as CSS repeats them.
 * It reads the computed style, so a consumer `duration-*` sets the wait.
 */
function readSidePanelTransitionMs(panel: HTMLElement): number {
	const style = getComputedStyle(panel);
	const durations = toSeconds(style.transitionDuration);
	const delays = toSeconds(style.transitionDelay);
	const ends = style.transitionProperty
		.split(",")
		.map(
			(_, index) =>
				(durations[index % durations.length] ?? 0) + (delays[index % delays.length] ?? 0),
		);
	return Math.max(0, ...ends) * 1000;
}

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
	 * the internal state. Keeps one identity across renders, so it is safe in an
	 * effect dependency list.
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

/**
 * The internal context value: the public state `useSidePanel` returns, and
 * the panel's focus tracker, which stays off the public object.
 */
type SidePanelContextValue = {
	state: AppLayoutSidePanelState;
	/**
	 * The last element focused inside the panel, or `null` once focus landed
	 * outside it. The panel writes it; the root reads it on close.
	 */
	lastFocusedInsideRef: RefObject<Element | null>;
	/**
	 * The panel's `<aside>`. The panel fills it; the header reads it as the
	 * element a swipe moves.
	 */
	panelRef: RefObject<HTMLElement | null>;
};

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

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
	return context.state;
}

/**
 * Read the nearest {@link SidePanelContext} for an internal part. Throws with
 * a part-specific message when rendered outside `AppLayout.SidePanelRoot`.
 */
function useSidePanelContext(part: string): SidePanelContextValue {
	const context = useContext(SidePanelContext);
	invariant(context, `AppLayout.${part} must be rendered inside AppLayout.SidePanelRoot.`);
	return context;
}

/**
 * The props for `AppLayout.SidePanelRoot`: the open state, controlled or
 * uncontrolled, the same shape as `Sidebar.Root`.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanelroot
 *
 * @example
 * ```tsx
 * <AppLayout.SidePanelRoot
 *   defaultOpen={sidePanelOpen}
 *   onOpenChange={(open) => {
 *     document.cookie = serializeSidePanelStateCookie(open);
 *   }}
 * >
 *   <AppLayout.Workspace>…</AppLayout.Workspace>
 * </AppLayout.SidePanelRoot>
 * ```
 */
type AppLayoutSidePanelRootProps = {
	/**
	 * The shell below it: `AppLayout.Workspace` with the trigger and the panel
	 * inside. The root renders no element of its own.
	 */
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
 * first `AppLayout.SidePanelTrigger` outside the panel that can take focus. A
 * closed panel is `inert` and cannot hold focus, so without this the browser
 * drops focus to the document. The return runs on every close, whether a
 * trigger, `setOpen`, or a controlled parent closed the panel. A trigger that
 * CSS hides at the current breakpoint, or a disabled one, cannot take focus
 * either, so a responsive header with one trigger per breakpoint lands on the
 * visible one.
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

	// Why a ref: an inline `onOpenChange` takes a new identity on every parent
	// render, and `setOpen` is public through `useSidePanel()` as an effect
	// dependency. Why not `useCallbackRef`: it writes in a passive effect, after
	// a consumer's `useEffect` in the same commit has read the stale callback.
	const onOpenChangeRef = useRef(onOpenChange);
	useLayoutEffect(() => {
		onOpenChangeRef.current = onOpenChange;
	});

	// Why a tracker: once the panel is `inert`, the browser moves focus to
	// `<body>` on its own schedule, so `document.activeElement` alone cannot say
	// whether focus was inside. The panel writes the ref from its own focus events.
	const lastFocusedInsideRef = useRef<Element | null>(null);
	const panelRef = useRef<HTMLElement | null>(null);

	const setOpen = useCallback(
		(next: boolean) => {
			if (!isControlled) {
				setInternalOpen(next);
			}
			onOpenChangeRef.current?.(next);
		},
		[isControlled],
	);

	const toggle = useCallback(() => {
		setOpen(!open);
	}, [open, setOpen]);

	// Why a layout effect: focus moves in the same commit that made the panel
	// `inert`, so no frame paints with focus on `<body>`.
	useLayoutEffect(() => {
		if (open) {
			return;
		}
		const lastFocusedInside = lastFocusedInsideRef.current;
		lastFocusedInsideRef.current = null;
		if (lastFocusedInside == null) {
			return;
		}
		const panel = document.getElementById(panelId);
		const activeElement = document.activeElement;
		// Why read `activeElement` too: focus that left the panel for nowhere (a
		// removed control, a window blur) keeps the ref set, and a later focus
		// outside the panel must keep its place.
		const focusIsInPanel = panel != null && panel.contains(activeElement);
		const focusFellToBody = activeElement === document.body;
		if (!focusIsInPanel && !focusFellToBody) {
			return;
		}
		const triggers = document.querySelectorAll<HTMLElement>(`[aria-controls="${panelId}"]`);
		// Why confirm the move: a responsive header hides every trigger but one,
		// and `focus()` on a hidden or disabled control does nothing.
		for (const trigger of triggers) {
			if ((panel != null && panel.contains(trigger)) || !isTabbable(trigger)) {
				continue;
			}
			trigger.focus();
			if (document.activeElement === trigger) {
				return;
			}
		}
	}, [open, panelId]);

	const contextValue = useMemo<SidePanelContextValue>(
		() => ({ lastFocusedInsideRef, panelRef, state: { open, panelId, setOpen, toggle } }),
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
		 * of taking width beside it. One breakpoint lower it covers the card from
		 * gutter to gutter; with `"sm"` there is no lower breakpoint, so it covers
		 * the card as soon as it floats. Match it to `Sidebar.Root`'s
		 * `mobileBreakpoint`, so the rail and the panel change presentation at
		 * one width.
		 *
		 * @default "lg"
		 */
		mobileBreakpoint?: AppLayoutSidePanelMobileBreakpoint;
	};

// Why no `asChild`: the panel renders a fixed two-element structure (a basis
// animator clipping an inner column at the open width), so there is no single
// default element a Slot swap could replace. A different landmark is a
// different part; build it on `useSidePanel()`.
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
 * stays usable. Three parts fill it:
 *
 * - `AppLayout.SidePanelHeader` for the title and the close control. It sits
 *   on the same band as `AppLayout.Header`, so the two rows center on one line.
 * - `AppLayout.SidePanelBody` for the scroll region.
 * - `AppLayout.SidePanelFooter`, optional, for a composer or an action row.
 *
 * It keeps the card gutter on its top, end, and bottom edges and none on its
 * start edge, so the card's own end margin is the gap between the two, one
 * gutter wide.
 *
 * It opens and closes the way `Sidebar.Nav` collapses, and nothing else moves:
 *
 * - The `<aside>` is a clip box whose `flex-basis` animates between the open
 *   width plus the end inset and zero over 200ms (`ease-out-strong`).
 * - The card is an inner column pinned to the box's end inset at the open
 *   width, so the content never reflows or shifts.
 * - The box's start edge sweeps across the card.
 *
 * A CSS transition reverses from wherever it is, so a second click mid-flight
 * turns the panel around. `motion-reduce:transition-none` turns the slide into
 * a cut. `not-data-hydrated:transition-none` holds the transition until one
 * frame after hydration, so a state the client corrects after the server
 * render snaps instead of sliding on page load. When a close ends, the
 * transition stays off until the next open, so a closed panel snaps when the
 * viewport crosses `mobileBreakpoint` or the rail changes. The `transition-*` and
 * `duration-*` utilities are bare, so a merged `transition-none` or
 * `duration-*` replaces them through tailwind-merge.
 *
 * Closed, the box is `basis-0 pointer-events-none` and `inert`,
 * so nothing inside it is focusable, clickable, or read by assistive
 * technology, and its children stay mounted: a conversation keeps its scroll
 * position, its focus target, and its in-flight reply across a close and a
 * reopen.
 *
 * Below `mobileBreakpoint` the panel floats over the card instead of taking
 * width from it: `absolute`, pinned to the row's end edge inside the card
 * gutter, `min(24rem, 100cqw - 5rem)` wide (24rem, or the row less a 5rem
 * strip of page when the row is narrower), with a larger shadow and `z-20` so
 * it paints above a page's own sticky rows. Closed, it slides off the end edge
 * instead of collapsing and goes `invisible` the instant the slide ends, so a
 * row narrower than the frame has no panel strip beside it. One breakpoint
 * lower it covers the card from gutter to gutter, because a strip of page
 * beside a 24rem panel is no page at all on a phone.
 * With `"sm"` there is no lower breakpoint, so the panel covers the card as
 * soon as it floats. Two cards side by side in 900px are two unusable cards.
 *
 * The panel also floats, with the same strip treatment, whenever the
 * `AppLayout.Workspace` row is narrower than the lane it needs, whatever the
 * viewport is. The row is the named container `app-layout-workspace`, and
 * the lane depends on the rail beside the card: `--container-side-panel-lane`
 * (56.5rem: the expanded rail, the card at the panel's floor, the panel, and
 * the three gutters) while a direct child of the row is an expanded
 * `Sidebar.Nav`, and `--container-side-panel-lane-icon-rail` (46.75rem: the
 * same row with the icon rail) with a collapsed rail, no rail, or a rail that
 * is a sheet. An expanded rail at a tablet width floats the panel instead of
 * squeezing the page narrower than it, and collapsing the rail returns the
 * panel to the lane. A wider rail or panel raises the tokens in `@theme`.
 *
 * A drag on `AppLayout.SidePanelHeader` toward the end edge swipes the panel
 * away in every presentation: a floating panel slides, and a panel in the
 * lane shrinks the way its close animation does. A floating panel is also an
 * overlay: `Escape` closes it while focus is inside, after an open combobox
 * or popover inside it has taken its own `Escape`. A panel in the lane is a
 * docked pane and ignores `Escape`. The root returns focus to the trigger
 * outside on every close.
 *
 * When the panel covers the row, it is modal. The row's other children (the
 * card and the rail) go `inert` while it is open, so nothing beneath it is
 * clickable or read; `useFocusTrap` wraps `Tab` inside it and moves focus
 * into it on open. The one `<aside>` stays mounted across the lane, the
 * float, and the cover, so a conversation keeps its DOM and the trap turns
 * on and off with the viewport.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--app-layout-side-panel-width` | `clamp(21rem, 24cqw, 27rem)` | The panel's width beside the card: a quarter of the `AppLayout.Workspace` row, never narrower than 336px and never wider than 432px. It reads the row, not the viewport, so a row narrower than the viewport holds the panel at its floor and the page keeps the rest. Set it on `AppLayout.Root` or on this part. |
 * | `--app-layout-card-gutter` | `0.5rem` | Read, not owned: `AppLayout.Content` owns this token. The panel keeps it on its top, end, and bottom edges, and the floating panel insets itself by it. Set it on `AppLayout.Root` or another common ancestor of the card and the panel, not on `AppLayout.Content`: custom properties inherit downward only, so a value on the card never reaches the panel. |
 * | `--container-side-panel-lane` | `56.5rem` | A theme token the row's container query reads: the narrowest `AppLayout.Workspace` row that holds an expanded `Sidebar.Nav` (13rem), the card at the panel's floor (21rem), the panel (21rem), and the three gutters. Below it the panel floats while a direct child of the row is an expanded rail. Set it in `@theme`, not on an element. |
 * | `--container-side-panel-lane-icon-rail` | `46.75rem` | The same row with the icon rail (3.25rem) in place of the expanded one, or with no rail. Below it the panel floats whatever the rail is. Set it in `@theme`, not on an element. |
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
	onBlur,
	onFocus,
	onKeyDown,
	ref,
	...props
}: AppLayoutSidePanelProps) => {
	const {
		lastFocusedInsideRef,
		panelRef,
		state: { open, panelId, setOpen },
	} = useSidePanelContext("SidePanel");
	const isHydrated = useIsHydratedAfterPaint();
	const composedRef = useComposedRefs(ref, panelRef);

	// Why: only an open or a close may animate, and a closed panel also changes
	// presentation at `mobileBreakpoint` or when the rail changes. The transition
	// stays off from the end of a close to the next open.
	const [closeEnded, setCloseEnded] = useState(!open);
	useEffect(() => {
		// Why reset on open and not in the cleanup: `StrictMode` replays the
		// cleanup on mount, and a closed panel must keep the gate shut.
		if (open) {
			setCloseEnded(false);
			return;
		}
		const panel = panelRef.current;
		if (panel == null) {
			return;
		}
		const timer = setTimeout(() => setCloseEnded(true), readSidePanelTransitionMs(panel));
		return () => clearTimeout(timer);
	}, [open, panelRef]);

	// Why a viewport query and not the computed position: the cover is the one
	// presentation the viewport alone decides, and this is the range Tailwind
	// compiles the cover tier to.
	const covers = useMatchesMediaQuery(sidePanelCoverQuery[mobileBreakpoint]);
	const isModal = open && covers;

	// Why siblings: the card and the rail are the panel's siblings in the row,
	// and `AppLayout` knows nothing about the rail.
	useInertSiblings(panelRef, { active: isModal });
	useFocusTrap(panelRef, { active: isModal });

	// Why a document capture listener, registered at mount: a combobox or a
	// popover inside the panel closes on the same Escape from a document
	// listener it registers when it opens, and by the time the event reaches
	// the panel the DOM no longer shows it open. Registered first, this one
	// reads the ownership before that listener runs.
	const escapeBelongsToNestedPopupRef = useRef(false);
	useEffect(() => {
		const panel = panelRef.current;
		if (panel == null) {
			return;
		}
		const recordOwner = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}
			escapeBelongsToNestedPopupRef.current = escapeBelongsToNestedPopup(panel, event.target);
		};
		document.addEventListener("keydown", recordOwner, true);
		return () => {
			document.removeEventListener("keydown", recordOwner, true);
		};
	}, [panelRef]);

	return (
		<aside
			ref={composedRef}
			data-slot={joinDataSlot(dataSlot, "app-layout-side-panel")}
			className={cx(
				// The box is a clip, not the card: the card is the inner column below,
				// pinned to the row's end inset, so the only thing that moves is this
				// box's start edge. `className` lands here, on the clip box.
				"relative min-w-0",
				// Why isolate: a page's sticky rows carry their own z-index, and the
				// panel's children must stack inside the panel, not against them.
				"isolate",
				// Why clip on the inline axis only: the sweep is horizontal, and a
				// clip on both axes would cut the card's shadow at the top and bottom.
				"overflow-x-clip",
				// The card's width, its inset from the box's end edge, and the box width
				// that sums them, as three private variables: the open width and the
				// gutter in the row, the whole box and no inset once the panel floats.
				// Why no private name inside a value: Tailwind reads the `_` of a private
				// name inside an arbitrary value as a space, so each value names public
				// variables only and the utilities read the private ones by name.
				// Why cqw: the lane tokens budget the panel at its 21rem floor, and a
				// width that read the viewport outgrew that budget in a narrow row.
				"[--_side-panel-content-width:var(--app-layout-side-panel-width,clamp(21rem,24cqw,27rem))] [--_side-panel-content-inset:var(--app-layout-card-gutter,0.5rem)] [--_side-panel-box-width:calc(var(--app-layout-side-panel-width,clamp(21rem,24cqw,27rem))+var(--app-layout-card-gutter,0.5rem))]",
				// A fixed basis, never a share of the row: `flex-1` cannot interpolate
				// to a width, so a lane that animates never uses it. The basis is the
				// card plus its end inset; the card beside it absorbs the change.
				"grow-0 shrink-0 basis-(--_side-panel-box-width)",
				// The gutter on the top and bottom edges only: the card's own end
				// margin is the gap at the start edge, and the inset at the end edge is
				// inside the box, so no margin ever animates and the height never changes.
				"my-(--app-layout-card-gutter,0.5rem) mr-0 ml-0",
				// Why one negated gate: a state the client corrects after the server
				// render must snap, not slide, on page load. Why bare utilities: a
				// consumer `transition-none` or `duration-*` replaces the default
				// through tailwind-merge.
				// Why `visibility` too: the floating panel's closed `invisible` rides
				// the slide; see `sidePanelFloatClassName`.
				"transition-[flex-basis,translate,visibility] duration-200 ease-out-strong motion-reduce:transition-none not-data-hydrated:transition-none",
				!open && closeEnded && "transition-none",
				// The closed `basis-0` is in `sidePanelFloatClassName`, gated to the lane.
				"data-state-closed:pointer-events-none",
				sidePanelFloatClassName[mobileBreakpoint],
				sidePanelLaneFloatClassName,
				sidePanelExpandedRailLaneFloatClassName,
				sidePanelLaneStripWidthClassName[mobileBreakpoint],
				className,
			)}
			onFocus={(event) => {
				onFocus?.(event);
				lastFocusedInsideRef.current = event.target;
			}}
			onBlur={(event) => {
				onBlur?.(event);
				// Why keep the ref on a null `relatedTarget`: focus left for nowhere
				// (a removed control, a window blur, the `inert` fixup), and the root
				// still hands it back on close.
				if (event.relatedTarget != null && !event.currentTarget.contains(event.relatedTarget)) {
					lastFocusedInsideRef.current = null;
				}
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.defaultPrevented || event.key !== "Escape") {
					return;
				}
				if (!isSidePanelFloating(event.currentTarget)) {
					return;
				}
				// Why the guard: one press must close one surface, and the popup
				// that owned this Escape is gone by now.
				if (escapeBelongsToNestedPopupRef.current) {
					escapeBelongsToNestedPopupRef.current = false;
					return;
				}
				event.preventDefault();
				setOpen(false);
			}}
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
			{/* The card: pinned to the box's end inset at the open width, so the
			    header, the body, and the footer keep their layout and the box's start
			    edge sweeps across them instead of reflowing or moving them. */}
			<div
				className={cx(
					"bg-card border-card-muted absolute inset-y-0 flex flex-col rounded-xl border shadow-sm",
					"right-(--_side-panel-content-inset) w-(--_side-panel-content-width)",
					// clip, not hidden: the same trap AppLayout.Content avoids.
					"overflow-clip",
				)}
			>
				{children}
			</div>
		</aside>
	);
};

/**
 * The props for `AppLayout.SidePanelTrigger`: `IconButton`'s props, except the
 * parts the trigger owns. The type omits `asChild` and `children` (the trigger
 * renders only its icon and `aria-label`; build a custom trigger with
 * `useSidePanel` instead). `appearance`, `icon`, `intent`, `label`, and `size`
 * become optional with side panel defaults. `onClick` runs before the toggle; call
 * `event.preventDefault()` in it to keep the panel where it is.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepaneltrigger
 *
 * @example
 * ```tsx
 * <AppLayout.SidePanelTrigger icon={<XIcon />} label="Close the assistant" />
 * ```
 */
type AppLayoutSidePanelTriggerProps = Omit<
	IconButtonProps,
	"appearance" | "asChild" | "children" | "icon" | "intent" | "label" | "size"
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
		/**
		 * The size of the trigger `IconButton`. Small, so it sits level with the
		 * other `size="sm"` controls in an `AppLayout.Header` row.
		 *
		 * @default "sm"
		 */
		size?: IconButtonProps["size"];
	};

const defaultSidePanelTriggerIcon = <SidebarSimpleIcon mirrored />;

// Why no `asChild`: the trigger renders a fully wired mantle IconButton (icon +
// aria-label + aria-expanded/aria-controls); a custom trigger composes the
// same behavior from `useSidePanel()` instead of slot-swapping this one.
/**
 * The button that toggles `AppLayout.SidePanel`, the way `Sidebar.Trigger`
 * toggles the rail. Renders a small ghost neutral `IconButton` with `aria-expanded`
 * and `aria-controls` wired to the panel's `<aside>`. Place one in
 * `AppLayout.HeaderActions` to open the panel, and one more in
 * `AppLayout.SidePanelHeader` with a close icon to close it from inside: when
 * that one closes the panel, the root moves focus to the one outside. A
 * consumer `onClick` runs before the toggle, and `event.preventDefault()` in
 * it keeps the panel where it is.
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
 * | `data-slot` | `"app-layout-side-panel-trigger icon-button"` | On the button: the part's slot, joined ahead of `IconButton`'s own. |
 * | `data-slot` | `"app-layout-side-panel-trigger-tooltip tooltip-content"` | On the tooltip surface, not the button: the styling hook for the label popup this part renders, joined ahead of `Tooltip.Content`'s own slot. |
 * | `data-appearance` | `"filled"` \| `"ghost"` \| `"outlined"` | Read, not stamped: the underlying `IconButton` reflects its `appearance`, which this part defaults to `"ghost"`. |
 * | `data-intent` | `"neutral"` | Read, not stamped: the underlying `IconButton` reflects its `intent`, which this part defaults to `"neutral"`. |
 * | `data-size` | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | Read, not stamped: the underlying `IconButton` reflects its `size`, which this part defaults to `"sm"`. |
 * | `data-icon-button` | `"true"` | Read, not stamped: always present on the underlying `IconButton`. |
 * | `data-loading` | present when `isLoading` | Read, not stamped: the underlying `IconButton` stamps it by presence, never `"false"`. |
 * | `data-disabled` | present when disabled | Read, not stamped: the underlying `IconButton` stamps it by presence, never `"false"`, when it resolves disabled: `disabled`, `aria-disabled="true"`, or `isLoading` with no explicit `disabled`. |
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
	size = "sm",
	...props
}: AppLayoutSidePanelTriggerProps) => {
	const { open, panelId, toggle } = useSidePanelContext("SidePanelTrigger").state;

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
					size={size}
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
 * Renders a `<div>`, not a `<header>`: the row is a toolbar, not the panel's
 * introduction, and it keeps one element shape with `AppLayout.Header`. A
 * `<header>` inside the `<aside>` scopes to the panel and claims no landmark,
 * so if the row introduces the panel, compose a `<header>` with `asChild`.
 *
 * The row is the panel's swipe handle, through `useSwipeToDismiss`, in every
 * presentation. A drag toward the end edge follows the pointer one to one: a
 * floating panel slides, and a panel in the lane shrinks its basis the way
 * its own close animation does, so the page grows under the finger. A
 * release past 25% of the panel's width, or a flick, closes it; a shorter
 * drag springs back on the panel's own 200ms ease-out, so `motion-reduce:`
 * turns it into a cut, and a drag the wrong way meets rubber-band
 * resistance. The row is `touch-pan-y`, so a vertical swipe still scrolls,
 * and a tap on a control in the row stays a tap.
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
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";
	// Why nullable: the header renders outside `AppLayout.SidePanelRoot` too,
	// and only the swipe needs the root.
	const context = useContext(SidePanelContext);
	const headerRef = useRef<HTMLDivElement>(null);
	const composedRef = useComposedRefs(ref, headerRef);
	const panelRef = context?.panelRef;
	const setOpen = context?.state.setOpen;

	useSwipeToDismiss(headerRef, {
		target: panelRef,
		active: context != null,
		// Why decide at pointer down: the float is CSS. A floating panel slides
		// off the end edge; a panel in the lane shrinks its basis, the way its
		// own close animation does.
		property: () => (isSidePanelFloating(panelRef?.current ?? null) ? "translate" : "flex-basis"),
		onDismiss: () => {
			setOpen?.(false);
		},
	});

	return (
		<Comp
			ref={composedRef}
			data-slot={joinDataSlot(dataSlot, "app-layout-side-panel-header")}
			className={cx(
				"border-card-muted flex shrink-0 items-center gap-2 border-b px-4",
				// Why pan-y: the row is the swipe handle on a floating panel, and a
				// vertical swipe on it must still scroll.
				"touch-pan-y",
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
 * no rail (sign in, sign up, onboarding, a standalone flow, a 404), compose
 * [`CenteredLayout`](https://mantle.ngrok.com/layouts/centered-layout) instead.
 *
 * The card reads exactly like the column beside it and like every other mantle
 * surface: `Content > Header + Body`, the same shape as `Sidebar.Nav`,
 * `Dialog.Content`, `Sheet.Content`, and `Card.Root`.
 *
 * There is deliberately no `Footer` part: a route rendering through an
 * `<Outlet />` inside `AppLayout.Body` could never reach one, and a page-owned
 * bottom bar is exactly what most consumers want. Make the page's root a flex
 * column instead; see the docs' "Sizing a page to the card".
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
	 * The row below the notice where the user works: a `Sidebar.Nav` beside an
	 * `AppLayout.Content` card, and an `AppLayout.SidePanel` after it.
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
	 * The toolbar row at the top of the content card: `AppLayout.Content`'s
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
	 * pane. Reads its open state from `AppLayout.SidePanelRoot`: it slides in at
	 * `--app-layout-side-panel-width`, collapses to nothing and goes `inert`
	 * when closed, floats over the card below `mobileBreakpoint` or when the
	 * row is too narrow for the rail beside it, and covers the card as a modal
	 * on a phone.
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
	 * close control at the end, on the same band as `AppLayout.Header`. It is
	 * the panel's swipe handle.
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
