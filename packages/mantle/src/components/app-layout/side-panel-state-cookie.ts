import { readCookie } from "../../utils/cookie.js";

/**
 * The cookie name {@link extractSidePanelStateCookie} reads and
 * {@link serializeSidePanelStateCookie} writes.
 *
 * Exported so an app can clear the cookie on sign-out, or read it with its own
 * cookie library, without hard-coding the name.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#side_panel_state_cookie_name
 *
 * @example
 * ```ts
 * // clear the persisted panel state on sign-out
 * headers.append("Set-Cookie", `${SIDE_PANEL_STATE_COOKIE_NAME}=; Max-Age=0; Path=/`);
 * ```
 */
const SIDE_PANEL_STATE_COOKIE_NAME = "mantle-side-panel-state";

/**
 * The serialized values the cookie holds. Words rather than `"true"`/`"false"`
 * so the cookie is readable in devtools and reads the same as the panel's
 * `data-state` attribute.
 */
const SIDE_PANEL_STATE_COOKIE_VALUES = {
	closed: "closed",
	open: "open",
} as const;

/**
 * Parse the side panel's open state out of a raw `Cookie` header.
 *
 * This is the server half of cookie-backed persistence: a cookie is available
 * before the server renders, so the server HTML already carries the right
 * `data-state` and there is no first-frame correction to hide. Pass the result
 * straight to `AppLayout.SidePanelRoot`'s `defaultOpen`.
 *
 * Returns `undefined`, not `false`, when the cookie is absent or holds a value
 * this helper does not recognize, so a first-time visitor stays distinct from
 * one who closed the panel. Pick the default at the call site with `?? false`.
 *
 * Never throws: a header is client-controlled, and a value with a malformed
 * percent-escape is unparseable rather than fatal, so one corrupt cookie cannot
 * fail the server render on every page load.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#persisting-the-side-panel-to-a-cookie-ssr
 *
 * @example
 * ```ts
 * // app/root.tsx loader
 * export const loader = ({ request }: Route.LoaderArgs) => ({
 *   sidePanelOpen: extractSidePanelStateCookie(request.headers.get("Cookie")) ?? false,
 * });
 * ```
 *
 * @param cookieHeader - The raw `Cookie` header string from the request, or null/undefined.
 * @returns `true` when open, `false` when closed, `undefined` when unset, undecodable, or unparseable.
 */
function extractSidePanelStateCookie(cookieHeader: string | null | undefined): boolean | undefined {
	const value = readCookie(cookieHeader, SIDE_PANEL_STATE_COOKIE_NAME);

	if (value === SIDE_PANEL_STATE_COOKIE_VALUES.open) {
		return true;
	}
	if (value === SIDE_PANEL_STATE_COOKIE_VALUES.closed) {
		return false;
	}
	return undefined;
}

/**
 * Attributes for {@link serializeSidePanelStateCookie}. Omits `HttpOnly` on
 * purpose: the browser writes this cookie from `onOpenChange`, so a
 * server-only cookie could never follow a toggle.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#serializesidepanelstatecookie
 *
 * @example
 * ```ts
 * serializeSidePanelStateCookie(open, { maxAge: 60 * 60 * 24 * 365, sameSite: "Lax" });
 * ```
 */
type SerializeSidePanelStateCookieOptions = {
	/**
	 * How long the preference survives, in seconds.
	 *
	 * @default 31_536_000 // one year
	 */
	maxAge?: number;
	/**
	 * The path the cookie applies to. Keep the default unless the panel only
	 * exists under one route subtree.
	 *
	 * @default "/"
	 */
	path?: string;
	/**
	 * The domain the cookie applies to. Omitted by default, which scopes it to
	 * the exact current host. Set it (e.g. `".example.com"`) to share the
	 * preference across subdomains.
	 */
	domain?: string;
	/**
	 * `SameSite` policy. `"Lax"` is right for a UI preference: it survives
	 * top-level navigations back to your app without riding along on
	 * cross-site subrequests.
	 *
	 * @default "Lax"
	 */
	sameSite?: "Lax" | "Strict" | "None";
	/**
	 * Whether to add the `Secure` attribute. Omitted by default so the same call
	 * works on `http://localhost`, where a `Secure` cookie is silently rejected.
	 * Set it to `true` in production if your policy requires it; this cookie
	 * holds no secret, only whether a panel is open.
	 *
	 * @default false
	 */
	secure?: boolean;
};

/**
 * Serialize the side panel's open state as a cookie string.
 *
 * Framework-agnostic by design: the returned string is valid for both
 * `document.cookie` on the client and a `Set-Cookie` response header on the
 * server, so the same helper covers whichever side of your app owns the write.
 *
 * @see https://mantle.ngrok.com/layouts/app-layout#persisting-the-side-panel-to-a-cookie-ssr
 *
 * @example
 * ```tsx
 * // client: persist as the user toggles, and render from the loader value
 * const { sidePanelOpen } = useLoaderData<typeof loader>();
 * <AppLayout.SidePanelRoot
 *   defaultOpen={sidePanelOpen}
 *   onOpenChange={(open) => {
 *     document.cookie = serializeSidePanelStateCookie(open);
 *   }}
 * >
 * ```
 *
 * @param open - Whether the panel is open.
 * @param options - Cookie attributes; see {@link SerializeSidePanelStateCookieOptions}.
 * @returns A cookie string such as `mantle-side-panel-state=closed; Max-Age=31536000; Path=/; SameSite=Lax`.
 */
function serializeSidePanelStateCookie(
	open: boolean,
	options: SerializeSidePanelStateCookieOptions = {},
): string {
	const { domain, maxAge = 31_536_000, path = "/", sameSite = "Lax", secure = false } = options;

	const value = open ? SIDE_PANEL_STATE_COOKIE_VALUES.open : SIDE_PANEL_STATE_COOKIE_VALUES.closed;

	const attributes = [
		`${SIDE_PANEL_STATE_COOKIE_NAME}=${value}`,
		`Max-Age=${maxAge}`,
		`Path=${path}`,
	];

	if (domain != null) {
		attributes.push(`Domain=${domain}`);
	}

	attributes.push(`SameSite=${sameSite}`);

	if (secure) {
		attributes.push("Secure");
	}

	return attributes.join("; ");
}

export {
	//,
	extractSidePanelStateCookie,
	serializeSidePanelStateCookie,
	SIDE_PANEL_STATE_COOKIE_NAME,
};

export type {
	//,
	SerializeSidePanelStateCookieOptions,
};
