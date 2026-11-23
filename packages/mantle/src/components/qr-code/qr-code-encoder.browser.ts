import type { encodeQrCode } from "./qr-code-geometry.js";

/**
 * The browser has no QR encoder up front. `package.json#imports` maps
 * `#qr-code-encoder` here for the `browser` condition, so the client bundle
 * holds no `uqr`: `QrCode.Root` keeps the server-rendered SVG, and it loads
 * the encoder only for a value that the server did not render.
 *
 * @example
 * ```ts
 * import { encodeQrCodeSync } from "#qr-code-encoder";
 * encodeQrCodeSync; // undefined in the browser
 * ```
 */
const encodeQrCodeSync: typeof encodeQrCode | undefined = undefined;

export {
	//,
	encodeQrCodeSync,
};
