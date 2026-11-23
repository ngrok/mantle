---
"@ngrok/mantle": patch
---

Add `@ngrok/mantle/time-zone` (preview). It renders dates in the visitor's time zone on the server, with no hydration mismatch.

- `TimeZoneScript` stores the browser's time zone in the `mantle-tz` cookie before hydration. On an `ngrok.com` or `ngrok.ai` host, the cookie covers every subdomain of that site.
- `readTimeZoneCookie` reads the zone from a `Cookie` header in a loader. It returns only a valid zone name.
- `TimeZoneProvider` gives the zone to `LocalTime` and `useTimeZone`. The server and the hydration render use the cookie's zone, then the browser's zone. A request with no cookie renders UTC first.
- `LocalTime` renders a `<time>` element with the instant in `datetime` and the text in the visitor's zone. It stamps `data-slot="local-time"`.
- `formatDateTime` formats a date in a required time zone. It is safe to call on the server.

See https://mantle.ngrok.com/components/preview/time-zone.
