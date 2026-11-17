/**
 * The file the production build writes the measured example heights to,
 * relative to the app root. `vite-plugins/example-heights.ts` writes it after
 * the bundles are built and before the prerender, so the `doc-page` loader
 * can read it while it prerenders each page.
 */
export const exampleHeightsFile = "build/server/example-heights.json";

/**
 * The height of an example's `PreviewCanvas` in a docs frame, in pixels:
 * `wide` for a frame 48rem wide or wider, `narrow` for a smaller frame.
 */
export type ExampleHeight = { wide: number; narrow: number };

/** The measured heights, keyed by the example's preview key. */
export type ExampleHeights = Record<string, ExampleHeight>;

/**
 * The `type` of the message a preview document posts to its docs frame with
 * the height of its `PreviewCanvas`.
 */
export const previewHeightMessage = "mantle:preview-height";

/**
 * The `type` of the message a docs frame posts to its preview document to ask
 * for the current height again.
 */
export const previewHeightRequest = "mantle:preview-height-request";

/**
 * Returns the height a preview height message carries, or `null` when the
 * data is some other message.
 */
export function parsePreviewHeightMessage(data: unknown): number | null {
	if (typeof data !== "object" || data == null || !("type" in data) || !("height" in data)) {
		return null;
	}
	const { type, height } = data;
	return type === previewHeightMessage && typeof height === "number" && height > 0 ? height : null;
}

/**
 * Reports the height of the `PreviewCanvas` to the parent docs frame, now and
 * on each resize, and again when the frame asks. The preview document runs it
 * as an inline script, so the frame gets a height as soon as the canvas is
 * parsed: it does not wait for the scripts, the hydration, or the load event.
 *
 * Why it stays self-contained: it runs from its source text, so it can use
 * only its arguments and browser globals.
 */
function reportPreviewHeight(message: string, request: string) {
	const canvas = document.querySelector("[data-preview-canvas]");
	if (canvas == null || window.parent === window) {
		return;
	}
	let height = 0;
	const post = () => {
		if (height > 0) {
			window.parent.postMessage({ type: message, height }, window.location.origin);
		}
	};
	new ResizeObserver(() => {
		height = Math.ceil(canvas.getBoundingClientRect().height);
		post();
	}).observe(canvas);
	window.addEventListener("message", (event) => {
		if (event.source === window.parent && event.data?.type === request) {
			post();
		}
	});
}

/** The source of the inline script that runs `reportPreviewHeight`. */
export const reportPreviewHeightScript = `(${reportPreviewHeight.toString()})(${JSON.stringify(previewHeightMessage)},${JSON.stringify(previewHeightRequest)})`;
