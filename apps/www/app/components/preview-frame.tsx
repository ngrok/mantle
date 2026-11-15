import { IconButton } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { SegmentedControl } from "@ngrok/mantle/segmented-control";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import { DesktopIcon } from "@phosphor-icons/react/Desktop";
import { DeviceMobileIcon } from "@phosphor-icons/react/DeviceMobile";
import { DeviceTabletIcon } from "@phosphor-icons/react/DeviceTablet";
import type { ReactNode } from "react";
import { useState } from "react";
import { href } from "react-router";
import type { PreviewExampleName } from "~/features/preview-registry";

const viewportValues = ["desktop", "tablet", "mobile"] as const;

type Viewport = (typeof viewportValues)[number];

function isViewport(value: string): value is Viewport {
	return viewportValues.some((viewport) => viewport === value);
}

const viewportOptions = [
	{ value: "desktop", label: "Desktop viewport", icon: <DesktopIcon className="size-4" /> },
	{ value: "tablet", label: "Tablet viewport", icon: <DeviceTabletIcon className="size-4" /> },
	{ value: "mobile", label: "Mobile viewport", icon: <DeviceMobileIcon className="size-4" /> },
] as const satisfies ReadonlyArray<{ value: Viewport; label: string; icon: ReactNode }>;

/**
 * Fixed preset widths, not percentages: the presets exist to exercise real
 * media-query breakpoints inside the frame, so tablet is Tailwind's `md`
 * boundary (48rem) and mobile is the 320px minimum supported width. Desktop fills the docs
 * column. Static class Record so Tailwind sees every class.
 */
const viewportWidthClasses = {
	desktop: "w-full",
	tablet: "w-192 max-w-full",
	mobile: "w-80 max-w-full",
} as const satisfies Record<Viewport, string>;

/**
 * A key the `/preview/*` route resolves: a shell demo in the preview registry,
 * or a docs page example as `<page path>/<example name>`.
 */
export type PreviewKey = PreviewExampleName | `${string}/${string}`;

type PreviewFrameProps = {
	/** Which example the frame renders: a preview registry name or a page example key. */
	example: PreviewKey;
	/**
	 * Human-readable name of the example — the iframe's accessible title and
	 * part of the toolbar buttons' labels.
	 */
	title: string;
	/**
	 * `fixed` (default): the frame is `h-160` tall and the example fills it,
	 * for full-page layout demos. `content`: the frame grows to the height of
	 * the example's `PreviewCanvas`, for component examples.
	 */
	height?: "fixed" | "content";
	/** Merged onto the outer frame — e.g. to override the default `h-160` canvas height. */
	className?: string;
};

/**
 * A framed, viewport-switchable live example: an iframe pointed at the
 * chrome-less `/preview/*` route with a toolbar to preview the
 * example at desktop, tablet (48rem), and mobile (320px) widths, reload it,
 * or open it in a new tab. Because the example is its own document it gets a
 * real `Main` landmark, its own `window` (document-level keyboard shortcuts
 * stay inside the frame), and media queries driven by the frame — not the
 * reader's browser window. Theme changes on the docs page propagate automatically:
 * both documents share mantle's cookie + BroadcastChannel theme sync.
 *
 * @example
 * ```tsx
 * <PreviewFrame example="centered-layout" title="Centered layout demo" />
 * ```
 */
export function PreviewFrame({ example, title, height = "fixed", className }: PreviewFrameProps) {
	const [viewport, setViewport] = useState<Viewport>("desktop");
	// remounting the iframe with a new key is a full document reload
	const [reloadCount, setReloadCount] = useState(0);
	const [contentHeight, setContentHeight] = useState<number | null>(null);
	const previewHref = href("/preview/*", { "*": example });

	return (
		<div
			className={cx(
				"grid overflow-hidden rounded-lg border border-gray-300",
				height === "fixed" ? "h-160 grid-rows-[auto_minmax(0,1fr)]" : "grid-rows-[auto_auto]",
				className,
			)}
		>
			<div className="flex items-center gap-2 border-b border-gray-300 p-1.5">
				<SegmentedControl.Root
					aria-label="Preview viewport"
					className="w-fit"
					value={viewport}
					onChange={(value: string) => {
						if (isViewport(value)) {
							setViewport(value);
						}
					}}
				>
					{viewportOptions.map((option) => (
						<SegmentedControl.Item key={option.value} value={option.value} className="px-2.5">
							{option.icon}
							<span className="sr-only">{option.label}</span>
						</SegmentedControl.Item>
					))}
				</SegmentedControl.Root>
				<div className="ml-auto flex items-center gap-1">
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						label={`Reload the ${title} preview`}
						icon={<ArrowClockwiseIcon />}
						onClick={() => setReloadCount((count) => count + 1)}
					/>
					<IconButton
						asChild
						appearance="ghost"
						intent="neutral"
						label={`Open the ${title} preview in a new tab`}
						icon={<ArrowSquareOutIcon />}
					>
						<a href={previewHref} target="_blank" rel="noreferrer" />
					</IconButton>
				</div>
			</div>
			<div className="bg-base bg-[radial-gradient(var(--color-gray-300)_1px,transparent_1px)] bg-size-[16px_16px]">
				<div
					className={cx(
						"mx-auto h-full transition-[width] duration-200 motion-reduce:transition-none",
						// box-content keeps the preset width as the iframe's actual
						// viewport width — the delineating borders sit outside it
						viewport !== "desktop" && "box-content border-x border-gray-300",
						viewportWidthClasses[viewport],
					)}
				>
					{/* oxlint-disable-next-line react/iframe-missing-sandbox -- first-party
					same-origin example document: it needs scripts, cookies, localStorage,
					and BroadcastChannel for theme sync, and `allow-scripts` +
					`allow-same-origin` together make a sandbox escapable anyway */}
					<iframe
						key={reloadCount}
						src={previewHref}
						title={`Preview of the ${title}`}
						loading="lazy"
						className={cx("bg-card block w-full", height === "fixed" ? "h-full" : "h-40")}
						style={
							height === "content" && contentHeight != null ? { height: contentHeight } : undefined
						}
						ref={(iframe) => {
							if (iframe == null || height !== "content") {
								return;
							}
							let observer: ResizeObserver | null = null;
							const observe = () => {
								observer?.disconnect();
								observer = observeCanvasHeight(iframe, setContentHeight);
							};
							// Why check readyState: a frame near the top can finish loading
							// before the page hydrates, and then its load event is gone.
							if (iframe.contentDocument?.readyState === "complete") {
								observe();
							}
							iframe.addEventListener("load", observe);
							return () => {
								iframe.removeEventListener("load", observe);
								observer?.disconnect();
							};
						}}
					/>
				</div>
			</div>
		</div>
	);
}

/**
 * Reports the height of the `PreviewCanvas` in a loaded preview frame, now and
 * on each resize. Returns the observer, or `null` when the frame's document has
 * no canvas yet (the blank document before the preview loads).
 */
function observeCanvasHeight(
	iframe: HTMLIFrameElement,
	onHeight: (height: number) => void,
): ResizeObserver | null {
	const canvas = iframe.contentDocument?.querySelector("[data-preview-canvas]");
	const frameWindow = canvas?.ownerDocument.defaultView;
	if (canvas == null || frameWindow == null) {
		return null;
	}
	// Why the frame's own ResizeObserver: the canvas lives in the frame's
	// document, and that document runs the resize steps for it.
	const observer = new frameWindow.ResizeObserver(() => {
		onHeight(Math.ceil(canvas.getBoundingClientRect().height));
	});
	observer.observe(canvas);
	return observer;
}
