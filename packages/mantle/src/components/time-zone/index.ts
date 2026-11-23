/**
 * Re-exports for Time Zone: server-rendered dates in the visitor's time zone.
 * An inline script stores the zone in a cookie, a root loader reads it, and
 * `LocalTime` renders each instant in that zone on the server, so the text
 * hydrates without a mismatch.
 *
 * @useWhen Show a timestamp in the visitor's time zone on a server-rendered page, with no hydration
 * mismatch and no text that pops in after hydration.
 *
 * @siblings
 * - `BrowserOnly`: the text depends on other browser state, such as the clock for a "5m ago" label.
 * - `Calendar`: the user picks a date from a month grid.
 *
 * @see https://mantle.ngrok.com/components/preview/time-zone
 */

export {
	//,
	formatDateTime,
	readTimeZoneCookie,
} from "./time-zone.js";

export type {
	//,
	FormatDateTimeOptions,
} from "./time-zone.js";

export {
	//,
	LocalTime,
	TimeZoneProvider,
	TimeZoneScript,
	useTimeZone,
} from "./time-zone-provider.js";
