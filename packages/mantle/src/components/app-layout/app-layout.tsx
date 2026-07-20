import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The outer frame of an application shell. Renders a `<div>` with
 * `relative isolate flex h-full w-full flex-col overflow-hidden bg-base`, so
 * it fills its nearest sized ancestor — which makes it embeddable in docs
 * demos and tests. Real app shells pin it to the viewport by merging
 * `className="fixed inset-0"` (mantle `cx` is tailwind-merge-backed, so the
 * override is deterministic); the shell itself never scrolls — only
 * `AppLayout.Content` does.
 *
 * When the shell owns the document, render a `SkipToMainLink` as its first
 * child and compose the `Main` landmark into `AppLayout.Content` via
 * `asChild` so keyboard users can jump past the sidebar and toolbar straight
 * into the content card.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * ```tsx
 * <AppLayout.Root className="fixed inset-0">
 *   <SkipToMainLink />
 *   <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
 *   <AppLayout.Body>
 *     <AppLayout.Inset>
 *       <AppLayout.Content>
 *         <AppLayout.Header>
 *           <Breadcrumbs />
 *         </AppLayout.Header>
 *         <Outlet />
 *       </AppLayout.Content>
 *     </AppLayout.Inset>
 *   </AppLayout.Body>
 * </AppLayout.Root>
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
				"bg-base relative isolate flex h-full w-full flex-col overflow-hidden",
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
 * including any sidebar — for impersonation notices, environment warnings,
 * and similar app-wide messaging. Renders an unstyled `<div>` (`w-full
 * shrink-0`): the notice content brings its own colors and layout, and the
 * part collapses to nothing when empty. Deliberately not named `Banner` so it
 * never reads as the ARIA `banner` landmark — it claims no landmark at all.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>
 *       {isImpersonating && (
 *         <div className="bg-red-500 text-on-filled flex items-center gap-2 px-4 py-1 text-xs">
 *           You are impersonating {userEmail}.
 *         </div>
 *       )}
 *     </AppLayout.Notice>
 *     <AppLayout.Body>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Inset>
 *         <AppLayout.Content asChild>
 *           <Main>
 *             <AppLayout.Header>
 *               <Sidebar.Trigger />
 *               <Breadcrumbs />
 *             </AppLayout.Header>
 *             <Outlet />
 *           </Main>
 *         </AppLayout.Content>
 *       </AppLayout.Inset>
 *     </AppLayout.Body>
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
			className={cx("w-full shrink-0", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The main horizontal region of the shell, below `AppLayout.Notice`. A flex
 * row (`flex min-h-0 flex-1`) whose children are the app's columns — place a
 * `Sidebar.Nav` (or any other rail) beside an `AppLayout.Inset`. The
 * `min-h-0` is what lets `AppLayout.Content` scroll instead of the page.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
 *     <AppLayout.Body>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Inset>
 *         <AppLayout.Content asChild>
 *           <Main>
 *             <AppLayout.Header>
 *               <Sidebar.Trigger />
 *               <Breadcrumbs />
 *             </AppLayout.Header>
 *             <Outlet />
 *           </Main>
 *         </AppLayout.Content>
 *       </AppLayout.Inset>
 *     </AppLayout.Body>
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
			className={cx("flex min-h-0 flex-1", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The content column of the shell: the flex column beside the sidebar that
 * wraps the scrolling `AppLayout.Content` card. Owns the card gutter
 * (`gap-2 p-2`), keeping a consistent gap beside a sidebar (invisible when
 * both share `bg-base`).
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
 *     <AppLayout.Body>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Inset>
 *         <AppLayout.Content asChild>
 *           <Main>
 *             <AppLayout.Header>
 *               <Sidebar.Trigger />
 *               <Breadcrumbs />
 *             </AppLayout.Header>
 *             <Outlet />
 *           </Main>
 *         </AppLayout.Content>
 *       </AppLayout.Inset>
 *     </AppLayout.Body>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const Inset = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-inset")}
			className={cx("flex min-w-0 flex-1 flex-col gap-2 p-2", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The toolbar row pinned to the top of the content card — render it as the
 * **first child of `AppLayout.Content`**. It is sticky (`top-0`) inside the
 * card's scroll container with a hairline border beneath it, so page content
 * scrolls under it. The natural home for a `Sidebar.Trigger` in its top-left,
 * followed by `Breadcrumb` navigation, search, or page-level actions.
 *
 * Renders a semantic `<header>` scoped to the content region (inside `Main`
 * it is deliberately not an ARIA `banner` landmark).
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
 *     <AppLayout.Body>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Inset>
 *         <AppLayout.Content asChild>
 *           <Main>
 *             <AppLayout.Header>
 *               <Sidebar.Trigger />
 *               <Breadcrumbs />
 *             </AppLayout.Header>
 *             <Outlet />
 *           </Main>
 *         </AppLayout.Content>
 *       </AppLayout.Inset>
 *     </AppLayout.Body>
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
}: ComponentProps<"header"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "header";

	return (
		<Comp
			data-slot={joinDataSlot(dataSlot, "app-layout-header")}
			className={cx(
				// h-14 + the Inset's 8px gutter puts this toolbar's center on the
				// same line as Sidebar.Header's h-18 switcher row.
				"border-card-muted bg-card sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The scrolling content card of the shell: a rounded, bordered `bg-card`
 * surface that fills the remaining space and scrolls internally
 * (`overflow-y-auto overscroll-none`) — the page body never scrolls and
 * scroll never bounces the shell. Render `AppLayout.Header` as its first
 * child for a sticky in-card toolbar that content scrolls beneath. The card
 * renders a `<div>` by default, but in a real
 * app shell this should almost always be mantle's `Main` landmark, composed
 * via `asChild` — pair it with a `SkipToMainLink` as the first child of
 * `AppLayout.Root` so keyboard users can jump past the sidebar and toolbar
 * straight into the content card (`SkipToMainLink`'s default `targetId`
 * matches `Main`'s `id="main"`). The `<div>` default exists for embedded
 * usage (docs demos, tests) where the surrounding document already owns the
 * Main landmark.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
 *     <AppLayout.Body>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Inset>
 *         <AppLayout.Content asChild>
 *           <Main>
 *             <AppLayout.Header>
 *               <Sidebar.Trigger />
 *               <Breadcrumbs />
 *             </AppLayout.Header>
 *             <Outlet />
 *           </Main>
 *         </AppLayout.Content>
 *       </AppLayout.Inset>
 *     </AppLayout.Body>
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
				"bg-card border-card-muted scrollbar min-h-0 flex-1 overflow-y-auto overscroll-none rounded-xl border shadow-sm",
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
 * `AppLayout.Notice` strip on top, then a row holding the app's columns —
 * typically a `Sidebar.Nav` beside an `AppLayout.Inset` whose
 * `AppLayout.Content` card is the only thing that scrolls. It owns structure
 * only and is deliberately unaware of any sidebar: compose `Sidebar.Root`
 * around it and place `Sidebar.Trigger` in `AppLayout.Header` to connect the
 * two.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout
 *
 * @example
 * Composition:
 * ```
 * AppLayout.Root
 * ├── AppLayout.Notice
 * └── AppLayout.Body
 *     └── AppLayout.Inset
 *         └── AppLayout.Content
 *             └── AppLayout.Header
 * ```
 *
 * @example
 * ```tsx
 * <Sidebar.Root>
 *   <AppLayout.Root className="fixed inset-0">
 *     <SkipToMainLink />
 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
 *     <AppLayout.Body>
 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
 *       <AppLayout.Inset>
 *         <AppLayout.Content asChild>
 *           <Main>
 *             <AppLayout.Header>
 *               <Sidebar.Trigger />
 *               <Breadcrumbs />
 *             </AppLayout.Header>
 *             <Outlet />
 *           </Main>
 *         </AppLayout.Content>
 *       </AppLayout.Inset>
 *     </AppLayout.Body>
 *   </AppLayout.Root>
 * </Sidebar.Root>
 * ```
 */
const AppLayout = {
	/**
	 * The outer frame. Fills its nearest sized ancestor; merge
	 * `className="fixed inset-0"` to pin a real app shell to the viewport.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
	 *     <AppLayout.Body>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Inset>
	 *         <AppLayout.Content asChild>
	 *           <Main>
	 *             <AppLayout.Header>
	 *               <Sidebar.Trigger />
	 *               <Breadcrumbs />
	 *             </AppLayout.Header>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Content>
	 *       </AppLayout.Inset>
	 *     </AppLayout.Body>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Root,
	/**
	 * A full-window-width strip above everything (impersonation notices,
	 * environment warnings). Unstyled; collapses when empty.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
	 *     <AppLayout.Body>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Inset>
	 *         <AppLayout.Content asChild>
	 *           <Main>
	 *             <AppLayout.Header>
	 *               <Sidebar.Trigger />
	 *               <Breadcrumbs />
	 *             </AppLayout.Header>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Content>
	 *       </AppLayout.Inset>
	 *     </AppLayout.Body>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Notice,
	/**
	 * The flex row below the notice — place a `Sidebar.Nav` beside an
	 * `AppLayout.Inset` here.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
	 *     <AppLayout.Body>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Inset>
	 *         <AppLayout.Content asChild>
	 *           <Main>
	 *             <AppLayout.Header>
	 *               <Sidebar.Trigger />
	 *               <Breadcrumbs />
	 *             </AppLayout.Header>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Content>
	 *       </AppLayout.Inset>
	 *     </AppLayout.Body>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Body,
	/**
	 * The content column: wraps the `AppLayout.Content` card and owns the
	 * card gutter.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
	 *     <AppLayout.Body>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Inset>
	 *         <AppLayout.Content asChild>
	 *           <Main>
	 *             <AppLayout.Header>
	 *               <Sidebar.Trigger />
	 *               <Breadcrumbs />
	 *             </AppLayout.Header>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Content>
	 *       </AppLayout.Inset>
	 *     </AppLayout.Body>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Inset,
	/**
	 * The sticky toolbar `<header>` at the top of the content card — render
	 * it as `AppLayout.Content`'s first child, with `Sidebar.Trigger` in its
	 * top-left followed by breadcrumbs.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
	 *     <AppLayout.Body>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Inset>
	 *         <AppLayout.Content asChild>
	 *           <Main>
	 *             <AppLayout.Header>
	 *               <Sidebar.Trigger />
	 *               <Breadcrumbs />
	 *             </AppLayout.Header>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Content>
	 *       </AppLayout.Inset>
	 *     </AppLayout.Body>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Header,
	/**
	 * The rounded `bg-card` surface that is the shell's only scroll container
	 * (`overflow-y-auto overscroll-none`). `AppLayout.Header` is its first
	 * child; compose `Main` via `asChild` when the shell owns the document.
	 *
	 * @see https://mantle.ngrok.com/layouts/app-layout
	 *
	 * @example
	 * ```tsx
	 * <Sidebar.Root>
	 *   <AppLayout.Root className="fixed inset-0">
	 *     <SkipToMainLink />
	 *     <AppLayout.Notice>{isImpersonating && <ImpersonationBanner />}</AppLayout.Notice>
	 *     <AppLayout.Body>
	 *       <Sidebar.Nav aria-label="Main">…</Sidebar.Nav>
	 *       <AppLayout.Inset>
	 *         <AppLayout.Content asChild>
	 *           <Main>
	 *             <AppLayout.Header>
	 *               <Sidebar.Trigger />
	 *               <Breadcrumbs />
	 *             </AppLayout.Header>
	 *             <Outlet />
	 *           </Main>
	 *         </AppLayout.Content>
	 *       </AppLayout.Inset>
	 *     </AppLayout.Body>
	 *   </AppLayout.Root>
	 * </Sidebar.Root>
	 * ```
	 */
	Content,
} as const;

export {
	//,
	AppLayout,
};
