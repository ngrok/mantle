"use client";

import type { ComponentProps, PropsWithChildren } from "react";
import { createContext, use, useSyncExternalStore } from "react";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import {
	type FormatDateTimeOptions,
	fallbackTimeZone,
	formatDateTime,
	timeZoneScript,
} from "./time-zone.js";

const TimeZoneContext = createContext<string>(fallbackTimeZone);

// Why a module cache: the provider reads the zone on each render, and an
// `Intl.DateTimeFormat` costs about a millisecond to build.
let browserTimeZone: string | undefined;
const getBrowserTimeZone = () =>
	(browserTimeZone ??= Intl.DateTimeFormat().resolvedOptions().timeZone);

// Why no subscription: a zone change in an open tab is rare, and the inline
// script writes the new zone on the next document load.
const subscribe = () => () => {};

type TimeZoneProviderProps = PropsWithChildren<{
	/**
	 * The zone from the request's time zone cookie, read with
	 * `readTimeZoneCookie`. The server and the hydration render use it.
	 * `undefined` when the request has no cookie, such as on a first visit:
	 * then they use UTC.
	 */
	timeZone: string | undefined;
}>;

/**
 * Provides the visitor's time zone to `useTimeZone` and `LocalTime`.
 *
 * The server renders in `timeZone`, and the hydration render uses the same
 * zone, so the text matches and React keeps the server HTML. Then the
 * browser's own zone replaces it. The two differ only when the request had no
 * cookie or a stale one, so the text changes once on that visit and never
 * causes a hydration mismatch.
 *
 * @see https://mantle.ngrok.com/components/preview/time-zone#timezoneprovider
 *
 * @example
 * ```tsx
 * import { TimeZoneProvider } from "@ngrok/mantle/time-zone";
 *
 * // root.tsx
 * <TimeZoneProvider timeZone={loaderData?.timeZone}>{children}</TimeZoneProvider>
 * ```
 */
function TimeZoneProvider({ timeZone, children }: TimeZoneProviderProps) {
	// Why the server zone, not the resolved zone: a subtree that hydrates later,
	// such as one behind `Suspense`, must render its hydration pass in the server
	// zone too. `useTimeZone` resolves the browser zone in each consumer.
	return <TimeZoneContext value={timeZone ?? fallbackTimeZone}>{children}</TimeZoneContext>;
}

/**
 * Returns the visitor's IANA time zone, such as `America/Chicago`: the
 * cookie's zone on the server and in the hydration render, then the browser's
 * zone. Outside a `TimeZoneProvider`, the server and the hydration render use
 * `"UTC"`.
 *
 * @see https://mantle.ngrok.com/components/preview/time-zone#usetimezone
 *
 * @example
 * ```tsx
 * import { formatDateTime, useTimeZone } from "@ngrok/mantle/time-zone";
 *
 * function RenewalDate({ date }: { date: Date }) {
 * 	const timeZone = useTimeZone();
 * 	return <p>Renews {formatDateTime(date, { timeZone, dateStyle: "long" })}</p>;
 * }
 * ```
 */
function useTimeZone(): string {
	const serverTimeZone = use(TimeZoneContext);
	return useSyncExternalStore(subscribe, getBrowserTimeZone, () => serverTimeZone);
}

const defaultFormat = { dateStyle: "medium", timeStyle: "short" } as const;

type LocalTimeProps = Omit<ComponentProps<"time">, "children" | "dateTime"> &
	WithDataSlot & {
		/**
		 * The instant to show. An invalid date throws, because a `<time>` with no
		 * valid `datetime` gives crawlers and assistive tech wrong data.
		 */
		date: Date;
		/**
		 * `Intl.DateTimeFormat` options and an optional locale. The zone comes
		 * from `TimeZoneProvider`.
		 *
		 * @default { dateStyle: "medium", timeStyle: "short" }
		 */
		format?: Omit<FormatDateTimeOptions, "timeZone">;
	};

/**
 * A `<time>` element that shows an instant in the visitor's time zone, with
 * the instant in ISO 8601 form in `datetime` for crawlers and assistive tech.
 * It renders on the server: the text is right in the first paint whenever the
 * request carried the time zone cookie.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"local-time"` | The `<time>` element. |
 *
 * @useWhen Show a timestamp, such as a creation time or a renewal date, in the visitor's time zone,
 * rendered on the server with no hydration mismatch.
 *
 * @siblings
 * - `BrowserOnly`: the text depends on other browser state, such as the clock for a "5m ago" label.
 *
 * @preview The API is not stable and may change. There may also be bugs.
 * Please file an issue at https://github.com/ngrok/mantle/issues if you find any.
 *
 * @see https://mantle.ngrok.com/components/preview/time-zone#localtime
 *
 * @example
 * ```tsx
 * import { LocalTime } from "@ngrok/mantle/time-zone";
 *
 * <LocalTime date={new Date("2026-11-23T16:04:00Z")} />
 * // In America/Chicago:
 * // <time datetime="2026-11-23T16:04:00.000Z">Nov 23, 2026, 10:04 AM</time>
 * ```
 */
function LocalTime({
	"data-slot": dataSlot,
	date,
	format = defaultFormat,
	...props
}: LocalTimeProps) {
	// Why no `asChild`: the formatted text and `datetime` are this part's whole
	// output, and only a `<time>` element gives `datetime` meaning.
	const timeZone = useTimeZone();
	return (
		<time data-slot={joinDataSlot(dataSlot, "local-time")} dateTime={date.toISOString()} {...props}>
			{formatDateTime(date, { ...format, timeZone })}
		</time>
	);
}

/**
 * The inline script that writes the time zone cookie before hydration. Place
 * it in `<head>`, next to `PreventWrongThemeFlashScript`. On an `ngrok.com` or
 * `ngrok.ai` host, the cookie covers every subdomain of that site.
 *
 * @see https://mantle.ngrok.com/components/preview/time-zone#timezonescript
 *
 * @example
 * ```tsx
 * import { TimeZoneScript } from "@ngrok/mantle/time-zone";
 *
 * <head>
 * 	<TimeZoneScript nonce={nonce} />
 * </head>
 * ```
 */
function TimeZoneScript({ nonce }: { nonce?: string }) {
	return (
		<script
			dangerouslySetInnerHTML={{ __html: timeZoneScript }}
			nonce={nonce}
			suppressHydrationWarning
		/>
	);
}

export {
	//,
	LocalTime,
	TimeZoneProvider,
	TimeZoneScript,
	useTimeZone,
};
