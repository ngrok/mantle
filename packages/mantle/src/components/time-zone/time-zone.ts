import { readCookie } from "../../utils/cookie.js";

/**
 * The cookie that carries the visitor's IANA time zone, such as
 * `America/Chicago`. `TimeZoneScript` writes it in the browser, and the server
 * reads it with {@link readTimeZoneCookie}.
 */
const timeZoneCookieName = "mantle-tz";

/**
 * The zone a server renders in when the request has no valid time zone cookie.
 */
const fallbackTimeZone = "UTC";

/**
 * Returns the canonical spelling of a time zone that `Intl` accepts, such as
 * `America/Chicago` for `america/chicago`, or `undefined` for any other value.
 */
function canonicalTimeZone(value: string): string | undefined {
	// Why the length cap: a cookie is client input, and no IANA name is this long.
	if (value.length === 0 || value.length > 64) {
		return undefined;
	}
	// Why not `Intl.supportedValuesOf`: it omits aliases, such as `Asia/Calcutta`,
	// that a browser can still report as its own zone.
	try {
		return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
	} catch {
		return undefined;
	}
}

/**
 * Reads the visitor's time zone from a raw `Cookie` header, in its canonical
 * spelling. Returns `undefined` when the cookie is absent or does not name a
 * time zone that `Intl` accepts. Safe to call on the server.
 *
 * Call it once where the request enters, such as a root loader, and pass the
 * result to `TimeZoneProvider`. It returns only the zone name, so loader data
 * never carries the rest of the `Cookie` header.
 *
 * @see https://mantle.ngrok.com/components/preview/time-zone#readtimezonecookie
 *
 * @example
 * ```ts
 * import { readTimeZoneCookie } from "@ngrok/mantle/time-zone";
 *
 * // root.tsx
 * export function loader({ request }: Route.LoaderArgs) {
 * 	return { timeZone: readTimeZoneCookie(request.headers.get("Cookie")) };
 * }
 * ```
 */
function readTimeZoneCookie(cookieHeader: string | null | undefined): string | undefined {
	const value = readCookie(cookieHeader, timeZoneCookieName);
	// Why canonical: the formatter cache keys on the zone, so each spelling of
	// one zone would add a cache entry.
	return value == null ? undefined : canonicalTimeZone(value);
}

/**
 * Options for {@link formatDateTime}: `Intl.DateTimeFormat` options with a
 * required `timeZone` and an optional `locale`.
 */
type FormatDateTimeOptions = Intl.DateTimeFormatOptions & {
	/**
	 * The zone to render in. Required on purpose: a format with no zone uses the
	 * process zone, and the server and the browser are in different zones.
	 */
	timeZone: string;
	/**
	 * The locale. A fixed locale makes the server and the browser render the
	 * same text. Pass the locale from `Accept-Language` only when the browser
	 * renders with the same locale.
	 *
	 * @default "en-US"
	 */
	locale?: string;
};

// Why a cache: an `Intl.DateTimeFormat` costs about a millisecond to build, and
// a table formats one timestamp for each row with the same options.
const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Formats a date in an explicit time zone. A pure function, safe to call on
 * the server: a loader, a server render, and the browser produce the same text
 * for the same zone and locale.
 *
 * @see https://mantle.ngrok.com/components/preview/time-zone#formatdatetime
 *
 * @example
 * ```ts
 * import { formatDateTime } from "@ngrok/mantle/time-zone";
 *
 * formatDateTime(new Date("2026-11-23T16:04:00Z"), {
 * 	timeZone: "America/Chicago",
 * 	dateStyle: "medium",
 * 	timeStyle: "short",
 * }); // "Nov 23, 2026, 10:04 AM"
 * ```
 */
function formatDateTime(date: Date, { locale = "en-US", ...options }: FormatDateTimeOptions) {
	const key = `${locale}|${JSON.stringify(options)}`;
	let formatter = formatters.get(key);
	if (formatter == null) {
		formatter = new Intl.DateTimeFormat(locale, options);
		formatters.set(key, formatter);
	}
	return formatter.format(date);
}

/**
 * The body of the inline script that writes the time zone cookie. It runs
 * before hydration, so the next document request carries the zone. On an
 * ngrok site (the same sites as the theme cookie) the cookie covers every
 * subdomain, so a visit to one of them, such as the login page, sets it for
 * the others.
 *
 * Why a string and not a function: the script runs before any bundle loads,
 * so it cannot import anything.
 */
const timeZoneScript = `try{var m=/(?:^|\\.)(ngrok\\.(?:com|ai))$/.exec(location.hostname);document.cookie="${timeZoneCookieName}="+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+";path=/;max-age=31536000;samesite=lax"+(m?";domain=."+m[1]:"")+(location.protocol==="https:"?";secure":"")}catch(e){}`;

export {
	//,
	fallbackTimeZone,
	formatDateTime,
	readTimeZoneCookie,
	timeZoneCookieName,
	timeZoneScript,
};

export type {
	//,
	FormatDateTimeOptions,
};
