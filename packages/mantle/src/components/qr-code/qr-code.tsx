"use client";

import type { ComponentProps } from "react";
import { createContext, useContext, useMemo } from "react";
import invariant from "tiny-invariant";
import { encode } from "uqr";
import { cx } from "../../utils/cx/cx.js";
import type { WithAsChild } from "../../types/as-child.js";
import { Slot } from "../slot/index.js";

/**
 * The encoded geometry shared from `QrCode.Root` to the SVG rendering parts.
 */
type QrCodeContextValue = {
	/** The `d` attribute for the QR `Pattern` path. */
	path: string;
	/** The width/height of the (square) QR `Frame` viewBox. */
	dimension: number;
};

const QrCodeContext = createContext<QrCodeContextValue | null>(null);

/**
 * Validates sizing props before they reach `uqr` or SVG coordinate math.
 *
 * @throws When `pixelSize` is not a finite positive number, or `quietZone` is
 * not a non-negative integer.
 *
 * @example
 * ```ts
 * assertValidRootProps(10, 4);
 * ```
 */
function assertValidRootProps(pixelSize: number, quietZone: number): void {
	invariant(
		Number.isFinite(pixelSize) && pixelSize > 0,
		"`QrCode.Root` pixelSize must be a finite number greater than 0.",
	);
	invariant(
		Number.isInteger(quietZone) && quietZone >= 0,
		"`QrCode.Root` quietZone must be a non-negative integer.",
	);
}

/**
 * Reads the QR code context provided by `QrCode.Root`. Throws a clear error when
 * a part is rendered outside of a `QrCode.Root`.
 *
 * @example
 * ```tsx
 * const { dimension, path } = useQrCodeContext();
 * ```
 */
function useQrCodeContext(): QrCodeContextValue {
	const context = useContext(QrCodeContext);
	invariant(
		context,
		"`QrCode.Frame` and `QrCode.Pattern` must be rendered inside a `QrCode.Root`.",
	);
	return context;
}

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
 * QR error correction level — the share of the code that can be damaged or
 * obscured while staying scannable: `"L"` ~7%, `"M"` ~15%, `"Q"` ~25%, `"H"`
 * ~30%. Higher levels produce a denser code.
 */
type QrCodeErrorCorrection = "L" | "M" | "Q" | "H";

/**
 * Props for `QrCode.Root`, the provider and positioned tile that encodes the QR
 * value for child parts.
 */
type QrCodeRootProps = ComponentProps<"div"> &
	WithAsChild & {
		/** The string to encode (e.g. a URL or `otpauth://` MFA URI). */
		value: string;
		/**
		 * The error correction level. Defaults to `"L"`. Use `"H"` when an
		 * `Overlay` covers center modules so the code stays scannable.
		 */
		ecc?: QrCodeErrorCorrection;
		/** The pixel size of each module, affecting internal resolution. */
		pixelSize?: number;
		/**
		 * Width of the quiet zone — the light-module margin baked into the encoded
		 * grid around the code, not cosmetic CSS padding. Defaults to `4`, the QR
		 * spec's recommended margin for reliable scanning. Lower values tighten the
		 * surrounding whitespace but can hurt scannability; avoid `0`.
		 */
		quietZone?: number;
	};

/**
 * The root container of a QR code. Encodes `value` (via the dependency-free
 * `uqr` encoder) and renders a positioned white tile around the QR `Frame`,
 * sharing the encoded path with the other parts via context.
 *
 * Set the error correction level via `ecc`. When you place a logo in an
 * `Overlay`, use `ecc="H"` so the covered modules can still be recovered by a
 * scanner. Tighten the surrounding whitespace with `quietZone` (defaults to the
 * spec-recommended `4` light modules).
 *
 * The default styling is black modules on a white tile in every theme (never
 * theme-aware tokens). Consumers can override those styles, but inverting a QR
 * code's colors makes it unreliable for many scanners.
 *
 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
const Root = ({
	value,
	ecc = "L",
	pixelSize = 10,
	quietZone = 4,
	asChild,
	className,
	children,
	ref,
	...props
}: QrCodeRootProps) => {
	assertValidRootProps(pixelSize, quietZone);

	// The quiet zone is the QR spec's required margin (light modules on each
	// side). It's part of the code itself — the scannable margin — not cosmetic
	// padding. The spec recommends 4; lowering it tightens the whitespace at
	// the cost of scannability.
	const encoded = useMemo(() => encode(value, { ecc, border: quietZone }), [value, ecc, quietZone]);
	const path = useMemo(() => buildPath(encoded.data, pixelSize), [encoded, pixelSize]);
	const context = useMemo<QrCodeContextValue>(
		() => ({ path, dimension: encoded.size * pixelSize }),
		[path, encoded.size, pixelSize],
	);

	const Comp = asChild ? Slot : "div";

	return (
		<QrCodeContext.Provider value={context}>
			<Comp
				ref={ref}
				{...props}
				data-slot="qr-code"
				className={cx("relative inline-flex bg-static-white text-static-black", className)}
			>
				{children}
			</Comp>
		</QrCodeContext.Provider>
	);
};
Root.displayName = "QrCode";

/**
 * Props for `QrCode.Frame`, the fixed SVG element that sizes the encoded QR
 * pattern with its `viewBox`.
 */
type QrCodeFrameProps = ComponentProps<"svg">;

/**
 * The `svg` frame that holds the QR `Pattern`. Defaults to a square `size-48`
 * and scales the encoded pattern to fit via its `viewBox`, so resize the whole
 * code by passing a different size to `className` (e.g. `className="size-64"`).
 *
 * Does not support `asChild`: the QR pattern must live inside an `svg`, so the
 * frame element is fixed and cannot be swapped.
 *
 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
const Frame = ({ className, children, ref, ...props }: QrCodeFrameProps) => {
	const { dimension } = useQrCodeContext();

	return (
		<svg
			ref={ref}
			{...props}
			data-slot="qr-code-frame"
			xmlns="http://www.w3.org/2000/svg"
			viewBox={`0 0 ${dimension} ${dimension}`}
			shapeRendering="crispEdges"
			className={cx("block size-48", className)}
		>
			{children}
		</svg>
	);
};
Frame.displayName = "QrCodeFrame";

/**
 * Props for `QrCode.Pattern`, the fixed SVG `path` element that renders the
 * encoded dark modules.
 */
type QrCodePatternProps = ComponentProps<"path">;

/**
 * The encoded QR modules, rendered as a single `path` inside the `Frame`.
 * Defaults to black fill (`fill-static-black`) so the code stays scannable in
 * every theme.
 *
 * Does not support `asChild`: the modules are a fixed `path` and cannot be
 * swapped for another element.
 *
 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
const Pattern = ({ className, ref, ...props }: QrCodePatternProps) => {
	const { path } = useQrCodeContext();

	return (
		<path
			ref={ref}
			{...props}
			data-slot="qr-code-pattern"
			d={path}
			className={cx("fill-static-black", className)}
		/>
	);
};
Pattern.displayName = "QrCodePattern";

/**
 * Props for `QrCode.Overlay`, the optional centered logo container rendered on
 * top of the QR pattern.
 */
type QrCodeOverlayProps = ComponentProps<"div"> & WithAsChild;

/**
 * An overlay centered on top of the QR code, typically holding a brand logo
 * (e.g. `NgrokLettermarkIcon`). Renders a white, rounded "punch-out" so the
 * logo stays legible over the modules beneath it. Because the overlay hides the
 * center modules, use a higher `ecc` (e.g. `"H"`) on the `Root`.
 *
 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
const Overlay = ({ asChild, className, ref, ...props }: QrCodeOverlayProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			ref={ref}
			{...props}
			data-slot="qr-code-overlay"
			className={cx(
				"absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-static-white text-static-black p-1.5",
				className,
			)}
		/>
	);
};
Overlay.displayName = "QrCodeOverlay";

/**
 * A QR code. Compose `QrCode.Root` with a `QrCode.Frame` wrapping a
 * `QrCode.Pattern`, and optionally a `QrCode.Overlay` for a centered logo.
 * Encoding is handled by the dependency-free `uqr` library; the render logic is
 * owned by mantle (no headless runtime).
 *
 * `Root` and `Overlay` support the `asChild` prop for polymorphic composition.
 * `Frame` and `Pattern` render fixed SVG elements and do not.
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
const QrCode = {
	/**
	 * The root container of a QR code. Encodes `value` and renders a positioned
	 * white tile. Set `ecc` (e.g. `"H"` when using an `Overlay`).
	 *
	 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
	Root,
	/**
	 * The `svg` frame that holds the QR `Pattern`. Defaults to `size-48`; resize
	 * the whole code by passing a different size to `className`.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
	Frame,
	/**
	 * The encoded QR modules, rendered as a `path` inside the `Frame`. Defaults
	 * to black fill so the code stays scannable in every theme.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
	Pattern,
	/**
	 * An overlay centered on top of the QR code, typically holding a brand logo.
	 * Renders a white rounded "punch-out" so the logo stays legible. Use a higher
	 * `ecc` on the `Root` when an overlay is present.
	 *
	 * @see https://mantle.ngrok.com/components/data-display/qr-code
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
	Overlay,
} as const;

export {
	//,
	buildPath,
	QrCode,
};

export type {
	//,
	QrCodeErrorCorrection,
	QrCodeFrameProps,
	QrCodeOverlayProps,
	QrCodePatternProps,
	QrCodeRootProps,
};
