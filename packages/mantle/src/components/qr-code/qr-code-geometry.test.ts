import { describe, expect, test } from "vitest";
import { buildPath, encodeQrCode } from "./qr-code-geometry.js";

const defaults = { value: "https://ngrok.com", ecc: "L", quietZone: 4, pixelSize: 10 } as const;

describe("buildPath", () => {
	test("emits an SVG rect command per dark module, scaled by pixelSize", () => {
		// 2x2 grid: top-left and bottom-right modules are dark.
		const grid = [
			[true, false],
			[false, true],
		];
		expect(buildPath(grid, 10)).toBe("M0,0h10v10h-10zM10,10h10v10h-10z");
	});

	test("scales coordinates by pixelSize", () => {
		expect(buildPath([[false, true]], 4)).toBe("M4,0h4v4h-4z");
	});

	test("returns an empty string when no modules are dark", () => {
		expect(
			buildPath(
				[
					[false, false],
					[false, false],
				],
				10,
			),
		).toBe("");
	});
});

describe("encodeQrCode", () => {
	test("puts the first finder module inside the quiet zone and sizes the grid with it", () => {
		const { path, dimension } = encodeQrCode(defaults);
		// Why these numbers: "https://ngrok.com" at `"L"` is a 21-module version 1 code. A quiet
		// zone of 4 puts the top-left finder at module (4, 4), and 21 + 2 * 4 modules of 10 is 290.
		expect(path).toMatch(/^M40,40h10v10h-10z/);
		expect(dimension).toBe(290);
	});

	test("different values produce different paths", () => {
		expect(encodeQrCode(defaults).path).not.toBe(
			encodeQrCode({ ...defaults, value: "https://example.com" }).path,
		);
	});

	test("the error correction level changes the path", () => {
		// Higher error correction adds recovery data, so the same value encodes differently.
		expect(encodeQrCode(defaults).path).not.toBe(encodeQrCode({ ...defaults, ecc: "H" }).path);
	});

	test("a smaller quiet zone shrinks the grid", () => {
		expect(encodeQrCode({ ...defaults, quietZone: 1 }).dimension).toBe(230);
	});
});
