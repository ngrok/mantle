import { BrowserOnly } from "@ngrok/mantle/browser-only";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Browser Only docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<BrowserOnly fallback={<div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />}>
				{() => <p>This only renders in the browser after hydration!</p>}
			</BrowserOnly>
			<BrowserOnly fallback={<div className="h-20 bg-gray-100 rounded p-4">Loading...</div>}>
				{() => (
					<div className="border-card-muted rounded border p-4">
						<p>Browser-only content with window dimensions:</p>
						<p>Width: {window.innerWidth}px</p>
						<p>Height: {window.innerHeight}px</p>
					</div>
				)}
			</BrowserOnly>
		</PreviewCanvas>
	);
}
