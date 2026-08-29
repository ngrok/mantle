import { LiveRegion } from "@ngrok/mantle/live-region";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * Announces completed client-side navigations to assistive technology.
 *
 * React Router swaps the route without a document load, so screen readers
 * hear nothing. This component publishes "Navigated to {page}" to a
 * persistent polite `LiveRegion` after each pathname change. The prefix marks
 * the message as a navigation, so it does not read as unrelated status text.
 *
 * The announcement prefers the page `<h1>` over `document.title` because
 * routes without a `meta` export keep the previous document title. The
 * pathname is the last resort.
 *
 * Deliberate non-behaviors:
 * - The initial document load stays silent; assistive technology reads the
 *   document title itself.
 * - Search-param and hash changes stay silent; they are in-page state.
 * - Focus never moves; a focus move announces on its own, and the two
 *   announcements would race.
 *
 * Render it once, inside the router context in the root layout.
 *
 * @example
 * ```tsx
 * <RouteAnnouncer />
 * <ScrollRestoration />
 * <Scripts />
 * ```
 */
function RouteAnnouncer() {
	const { pathname } = useLocation();
	const [announcement, setAnnouncement] = useState("");
	const previousPathname = useRef(pathname);

	useEffect(() => {
		if (previousPathname.current === pathname) {
			return;
		}
		previousPathname.current = pathname;

		const pageHeading = document.querySelector("h1")?.textContent?.trim();
		const pageName = pageHeading || document.title || pathname;
		const message = `Navigated to ${pageName}`;

		// Clear first, then publish on the next frame. Consecutive pages can
		// resolve to the same text, and a live region only announces a DOM change.
		setAnnouncement("");
		const frame = requestAnimationFrame(() => {
			setAnnouncement(message);
		});
		return () => {
			cancelAnimationFrame(frame);
		};
	}, [pathname]);

	return <LiveRegion>{announcement}</LiveRegion>;
}

export {
	//,
	RouteAnnouncer,
};
