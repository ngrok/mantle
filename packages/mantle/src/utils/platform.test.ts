import { afterEach, describe, expect, test, vi } from "vitest";
import { isApplePlatform } from "./platform.js";

/**
 * happy-dom reports `navigator.platform === "X11; Darwin arm64"`, which is
 * deliberately NOT matched by the Apple regex — so the default test platform is
 * non-Apple regardless of the machine running the suite. Each case stubs the
 * property it exercises so the assertions never depend on the host.
 */
function stubPlatform(platform: string) {
	vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
}

function stubUserAgent(userAgent: string) {
	vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
}

describe("isApplePlatform", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test("is false under happy-dom, whatever the host machine is", () => {
		// Guards the premise every other suite relies on: happy-dom reports
		// `navigator.platform === "X11; Darwin arm64"`, so a keyboard-shortcut
		// test that does not stub the platform is exercising the Ctrl branch —
		// even when the suite runs on a Mac. (Node's own `navigator.platform` is
		// "MacIntel", so this would invert if the file ever ran in a node env.)
		expect(isApplePlatform()).toBe(false);
	});

	test.for([
		["MacIntel", true],
		["MacPPC", true],
		["iPhone", true],
		["iPad", true],
		["iPod touch", true],
		["macOS", true],
		["Win32", false],
		["Windows", false],
		["Linux x86_64", false],
		["X11; Darwin arm64", false],
		["", false],
	] as const)("navigator.platform %s -> %s", ([platform, expected]) => {
		stubPlatform(platform);
		stubUserAgent("");
		expect(isApplePlatform()).toBe(expected);
	});

	test("prefers userAgentData.platform over the deprecated navigator.platform", () => {
		stubPlatform("Win32");
		vi.stubGlobal("navigator", {
			platform: "Win32",
			userAgent: "",
			userAgentData: { platform: "macOS" },
		});
		expect(isApplePlatform()).toBe(true);
	});

	test("falls through to navigator.platform when userAgentData.platform is empty", () => {
		vi.stubGlobal("navigator", {
			platform: "MacIntel",
			userAgent: "",
			userAgentData: { platform: "" },
		});
		expect(isApplePlatform()).toBe(true);
	});

	test("falls through to userAgent when platform is empty", () => {
		vi.stubGlobal("navigator", {
			platform: "",
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
		});
		expect(isApplePlatform()).toBe(true);
	});

	test("is false when navigator is unavailable (SSR)", () => {
		vi.stubGlobal("navigator", undefined);
		expect(isApplePlatform()).toBe(false);
	});
});
