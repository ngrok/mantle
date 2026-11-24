import { encode } from "uqr";

/**
 * QR error correction level: the share of the code that can be damaged or
 * obscured while staying scannable: `"L"` ~7%, `"M"` ~15%, `"Q"` ~25%, `"H"`
 * ~30%. Higher levels produce a denser code.
 */
type QrCodeErrorCorrection = "L" | "M" | "Q" | "H";

/**
 * The encoded SVG geometry of a QR code.
 */
type QrCodeGeometry = {
	/** The `d` attribute for the QR `Pattern` path. */
	path: string;
	/** The width and height of the square QR `Frame` viewBox. */
	dimension: number;
};

/**
 * The inputs that decide a QR code's geometry.
 */
type EncodeQrCodeOptions = {
	/** The string to encode. */
	value: string;
	/** The error correction level. */
	ecc: QrCodeErrorCorrection;
	/** The width of the light-module margin, in modules. */
	quietZone: number;
	/** The size of each module, in viewBox units. */
	pixelSize: number;
};

/**
 * Builds the SVG `path` `d` attribute for a QR code by emitting one square
 * (`M x,y h s v s h-s z`) per dark module in the encoded grid, scaled by
 * `pixelSize`. Returns an empty string when there are no dark modules.
 *
 * @example
 * ```ts
 * buildPath([[true, false], [false, true]], 10);
 * // "M0,0h10v10h-10zM10,10h10v10h-10z"
 * ```
 */
function buildPath(modules: ReadonlyArray<ReadonlyArray<boolean>>, pixelSize: number): string {
	const rects: string[] = [];
	modules.forEach((columns, row) => {
		columns.forEach((isDark, col) => {
			if (isDark) {
				const x = col * pixelSize;
				const y = row * pixelSize;
				rects.push(`M${x},${y}h${pixelSize}v${pixelSize}h-${pixelSize}z`);
			}
		});
	});
	return rects.join("");
}

/**
 * Encodes `value` with the `uqr` encoder and returns the SVG geometry that
 * `QrCode.Frame` and `QrCode.Pattern` render. The quiet zone is part of the
 * encoded grid, so `dimension` includes it.
 *
 * @example
 * ```ts
 * const { path, dimension } = encodeQrCode({
 *   value: "https://ngrok.com",
 *   ecc: "L",
 *   quietZone: 4,
 *   pixelSize: 10,
 * });
 * // dimension === 290 (21 modules plus 4 on each side, times 10)
 * ```
 */
function encodeQrCode({ value, ecc, quietZone, pixelSize }: EncodeQrCodeOptions): QrCodeGeometry {
	const encoded = encode(value, { ecc, border: quietZone });
	return { path: buildPath(encoded.data, pixelSize), dimension: encoded.size * pixelSize };
}

export {
	//,
	buildPath,
	encodeQrCode,
};

export type {
	//,
	EncodeQrCodeOptions,
	QrCodeErrorCorrection,
	QrCodeGeometry,
};
