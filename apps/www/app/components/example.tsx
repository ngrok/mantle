import { IconButton } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { SegmentedControl } from "@ngrok/mantle/segmented-control";
import { Tabs } from "@ngrok/mantle/tabs";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import { DesktopIcon } from "@phosphor-icons/react/Desktop";
import { DeviceMobileIcon } from "@phosphor-icons/react/DeviceMobile";
import { DeviceTabletIcon } from "@phosphor-icons/react/DeviceTablet";
import { $cssProperties } from "@ngrok/mantle/types";
import type { ReactNode } from "react";
import { createContext, use, useEffect, useRef, useState } from "react";
import { href } from "react-router";
import {
	type ExampleHeights,
	parsePreviewHeightMessage,
	previewHeightRequest,
} from "~/features/example-heights";
import {
	parsePreviewHistoryMessage,
	previewHistoryGoMessage,
	type PreviewHistoryMessage,
} from "~/features/preview-history/preview-history";
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

/**
 * A page of the breadcrumbs recipe's routed demo: a route tree of its own
 * under `/preview/breadcrumbs-from-routes` (see `routes.ts`), for a demo that
 * needs real navigation rather than one component.
 */
type RoutedDemoPath = `/preview/breadcrumbs-from-routes/${string}`;

/** What a frame loads: an example by its preview key, or a routed demo page by its path. */
type FrameTarget = { name: PreviewKey; path?: never } | { path: RoutedDemoPath; name?: never };

/**
 * The measured heights of the current docs page's examples. The `doc-page`
 * route provides them from its loader. A frame with a measured height takes
 * that height at the first paint, so the page does not shift when the
 * preview loads.
 */
export const ExampleHeightsContext = createContext<ExampleHeights>({});

type FrameProps = {
	target: FrameTarget;
	title: string;
	height: "fixed" | "content";
};

/**
 * The sandbox half of an `Example`: an iframe pointed at the chrome-less
 * `/preview/*` route, with a toolbar to switch the viewport, reload the
 * example, or open it in a new tab.
 */
function Frame({ target, title, height }: FrameProps) {
	const [viewport, setViewport] = useState<Viewport>("desktop");
	// remounting the iframe with a new key is a full document reload
	const [reloadCount, setReloadCount] = useState(0);
	const [contentHeight, setContentHeight] = useState<number | null>(null);
	const exampleHeights = use(ExampleHeightsContext);
	const measuredHeight = target.name == null ? undefined : exampleHeights[target.name];
	const previewHref = target.name == null ? target.path : href("/preview/*", { "*": target.name });
	const isRoutedDemo = target.path != null;
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	// Why null: a fresh document has no entry to move to until it reports one.
	const [history, setHistory] = useState<PreviewHistoryMessage | null>(null);

	useEffect(() => {
		if (!isRoutedDemo) {
			return;
		}
		const onMessage = (event: MessageEvent) => {
			const report = parsePreviewHistoryMessage(event.data);
			if (
				report != null &&
				event.origin === window.location.origin &&
				event.source === iframeRef.current?.contentWindow
			) {
				setHistory(report);
			}
		};
		window.addEventListener("message", onMessage);
		return () => {
			window.removeEventListener("message", onMessage);
		};
	}, [isRoutedDemo]);

	const traverse = (delta: -1 | 1) => {
		iframeRef.current?.contentWindow?.postMessage(
			previewHistoryGoMessage(delta),
			window.location.origin,
		);
	};

	return (
		<div
			className={cx(
				"grid overflow-hidden rounded-xl border border-gray-300",
				height === "fixed" ? "h-160 grid-rows-[auto_minmax(0,1fr)]" : "grid-rows-[auto_auto]",
			)}
		>
			<div className="flex items-center gap-2 border-b border-gray-300 p-1.5">
				<SegmentedControl.Root
					aria-label="Preview viewport"
					className="w-fit"
					value={viewport}
					onValueChange={(value: string) => {
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
				{/* Why only a routed demo: no other example navigates in its frame. */}
				{isRoutedDemo && (
					<div role="group" aria-label="Preview history" className="flex items-center gap-1">
						<IconButton
							type="button"
							appearance="ghost"
							intent="neutral"
							label={`Go back in the ${title} preview`}
							icon={<ArrowLeftIcon />}
							disabled={history?.canGoBack !== true}
							onClick={() => traverse(-1)}
						/>
						<IconButton
							type="button"
							appearance="ghost"
							intent="neutral"
							label={`Go forward in the ${title} preview`}
							icon={<ArrowRightIcon />}
							disabled={history?.canGoForward !== true}
							onClick={() => traverse(1)}
						/>
					</div>
				)}
				<div className="ml-auto flex items-center gap-1">
					<IconButton
						type="button"
						appearance="ghost"
						intent="neutral"
						label={`Reload the ${title} preview`}
						icon={<ArrowClockwiseIcon />}
						onClick={() => {
							// the new document starts with no entry to move to, and reports again
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
			<div className="bg-base bg-[radial-gradient(var(--color-gray-300)_1px,transparent_1px)] bg-size-[16px_16px]">
				<div
					className={cx(
						// Why a container: the measured height to start from depends on the frame's
						// width, and a container query reads that width before the first paint.
						"@container mx-auto h-full transition-[width] duration-200 ease-out-strong motion-reduce:transition-none",
						// box-content keeps the preset width as the iframe's actual
						// viewport width; the delineating borders sit outside it
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
						// Why no scrollbar: the frame takes the height of the canvas. A scrollbar
						// makes the canvas narrower, which changes that height, and the frame
						// then fits the new height with the scrollbar still on. HTML marks the
						// attribute obsolete, but each browser obeys it, and no CSS on the frame
						// stops the scroll of the document in it.
						// Why only with a height: a document with no canvas, such as an error
						// page, reports no height, and it must stay in reach.
						// oxlint-disable-next-line typescript/no-deprecated -- see the comment above
						scrolling={
							height === "content" && (contentHeight ?? measuredHeight) != null ? "no" : undefined
						}
						className={cx(
							"bg-card block w-full",
							height === "fixed" && "h-full",
							height === "content" &&
								(measuredHeight == null
									? "h-40"
									: "h-(--example-height-narrow) @3xl:h-(--example-height-wide)"),
						)}
						style={$cssProperties({
							height: contentHeight ?? undefined,
							...(measuredHeight != null && {
								"--example-height-narrow": `${measuredHeight.narrow}px`,
								"--example-height-wide": `${measuredHeight.wide}px`,
							}),
						})}
						ref={(iframe) => {
							iframeRef.current = iframe;
							if (iframe == null || height !== "content") {
								return;
							}
							const onMessage = (event: MessageEvent) => {
								const reported = parsePreviewHeightMessage(event.data);
								if (
									reported != null &&
									event.source === iframe.contentWindow &&
									event.origin === window.location.origin &&
									// Why: the measured height is the hydrated height. The server markup
									// can differ, so it does not replace the measured height.
									(reported.hydrated || measuredHeight == null)
								) {
									setContentHeight(reported.height);
								}
							};
							window.addEventListener("message", onMessage);
							// Why ask: a preview near the top can report its height before the page
							// hydrates and this listener exists. A preview that has not loaded yet
							// reports on its own.
							iframe.contentWindow?.postMessage(
								{ type: previewHeightRequest },
								window.location.origin,
							);
							return () => {
								window.removeEventListener("message", onMessage);
							};
						}}
					/>
				</div>
			</div>
		</div>
	);
}

type ExampleProps = (
	| {
			/**
			 * The example to run. A page example is `<page path>/<name>`: the key
			 * `components/actions/button/size` renders `SizeExample` from
			 * `app/docs/components/actions/button.examples.tsx`. A key with no slash
			 * names a shell demo in the preview registry.
			 */
			name: PreviewKey;
			path?: never;
	  }
	| {
			/**
			 * The page of a routed demo to open, in place of `name`. The demo
			 * navigates inside its frame, so a reader can follow its links.
			 */
			path: RoutedDemoPath;
			name?: never;
	  }
) & {
	/** The example's name, for the frame's accessible title and toolbar labels. */
	title: string;
	/**
	 * `content`: the frame grows to the height of the example's
	 * `PreviewCanvas`. `fixed`: the frame is `h-160` tall and the example fills
	 * it. Defaults to `content` for a page example and `fixed` for a shell demo
	 * or a routed demo.
	 */
	height?: "fixed" | "content";
	/** The example's code, as an MDX code fence. It shows in the Code tab. */
	children?: ReactNode;
};

/**
 * A live docs example: the component or layout runs in a sandboxed iframe
 * with its own document, so its breakpoints, keyboard shortcuts, and overlays
 * stay in the frame. A Preview/Code toggle sits above it. The frame has a
 * desktop, tablet, and mobile (320px) viewport switch, a reload button, and a
 * link that opens the example in a new tab. The preview panel stays mounted
 * on the Code tab, so a toggle never reloads the example.
 *
 * @example
 * ```mdx
 * <Example name="components/actions/button/size" title="Button size example">
 *
 * {tsx fence}
 *
 * </Example>
 * ```
 *
 * @example
 * ```mdx
 * <Example path="/preview/breadcrumbs-from-routes/endpoints" title="Breadcrumbs from routes demo" />
 * ```
 */
export function Example({ title, height, children, ...target }: ExampleProps) {
	const frame = (
		<Frame
			target={target}
			title={title}
			height={height ?? (target.name?.includes("/") === true ? "content" : "fixed")}
		/>
	);
	if (children == null) {
		return (
			<div data-full-bleed="" className="mb-6">
				{frame}
			</div>
		);
	}
	return (
		<Tabs.Root appearance="pill" defaultValue="preview" data-full-bleed="" className="mb-6">
			<Tabs.List aria-label={`${title}: preview and code`}>
				<Tabs.Trigger value="preview">Preview</Tabs.Trigger>
				<Tabs.Trigger value="code">Code</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content
				value="preview"
				// Keeps the preview mounted while the code shows. The inactive panel is `hidden`.
				forceMount
			>
				{frame}
			</Tabs.Content>
			<Tabs.Content value="code" className="**:data-[slot=code-block]:mb-0">
				{children}
			</Tabs.Content>
		</Tabs.Root>
	);
}
