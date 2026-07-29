import { describe, expect, test } from "vitest";
import {
	extractSidebarStateCookie,
	serializeSidebarStateCookie,
	SIDEBAR_STATE_COOKIE_NAME,
} from "./sidebar-state-cookie.js";

describe("extractSidebarStateCookie", () => {
	test.for([
		["mantle-sidebar-state=expanded", true],
		["mantle-sidebar-state=collapsed", false],
	] as const)("reads %s as %s", ([header, expected]) => {
		expect(extractSidebarStateCookie(header)).toBe(expected);
	});

	test.for([
		["a null header", null],
		["an undefined header", undefined],
		["an empty header", ""],
	] as const)("returns undefined for %s", ([, header]) => {
		expect(extractSidebarStateCookie(header)).toBeUndefined();
	});

	test("returns undefined when the cookie is absent from a populated header", () => {
		expect(extractSidebarStateCookie("theme=dark; session=abc123")).toBeUndefined();
	});

	test("distinguishes a first-time visitor from a deliberate collapse", () => {
		// The whole reason the return type is `boolean | undefined`: folding "unset"
		// into `false` would collapse every first-time visitor's sidebar.
		expect(extractSidebarStateCookie("theme=dark")).toBeUndefined();
		expect(extractSidebarStateCookie("mantle-sidebar-state=collapsed")).toBe(false);
	});

	test("finds the cookie among others, whatever the position or spacing", () => {
		expect(extractSidebarStateCookie("theme=dark;mantle-sidebar-state=collapsed;x=1")).toBe(false);
		expect(extractSidebarStateCookie("  theme=dark ;  mantle-sidebar-state=expanded  ")).toBe(true);
	});

	test("returns undefined for an unrecognized value rather than guessing", () => {
		expect(extractSidebarStateCookie("mantle-sidebar-state=")).toBeUndefined();
		expect(extractSidebarStateCookie("mantle-sidebar-state=true")).toBeUndefined();
		expect(extractSidebarStateCookie("mantle-sidebar-state=EXPANDED")).toBeUndefined();
	});

	test("does not match a cookie whose name merely ends with ours", () => {
		// `String.startsWith` on the trimmed segment is what prevents
		// `x-mantle-sidebar-state` from being read as the real cookie.
		expect(extractSidebarStateCookie("x-mantle-sidebar-state=collapsed")).toBeUndefined();
	});

	test("round-trips whatever serializeSidebarStateCookie produced", () => {
		for (const open of [true, false]) {
			const [pair] = serializeSidebarStateCookie(open).split(";");
			expect(extractSidebarStateCookie(pair)).toBe(open);
		}
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

	test("omits Secure by default so it is not rejected over http://localhost", () => {
		expect(serializeSidebarStateCookie(true)).not.toContain("Secure");
	});

	test("adds Secure when asked", () => {
		expect(serializeSidebarStateCookie(true, { secure: true })).toContain("; Secure");
	});

	test("omits Domain by default and includes it when given", () => {
		expect(serializeSidebarStateCookie(true)).not.toContain("Domain");
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

	test("names the cookie with the exported constant", () => {
		expect(serializeSidebarStateCookie(true).startsWith(`${SIDEBAR_STATE_COOKIE_NAME}=`)).toBe(
			true,
		);
	});
});
