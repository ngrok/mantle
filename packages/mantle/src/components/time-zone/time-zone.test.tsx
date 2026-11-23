import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { formatDateTime, readTimeZoneCookie, timeZoneScript } from "./time-zone.js";
import { LocalTime, TimeZoneProvider, useTimeZone } from "./time-zone-provider.js";

// `vitest.config.ts` pins TZ=UTC, so the browser zone in these tests is UTC.
const createdAt = new Date("2026-11-23T16:04:00Z");

describe("readTimeZoneCookie", () => {
	test.each([
		["a=1; mantle-tz=America%2FChicago; b=2", "America/Chicago"],
		// One cache entry for each zone: every spelling reads as the canonical name.
		["mantle-tz=america%2Fchicago", "America/Chicago"],
		["mantle-tz=Mars%2FOlympus_Mons", undefined],
		["mantle-tz=%E0%A4%A", undefined],
		[`mantle-tz=${"A".repeat(65)}`, undefined],
		["other-tz=America%2FChicago", undefined],
		[null, undefined],
	])("reads %s as %s", (header, expected) => {
		expect(readTimeZoneCookie(header)).toBe(expected);
	});
});

describe("formatDateTime", () => {
	test("formats in the given zone, across a daylight saving change", () => {
		// 08:30 UTC is 03:30 CDT, one hour after US clocks move forward.
		const date = new Date("2026-03-08T08:30:00Z");
		expect(formatDateTime(date, { timeZone: "America/Chicago", timeStyle: "short" })).toBe(
			"3:30 AM",
		);
		expect(
			formatDateTime(date, { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }),
		).toBe("Mar 8, 2026, 2:00 PM");
	});

	test("takes a locale", () => {
		expect(
			formatDateTime(createdAt, { timeZone: "Europe/London", locale: "en-GB", dateStyle: "long" }),
		).toBe("23 November 2026");
	});
});

describe("timeZoneScript", () => {
	function runScript(hostname: string, protocol = "https:") {
		const document = { cookie: "" };
		// Why a Function: the script runs as an inline `<script>`, so the test runs
		// the same string against a fake `location` and `document`.
		new Function("location", "document", timeZoneScript)({ hostname, protocol }, document);
		return document.cookie;
	}

	test("writes the browser zone to the cookie", () => {
		expect(runScript("localhost", "http:")).toBe(
			"mantle-tz=UTC;path=/;max-age=31536000;samesite=lax",
		);
	});

	test.each([
		["dashboard.ngrok.com", ";domain=.ngrok.com;secure"],
		["ngrok.ai", ";domain=.ngrok.ai;secure"],
		["evilngrok.com", ";secure"],
		["ngrok.com.example.org", ";secure"],
	])("on %s, ends the cookie with %s", (hostname, suffix) => {
		expect(runScript(hostname)).toBe(`mantle-tz=UTC;path=/;max-age=31536000;samesite=lax${suffix}`);
	});
});

describe("LocalTime", () => {
	test("renders the instant in datetime and the text in the provider's zone on the server", () => {
		const html = renderToString(
			<TimeZoneProvider timeZone="America/Chicago">
				<LocalTime date={createdAt} />
			</TimeZoneProvider>,
		);
		// React writes the attribute as `dateTime`; HTML attribute names ignore case.
		expect(html).toMatch(/datetime="2026-11-23T16:04:00.000Z"/i);
		expect(html).toContain("Nov 23, 2026, 10:04 AM");
	});

	test("renders UTC on the server when the request has no cookie", () => {
		const html = renderToString(
			<TimeZoneProvider timeZone={undefined}>
				<LocalTime date={createdAt} format={{ timeStyle: "short" }} />
			</TimeZoneProvider>,
		);
		expect(html).toContain("4:04 PM");
	});

	test("hydrates the server zone without a mismatch, then shows the browser zone", async () => {
		const page = (
			<TimeZoneProvider timeZone="America/Chicago">
				<LocalTime date={createdAt} format={{ timeStyle: "short" }} />
			</TimeZoneProvider>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(page);
		document.body.append(container);
		const serverTime = container.querySelector("time");
		const errors: unknown[] = [];

		await act(async () => {
			hydrateRoot(container, page, { onRecoverableError: (error) => errors.push(error) });
		});

		expect(errors).toEqual([]);
		// React kept the server node and updated its text to the browser zone.
		expect(container.querySelector("time")).toBe(serverTime);
		expect(serverTime).toHaveTextContent("4:04 PM");
		container.remove();
	});

	test("a subtree that hydrates after the provider still hydrates in the server zone", async () => {
		let suspend = false;
		let resume = () => {};
		const resumed = new Promise<void>((done) => {
			resume = done;
		});
		// Suspends in the hydration render, so this subtree hydrates after the
		// provider has committed and switched to the browser zone.
		function Deferred() {
			if (suspend) {
				throw resumed;
			}
			return <LocalTime date={createdAt} format={{ timeStyle: "short" }} />;
		}
		const page = (
			<TimeZoneProvider timeZone="America/Chicago">
				<Suspense fallback={null}>
					<Deferred />
				</Suspense>
			</TimeZoneProvider>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(page);
		document.body.append(container);
		const serverTime = container.querySelector("time");
		expect(serverTime).toHaveTextContent("10:04 AM");
		const errors: unknown[] = [];

		suspend = true;
		await act(async () => {
			hydrateRoot(container, page, { onRecoverableError: (error) => errors.push(error) });
		});
		suspend = false;
		await act(async () => {
			resume();
			await resumed;
		});

		expect(errors).toEqual([]);
		expect(container.querySelector("time")).toBe(serverTime);
		expect(serverTime).toHaveTextContent("4:04 PM");
		container.remove();
	});

	test("className and data-* reach the <time>, and data-slot joins an incoming chain", () => {
		render(
			<LocalTime
				date={createdAt}
				className="text-muted"
				data-slot="row-created"
				data-testid="created"
			/>,
		);
		const time = screen.getByTestId("created");
		expect(time).toHaveClass("text-muted");
		expect(time).toHaveAttribute("data-slot", "row-created local-time");
	});
});

describe("useTimeZone", () => {
	test("returns the browser zone after mount, inside and outside a provider", () => {
		function Zone() {
			return <span>{useTimeZone()}</span>;
		}
		render(
			<>
				<TimeZoneProvider timeZone="America/Chicago">
					<Zone />
				</TimeZoneProvider>
				<Zone />
			</>,
		);
		expect(screen.getAllByText("UTC")).toHaveLength(2);
	});
});
