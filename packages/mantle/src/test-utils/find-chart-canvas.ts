import { waitFor } from "@testing-library/react";

/**
 * Resolve a chart's canvas. The Root inserts it when the chart activates,
 * which a real browser's `IntersectionObserver` reports one task after mount,
 * so a browser test waits for it instead of querying it after `render()`.
 *
 * @example
 * ```ts
 * const canvas = await findChartCanvas(container);
 * await waitFor(() => expect(canvas.width).toBeGreaterThan(0));
 * ```
 */
export const findChartCanvas = (container: ParentNode): Promise<HTMLCanvasElement> =>
	waitFor(() => {
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart canvas to render");
		}
		return canvas;
	});
