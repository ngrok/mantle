import invariant from "tiny-invariant";
import type {
	EdgeFade,
	PaintBackend,
	PaintBackendFactory,
	PaintBackendOptions,
	PaintContext,
	PathDataContext,
	ResolvedPaint,
} from "./paint-backend.js";
import type { BarOrientation, SeriesMeta } from "./types.js";
import { CHART_CHROME_CSS, cssSeriesColor } from "./colors.js";
import { paintTextureTile, TEXTURE_TILE_SIZE, textureGroundColor } from "./texture.js";

/**
 * The SVG paint backend: one `<svg>` per chart, in CSS pixels. It records the
 * renderer's 2D drawing calls and writes them as one `<path>` per run of calls
 * that share a style, so a bar series is one path and a line is one path.
 *
 * Colors stay CSS: a series paints `var(--color-chart-blue)` and the browser
 * resolves it. A theme switch repaints no chart, and the backend reads no
 * computed style, watches no theme attribute, and holds no bitmap.
 *
 * This module is internal shared implementation — not exported from the package.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * Whether `node` is an SVG element. Why not `instanceof SVGElement`: a chart in
 * a same-origin iframe owns elements from that frame's realm.
 */
const isSvgElement = (node: Element | undefined): node is SVGElement =>
	node?.namespaceURI === SVG_NAMESPACE;

/** The layers a frame paints into, back to front. */
type Layer = "underlay" | "marks" | "overlay";

const LAYERS: readonly Layer[] = ["underlay", "marks", "overlay"];

/** A clip rectangle in CSS pixels. */
type ClipRect = { x: number; y: number; width: number; height: number };

/** The drawing state that `save` keeps and `restore` brings back. */
type DrawState = {
	fillStyle: string;
	strokeStyle: string;
	lineWidth: number;
	globalAlpha: number;
	lineJoin: CanvasLineJoin;
	lineCap: CanvasLineCap;
	dash: string;
	font: string;
	textAlign: CanvasTextAlign;
	textBaseline: CanvasTextBaseline;
	clip: ClipRect | null;
};

/** One element of a recorded frame. */
type Mark =
	| {
			type: "path";
			/** Every style input, so two runs with equal keys join into one path. */
			key: string;
			data: string;
			paint: "fill" | "stroke";
			state: DrawState;
	  }
	| { type: "text"; text: string; x: number; y: number; state: DrawState };

const INITIAL_STATE: DrawState = {
	fillStyle: "#000",
	strokeStyle: "#000",
	lineWidth: 1,
	globalAlpha: 1,
	lineJoin: "miter",
	lineCap: "butt",
	dash: "",
	font: "10px sans-serif",
	textAlign: "start",
	textBaseline: "alphabetic",
	clip: null,
};

/** A coordinate in path data: two decimals hold sub-pixel position at any zoom a chart reaches. */
const coordinate = (value: number): string => String(Math.round(value * 100) / 100);

const TEXT_ANCHOR: Record<CanvasTextAlign, string> = {
	start: "start",
	left: "start",
	center: "middle",
	right: "end",
	end: "end",
};

const DOMINANT_BASELINE: Record<CanvasTextBaseline, string> = {
	top: "text-before-edge",
	hanging: "hanging",
	middle: "central",
	alphabetic: "alphabetic",
	ideographic: "ideographic",
	bottom: "text-after-edge",
};

/** One measuring context per document, so 100 charts with axes share one canvas. */
const measureContexts = new WeakMap<Document, CanvasRenderingContext2D | null>();

const measureContextFor = (document: Document): CanvasRenderingContext2D | null => {
	if (!measureContexts.has(document)) {
		measureContexts.set(document, document.createElement("canvas").getContext("2d"));
	}
	return measureContexts.get(document) ?? null;
};

/** The pixel size a CSS `font` shorthand starts with, such as `11` in `11px Inter`. */
const fontSize = (font: string): number => Number.parseFloat(font) || 10;

const clipKey = (clip: ClipRect | null): string =>
	clip == null
		? ""
		: `${coordinate(clip.x)},${coordinate(clip.y)},${coordinate(clip.width)},${coordinate(clip.height)}`;

const intersect = (a: ClipRect | null, b: ClipRect): ClipRect => {
	if (a == null) {
		return b;
	}
	const x = Math.max(a.x, b.x);
	const y = Math.max(a.y, b.y);
	return {
		x,
		y,
		width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
		height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
	};
};

/**
 * Records 2D drawing calls as SVG marks. It holds no DOM: {@link SvgSurface}
 * writes what it recorded.
 */
class SvgRecorder implements PathDataContext {
	#state: DrawState = { ...INITIAL_STATE };
	#stack: DrawState[] = [];
	#path: string[] = [];
	/** The one rectangle the current path holds, so `clip` can take it; `null` for any other path. */
	#pathRect: ClipRect | null = null;
	#pathSegments = 0;
	#hasCurrentPoint = false;
	#document: Document;
	/** The layer new marks join; the backend sets it around the grid and the marks. */
	layer: Layer = "overlay";
	readonly marks: Record<Layer, Mark[]> = { underlay: [], marks: [], overlay: [] };

	constructor(document: Document) {
		this.#document = document;
	}

	get fillStyle(): string {
		return this.#state.fillStyle;
	}
	set fillStyle(value: string | CanvasGradient | CanvasPattern) {
		invariant(typeof value === "string", "The SVG chart backend fills with color strings only.");
		this.#state.fillStyle = value;
	}
	get strokeStyle(): string {
		return this.#state.strokeStyle;
	}
	set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
		invariant(typeof value === "string", "The SVG chart backend strokes with color strings only.");
		this.#state.strokeStyle = value;
	}
	get lineWidth(): number {
		return this.#state.lineWidth;
	}
	set lineWidth(value: number) {
		this.#state.lineWidth = value;
	}
	get globalAlpha(): number {
		return this.#state.globalAlpha;
	}
	set globalAlpha(value: number) {
		this.#state.globalAlpha = value;
	}
	get lineJoin(): CanvasLineJoin {
		return this.#state.lineJoin;
	}
	set lineJoin(value: CanvasLineJoin) {
		this.#state.lineJoin = value;
	}
	get lineCap(): CanvasLineCap {
		return this.#state.lineCap;
	}
	set lineCap(value: CanvasLineCap) {
		this.#state.lineCap = value;
	}
	get font(): string {
		return this.#state.font;
	}
	set font(value: string) {
		this.#state.font = value;
	}
	get textAlign(): CanvasTextAlign {
		return this.#state.textAlign;
	}
	set textAlign(value: CanvasTextAlign) {
		this.#state.textAlign = value;
	}
	get textBaseline(): CanvasTextBaseline {
		return this.#state.textBaseline;
	}
	set textBaseline(value: CanvasTextBaseline) {
		this.#state.textBaseline = value;
	}

	/** Drop the last frame's marks and drawing state. */
	reset(): void {
		this.#state = { ...INITIAL_STATE };
		this.#stack = [];
		this.beginPath();
		for (const layer of LAYERS) {
			this.marks[layer] = [];
		}
		this.layer = "overlay";
	}

	save(): void {
		this.#stack.push({ ...this.#state });
	}

	restore(): void {
		const state = this.#stack.pop();
		if (state != null) {
			this.#state = state;
		}
	}

	beginPath(): void {
		this.#path = [];
		this.#pathRect = null;
		this.#pathSegments = 0;
		this.#hasCurrentPoint = false;
	}

	closePath(): void {
		this.#path.push("Z");
	}

	moveTo(x: number, y: number): void {
		this.#path.push(`M${coordinate(x)} ${coordinate(y)}`);
		this.#pathSegments += 1;
		this.#pathRect = null;
		this.#hasCurrentPoint = true;
	}

	lineTo(x: number, y: number): void {
		const command = this.#hasCurrentPoint ? "L" : "M";
		this.#path.push(`${command}${coordinate(x)} ${coordinate(y)}`);
		this.#pathRect = null;
		this.#hasCurrentPoint = true;
	}

	bezierCurveTo(
		control1X: number,
		control1Y: number,
		control2X: number,
		control2Y: number,
		x: number,
		y: number,
	): void {
		this.#path.push(
			`C${coordinate(control1X)} ${coordinate(control1Y)} ${coordinate(control2X)} ${coordinate(control2Y)} ${coordinate(x)} ${coordinate(y)}`,
		);
		this.#pathRect = null;
		this.#hasCurrentPoint = true;
	}

	rect(x: number, y: number, width: number, height: number): void {
		this.#path.push(
			`M${coordinate(x)} ${coordinate(y)}h${coordinate(width)}v${coordinate(height)}h${coordinate(-width)}Z`,
		);
		this.#pathSegments += 1;
		this.#pathRect = this.#pathSegments === 1 ? { x, y, width, height } : null;
		this.#hasCurrentPoint = true;
	}

	roundRect(x: number, y: number, width: number, height: number, radii: number[]): void {
		const [topLeft = 0, topRight = 0, bottomRight = 0, bottomLeft = 0] = radii;
		const right = x + width;
		const bottom = y + height;
		const corner = (radius: number, endX: number, endY: number): string =>
			radius > 0
				? `A${coordinate(radius)} ${coordinate(radius)} 0 0 1 ${coordinate(endX)} ${coordinate(endY)}`
				: `L${coordinate(endX)} ${coordinate(endY)}`;
		this.#path.push(
			`M${coordinate(x + topLeft)} ${coordinate(y)}`,
			`L${coordinate(right - topRight)} ${coordinate(y)}`,
			corner(topRight, right, y + topRight),
			`L${coordinate(right)} ${coordinate(bottom - bottomRight)}`,
			corner(bottomRight, right - bottomRight, bottom),
			`L${coordinate(x + bottomLeft)} ${coordinate(bottom)}`,
			corner(bottomLeft, x, bottom - bottomLeft),
			`L${coordinate(x)} ${coordinate(y + topLeft)}`,
			corner(topLeft, x + topLeft, y),
			"Z",
		);
		this.#pathSegments += 1;
		this.#pathRect = null;
		this.#hasCurrentPoint = true;
	}

	arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
		const startX = x + radius * Math.cos(startAngle);
		const startY = y + radius * Math.sin(startAngle);
		this.#path.push(
			`${this.#hasCurrentPoint ? "L" : "M"}${coordinate(startX)} ${coordinate(startY)}`,
		);
		const sweep = endAngle - startAngle;
		const r = coordinate(radius);
		if (sweep >= Math.PI * 2) {
			// Why two halves: one arc command cannot draw a full circle, because its
			// start and end points are the same point.
			const oppositeX = x - radius * Math.cos(startAngle);
			const oppositeY = y - radius * Math.sin(startAngle);
			this.#path.push(
				`A${r} ${r} 0 1 1 ${coordinate(oppositeX)} ${coordinate(oppositeY)}`,
				`A${r} ${r} 0 1 1 ${coordinate(startX)} ${coordinate(startY)}`,
			);
		} else {
			const endX = x + radius * Math.cos(endAngle);
			const endY = y + radius * Math.sin(endAngle);
			const large = sweep > Math.PI ? 1 : 0;
			this.#path.push(`A${r} ${r} 0 ${large} 1 ${coordinate(endX)} ${coordinate(endY)}`);
		}
		this.#pathRect = null;
		this.#hasCurrentPoint = true;
	}

	appendPathData(data: string): void {
		this.#path.push(data);
		this.#pathRect = null;
		this.#hasCurrentPoint = true;
	}

	fill(): void {
		this.#addPath("fill", this.#path.join(""));
	}

	stroke(): void {
		this.#addPath("stroke", this.#path.join(""));
	}

	fillRect(x: number, y: number, width: number, height: number): void {
		this.#addPath(
			"fill",
			`M${coordinate(x)} ${coordinate(y)}h${coordinate(width)}v${coordinate(height)}h${coordinate(-width)}Z`,
		);
	}

	clip(): void {
		const rect = this.#pathRect;
		invariant(rect != null, "The SVG chart backend clips to one rectangle only.");
		this.#state.clip = intersect(this.#state.clip, rect);
	}

	setLineDash(segments: number[]): void {
		this.#state.dash = segments.join(" ");
	}

	fillText(text: string, x: number, y: number): void {
		this.marks[this.layer].push({ type: "text", text, x, y, state: { ...this.#state } });
	}

	measureText(text: string): { width: number } {
		const context = measureContextFor(this.#document);
		if (context == null) {
			// Why an estimate: a test DOM has no canvas to measure with, and the
			// gutter only needs a width of the right order.
			return { width: text.length * fontSize(this.#state.font) * 0.6 };
		}
		context.font = this.#state.font;
		return { width: context.measureText(text).width };
	}

	#addPath(paint: "fill" | "stroke", data: string): void {
		if (data === "") {
			return;
		}
		const state = this.#state;
		const key =
			paint === "fill"
				? `f|${state.fillStyle}|${state.globalAlpha}|${clipKey(state.clip)}`
				: `s|${state.strokeStyle}|${state.globalAlpha}|${state.lineWidth}|${state.lineJoin}|${state.lineCap}|${state.dash}|${clipKey(state.clip)}`;
		const marks = this.marks[this.layer];
		const last = marks.at(-1);
		if (last?.type === "path" && last.key === key) {
			last.data += data;
			return;
		}
		marks.push({ type: "path", key, data, paint, state: { ...state } });
	}
}

/** The style a written element last wore, so an unchanged frame writes nothing. */
const writtenStyles = new WeakMap<Element, Map<string, string>>();

const writeStyle = (element: SVGElement, name: string, value: string): void => {
	let styles = writtenStyles.get(element);
	if (styles == null) {
		styles = new Map();
		writtenStyles.set(element, styles);
	}
	if (styles.get(name) === value) {
		return;
	}
	styles.set(name, value);
	if (value === "") {
		element.style.removeProperty(name);
	} else {
		element.style.setProperty(name, value);
	}
};

const writeAttribute = (element: Element, name: string, value: string | null): void => {
	if (value == null) {
		if (element.hasAttribute(name)) {
			element.removeAttribute(name);
		}
		return;
	}
	if (element.getAttribute(name) !== value) {
		element.setAttribute(name, value);
	}
};

let surfaceCount = 0;

/** Writes recorded marks into one `<svg>`, reusing the elements of the last frame. */
class SvgSurface {
	readonly svg: SVGSVGElement;
	#document: Document;
	#defs: SVGDefsElement;
	#groups: Record<Layer, SVGGElement>;
	#idPrefix: string;
	#clips = new Map<string, SVGClipPathElement>();
	#clipCount = 0;
	#fade: { mask: SVGMaskElement; gradient: SVGLinearGradientElement; rect: SVGRectElement } | null =
		null;

	constructor(document: Document, slotName: string) {
		this.#document = document;
		surfaceCount += 1;
		this.#idPrefix = `mantle-chart-${surfaceCount}`;
		const svg = this.#create("svg");
		svg.setAttribute("data-slot", `${slotName}-svg`);
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		svg.style.position = "absolute";
		svg.style.inset = "0";
		svg.style.width = "100%";
		svg.style.height = "100%";
		svg.style.overflow = "hidden";
		// Why ltr: the engine aligns text to physical left and right, as canvas
		// does. SVG `text-anchor` follows the inherited direction, so an RTL
		// ancestor would flip each label to the other side of its anchor.
		svg.style.direction = "ltr";
		this.#defs = this.#create("defs");
		svg.append(this.#defs);
		this.#groups = {
			underlay: this.#create("g"),
			marks: this.#create("g"),
			overlay: this.#create("g"),
		};
		for (const layer of LAYERS) {
			svg.append(this.#groups[layer]);
		}
		this.svg = svg;
	}

	#create<TName extends keyof SVGElementTagNameMap>(name: TName): SVGElementTagNameMap[TName] {
		return this.#document.createElementNS(SVG_NAMESPACE, name);
	}

	/** A document-unique id for one of this surface's definitions. */
	id(name: string): string {
		return `${this.#idPrefix}-${name}`;
	}

	/** Add or replace a definition, such as a texture `<pattern>`. */
	define(element: SVGElement): void {
		const existing = element.id === "" ? null : this.#defs.querySelector(`#${element.id}`);
		if (existing == null) {
			this.#defs.append(element);
		} else {
			existing.replaceWith(element);
		}
	}

	/** Remove the definitions whose ids start with `prefix`. */
	undefine(prefix: string): void {
		for (const element of Array.from(this.#defs.children)) {
			if (element.id.startsWith(prefix)) {
				element.remove();
			}
		}
	}

	/** Write one frame's marks. */
	write(recorder: SvgRecorder, fade: EdgeFade | null): void {
		const usedClips = new Set<string>();
		for (const layer of LAYERS) {
			this.#writeLayer(this.#groups[layer], recorder.marks[layer], usedClips);
		}
		for (const [key, clip] of this.#clips) {
			if (!usedClips.has(key)) {
				clip.remove();
				this.#clips.delete(key);
			}
		}
		this.#writeFade(fade);
	}

	/** Write one group's children in place, reusing element `i` for mark `i`. */
	#writeLayer(group: SVGGElement, marks: readonly Mark[], usedClips: Set<string>): void {
		marks.forEach((mark, index) => {
			const tag = mark.type === "path" ? "path" : "text";
			const existing = group.children[index];
			let element: SVGElement;
			if (isSvgElement(existing) && existing.localName === tag) {
				element = existing;
			} else {
				element = this.#create(tag);
				if (existing == null) {
					group.append(element);
				} else {
					existing.replaceWith(element);
				}
			}
			const { state } = mark;
			const key = clipKey(state.clip);
			writeAttribute(
				element,
				"clip-path",
				key === "" ? null : `url(#${this.#clipFor(key, state.clip)})`,
			);
			if (key !== "") {
				usedClips.add(key);
			}
			writeStyle(element, "opacity", state.globalAlpha === 1 ? "" : String(state.globalAlpha));
			if (mark.type === "path") {
				writeAttribute(element, "d", mark.data);
				if (mark.paint === "fill") {
					writeStyle(element, "fill", state.fillStyle);
					writeStyle(element, "stroke", "none");
					writeStyle(element, "stroke-width", "");
					writeStyle(element, "stroke-linejoin", "");
					writeStyle(element, "stroke-linecap", "");
					writeStyle(element, "stroke-dasharray", "");
				} else {
					writeStyle(element, "fill", "none");
					writeStyle(element, "stroke", state.strokeStyle);
					writeStyle(element, "stroke-width", String(state.lineWidth));
					writeStyle(element, "stroke-linejoin", state.lineJoin);
					writeStyle(element, "stroke-linecap", state.lineCap);
					writeStyle(element, "stroke-dasharray", state.dash);
				}
				return;
			}
			writeAttribute(element, "x", coordinate(mark.x));
			writeAttribute(element, "y", coordinate(mark.y));
			writeStyle(element, "font", state.font);
			writeStyle(element, "fill", state.fillStyle);
			writeStyle(element, "text-anchor", TEXT_ANCHOR[state.textAlign]);
			writeStyle(element, "dominant-baseline", DOMINANT_BASELINE[state.textBaseline]);
			if (element.textContent !== mark.text) {
				element.textContent = mark.text;
			}
		});
		while (group.children.length > marks.length) {
			group.lastElementChild?.remove();
		}
	}

	#clipFor(key: string, rect: ClipRect | null): string {
		let clip = this.#clips.get(key);
		if (clip == null && rect != null) {
			clip = this.#create("clipPath");
			this.#clipCount += 1;
			clip.id = this.id(`clip-${this.#clipCount}`);
			const shape = this.#create("rect");
			shape.setAttribute("x", coordinate(rect.x));
			shape.setAttribute("y", coordinate(rect.y));
			shape.setAttribute("width", coordinate(rect.width));
			shape.setAttribute("height", coordinate(rect.height));
			clip.append(shape);
			this.#defs.append(clip);
			this.#clips.set(key, clip);
		}
		return clip?.id ?? "";
	}

	/**
	 * Fade the marks layer through a luminance mask: white keeps a mark, and the
	 * ramp at the left edge keeps `1 - alpha` of it, the share the canvas
	 * backend's erase leaves.
	 */
	#writeFade(fade: EdgeFade | null): void {
		const marks = this.#groups.marks;
		if (fade == null) {
			writeAttribute(marks, "mask", null);
			return;
		}
		if (this.#fade == null) {
			const mask = this.#create("mask");
			mask.id = this.id("fade");
			mask.setAttribute("maskUnits", "userSpaceOnUse");
			const gradient = this.#create("linearGradient");
			gradient.id = this.id("fade-ramp");
			gradient.setAttribute("gradientUnits", "userSpaceOnUse");
			const from = this.#create("stop");
			from.setAttribute("offset", "0");
			from.setAttribute("stop-color", "white");
			const to = this.#create("stop");
			to.setAttribute("offset", "1");
			to.setAttribute("stop-color", "white");
			gradient.append(from, to);
			const rect = this.#create("rect");
			rect.setAttribute("x", "0");
			rect.setAttribute("y", "0");
			rect.setAttribute("width", "100%");
			rect.setAttribute("height", "100%");
			rect.setAttribute("fill", `url(#${gradient.id})`);
			mask.append(rect);
			this.#defs.append(gradient, mask);
			this.#fade = { mask, gradient, rect };
		}
		const { gradient } = this.#fade;
		writeAttribute(gradient, "x1", coordinate(fade.left));
		writeAttribute(gradient, "x2", coordinate(fade.left + fade.width));
		gradient.firstElementChild?.setAttribute("stop-opacity", String(1 - fade.alpha));
		writeAttribute(marks, "mask", `url(#${this.#fade.mask.id})`);
	}
}

class SvgBackend implements PaintBackend {
	readonly kind = "svg";
	readonly element: SVGSVGElement;
	#root: HTMLElement;
	#surface: SvgSurface;
	#recorder: SvgRecorder;
	#fade: EdgeFade | null = null;
	#fontFamily: string | null = null;

	constructor({ root, slotName }: PaintBackendOptions) {
		this.#root = root;
		const document = root.ownerDocument;
		this.#surface = new SvgSurface(document, slotName);
		this.#recorder = new SvgRecorder(document);
		this.element = this.#surface.svg;
	}

	paintSignature({
		orientation,
	}: {
		devicePixelRatio: number;
		orientation: BarOrientation;
	}): string {
		// Why orientation alone: CSS resolves the colors and the tiles are vector,
		// so only the rung textures' direction changes what this backend writes.
		return orientation;
	}

	resolvePaint({
		series,
		orientation,
		signature,
	}: {
		series: readonly SeriesMeta[];
		devicePixelRatio: number;
		orientation: BarOrientation;
		signature: string;
	}): ResolvedPaint {
		// A pass follows a Root `className` or `style` change, which can change the font.
		this.#fontFamily = null;
		const colors = new Map<string, string>();
		const inputs = new Map<string, string>();
		const barFills = new Map<string, string>();
		const texturePrefix = this.#surface.id("texture-");
		this.#surface.undefine(texturePrefix);
		series.forEach((meta, index) => {
			colors.set(meta.dataKey, meta.color);
			inputs.set(meta.dataKey, `${meta.colorInput}|${meta.texture}`);
			if (meta.mark !== "bar" || meta.texture === "solid") {
				return;
			}
			const id = `${texturePrefix}${index}`;
			this.#surface.define(this.#texturePattern(id, meta.texture, meta.color, orientation));
			barFills.set(meta.dataKey, `url(#${id})`);
		});
		return {
			signature,
			series: colors,
			inputs,
			barFills,
			chrome: CHART_CHROME_CSS,
			fontFamily: this.#readFontFamily,
			resolve: cssSeriesColor,
		};
	}

	/**
	 * The Root's font family, read once and only for a chart that measures axis
	 * labels: a chart with no axis reads no computed style at all.
	 */
	#readFontFamily = (): string => {
		if (this.#fontFamily == null) {
			const view = this.#root.ownerDocument.defaultView;
			this.#fontFamily = view?.getComputedStyle(this.#root).fontFamily || "sans-serif";
		}
		return this.#fontFamily;
	};

	#texturePattern(
		id: string,
		texture: Exclude<SeriesMeta["texture"], "solid">,
		color: string,
		orientation: BarOrientation,
	): SVGPatternElement {
		const document = this.#root.ownerDocument;
		const pattern = document.createElementNS(SVG_NAMESPACE, "pattern");
		pattern.id = id;
		pattern.setAttribute("patternUnits", "userSpaceOnUse");
		pattern.setAttribute("width", String(TEXTURE_TILE_SIZE));
		pattern.setAttribute("height", String(TEXTURE_TILE_SIZE));
		const tile = new SvgRecorder(document);
		paintTextureTile(tile, { texture, ground: textureGroundColor(color), ink: color, orientation });
		const group = document.createElementNS(SVG_NAMESPACE, "g");
		for (const mark of tile.marks.overlay) {
			if (mark.type !== "path") {
				continue;
			}
			const path = document.createElementNS(SVG_NAMESPACE, "path");
			path.setAttribute("d", mark.data);
			if (mark.paint === "fill") {
				path.style.setProperty("fill", mark.state.fillStyle);
			} else {
				path.style.setProperty("fill", "none");
				path.style.setProperty("stroke", mark.state.strokeStyle);
				path.style.setProperty("stroke-width", String(mark.state.lineWidth));
				path.style.setProperty("stroke-linecap", mark.state.lineCap);
			}
			group.append(path);
		}
		pattern.append(group);
		return pattern;
	}

	measureContext(): PaintContext {
		return this.#recorder;
	}

	begin(): PaintContext {
		this.#recorder.reset();
		this.#fade = null;
		return this.#recorder;
	}

	composite(
		_context: PaintContext,
		layers: { underlay: () => void; marks: () => void; fade: EdgeFade | null },
	): void {
		const recorder = this.#recorder;
		recorder.layer = "underlay";
		layers.underlay();
		recorder.layer = "marks";
		layers.marks();
		recorder.layer = "overlay";
		this.#fade = layers.fade;
	}

	end(): void {
		this.#surface.write(this.#recorder, this.#fade);
	}

	release(): void {}

	destroy(): void {}
}

/**
 * Build the SVG backend of one chart.
 *
 * @example
 * ```ts
 * const backend = createSvgBackend({ root, plot, slotName: "bar-chart", onColorsChange });
 * plot.prepend(backend.element);
 * ```
 */
const createSvgBackend: PaintBackendFactory = (options) => new SvgBackend(options);

export {
	//,
	createSvgBackend,
	SvgRecorder,
};
