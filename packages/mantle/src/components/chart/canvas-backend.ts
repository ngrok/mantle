import type {
	EdgeFade,
	PaintBackend,
	PaintBackendFactory,
	PaintBackendOptions,
	PaintContext,
	ResolvedPaint,
} from "./paint-backend.js";
import type { SeriesColor, SeriesMeta } from "./types.js";
import {
	colorParseContext,
	createColorResolver,
	observeThemeChanges,
	resolveChromeColors,
	resolveSeriesColor,
	themeSignature,
} from "./canvas-colors.js";
import { watchDevicePixelRatio } from "./environment.js";

/**
 * The canvas paint backend: one `<canvas>` per chart, sized to the device
 * pixel ratio. A canvas cannot paint a CSS variable, so this backend resolves
 * every color through the Root's computed style, and repaints when the theme
 * or the device pixel ratio changes. Only ScatterPlot paints here.
 *
 * This module is internal shared implementation — not exported from the package.
 */
class CanvasBackend implements PaintBackend {
	readonly kind = "canvas";
	readonly element: HTMLCanvasElement;
	#root: HTMLElement;
	#plot: HTMLElement;
	/** The 2D context, created on the first paint so a chart that never paints never holds one. */
	#context: CanvasRenderingContext2D | null = null;
	#contextRequested = false;
	#stopTheme: () => void;
	#stopRatio: () => void;

	constructor({ root, plot, slotName, onEnvironmentChange }: PaintBackendOptions) {
		this.#root = root;
		this.#plot = plot;
		const canvas = root.ownerDocument.createElement("canvas");
		canvas.setAttribute("data-slot", `${slotName}-canvas`);
		canvas.setAttribute("aria-hidden", "true");
		canvas.style.position = "absolute";
		canvas.style.inset = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		this.element = canvas;
		this.#stopTheme = observeThemeChanges(root.ownerDocument.documentElement, () =>
			onEnvironmentChange("colors"),
		);
		const view = root.ownerDocument.defaultView;
		this.#stopRatio =
			view == null ? () => {} : watchDevicePixelRatio(view, () => onEnvironmentChange("ratio"));
	}

	#ctx(): CanvasRenderingContext2D | null {
		if (!this.#contextRequested) {
			this.#contextRequested = true;
			this.#context = this.element.getContext("2d");
		}
		return this.#context;
	}

	paintSignature(): string {
		return themeSignature(this.#root.ownerDocument.documentElement);
	}

	resolvePaint({
		series,
		signature,
	}: {
		series: readonly SeriesMeta[];
		signature: string;
	}): ResolvedPaint | null {
		const view = this.#root.ownerDocument.defaultView;
		if (view == null) {
			return null;
		}
		// One resolver per pass holds the single computed-style read every token
		// resolves from. Why the plot hosts the probe: the Root's child list is the
		// consumer's, and a structural selector there must not count a hidden span.
		const resolver = createColorResolver(this.#plot, {
			computed: view.getComputedStyle(this.#root),
			parseContext: colorParseContext(this.#root.ownerDocument),
		});
		const colors = new Map<string, string>();
		const inputs = new Map<string, string>();
		for (const meta of series) {
			colors.set(meta.dataKey, resolveSeriesColor(resolver, meta.colorInput));
			inputs.set(meta.dataKey, `${meta.colorInput}|${meta.texture}`);
		}
		return {
			signature,
			series: colors,
			inputs,
			// Why empty: ScatterPlot draws no bars, so no series takes a texture.
			barFills: new Map(),
			chrome: resolveChromeColors(resolver),
			fontFamily: () => resolver.fontFamily,
			resolve: (color: SeriesColor) => resolveSeriesColor(resolver, color),
		};
	}

	measureContext(): PaintContext | null {
		return this.#ctx();
	}

	begin({
		cssWidth,
		cssHeight,
		devicePixelRatio,
	}: {
		cssWidth: number;
		cssHeight: number;
		devicePixelRatio: number;
	}): PaintContext | null {
		const context = this.#ctx();
		if (context == null) {
			return null;
		}
		const canvas = this.element;
		const deviceWidth = Math.round(cssWidth * devicePixelRatio);
		const deviceHeight = Math.round(cssHeight * devicePixelRatio);
		if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
			// Setting the backing store clears the canvas, so touch it only on a change.
			canvas.width = deviceWidth;
			canvas.height = deviceHeight;
		}
		context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
		context.clearRect(0, 0, cssWidth, cssHeight);
		return context;
	}

	composite(
		_context: PaintContext,
		layers: { underlay: () => void; marks: () => void; fade: EdgeFade | null },
	): void {
		const { underlay, marks, fade } = layers;
		const context = this.#context;
		if (fade == null || context == null) {
			underlay();
			marks();
			return;
		}
		// Liveline's scroll mask: paint the marks, erase them through a horizontal
		// alpha ramp at the plot's left edge, then paint the grid beneath them with
		// destination-over. That gives the layered pixels with no offscreen canvas.
		marks();
		context.save();
		context.globalCompositeOperation = "destination-out";
		const gradient = context.createLinearGradient(fade.left, 0, fade.left + fade.width, 0);
		gradient.addColorStop(0, `rgba(0, 0, 0, ${fade.alpha})`);
		gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
		context.fillStyle = gradient;
		context.fillRect(fade.left, fade.top, fade.width, fade.height);
		context.globalCompositeOperation = "destination-over";
		underlay();
		context.restore();
	}

	end(): void {}

	release(): void {
		const canvas = this.element;
		if (canvas.width !== 0 || canvas.height !== 0) {
			canvas.width = 0;
			canvas.height = 0;
		}
	}

	destroy(): void {
		this.#stopTheme();
		this.#stopRatio();
	}
}

/**
 * Build the canvas backend of one chart.
 *
 * @example
 * ```ts
 * const backend = createCanvasBackend({ root, plot, slotName: "scatter-plot", onEnvironmentChange });
 * plot.prepend(backend.element);
 * ```
 */
const createCanvasBackend: PaintBackendFactory = (options) => new CanvasBackend(options);

export {
	//,
	createCanvasBackend,
};
