import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mantleVersionSchema, parseMantleVersion } from "./mantle-version.server";

describe("mantleVersionSchema", () => {
	describe("valid inputs", () => {
		it.each([["0.0.0"], ["12.34.567"]])("accepts %s", (version) => {
			expect(mantleVersionSchema.parse(version)).toBe(version);
		});
	});

	describe("invalid inputs", () => {
		it.each([
			["empty string", ""],
			["partial: major.minor", "1.2"],
			["extra segment", "1.2.3.4"],
			["leading v", "v1.2.3"],
			["prerelease suffix", "1.2.3-beta.1"],
			["build metadata suffix", "1.2.3+sha.abc"],
			["leading whitespace", " 1.2.3"],
			["trailing whitespace", "1.2.3 "],
			["non-numeric segment", "1.2.x"],
		])("rejects %s (%s)", (_label, version) => {
			expect(() => mantleVersionSchema.parse(version)).toThrow(z.ZodError);
		});

		it("rejects a non-string whose string form matches the pattern", () => {
			// Why an array: `String(["1.2.3"])` matches the regex, so only the `typeof` guard rejects it.
			expect(() => mantleVersionSchema.parse(["1.2.3"])).toThrow(z.ZodError);
		});
	});

	it("uses a helpful error message for invalid versions", () => {
		const result = mantleVersionSchema.safeParse("nope");
		if (result.success) {
			throw new Error("expected safeParse to fail for invalid input");
		}
		expect(result.error.issues[0]?.message).toBe("expected a `major.minor.patch` version string");
	});
});

describe("parseMantleVersion", () => {
	it("returns the parsed version for a valid input", () => {
		expect(parseMantleVersion("4.2.0")).toBe("4.2.0");
	});

	it("throws a ZodError for invalid input", () => {
		expect(() => parseMantleVersion("1.2.3-beta.1")).toThrow(z.ZodError);
	});
});
