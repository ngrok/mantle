import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

/**
 * A focusable `<main>` landmark for the page's primary content. Renders with
 * `id="main"` and `tabIndex={-1}` so a skip link (or any programmatic focus
 * call) can send keyboard users directly to the main content without exposing
 * a visible focus ring on the region itself (`focus:outline-hidden`).
 *
 * Pair with the `<SkipToMainLink>` component at the top of the document.
 * `ref` lands on the rendered `<main>`, so it also composes as an `asChild`
 * child of layout parts — in an app shell, compose it onto `AppLayout.Body`
 * (`<AppLayout.Body asChild>`), never onto the `AppLayout.Content` card around
 * it. `AppLayout.Body` is the shell's only scroll container, and the skip link
 * focuses *this* element: when the landmark **is** the scrollport, arrows,
 * `Space`, and `PageDown` scroll the page immediately after the jump. Composed
 * onto the card instead, focus lands on an element that cannot scroll and the
 * keyboard user is stranded.
 *
 * @see https://mantle.ngrok.com/components/primitives/main
 *
 * @example
 * ```tsx
 * <SkipToMainLink />
 * <Header />
 * <Main>
 *   <h1>Page title</h1>
 * </Main>
 * ```
 *
 * @example
 * Composed onto the scrolling page region of an app shell:
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
const Main = ({
	className,
	"data-slot": dataSlot,
	...props
}: ComponentProps<"main"> & WithDataSlot) => {
	return (
		<main
			{...props}
			data-slot={joinDataSlot(dataSlot, "main")}
			id="main"
			tabIndex={-1}
			className={cx("focus:outline-hidden", className)}
		/>
	);
};
export {
	//,
	Main,
};
