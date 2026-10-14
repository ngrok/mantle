import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Main } from "../main/main.js";
import { Slot } from "../slot/index.js";

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
 * The toolbar row at the top of the content card. Render it as the **first
 * child of `AppLayout.Content`** (or of `AppLayout.SidePanel`, which takes the
 * same header), and compose its three slots in order:
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
				"border-card-muted flex h-14 shrink-0 items-center gap-2 border-b px-4",
				// With a sidebar header in the shell, derive the height from its
				// token so the two rows' centers align by construction: this toolbar
				// sits below the card's gutter and its 1px border, so center parity
				// needs its height to be the sidebar header's band minus twice each.
				// The band is the sidebar header's first row, so a header stacking a
				// second row leaves this height alone. Overriding
				// --sidebar-header-height at a common ancestor (e.g. AppLayout.Root)
				// moves both rows together.
				"group-has-data-[slot~=sidebar-header]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-2*var(--app-layout-card-gutter,0.5rem)-2px)]",
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
 * <AppLayout.SidePanel aria-label="Assistant" mobileBreakpoint="md" open={isOpen}>…</AppLayout.SidePanel>
 * ```
 */
type AppLayoutSidePanelMobileBreakpoint = "sm" | "md" | "lg";

/**
 * Maps each supported `mobileBreakpoint` to the classes that float the panel
 * over the card below it. Below the breakpoint the panel leaves the row, pins
 * to the row's end edge inside the card gutter, and takes a fixed width that
 * always leaves a strip of the page visible. A complete `Record` (not cva) so a
 * breakpoint without its classes is a compile error.
 */
const sidePanelFloatClassName: Record<AppLayoutSidePanelMobileBreakpoint, string> = {
	sm: "max-sm:absolute max-sm:inset-y-(--app-layout-card-gutter,0.5rem) max-sm:right-(--app-layout-card-gutter,0.5rem) max-sm:z-20 max-sm:m-0 max-sm:w-[min(24rem,calc(100vw-5rem))] max-sm:shadow-lg",
	md: "max-md:absolute max-md:inset-y-(--app-layout-card-gutter,0.5rem) max-md:right-(--app-layout-card-gutter,0.5rem) max-md:z-20 max-md:m-0 max-md:w-[min(24rem,calc(100vw-5rem))] max-md:shadow-lg",
	lg: "max-lg:absolute max-lg:inset-y-(--app-layout-card-gutter,0.5rem) max-lg:right-(--app-layout-card-gutter,0.5rem) max-lg:z-20 max-lg:m-0 max-lg:w-[min(24rem,calc(100vw-5rem))] max-lg:shadow-lg",
};

/**
 * The props for `AppLayout.SidePanel`: an `<aside>`'s props, `asChild`, and
 * the two the panel owns.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanel
 */
type AppLayoutSidePanelProps = ComponentProps<"aside"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether the panel is on screen. `true` slides it in beside the card at
		 * `--app-layout-side-panel-width`; `false` collapses it to nothing and
		 * marks it `inert`, with its children still mounted so their state
		 * survives the round trip. Required on purpose: a panel with no state
		 * owner is a second `AppLayout.Content`.
		 */
		open: boolean;
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

/**
 * A second card beside `AppLayout.Content`, for an assistant, a details pane, or
 * any surface that opens next to the page and closes again. Render it as the
 * **last child of `AppLayout.Workspace`**, after the card, and own its state:
 * `open` is required and controlled. Renders an `<aside>`, so it is the
 * `complementary` landmark; name it with `aria-label`.
 *
 * It takes the same card treatment as `AppLayout.Content` (`bg-card
 * border-card-muted rounded-xl border shadow-sm overflow-clip`), the same
 * `AppLayout.Header` as its first child, and an `AppLayout.Body` for its scroll
 * region. Pass `asChild` to that body and render a `<div>`: the page's body
 * already owns the `main` landmark. It keeps the card gutter on its top, end,
 * and bottom edges and none on its start edge, so the card's own end margin is
 * the gap between the two, one gutter wide.
 *
 * It is a flex item with a fixed basis (`grow-0 shrink-0`), never a share of
 * the row, so the card beside it absorbs every change in width. Opening and
 * closing animate `flex-basis`, `opacity`, and `margin` over 260ms (`ease-in-out`),
 * and `motion-reduce:transition-none` turns the slide into a cut. The `transition-*`
 * and `duration-*` utilities are bare, so a merged `transition-none` or
 * `duration-*` replaces them through tailwind-merge.
 *
 * Closed, it is `basis-0 opacity-0 m-0 border-0 pointer-events-none` and
 * `inert`, so nothing inside it is focusable, clickable, or read by assistive
 * technology, and its children stay mounted: a conversation keeps its scroll
 * position, its focus target, and its in-flight reply across a close and a
 * reopen. The element stays `inert` while focus is inside it, and the browser
 * then drops focus to `<body>`. Move focus to the control that closed the panel
 * in the same handler.
 *
 * Below `mobileBreakpoint` the panel floats over the card instead of taking
 * width from it: `absolute`, pinned to the row's end edge inside the card
 * gutter, `min(24rem, 100vw - 5rem)` wide, with a larger shadow and `z-20` so
 * it paints above a page's own sticky rows. Two cards side by side in 900px are
 * two unusable cards.
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
 * | `data-state` | `"open"` \| `"closed"` | Mirrors `open`. The collapse and the transition key off it in CSS, and consumers style against it. |
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#applayoutsidepanel
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
 *             <IconButton
 *               type="button"
 *               appearance="outlined"
 *               intent="neutral"
 *               size="sm"
 *               icon={<SparkleIcon />}
 *               label="Open the assistant"
 *               onClick={() => setIsAssistantOpen(true)}
 *             />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body>
 *           <Outlet />
 *         </AppLayout.Body>
 *       </AppLayout.Content>
 *       <AppLayout.SidePanel aria-label="Assistant" open={isAssistantOpen}>
 *         <AppLayout.Header>
 *           <AppLayout.HeaderContent>
 *             <p className="text-strong text-sm font-medium">Assistant</p>
 *           </AppLayout.HeaderContent>
 *           <AppLayout.HeaderActions>
 *             <IconButton
 *               type="button"
 *               appearance="ghost"
 *               intent="neutral"
 *               size="sm"
 *               icon={<XIcon />}
 *               label="Close the assistant"
 *               onClick={() => setIsAssistantOpen(false)}
 *             />
 *           </AppLayout.HeaderActions>
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <div>
 *             <AssistantConversation />
 *           </div>
 *         </AppLayout.Body>
 *       </AppLayout.SidePanel>
 *     </AppLayout.Workspace>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const SidePanel = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	mobileBreakpoint = "lg",
	open,
	...props
}: AppLayoutSidePanelProps) => {
	const Comp = asChild ? Slot : "aside";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-side-panel")}
			className={cx(
				"bg-card border-card-muted relative flex min-w-0 flex-col rounded-xl border shadow-sm",
				// Why isolate: a page's sticky rows carry their own z-index, and the
				// panel's children must stack inside the panel, not against them.
				"isolate",
				// clip, not hidden: the same trap AppLayout.Content avoids. It also
				// keeps the squeezed children from painting past the card while the
				// basis animates.
				"overflow-clip",
				// A fixed basis, never a share of the row: `flex-1` cannot interpolate
				// to a width, so a lane that animates never uses it. The card beside
				// it is the one that absorbs the change.
				"grow-0 shrink-0 basis-(--app-layout-side-panel-width,clamp(21rem,24vw,27rem))",
				// The gutter on three edges: the card's own end margin is the gap on
				// the start edge, so the inner gap and the outer inset are one number.
				"my-(--app-layout-card-gutter,0.5rem) mr-(--app-layout-card-gutter,0.5rem) ml-0",
				// Why bare utilities: a consumer `transition-none` or `duration-*`
				// replaces the default through tailwind-merge.
				"transition-[flex-basis,opacity,margin] duration-[260ms] ease-in-out motion-reduce:transition-none",
				// Why border-0 too: the hairline border would keep the closed panel two
				// pixels wide and paint a seam beside the card.
				"data-state-closed:basis-0 data-state-closed:opacity-0 data-state-closed:m-0 data-state-closed:border-0 data-state-closed:pointer-events-none",
				sidePanelFloatClassName[mobileBreakpoint],
				className,
			)}
			{...props}
			// Why after the spread: a wider props object can carry `data-state` or
			// `inert` past the type, and a consumer value would desync the collapse
			// from `open` or leave a closed panel in the tab order.
			data-state={open ? "open" : "closed"}
			inert={!open}
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
 * └── AppLayout.Workspace
 *     ├── AppLayout.Content
 *     │   ├── AppLayout.Header
 *     │   │   ├── AppLayout.HeaderStart
 *     │   │   ├── AppLayout.HeaderContent
 *     │   │   └── AppLayout.HeaderActions
 *     │   └── AppLayout.Body
 *     └── AppLayout.SidePanel
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
	 *             <IconButton
	 *               type="button"
	 *               appearance="outlined"
	 *               intent="neutral"
	 *               size="sm"
	 *               icon={<SparkleIcon />}
	 *               label="Open the assistant"
	 *               onClick={() => setIsAssistantOpen(true)}
	 *             />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body>
	 *           <Outlet />
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *       <AppLayout.SidePanel aria-label="Assistant" open={isAssistantOpen}>
	 *         <AppLayout.Header>
	 *           <AppLayout.HeaderContent>
	 *             <p className="text-strong text-sm font-medium">Assistant</p>
	 *           </AppLayout.HeaderContent>
	 *           <AppLayout.HeaderActions>
	 *             <IconButton
	 *               type="button"
	 *               appearance="ghost"
	 *               intent="neutral"
	 *               size="sm"
	 *               icon={<XIcon />}
	 *               label="Close the assistant"
	 *               onClick={() => setIsAssistantOpen(false)}
	 *             />
	 *           </AppLayout.HeaderActions>
	 *         </AppLayout.Header>
	 *         <AppLayout.Body asChild>
	 *           <div>
	 *             <AssistantConversation />
	 *           </div>
	 *         </AppLayout.Body>
	 *       </AppLayout.SidePanel>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	SidePanel,
} as const;

export {
	//,
	AppLayout,
};
export type {
	//,
	AppLayoutSidePanelMobileBreakpoint,
	AppLayoutSidePanelProps,
};
