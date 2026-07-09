import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mantleVersionSchema, parseMantleVersion } from "./mantle-version.server";

describe("mantleVersionSchema", () => {
	describe("valid inputs", () => {
		it.each([["0.0.0"], ["1.2.3"], ["10.20.30"], ["12.34.567"], ["999.999.999"]])(
			"accepts %s",
			(version) => {
				expect(mantleVersionSchema.parse(version)).toBe(version);
			},
		);
	});

	describe("invalid inputs", () => {
		it.each([
			["empty string", ""],
			["partial: major only", "1"],
			["partial: major.minor", "1.2"],
			["extra segment", "1.2.3.4"],
			["leading v", "v1.2.3"],
			["prerelease suffix", "1.2.3-beta.1"],
			["build metadata suffix", "1.2.3+sha.abc"],
			["prerelease + build", "1.2.3-rc.1+sha.abc"],
			["leading whitespace", " 1.2.3"],
			["trailing whitespace", "1.2.3 "],
			["non-numeric segment", "1.2.x"],
			["negative segment", "1.2.-3"],
		])("rejects %s (%s)", (_label, version) => {
			expect(() => mantleVersionSchema.parse(version)).toThrow(z.ZodError);
		});

		it.each([
			["undefined", undefined],
			["null", null],
			["number", 123],
			["boolean", true],
			["object", { major: 1, minor: 2, patch: 3 }],
			["array", [1, 2, 3]],
		])("rejects non-string: %s", (_label, value) => {
			expect(() => mantleVersionSchema.parse(value)).toThrow(z.ZodError);
		});
	});

	it("uses a helpful error message for invalid versions", () => {
		const result = mantleVersionSchema.safeParse("nope");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("expected a `major.minor.patch` version string");
		}
	});
});

describe("parseMantleVersion", () => {
	it("returns the parsed version for a valid input", () => {
		expect(parseMantleVersion("4.2.0")).toBe("4.2.0");
	});

	it("throws a ZodError for invalid input", () => {
		expect(() => parseMantleVersion("1.2.3-beta.1")).toThrow(z.ZodError);
	});

	it("throws a ZodError for non-string input", () => {
		expect(() => parseMantleVersion(undefined)).toThrow(z.ZodError);
	});
});
