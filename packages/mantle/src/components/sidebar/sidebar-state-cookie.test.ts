import { describe, expect, test } from "vitest";
import { extractSidebarStateCookie, serializeSidebarStateCookie } from "./sidebar-state-cookie.js";

describe("extractSidebarStateCookie", () => {
	test.for([
		["mantle-sidebar-state=expanded", true],
		["mantle-sidebar-state=collapsed", false],
	] as const)("reads %s as %s", ([header, expected]) => {
		expect(extractSidebarStateCookie(header)).toBe(expected);
	});

	test("returns undefined for a null header", () => {
		expect(extractSidebarStateCookie(null)).toBeUndefined();
	});

	test("returns undefined when the cookie is absent from a populated header", () => {
		// Why undefined and not false: a first-time visitor must stay distinct from a
		// deliberate collapse, or every first visit lands on a collapsed sidebar.
		expect(extractSidebarStateCookie("theme=dark; session=abc123")).toBeUndefined();
	});

	test("returns undefined for an unrecognized value rather than guessing", () => {
		expect(extractSidebarStateCookie("mantle-sidebar-state=")).toBeUndefined();
		expect(extractSidebarStateCookie("mantle-sidebar-state=true")).toBeUndefined();
		expect(extractSidebarStateCookie("mantle-sidebar-state=EXPANDED")).toBeUndefined();
	});

	test("returns undefined rather than throwing for a malformed percent-escape", () => {
		// Why: `decodeURIComponent` throws `URIError` on a bad percent-escape. A loader
		// calls this on every page load, so one corrupt cookie must not fail the render.
		expect(extractSidebarStateCookie("mantle-sidebar-state=%E0%A4%A")).toBeUndefined();
	});

	test("reads a percent-encoded value that decodes to a known state", () => {
		// Some cookie libraries encode on write, so the read has to decode. `%63` is
		// "c", which is what makes this "collapsed".
		expect(extractSidebarStateCookie("mantle-sidebar-state=%63ollapsed")).toBe(false);
	});
});

describe("serializeSidebarStateCookie", () => {
	test("serializes the expanded state with the documented defaults", () => {
		expect(serializeSidebarStateCookie(true)).toBe(
			"mantle-sidebar-state=expanded; Max-Age=31536000; Path=/; SameSite=Lax",
		);
	});

	test("serializes the collapsed state", () => {
		expect(serializeSidebarStateCookie(false)).toBe(
			"mantle-sidebar-state=collapsed; Max-Age=31536000; Path=/; SameSite=Lax",
		);
	});

	test("adds Secure when asked", () => {
		expect(serializeSidebarStateCookie(true, { secure: true })).toContain("; Secure");
	});

	test("adds Domain when given", () => {
		expect(serializeSidebarStateCookie(true, { domain: ".example.com" })).toContain(
			"; Domain=.example.com",
		);
	});

	test("honors maxAge, path, and sameSite overrides", () => {
		expect(
			serializeSidebarStateCookie(false, { maxAge: 60, path: "/app", sameSite: "Strict" }),
		).toBe("mantle-sidebar-state=collapsed; Max-Age=60; Path=/app; SameSite=Strict");
	});

	test("supports maxAge 0 to expire the cookie immediately", () => {
		// Regression guard on the default: `maxAge = 31_536_000` must be a default
		// parameter, not a `||` fallback, or 0 would silently become a year.
		expect(serializeSidebarStateCookie(true, { maxAge: 0 })).toContain("Max-Age=0");
	});
});
