import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A focusable `<main>` landmark for the page's primary content. Renders with
 * `id="main"` and `tabIndex={-1}` so a skip link (or any programmatic focus
 * call) can send keyboard users directly to the main content without exposing
 * a visible focus ring on the region itself (`focus:outline-hidden`).
 *
 * Pair with the `<SkipToMainLink>` component at the top of the document.
 *
 * @see https://mantle.ngrok.com/components/main
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
const Main = ({ className, ...props }: ComponentProps<"main">) => {
	return (
		<main
			{...props}
			data-slot="main"
			id="main"
			tabIndex={-1}
			className={cx("focus:outline-hidden", className)}
		/>
	);
};
Main.displayName = "Main";

export {
	//,
	Main,
};
