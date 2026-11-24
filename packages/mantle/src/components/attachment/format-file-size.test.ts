import { describe, expect, test } from "vitest";
import { formatFileSize } from "./format-file-size.js";

describe("formatFileSize", () => {
	test.each([
		{ bytes: 0, expected: "0 B" },
		{ bytes: 1023, expected: "1023 B" },
		{ bytes: 1024, expected: "1 KB" },
		{ bytes: 1536, expected: "1.5 KB" },
		{ bytes: 1024 * 1024 - 1, expected: "1 MB" },
		{ bytes: 5.25 * 1024 * 1024, expected: "5.3 MB" },
		{ bytes: 3 * 1024 ** 5, expected: "3072 TB" },
	])("formats $bytes bytes as $expected", ({ bytes, expected }) => {
		expect(formatFileSize(bytes)).toBe(expected);
	});
});
