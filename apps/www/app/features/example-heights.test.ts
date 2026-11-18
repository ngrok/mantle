// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	parsePreviewHeightMessage,
	previewHydratedEvent,
	reportPreviewHeightScript,
} from "./example-heights";

/**
 * Runs the reporter script in a document with a canvas of `height` pixels, as
 * a framed preview. Returns the reports it posts, a way to resize the canvas,
 * and a way to finish the font loads.
 */
function runReporter(height: number) {
	const canvas = document.createElement("div");
	canvas.dataset.previewCanvas = "";
	document.body.append(canvas);
	let canvasHeight = height;
	vi.spyOn(canvas, "getBoundingClientRect").mockImplementation(
		() => new DOMRect(0, 0, 320, canvasHeight),
	);

	const reports: unknown[] = [];
	vi.spyOn(window, "parent", "get").mockReturnValue({
		postMessage: (data: unknown) => reports.push(data),
	} as unknown as Window);

	// Why define it: happy-dom has no `document.fonts`.
	let fontsLoaded = () => {};
	const ready = new Promise<void>((resolve) => {
		fontsLoaded = resolve;
	});
	Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });

	// Why a stub: happy-dom lays out nothing, so its observer never fires.
	let resized = () => {};
	vi.stubGlobal(
		"ResizeObserver",
		class {
			constructor(callback: () => void) {
				resized = callback;
			}
			observe() {
				resized();
			}
		},
	);

	new Function(reportPreviewHeightScript)();
	return {
		reports: () => reports.map(parsePreviewHeightMessage),
		resize: (next: number) => {
			canvasHeight = next;
			resized();
		},
		fontsLoaded,
	};
}

afterEach(() => {
	document.body.replaceChildren();
	Reflect.deleteProperty(document, "fonts");
});

describe("reportPreviewHeightScript", () => {
	it("reports the server markup height as not hydrated", () => {
		const { reports } = runReporter(160);

		expect(reports()).toEqual([{ height: 160, hydrated: false }]);
	});

	it("reports the hydrated height after the fonts load", async () => {
		const { reports, resize, fontsLoaded } = runReporter(160);

		window.dispatchEvent(new Event(previewHydratedEvent));
		await Promise.resolve();
		expect(reports()).toEqual([{ height: 160, hydrated: false }]);

		resize(226);
		fontsLoaded();
		await expect.poll(reports).toContainEqual({ height: 226, hydrated: true });
		expect(reports()).not.toContainEqual({ height: 160, hydrated: true });
	});
});
