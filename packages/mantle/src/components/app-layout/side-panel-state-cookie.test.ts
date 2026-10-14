import { describe, expect, test } from "vitest";
import {
	extractSidePanelStateCookie,
	serializeSidePanelStateCookie,
} from "./side-panel-state-cookie.js";

describe("extractSidePanelStateCookie", () => {
	test.for([
		["mantle-side-panel-state=open", true],
		["mantle-side-panel-state=closed", false],
	] as const)("reads %s as %s", ([header, expected]) => {
		expect(extractSidePanelStateCookie(header)).toBe(expected);
	});

	test("returns undefined for a null header", () => {
		expect(extractSidePanelStateCookie(null)).toBeUndefined();
	});

	test("returns undefined when the cookie is absent from a populated header", () => {
		// Why undefined and not false: a first-time visitor must stay distinct from a
		// deliberate close, so the call site picks the default.
		expect(extractSidePanelStateCookie("theme=dark; session=abc123")).toBeUndefined();
	});

	test("returns undefined for an unrecognized value rather than guessing", () => {
		expect(extractSidePanelStateCookie("mantle-side-panel-state=")).toBeUndefined();
		expect(extractSidePanelStateCookie("mantle-side-panel-state=true")).toBeUndefined();
		expect(extractSidePanelStateCookie("mantle-side-panel-state=OPEN")).toBeUndefined();
	});

	test("returns undefined rather than throwing for a malformed percent-escape", () => {
		// Why: `decodeURIComponent` throws `URIError` on a bad percent-escape. A loader
		// calls this on every page load, so one corrupt cookie must not fail the render.
		expect(extractSidePanelStateCookie("mantle-side-panel-state=%E0%A4%A")).toBeUndefined();
	});

	test("reads a percent-encoded value that decodes to a known state", () => {
		// Some cookie libraries encode on write, so the read has to decode. `%6F` is
		// "o", which is what makes this "open".
		expect(extractSidePanelStateCookie("mantle-side-panel-state=%6Fpen")).toBe(true);
	});
});

describe("serializeSidePanelStateCookie", () => {
	test("serializes the open state with the documented defaults", () => {
		expect(serializeSidePanelStateCookie(true)).toBe(
			"mantle-side-panel-state=open; Max-Age=31536000; Path=/; SameSite=Lax",
		);
	});

	test("serializes the closed state", () => {
		expect(serializeSidePanelStateCookie(false)).toBe(
			"mantle-side-panel-state=closed; Max-Age=31536000; Path=/; SameSite=Lax",
		);
	});

	test("adds Secure when asked", () => {
		expect(serializeSidePanelStateCookie(true, { secure: true })).toContain("; Secure");
	});

	test("adds Domain when given", () => {
		expect(serializeSidePanelStateCookie(true, { domain: ".example.com" })).toContain(
			"; Domain=.example.com",
		);
	});

	test("honors maxAge, path, and sameSite overrides", () => {
		expect(
			serializeSidePanelStateCookie(false, { maxAge: 60, path: "/app", sameSite: "Strict" }),
		).toBe("mantle-side-panel-state=closed; Max-Age=60; Path=/app; SameSite=Strict");
	});

	test("supports maxAge 0 to expire the cookie immediately", () => {
		// Regression guard on the default: `maxAge = 31_536_000` must be a default
		// parameter, not a `||` fallback, or 0 would silently become a year.
		expect(serializeSidePanelStateCookie(true, { maxAge: 0 })).toContain("Max-Age=0");
	});
});
