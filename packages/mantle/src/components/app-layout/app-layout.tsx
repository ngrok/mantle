import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
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
 * child and compose the `Main` landmark into `AppLayout.Body` via `asChild` so
 * keyboard users can jump past the sidebar and toolbar straight into the
 * scrolling page region.
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
 *           <Sidebar.Trigger />
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <Main>
 *             <Outlet />
 *           </Main>
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
 *           <Sidebar.Trigger />
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <Main>
 *             <Outlet />
 *           </Main>
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
 * any other rail, on either side) beside an `AppLayout.Content` card. A flex row
 * (`flex min-h-0 flex-1`) whose `min-h-0` is what lets `AppLayout.Body` scroll
 * instead of the page.
 *
 * It owns no gutter, deliberately: the card insets itself with its own margin,
 * so a rail stays flush against the window edge and a collapsed icon rail keeps
 * its flush geometry.
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
 *           <Sidebar.Trigger />
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <Main>
 *             <Outlet />
 *           </Main>
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
			className={cx("flex min-h-0 flex-1", className)}
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
 *           <Sidebar.Trigger />
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <Main>
 *             <Outlet />
 *           </Main>
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
 * The toolbar row at the top of the content card — render it as the **first
 * child of `AppLayout.Content`**. The natural home for a `Sidebar.Trigger` in
 * its top-left, followed by `Breadcrumb` navigation, search, or page-level
 * actions.
 *
 * It is pinned by construction, not by `sticky`: as a `shrink-0` flex sibling
 * *outside* the scrolling `AppLayout.Body`, it cannot scroll away, cannot be
 * overlapped by a page's own `sticky top-0`, and does not translate sideways
 * when the page scrolls horizontally. It also no longer steals height from a
 * page that asks for `h-full`.
 *
 * Renders a `<div>`, not a `<header>`: the `Main` landmark is composed onto
 * `AppLayout.Body`, so a `<header>` here would have no sectioning ancestor and
 * would therefore *become* the ARIA `banner` landmark — which a card toolbar is
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
 *           <Sidebar.Trigger />
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <Main>
 *             <Outlet />
 *           </Main>
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
 * The page region of the content card, and the shell's **only** scroll
 * container (`overflow-y-auto overscroll-none`) — the page body never scrolls
 * and scroll never bounces the shell. Render it after `AppLayout.Header` inside
 * `AppLayout.Content`.
 *
 * In a real app shell this should almost always be mantle's `Main` landmark,
 * composed via `asChild`, and paired with a `SkipToMainLink` as the first child
 * of `AppLayout.Root` (`SkipToMainLink`'s default `targetId` matches `Main`'s
 * `id="main"`). Composing `Main` here rather than onto the card is what makes
 * the skip link actually useful: the focused landmark **is** the scroll
 * container, so arrows, `Space`, and `PageDown` scroll the page immediately, and
 * the skip really does jump past the sidebar *and* the toolbar. The plain
 * `<div>` default exists for embedded usage (docs demos, tests) where the
 * surrounding document already owns the Main landmark.
 *
 * It is a flex **item** that is **block inside**, and both halves are
 * load-bearing:
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
 *           <Sidebar.Trigger />
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <Main>
 *             <Outlet />
 *           </Main>
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
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

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
 * A viewport-locked application shell: an optional full-width
 * `AppLayout.Notice` strip on top, then an `AppLayout.Workspace` row holding the
 * app's columns — typically a `Sidebar.Nav` beside an `AppLayout.Content` card
 * whose `AppLayout.Body` is the only thing that scrolls. It owns structure only
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
 *     └── AppLayout.Content
 *         ├── AppLayout.Header
 *         └── AppLayout.Body
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
 *           <Sidebar.Trigger />
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <AppLayout.Body asChild>
 *           <Main>
 *             <Outlet />
 *           </Main>
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
	 *           <Sidebar.Trigger />
	 *           <Breadcrumbs />
	 *         </AppLayout.Header>
	 *         <AppLayout.Body asChild>
	 *           <Main>
	 *             <Outlet />
	 *           </Main>
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
	 *           <Sidebar.Trigger />
	 *           <Breadcrumbs />
	 *         </AppLayout.Header>
	 *         <AppLayout.Body asChild>
	 *           <Main>
	 *             <Outlet />
	 *           </Main>
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
	 *           <Sidebar.Trigger />
	 *           <Breadcrumbs />
	 *         </AppLayout.Header>
	 *         <AppLayout.Body asChild>
	 *           <Main>
	 *             <Outlet />
	 *           </Main>
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
	 *           <Sidebar.Trigger />
	 *           <Breadcrumbs />
	 *         </AppLayout.Header>
	 *         <AppLayout.Body asChild>
	 *           <Main>
	 *             <Outlet />
	 *           </Main>
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
	 *           <Sidebar.Trigger />
	 *           <Breadcrumbs />
	 *         </AppLayout.Header>
	 *         <AppLayout.Body asChild>
	 *           <Main>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Header,
	/**
	 * The page region and the shell's only scroll container. A flex item that is
	 * block inside, so `h-full` pages fit the card and `mx-auto max-w-7xl` pages
	 * still center. Compose `Main` here via `asChild` when the shell owns the
	 * document.
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
	 *           <Sidebar.Trigger />
	 *           <Breadcrumbs />
	 *         </AppLayout.Header>
	 *         <AppLayout.Body asChild>
	 *           <Main>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Body>
	 *       </AppLayout.Content>
	 *     </AppLayout.Workspace>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Body,
} as const;

export {
	//,
	AppLayout,
};
