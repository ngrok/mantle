"use client";

import type { ComponentProps } from "react";
import {
	createContext,
	use,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";
import invariant from "tiny-invariant";
import { encodeQrCodeSync } from "#qr-code-encoder";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { WithAsChild } from "../../types/as-child.js";
import { canUseDOM } from "../browser-only/can-use-dom.js";
import { Slot } from "../slot/index.js";
import type {
	EncodeQrCodeOptions,
	QrCodeErrorCorrection,
	QrCodeGeometry,
} from "./qr-code-geometry.js";

/**
 * What `QrCode.Root` shares with the SVG parts: the encoded geometry, or a
 * state in which the parts render without it.
 *
 * - `server-markup`: the hydration render reuses the `viewBox` and `d` that the server rendered, so it leaves them out.
 * - `loading`: the client loads the encoder for a value that the server did not render.
 */
type QrCodeContextValue =
	| ({ status: "encoded" } & QrCodeGeometry)
	| { status: "server-markup" }
	| { status: "loading" };

const QrCodeContext = createContext<QrCodeContextValue | null>(null);

const SERVER_MARKUP: QrCodeContextValue = { status: "server-markup" };
const LOADING: QrCodeContextValue = { status: "loading" };

/**
 * The encoder, once the server import or a client load sets it. A module cache,
 * so each `QrCode.Root` after the first load encodes in its first render.
 */
let encoder = encodeQrCodeSync;
let encoderLoad: Promise<void> | undefined;
const encoderListeners = new Set<() => void>();

/**
 * Loads the encoder chunk one time and tells each subscribed `QrCode.Root`.
 * A failed load clears the cache, so a later mount can try again.
 *
 * @example
 * ```ts
 * await loadEncoder();
 * ```
 */
function loadEncoder(): Promise<void> {
	encoderLoad ??= (async () => {
		try {
			const module = await import("./qr-code-geometry.js");
			encoder = module.encodeQrCode;
		} catch (error) {
			encoderLoad = undefined;
			throw error;
		}
		for (const listener of encoderListeners) {
			listener();
		}
	})();
	return encoderLoad;
}

/**
 * Subscribes to the encoder load for `useSyncExternalStore`.
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToEncoder(() => {});
 * ```
 */
function subscribeToEncoder(listener: () => void): () => void {
	encoderListeners.add(listener);
	return () => {
		encoderListeners.delete(listener);
	};
}

/**
 * Reads the encoder for `useSyncExternalStore`, on the server and the client.
 *
 * @example
 * ```ts
 * getEncoder()?.({ value: "https://ngrok.com", ecc: "L", quietZone: 4, pixelSize: 10 });
 * ```
 */
function getEncoder(): typeof encoder {
	return encoder;
}

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
 * Loads the encoder chunk while `needed` is true. A failed load throws to the
 * nearest error boundary.
 *
 * @example
 * ```tsx
 * useLoadEncoder(encoder == null);
 * ```
 */
function useLoadEncoder(needed: boolean): void {
	const [, setLoadFailure] = useState();
	useEffect(() => {
		if (!needed) {
			return;
		}
		loadEncoder().catch((error: unknown) => {
			// Why: an updater that throws hands the load failure to the nearest error boundary.
			setLoadFailure(() => {
				throw error;
			});
		});
	}, [needed]);
}

/**
 * Encodes the QR code for `QrCode.Root` with the least client JavaScript:
 *
 * - The server encodes, so the HTML holds the finished SVG.
 * - The hydration render keeps that SVG and needs no encoder.
 * - A value that only the client knows loads the encoder chunk, then encodes.
 *
 * @example
 * ```tsx
 * const context = useQrCodeEncoding({ value, ecc, quietZone, pixelSize });
 * ```
 */
function useQrCodeEncoding({
	value,
	ecc,
	quietZone,
	pixelSize,
}: EncodeQrCodeOptions): QrCodeContextValue {
	const isHydrated = useIsHydrated();
	const currentEncoder = useSyncExternalStore(subscribeToEncoder, getEncoder, getEncoder);
	const key = JSON.stringify([value, ecc, quietZone, pixelSize]);
	// Why: the DOM keeps the server SVG while the props match the props that
	// the server rendered, so only that key needs no encoder.
	const [serverKey] = useState(isHydrated ? undefined : key);
	useLoadEncoder(currentEncoder == null && serverKey !== key);

	const encoded = useMemo<QrCodeContextValue | undefined>(() => {
		const geometry = currentEncoder?.({ value, ecc, quietZone, pixelSize });
		return geometry && { status: "encoded", ...geometry };
	}, [currentEncoder, value, ecc, quietZone, pixelSize]);

	// Why: a server that resolves the `browser` condition (such as an edge
	// runtime) has no encoder up front, so its render waits for the chunk.
	if (currentEncoder == null && !canUseDOM()) {
		use(loadEncoder());
	}
	if (encoded != null) {
		return encoded;
	}
	return serverKey === key ? SERVER_MARKUP : LOADING;
}

/**
 * Reads the QR code context provided by `QrCode.Root`. Throws a clear error when
 * a part is rendered outside of a `QrCode.Root`.
 *
 * @example
 * ```tsx
 * const context = useQrCodeContext();
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
 * Reads the QR code context for `QrCode.Frame` and `QrCode.Pattern`. A part
 * that the client mounts after hydration has no server markup to keep, so it
 * reads `loading` and loads the encoder.
 *
 * @example
 * ```tsx
 * const context = useQrCodePartContext();
 * ```
 */
function useQrCodePartContext(): QrCodeContextValue {
	const context = useQrCodeContext();
	const isHydrated = useIsHydrated();
	const [hydratedFromServer] = useState(!isHydrated);
	const needsEncoder = context.status === "server-markup" && !hydratedFromServer;
	useLoadEncoder(needsEncoder);
	return needsEncoder ? LOADING : context;
}

/**
 * The `viewBox` for `QrCode.Frame`. While the encoder loads, a unit square
 * keeps the frame square; for the server markup, `undefined` keeps the server
 * `viewBox`.
 *
 * @example
 * ```ts
 * frameViewBox({ status: "loading" }); // "0 0 1 1"
 * ```
 */
function frameViewBox(context: QrCodeContextValue): string | undefined {
	switch (context.status) {
		case "encoded":
			return `0 0 ${context.dimension} ${context.dimension}`;
		case "loading":
			return "0 0 1 1";
		case "server-markup":
			return undefined;
	}
}

/**
 * The `d` for `QrCode.Pattern`. While the encoder loads, `""` clears a stale
 * server path; for the server markup, `undefined` keeps the server path.
 *
 * @example
 * ```ts
 * patternPath({ status: "loading" }); // ""
 * ```
 */
function patternPath(context: QrCodeContextValue): string | undefined {
	switch (context.status) {
		case "encoded":
			return context.path;
		case "loading":
			return "";
		case "server-markup":
			return undefined;
	}
}

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
		 * Width of the quiet zone: the light-module margin baked into the encoded
		 * grid around the code, not cosmetic CSS padding. Defaults to `4`, the QR
		 * spec's recommended margin for reliable scanning. Lower values tighten the
		 * surrounding whitespace but can hurt scannability; avoid `0`.
		 */
		quietZone?: number;
	} & WithDataSlot;

/**
 * The root container of a QR code. Encodes `value` (via the dependency-free
 * `uqr` encoder) and renders a positioned white tile around the QR `Frame`,
 * sharing the encoded path with the other parts via context.
 *
 * The server render encodes `value`, so the HTML holds the finished SVG and
 * hydration ships no encoder. A value that only the client knows loads the
 * encoder chunk the first time, and the code draws when it arrives.
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
	"data-slot": dataSlot,
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
	const context = useQrCodeEncoding({ value, ecc, quietZone, pixelSize });

	const Comp = asChild ? Slot : "div";

	return (
		<QrCodeContext.Provider value={context}>
			<Comp
				ref={ref}
				{...props}
				data-slot={joinDataSlot(dataSlot, "qr-code")}
				className={cx("relative inline-flex bg-static-white text-static-black", className)}
			>
				{children}
			</Comp>
		</QrCodeContext.Provider>
	);
};

/**
 * Props for `QrCode.Frame`, the fixed SVG element that sizes the encoded QR
 * pattern with its `viewBox`. `role` is locked to `"img"`.
 */
type QrCodeFrameProps = Omit<ComponentProps<"svg">, "role"> & WithDataSlot;

/**
 * The `svg` frame that holds the QR `Pattern`. Defaults to a square `size-48`
 * and scales the encoded pattern to fit via its `viewBox`, so resize the whole
 * code by passing a different size to `className` (e.g. `className="size-64"`).
 *
 * The frame is the image a screen reader meets: it always carries
 * `role="img"`. Pass `aria-label` (or `aria-labelledby`) that says what the
 * code encodes, such as "QR code for the ngrok dashboard". When neither is
 * set, the name falls back to "QR code".
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
const Frame = ({
	"data-slot": dataSlot,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	className,
	children,
	ref,
	...props
}: QrCodeFrameProps) => {
	const context = useQrCodePartContext();

	return (
		<svg
			ref={ref}
			{...props}
			// Why after the spread: a wider props object can still carry `role`
			// past the type, and an unnamed graphic is a gap for a screen reader.
			role="img"
			aria-label={ariaLabel ?? (ariaLabelledBy == null ? "QR code" : undefined)}
			aria-labelledby={ariaLabelledBy}
			data-slot={joinDataSlot(dataSlot, "qr-code-frame")}
			xmlns="http://www.w3.org/2000/svg"
			viewBox={frameViewBox(context)}
			suppressHydrationWarning={context.status === "server-markup"}
			shapeRendering="crispEdges"
			className={cx("block size-48", className)}
		>
			{children}
		</svg>
	);
};

/**
 * Props for `QrCode.Pattern`, the fixed SVG `path` element that renders the
 * encoded dark modules.
 */
type QrCodePatternProps = ComponentProps<"path"> & WithDataSlot;

/**
 * The encoded QR modules, rendered as a single `path` inside the `Frame`.
 * Defaults to black fill (`fill-static-black`) so the code stays scannable in
 * every theme. A consumer `className` can override the fill, but a light or
 * inverted fill makes the code unreliable for many scanners.
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
const Pattern = ({ "data-slot": dataSlot, className, ref, ...props }: QrCodePatternProps) => {
	const context = useQrCodePartContext();

	return (
		<path
			ref={ref}
			{...props}
			data-slot={joinDataSlot(dataSlot, "qr-code-pattern")}
			d={patternPath(context)}
			suppressHydrationWarning={context.status === "server-markup"}
			className={cx("fill-static-black", className)}
		/>
	);
};

/**
 * Props for `QrCode.Overlay`, the optional centered logo container rendered on
 * top of the QR pattern.
 */
type QrCodeOverlayProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

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
const Overlay = ({
	"data-slot": dataSlot,
	asChild,
	className,
	ref,
	...props
}: QrCodeOverlayProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			ref={ref}
			{...props}
			data-slot={joinDataSlot(dataSlot, "qr-code-overlay")}
			className={cx(
				"absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-static-white text-static-black p-1.5",
				className,
			)}
		/>
	);
};

export {
	//,
	Root,
	Frame,
	Pattern,
	Overlay,
};

export type {
	//,
	QrCodeErrorCorrection,
	QrCodeFrameProps,
	QrCodeOverlayProps,
	QrCodePatternProps,
	QrCodeRootProps,
};
