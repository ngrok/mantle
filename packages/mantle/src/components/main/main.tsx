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
 * child of layout parts (e.g. `AppLayout.Content asChild`).
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
