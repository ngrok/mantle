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
 * `id` and `tabIndex` are not props: the skip link's default target is
 * `#main`, and a focusable landmark needs `tabIndex={-1}`, so `Main` stamps
 * both. `ref` lands on the rendered `<main>`, so it also composes as an `asChild`
 * child of a layout part. In an app shell, `AppLayout.Body` renders it by
 * default: the landmark **is** the shell's only scroll container, so arrows,
 * `Space`, and `PageDown` scroll the page as soon as the skip lands. Never put
 * it on the `AppLayout.Content` card around the body. Focus then lands on an
 * element that cannot scroll, and the keyboard user is stranded.
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
 * In an app shell, `AppLayout.Body` renders it:
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
 *         <AppLayout.Body>
 *           <Outlet />
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
}: Omit<ComponentProps<"main">, "id" | "tabIndex"> & WithDataSlot) => {
	return (
		<main
			{...props}
			data-slot={joinDataSlot(dataSlot, "main")}
			// Why after the spread: `SkipToMainLink` targets `#main` and focuses it,
			// so a wider props object must not carry `id` or `tabIndex` past the type.
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
