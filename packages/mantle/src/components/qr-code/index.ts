/**
 * Re-exports for the QrCode component.
 *
 * @see https://mantle.ngrok.com/components/data-display/qr-code
 */

import * as QrCodeParts from "./qr-code-parts.js";

/**
 * A QR code. Compose `QrCode.Root` with a `QrCode.Frame` wrapping a
 * `QrCode.Pattern`, and optionally a `QrCode.Overlay` for a centered logo.
 * The dependency-free `uqr` library encodes `value`; mantle owns the render
 * logic (no headless runtime).
 *
 * `Root` and `Overlay` support the `asChild` prop for polymorphic composition.
 * `Frame` and `Pattern` render fixed SVG elements and do not.
 *
 * @useWhen Encode a URL or other text as a QR code that a phone camera can scan, with an optional
 * centered logo.
 *
 * @see https://mantle.ngrok.com/components/data-display/qr-code
 *
 * @example
 * Composition:
 * ```
 * QrCode.Root
 * ├── QrCode.Frame
 * │   └── QrCode.Pattern
 * └── QrCode.Overlay
 * ```
 *
 * @example
 * ```tsx
 * <QrCode.Root value="https://ngrok.com" ecc="H">
 *   <QrCode.Frame>
 *     <QrCode.Pattern />
 *   </QrCode.Frame>
 *   <QrCode.Overlay>
 *     <NgrokLettermarkIcon className="size-7" />
 *   </QrCode.Overlay>
 * </QrCode.Root>
 * ```
 */
const QrCode = QrCodeParts;

export {
	//,
	QrCode,
};

export type {
	//,
	QrCodeErrorCorrection,
	QrCodeFrameProps,
	QrCodeOverlayProps,
	QrCodePatternProps,
	QrCodeRootProps,
} from "./qr-code.js";
