import { ButtonGroup, IconButton } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { RadioGroup } from "@ngrok/mantle/radio-group";
import { Separator } from "@ngrok/mantle/separator";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import { DesktopIcon } from "@phosphor-icons/react/Desktop";
import { DeviceMobileIcon } from "@phosphor-icons/react/DeviceMobile";
import { DeviceTabletIcon } from "@phosphor-icons/react/DeviceTablet";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	parsePreviewHistoryMessage,
	previewHistoryGoMessage,
	type PreviewHistoryMessage,
} from "~/features/preview-history/preview-history";

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
 * boundary (48rem) and mobile is a common phone width. Desktop fills the docs
 * column. Static class Record so Tailwind sees every class.
 */
const viewportWidthClasses = {
	desktop: "w-full",
	tablet: "w-192 max-w-full",
	mobile: "w-[375px] max-w-full",
} as const satisfies Record<Viewport, string>;

type PreviewFrameProps = {
	/**
	 * The chrome-less document the iframe loads: a registry example's
	 * `/preview/:exampleName` URL, or the entry path of a routed demo below
	 * `/preview/`. `CodeExample.PreviewFrame` builds it from a typed target.
	 */
	src: string;
	/**
	 * Human-readable name of the example — the iframe's accessible title and
	 * part of the toolbar buttons' labels. Usually matches the registry title.
	 */
	title: string;
	/** Merged onto the outer frame — e.g. to override the default `h-160` canvas height. */
	className?: string;
};

/**
 * A framed, viewport-switchable live example: an iframe pointed at a
 * chrome-less `/preview/` document with a toolbar to preview the example at
 * desktop, tablet (48rem), and mobile (375px) widths, step back and forward
 * through the frame's own history, reload it, or open it in a new tab.
 * Because the example is its own document it gets a real `Main` landmark, its
 * own `window` (document-level keyboard shortcuts stay inside the frame), its
 * own router history, and media queries driven by the frame, not the reader's
 * browser window. Theme changes on the docs page propagate automatically:
 * both documents share mantle's cookie + BroadcastChannel theme sync.
 *
 * The Back and Forward buttons mimic the browser's for the frame: the framed
 * document reports its history stack over `postMessage` after each
 * navigation (see `FramedPreviewHistory`), and a button asks it to move by
 * one entry. They stay disabled until the document reports an entry to move to.
 *
 * @example
 * ```tsx
 * <PreviewFrame src="/preview/centered-layout" title="Centered layout demo" />
 * ```
 */
export function PreviewFrame({ src, title, className }: PreviewFrameProps) {
	const [viewport, setViewport] = useState<Viewport>("desktop");
	// remounting the iframe with a new key is a full document reload
	const [reloadCount, setReloadCount] = useState(0);
	const iframeRef = useRef<HTMLIFrameElement>(null);
	// null until the framed document reports; a fresh document has nowhere to go
	const [history, setHistory] = useState<PreviewHistoryMessage | null>(null);
	const previewHref = src;

	useEffect(() => {
		function onMessage(event: MessageEvent) {
			// only this frame's document, at this origin: other tools post here too
			if (event.origin !== window.location.origin) {
				return;
			}
			if (event.source == null || event.source !== iframeRef.current?.contentWindow) {
				return;
			}
			const report = parsePreviewHistoryMessage(event.data);
			if (report != null) {
				setHistory(report);
			}
		}
		window.addEventListener("message", onMessage);
		return () => {
			window.removeEventListener("message", onMessage);
		};
	}, []);

	function traverse(delta: -1 | 1) {
		iframeRef.current?.contentWindow?.postMessage(
			previewHistoryGoMessage(delta),
			window.location.origin,
		);
	}

	return (
		<div
			className={cx(
				"grid h-160 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-gray-300",
				className,
			)}
		>
			<div className="flex items-center gap-2 border-b border-gray-300 p-1.5">
				<RadioGroup.ButtonGroup
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
						<RadioGroup.Button key={option.value} value={option.value} className="px-2.5">
							{option.icon}
							<span className="sr-only">{option.label}</span>
						</RadioGroup.Button>
					))}
				</RadioGroup.ButtonGroup>
				<ButtonGroup appearance="panel" role="group" aria-label="Preview history">
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						label={`Go back in the ${title} preview`}
						icon={<ArrowLeftIcon />}
						disabled={history?.canGoBack !== true}
						onClick={() => traverse(-1)}
					/>
					<Separator orientation="vertical" className="min-h-5" />
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						label={`Go forward in the ${title} preview`}
						icon={<ArrowRightIcon />}
						disabled={history?.canGoForward !== true}
						onClick={() => traverse(1)}
					/>
				</ButtonGroup>
				<div className="ml-auto flex items-center gap-1">
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						label={`Reload the ${title} preview`}
						icon={<ArrowClockwiseIcon />}
						onClick={() => {
							// a new document starts with nowhere to go, and reports again
							setHistory(null);
							setReloadCount((count) => count + 1);
						}}
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
			<div className="bg-base bg-[radial-gradient(var(--color-gray-300)_1px,transparent_1px)] [background-size:16px_16px]">
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
						ref={iframeRef}
						src={previewHref}
						title={`Preview of the ${title}`}
						loading="lazy"
						className="bg-card size-full"
					/>
				</div>
			</div>
		</div>
	);
}
