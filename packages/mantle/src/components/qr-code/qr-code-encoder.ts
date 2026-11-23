import { encodeQrCode } from "./qr-code-geometry.js";

/**
 * The QR encoder for the server and for every environment without the
 * `browser` condition. `package.json#imports` maps `#qr-code-encoder` here, so
 * `QrCode.Root` encodes during the server render and the HTML holds the
 * finished SVG.
 *
 * @example
 * ```ts
 * import { encodeQrCodeSync } from "#qr-code-encoder";
 * const geometry = encodeQrCodeSync?.({ value: "https://ngrok.com", ecc: "L", quietZone: 4, pixelSize: 10 });
 * ```
 */
const encodeQrCodeSync: typeof encodeQrCode | undefined = encodeQrCode;

export {
	//,
	encodeQrCodeSync,
};
