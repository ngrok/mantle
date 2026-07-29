/**
 * The cookie name {@link extractSidebarStateCookie} reads and
 * {@link serializeSidebarStateCookie} writes.
 *
 * Exported so an app can clear the cookie on sign-out, or read it with its own
 * cookie library, without hard-coding the name.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#sidebar_state_cookie_name
 *
 * @example
 * ```ts
 * // clear the persisted rail state on sign-out
 * headers.append("Set-Cookie", `${SIDEBAR_STATE_COOKIE_NAME}=; Max-Age=0; Path=/`);
 * ```
 */
const SIDEBAR_STATE_COOKIE_NAME = "mantle-sidebar-state";

/**
 * The serialized values the cookie holds. Words rather than `"true"`/`"false"`
 * so the cookie is readable in devtools and reads the same as the sidebar's
 * `data-state` attribute.
 */
const SIDEBAR_STATE_COOKIE_VALUES = {
	collapsed: "collapsed",
	expanded: "expanded",
} as const;

/**
 * Parse the sidebar's expanded state out of a raw `Cookie` header.
 *
 * This is the server half of cookie-backed persistence: unlike storage-backed
 * persistence, a cookie is available *before* the server renders, so the
 * server-rendered HTML already carries the right `data-state` and there is no
 * first-frame correction to hide. Pass the result straight to `defaultOpen` —
 * controlled `open` is not required.
 *
 * Returns `undefined` — not `false` — when the cookie is absent or holds an
 * unrecognized value, so a first-time visitor is distinguishable from one who
 * deliberately collapsed the sidebar. Collapse the state into your own default
 * at the call site with `?? true`.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#persisting-the-collapsed-state
 *
 * @example
 * ```ts
 * // app/root.tsx loader
 * export const loader = ({ request }: Route.LoaderArgs) => ({
 *   sidebarOpen: extractSidebarStateCookie(request.headers.get("Cookie")) ?? true,
 * });
 * ```
 *
 * @param cookieHeader - The raw `Cookie` header string from the request, or null/undefined.
 * @returns `true` when expanded, `false` when collapsed, `undefined` when unset or unparseable.
 */
function extractSidebarStateCookie(cookieHeader: string | null | undefined): boolean | undefined {
	if (!cookieHeader) {
		return undefined;
	}

	const entry = cookieHeader
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${SIDEBAR_STATE_COOKIE_NAME}=`));

	if (entry == null) {
		return undefined;
	}

	const value = decodeURIComponent(entry.slice(`${SIDEBAR_STATE_COOKIE_NAME}=`.length));

	if (value === SIDEBAR_STATE_COOKIE_VALUES.expanded) {
		return true;
	}
	if (value === SIDEBAR_STATE_COOKIE_VALUES.collapsed) {
		return false;
	}
	return undefined;
}

/**
 * Attributes for {@link serializeSidebarStateCookie}. Deliberately omits
 * `HttpOnly`: the browser writes this cookie from `onOpenChange`, so a
 * server-only cookie could never be updated when the user toggles the rail.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#serializesidebarstatecookie
 *
 * @example
 * ```ts
 * serializeSidebarStateCookie(open, { maxAge: 60 * 60 * 24 * 365, sameSite: "Lax" });
 * ```
 */
type SerializeSidebarStateCookieOptions = {
	/**
	 * How long the preference survives, in seconds.
	 *
	 * @default 31_536_000 // one year
	 */
	maxAge?: number;
	/**
	 * The path the cookie applies to. Keep the default unless the sidebar only
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
	 * `SameSite` policy. `"Lax"` is right for a UI preference — it survives
	 * top-level navigations back to your app without riding along on
	 * cross-site subrequests.
	 *
	 * @default "Lax"
	 */
	sameSite?: "Lax" | "Strict" | "None";
	/**
	 * Whether to add the `Secure` attribute. Omitted by default so the same call
	 * works on `http://localhost` — a `Secure` cookie is silently rejected over
	 * http, which would make the preference appear not to persist in local
	 * development. Set it to `true` in production if your CSP or policy requires
	 * it; this cookie holds no secret, only whether a rail is open.
	 *
	 * @default false
	 */
	secure?: boolean;
};

/**
 * Serialize the sidebar's expanded state as a cookie string.
 *
 * Framework-agnostic by design: the returned string is valid for both
 * `document.cookie` on the client and a `Set-Cookie` response header on the
 * server, so the same helper covers whichever side of your app owns the write.
 *
 * @see https://mantle.ngrok.com/components/navigation/sidebar#persisting-the-collapsed-state
 *
 * @example
 * ```tsx
 * // client: persist as the user toggles, and render from the loader value
 * const { sidebarOpen } = useLoaderData<typeof loader>();
 * <Sidebar.Root
 *   defaultOpen={sidebarOpen}
 *   onOpenChange={(open) => {
 *     document.cookie = serializeSidebarStateCookie(open);
 *   }}
 * >
 * ```
 *
 * @example
 * ```ts
 * // server: set it from an action instead
 * return new Response(null, {
 *   headers: { "Set-Cookie": serializeSidebarStateCookie(false, { secure: true }) },
 * });
 * ```
 *
 * @param open - Whether the sidebar is expanded.
 * @param options - Cookie attributes; see {@link SerializeSidebarStateCookieOptions}.
 * @returns A cookie string such as `mantle-sidebar-state=collapsed; Max-Age=31536000; Path=/; SameSite=Lax`.
 */
function serializeSidebarStateCookie(
	open: boolean,
	options: SerializeSidebarStateCookieOptions = {},
): string {
	const { domain, maxAge = 31_536_000, path = "/", sameSite = "Lax", secure = false } = options;

	const value = open ? SIDEBAR_STATE_COOKIE_VALUES.expanded : SIDEBAR_STATE_COOKIE_VALUES.collapsed;

	const attributes = [`${SIDEBAR_STATE_COOKIE_NAME}=${value}`, `Max-Age=${maxAge}`, `Path=${path}`];

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
	extractSidebarStateCookie,
	serializeSidebarStateCookie,
	SIDEBAR_STATE_COOKIE_NAME,
};

export type {
	//,
	SerializeSidebarStateCookieOptions,
};
