/**
 * The Tailwind CSS v4 conflict resolver behind `cx`.
 *
 * Each class gets a class group from its root prefix and the kind of its value (a length, a
 * keyword, or a color), so two classes that look alike but set different CSS properties stay
 * apart: `text-heading-xl` sets the font size and `text-strong` sets the color. The class group
 * ids and the conflict table follow `tailwind-merge` (MIT, Dany Castillo), which the tests use as
 * the oracle.
 */

// --- Value validators ----------------------------------------------------------------------
// They follow `tailwind-merge` 3.7.1 (`src/lib/validators.ts`). A label such as `length:` in
// `[length:2px]` means a different class group for each root, so each root asks its own question.

const ARBITRARY_VALUE = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
const ARBITRARY_VARIABLE = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
const FRACTION = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
const TSHIRT = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
const LENGTH_UNIT =
	/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|Q|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^--spacing\(.+\)|^0$/;
const COLOR_FUNCTION =
	/^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix|color|light-dark|contrast-color|device-cmyk|--alpha)\(.+\)$/i;
const MASK_POSITION =
	/^(?:_*[+-]?(?:\d|\.\d)|[\w-]+\(|_*(?:inherit|initial|revert(?:-layer)?|unset)_*$)/i;
const SHADOW = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
const IMAGE =
	/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;

const isNumber = (value: string) => value !== "" && !Number.isNaN(Number(value));
const isInteger = (value: string) => value !== "" && Number.isInteger(Number(value));
const isPercent = (value: string) => value.endsWith("%") && isNumber(value.slice(0, -1));
// Why char codes first: most values are theme values, and `[` (91) or `(` (40) rules them out
// with no regex run.
const isArbitrary = (value: string) =>
	(value.charCodeAt(0) === 91 && ARBITRARY_VALUE.test(value)) ||
	(value.charCodeAt(0) === 40 && ARBITRARY_VARIABLE.test(value));

/**
 * Tests an arbitrary value, `[label:value]` or `[value]`: the label when it has one, else the
 * value. A theme value such as `red-500` fails.
 */
const testValue = (
	value: string,
	testLabel: (label: string) => boolean,
	testContent: (content: string) => boolean,
) => {
	const match = value.charCodeAt(0) === 91 ? ARBITRARY_VALUE.exec(value) : null;
	if (match == null) {
		return false;
	}
	return match[1] ? testLabel(match[1]) : testContent(match[2] ?? "");
};

/** Tests an arbitrary variable, `(label:--var)` or `(--var)`: the label, or `isUnlabeled`. */
const testVariable = (
	value: string,
	testLabel: (label: string) => boolean,
	isUnlabeled = false,
) => {
	const match = value.charCodeAt(0) === 40 ? ARBITRARY_VARIABLE.exec(value) : null;
	if (match == null) {
		return false;
	}
	return match[1] ? testLabel(match[1]) : isUnlabeled;
};

const never = () => false;
const isLengthLabel = (label: string) => label === "length";
const isSizeLabel = (label: string) =>
	label === "length" || label === "size" || label === "bg-size";
const isPositionLabel = (label: string) => label === "position" || label === "percentage";
const isImageLabel = (label: string) => label === "image" || label === "url";
const isShadowLabel = (label: string) => label === "shadow";
const isWeightLabel = (label: string) => label === "number" || label === "weight";
const isFamilyLabel = (label: string) => label === "family-name";
// Why the color check: a color function such as `hsl(0 0% 0%)` holds a percent.
const isLengthContent = (content: string) =>
	LENGTH_UNIT.test(content) && !COLOR_FUNCTION.test(content);

/** An arbitrary length, such as `[2px]`, `[2cap]`, `[0]`, `[length:x]`, or `(length:--x)`. */
const isArbitraryLength = (value: string) =>
	testValue(value, isLengthLabel, isLengthContent) || testVariable(value, isLengthLabel);

/** A border, ring, or outline width, such as `2`, `[2px]`, or `(length:--w)`. */
const isBorderWidth = (value: string) => isNumber(value) || isArbitraryLength(value);

/** A gradient stop position, such as `10%` or `[12px]`. */
const isStopPosition = (value: string) => isPercent(value) || isArbitraryLength(value);

/** A mask gradient stop position, such as `10`, `10%`, `[12px]`, or `(--x)`. */
const isMaskStopPosition = (value: string) =>
	isNumber(value) ||
	isPercent(value) ||
	testValue(
		value,
		(label) => label !== "color",
		(content) => MASK_POSITION.test(content) && !COLOR_FUNCTION.test(content),
	) ||
	testVariable(value, (label) => label !== "color", true);

const BG_POSITION =
	/^(center|top|bottom|left|right|top-left|left-top|top-right|right-top|bottom-right|right-bottom|bottom-left|left-bottom)$/;

/** A background or mask position, such as `center` or `[position:10px]`. */
const isBgPosition = (value: string) =>
	BG_POSITION.test(value) ||
	testValue(value, isPositionLabel, never) ||
	testVariable(value, isPositionLabel) ||
	(value.startsWith("position-") && isArbitrary(value.slice(9)));

/** A background or mask size, such as `cover` or `[length:200px]`. */
const isBgSize = (value: string) =>
	/^(auto|cover|contain)$/.test(value) ||
	testValue(value, isSizeLabel, never) ||
	testVariable(value, isSizeLabel) ||
	(value.startsWith("size-") && isArbitrary(value.slice(5)));

/** A shadow size, such as `lg`, `none`, `[0_1px_2px_black]`, or `(--shadow)`. */
const isShadowSize = (value: string) =>
	value === "none" ||
	TSHIRT.test(value) ||
	testValue(value, isShadowLabel, (content) => SHADOW.test(content)) ||
	testVariable(value, isShadowLabel, true);

// --- Class tables ----------------------------------------------------------------------------

/** Classes with no value, mapped to their class group. */
const KEYWORDS: Record<string, string | undefined> = Object.create(null);
for (const [group, words] of [
	[
		"display",
		"block inline-block inline flex inline-flex table inline-table table-caption table-cell table-column table-column-group table-footer-group table-header-group table-row-group table-row flow-root grid inline-grid contents list-item hidden",
	],
	["position", "static fixed absolute relative sticky"],
	["visibility", "visible invisible collapse"],
	["isolation", "isolate isolation-auto"],
	["text-transform", "uppercase lowercase capitalize normal-case"],
	["font-style", "italic not-italic"],
	["font-smoothing", "antialiased subpixel-antialiased"],
	["text-decoration", "underline overline line-through no-underline"],
	["text-overflow", "truncate text-ellipsis text-clip"],
	["fvn-normal", "normal-nums"],
	["fvn-ordinal", "ordinal"],
	["fvn-slashed-zero", "slashed-zero"],
	["fvn-figure", "lining-nums oldstyle-nums"],
	["fvn-spacing", "proportional-nums tabular-nums"],
	["fvn-fraction", "diagonal-fractions stacked-fractions"],
	["sr", "sr-only"],
	["not-sr", "not-sr-only"],
	["container", "container"],
	["container-type", "@container @container-normal @container-size"],
	["box", "box-border box-content"],
	["border-collapse", "border-collapse border-separate"],
	["table-layout", "table-auto table-fixed"],
	["transition-behavior", "transition-normal transition-discrete"],
	["ring-w-inset", "ring-inset"],
	["flex-direction", "flex-row flex-row-reverse flex-col flex-col-reverse"],
	["flex-wrap", "flex-wrap flex-wrap-reverse flex-nowrap"],
	["bg-attachment", "bg-fixed bg-local bg-scroll"],
	["bg-repeat", "bg-repeat bg-no-repeat bg-repeat-x bg-repeat-y bg-repeat-round bg-repeat-space"],
	["list-style-position", "list-inside list-outside"],
	["space-x-reverse", "space-x-reverse"],
	["space-y-reverse", "space-y-reverse"],
	["divide-x-reverse", "divide-x-reverse"],
	["divide-y-reverse", "divide-y-reverse"],
	["break", "break-normal break-words break-all break-keep"],
	["transform", "transform transform-cpu transform-gpu transform-none"],
	["filter", "filter filter-none"],
	["backdrop-filter", "backdrop-filter backdrop-filter-none"],
	["translate-none", "translate-none"],
	["snap-strictness", "snap-mandatory snap-proximity"],
	["snap-stop", "snap-normal snap-always"],
	["snap-align", "snap-start snap-end snap-center snap-align-none"],
	["snap-type", "snap-none snap-x snap-y snap-both"],
	["mask-type", "mask-type-alpha mask-type-luminance"],
	["mask-mode", "mask-alpha mask-luminance mask-match"],
	[
		"mask-repeat",
		"mask-repeat mask-no-repeat mask-repeat-x mask-repeat-y mask-repeat-round mask-repeat-space",
	],
	["mask-composite", "mask-add mask-subtract mask-intersect mask-exclude"],
	["transform-style", "transform-3d transform-flat"],
	["scale-3d", "scale-3d"],
	["backface", "backface-visible backface-hidden"],
	["field-sizing", "field-sizing-fixed field-sizing-content"],
	["forced-color-adjust", "forced-color-adjust-auto forced-color-adjust-none"],
	["scroll-behavior", "scroll-auto scroll-smooth"],
	// Mantle's own font-size utilities (packages/mantle/src/mantle.css).
	["font-size", "text-mono text-size-inherit"],
] as const) {
	for (const word of words.split(" ")) {
		KEYWORDS[word] = group;
	}
}

/**
 * Roots that take any value, mapped to their class group. A root that maps to itself is listed
 * once in the space-separated `SAME_NAME_ROOTS`.
 */
const ROOTS: Record<string, string | undefined> = Object.assign(Object.create(null), {
	"@container": "container-type",
	"backdrop-filter": "backdrop-filter",
	filter: "filter",
	align: "vertical-align",
	block: "block-size",
	inline: "inline-size",
	"max-block": "max-block-size",
	"max-inline": "max-inline-size",
	"min-block": "min-block-size",
	"min-inline": "min-inline-size",
	caret: "caret-color",
	col: "col-start-end",
	content: "align-content",
	"inset-e": "end",
	"inset-s": "start",
	items: "align-items",
	justify: "justify-content",
	origin: "transform-origin",
	placeholder: "placeholder-color",
	row: "row-start-end",
	scheme: "color-scheme",
	"scrollbar-thumb": "scrollbar-thumb-color",
	"scrollbar-track": "scrollbar-track-color",
	self: "align-self",
});
const SAME_NAME_ROOTS = `aspect columns break-after break-before break-inside box-decoration float clear overflow overflow-x
	overflow-y overscroll overscroll-x overscroll-y inset inset-x inset-y start end inset-bs inset-be top right bottom left z basis
	grow shrink order grid-cols col-start col-end grid-rows row-start row-end grid-flow auto-cols auto-rows gap gap-x gap-y
	justify-items justify-self place-content place-items place-self p px py ps pe pbs pbe pt pr pb pl m mx my ms me mbs mbe mt mr
	mb ml space-x space-y size w min-w max-w h
	min-h max-h tracking line-clamp leading list-image indent whitespace wrap hyphens underline-offset bg-clip bg-origin
	bg-size bg-position bg-blend mix-blend opacity brightness contrast grayscale hue-rotate invert saturate sepia backdrop-blur
	backdrop-brightness backdrop-contrast backdrop-grayscale backdrop-hue-rotate backdrop-invert backdrop-opacity backdrop-saturate
	backdrop-sepia border-spacing border-spacing-x border-spacing-y caption duration ease delay animate perspective
	perspective-origin rotate rotate-x rotate-y rotate-z scale scale-x scale-y scale-z skew skew-x skew-y translate translate-x
	translate-y translate-z zoom accent appearance cursor pointer-events resize scroll-m scroll-mx scroll-my scroll-ms scroll-me
	scroll-mbs scroll-mbe scroll-mt scroll-mr scroll-mb scroll-ml scroll-p scroll-px scroll-py scroll-ps scroll-pe scroll-pbs
	scroll-pbe scroll-pt scroll-pr scroll-pb scroll-pl select will-change fill rounded rounded-s rounded-e rounded-t rounded-r
	rounded-b rounded-l rounded-ss rounded-se rounded-ee rounded-es rounded-tl rounded-tr rounded-br rounded-bl mask-clip
	mask-origin mask-size mask-position font-features font-stretch outline-offset divide-x divide-y blur scrollbar-gutter`;
for (const root of SAME_NAME_ROOTS.split(/\s+/)) {
	ROOTS[root] = root;
}

/** Roots that are a class with no value too, such as `rounded`, `shadow`, and `grow`. */
const BARE_ROOTS = new Set(
	"rounded rounded-s rounded-e rounded-t rounded-r rounded-b rounded-l rounded-ss rounded-se rounded-ee rounded-es rounded-tl rounded-tr rounded-br rounded-bl shadow inset-shadow drop-shadow ring inset-ring outline grow shrink transition blur backdrop-blur invert backdrop-invert grayscale backdrop-grayscale sepia backdrop-sepia divide-x divide-y resize mask border".split(
		" ",
	),
);

/**
 * Value shapes for roots where a custom class must not merge. `my-app` and `top-ranked` look
 * like `my-4` and `top-2`, so these roots check the value first.
 */
const SPACING_VALUE =
	/^(\d*\.?\d+|\d+\/\d+|px|auto|full|screen|[sld]?v[wh]|min|max|fit|em|lh|none|prose|screen-\w+|(\d+(\.\d+)?)?(xs|sm|md|lg|xl))$/;
const VALUE_SHAPES: Record<string, { test: (value: string) => boolean } | undefined> =
	Object.create(null);
for (const root of "block inline min-block max-block min-inline max-inline p px py ps pe pbs pbe pt pr pb pl m mx my ms me mbs mbe mt mr mb ml gap gap-x gap-y inset inset-x inset-y inset-s inset-e start end top right bottom left space-x space-y w h size min-w min-h max-w max-h basis indent scroll-m scroll-mx scroll-my scroll-ms scroll-me scroll-mbs scroll-mbe scroll-mt scroll-mr scroll-mb scroll-ml scroll-p scroll-px scroll-py scroll-ps scroll-pe scroll-pbs scroll-pbe scroll-pt scroll-pr scroll-pb scroll-pl inset-bs inset-be translate translate-x translate-y translate-z border-spacing border-spacing-x border-spacing-y".split(
	" ",
)) {
	VALUE_SHAPES[root] = SPACING_VALUE;
}
VALUE_SHAPES.z = /^(\d+|auto)$/;
VALUE_SHAPES.order = /^(\d+|first|last|none)$/;

/**
 * The values of the other roots that check theirs, from `tailwind-merge` 3.7.1. Each line is
 * `roots:values`. Tokens: `#` a number, `#i` an integer, `/` a fraction, `%` a percent, `ts` a
 * T-shirt size, and `~` no value. An arbitrary value passes for each root.
 */
const PERCENT_VALUE = /^\d*\.?\d+%$/;
const POSITIONS =
	"center top bottom left right top-left left-top top-right right-top bottom-right right-bottom bottom-left left-bottom";
const BLEND_MODES =
	"normal multiply screen overlay darken lighten color-dodge color-burn hard-light soft-light difference exclusion hue saturation color luminosity";
const SECONDARY_AXIS = "start end center stretch center-safe end-safe";
const PRIMARY_AXIS = `${SECONDARY_AXIS} between around evenly baseline`;
for (const line of `self:auto ${SECONDARY_AXIS} baseline baseline-last|select:none text all auto
	|whitespace:normal nowrap pre pre-line pre-wrap break-spaces
	|scheme:normal dark light light-dark only-dark only-light|align:baseline top middle bottom text-top text-bottom sub super
	|animate:none spin ping pulse bounce|appearance:none auto|aspect:auto square video /
	|auto-cols auto-rows:auto min max fr|blur backdrop-blur:~ none ts
	|brightness contrast hue-rotate saturate backdrop-brightness backdrop-contrast backdrop-hue-rotate backdrop-saturate backdrop-opacity opacity delay outline-offset:#
	|grayscale invert sepia backdrop-grayscale backdrop-invert backdrop-sepia grow shrink:~ #
	|bg-blend:${BLEND_MODES}|mix-blend:${BLEND_MODES} plus-darker plus-lighter|bg-clip:border padding content text
	|bg-origin:border padding content|mask-clip mask-origin:border padding content fill stroke view|box-decoration:slice clone
	|break-after break-before:auto avoid all avoid-page page left right column|break-inside:auto avoid avoid-page avoid-column
	|caption:top bottom|clear:left right both none start end|float:right left none start end|columns:# auto ts
	|cursor:auto default pointer wait text move help not-allowed none context-menu progress cell crosshair vertical-text alias copy no-drop grab grabbing all-scroll col-resize row-resize n-resize e-resize s-resize w-resize ne-resize nw-resize se-resize sw-resize ew-resize ns-resize nesw-resize nwse-resize zoom-in zoom-out
	|duration:# initial|ease:linear initial in out in-out out-strong
	|font-stretch:% ultra-condensed extra-condensed condensed semi-condensed normal semi-expanded expanded extra-expanded ultra-expanded
	|grid-cols grid-rows:#i none subgrid|grid-flow:row col dense row-dense col-dense|col-start col-end row-start row-end:#i auto
	|hyphens:none manual auto|items:${SECONDARY_AXIS} baseline baseline-last|justify:${PRIMARY_AXIS} normal
	|justify-items:${SECONDARY_AXIS} normal|justify-self place-self:auto ${SECONDARY_AXIS}|place-content:${PRIMARY_AXIS}
	|place-items:${SECONDARY_AXIS} baseline|leading:none tight snug normal relaxed loose px em #|line-clamp:# none
	|overflow overflow-x overflow-y:auto hidden clip visible scroll|overscroll overscroll-x overscroll-y:auto contain none
	|perspective:dramatic near normal midrange distant none|pointer-events:auto none|resize:none ~ y x
	|rounded rounded-s rounded-e rounded-t rounded-r rounded-b rounded-l rounded-ss rounded-se rounded-ee rounded-es rounded-tl rounded-tr rounded-br rounded-bl:~ none full ts
	|rotate rotate-x rotate-y rotate-z scale scale-x scale-y scale-z:none #|skew skew-x skew-y:#
	|tracking:tighter tight normal wide wider widest|will-change:auto scroll contents transform|wrap:break-word anywhere normal
	|zoom:#i|underline-offset:# auto|origin perspective-origin:${POSITIONS}
	|divide-x divide-y:~ #|list-image:none|scrollbar-gutter:auto stable both
	|filter backdrop-filter:none|@container:normal size`.split("|")) {
	const [roots = "", values = ""] = line.split(":");
	// Why a set and flags over one regex per line: V8 compiles each regex it runs, and a set of
	// the words the source already holds costs less memory.
	const words = new Set<string>();
	const flags = new Set<string>();
	for (const token of values.trim().split(" ")) {
		(/^(#|#i|\/|%|ts)$/.test(token) ? flags : words).add(token === "~" ? "" : token);
	}
	const shape = {
		test: (value: string) =>
			words.has(value) ||
			(flags.has("#") && isNumber(value)) ||
			(flags.has("#i") && isInteger(value)) ||
			(flags.has("/") && FRACTION.test(value)) ||
			(flags.has("%") && PERCENT_VALUE.test(value)) ||
			(flags.has("ts") && TSHIRT.test(value)),
	};
	for (const root of roots.trim().split(" ")) {
		VALUE_SHAPES[root] = shape;
	}
}
VALUE_SHAPES.row = /^(auto|\d+|span-(full|\d+|\[.+\]|\(.+\)))$/;
VALUE_SHAPES.col = VALUE_SHAPES.row;

/** Mantle's type roles (packages/mantle/src/mantle.css): a font size, never a color. */
const TYPE_ROLE = /^(heading|paragraph)-(base|(\d+(\.\d+)?)?(xs|sm|md|lg|xl))$/;

/** Roots whose class group depends on the value. */
const VALUE_ROOTS: Record<string, ((value: string) => string | undefined) | undefined> =
	Object.assign(Object.create(null), {
		text: (value: string) => {
			if (/^(left|center|right|justify|start|end)$/.test(value)) {
				return "text-alignment";
			}
			if (/^(wrap|nowrap|balance|pretty)$/.test(value)) {
				return "text-wrap";
			}
			const isSize =
				value === "base" || TSHIRT.test(value) || TYPE_ROLE.test(value) || isArbitraryLength(value);
			return isSize ? "font-size" : "text-color";
		},
		font: (value: string) => {
			// tailwind-merge reads an unlabeled arbitrary value or variable as a weight.
			const isWeight =
				/^(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(value) ||
				testValue(value, isWeightLabel, () => true) ||
				testVariable(value, isWeightLabel, true);
			if (isWeight) {
				return "font-weight";
			}
			// Any other label, such as `[length:2px]`, names no font utility.
			return isArbitrary(value) &&
				!testValue(value, isFamilyLabel, never) &&
				!testVariable(value, isFamilyLabel)
				? undefined
				: "font-family";
		},
		bg: (value: string) => {
			if (isBgPosition(value)) {
				return "bg-position";
			}
			if (isBgSize(value)) {
				return "bg-size";
			}
			const isImage =
				value === "none" ||
				/^(linear-to-(t|tr|r|br|b|bl|l|tl)|(linear|conic)-\d+|(radial|conic)|(linear|radial|conic)-(\[.+\]|\(.+\)))$/.test(
					value,
				) ||
				testValue(value, isImageLabel, (content) => IMAGE.test(content)) ||
				testVariable(value, isImageLabel);
			return isImage ? "bg-image" : "bg-color";
		},
		decoration: (value: string) => {
			if (/^(solid|double|dotted|dashed|wavy)$/.test(value)) {
				return "text-decoration-style";
			}
			const isThickness =
				isNumber(value) ||
				value === "auto" ||
				value === "from-font" ||
				isArbitraryLength(value) ||
				testVariable(value, isPositionLabel);
			return isThickness ? "text-decoration-thickness" : "text-decoration-color";
		},
		shadow: (value: string) =>
			value === "" || value === "inner" || isShadowSize(value) ? "shadow" : "shadow-color",
		"inset-shadow": (value: string) =>
			isShadowSize(value) ? "inset-shadow" : "inset-shadow-color",
		"text-shadow": (value: string) => (isShadowSize(value) ? "text-shadow" : "text-shadow-color"),
		"drop-shadow": (value: string) =>
			value === "" || isShadowSize(value) ? "drop-shadow" : "drop-shadow-color",
		ring: (value: string) => (value === "" || isBorderWidth(value) ? "ring-w" : "ring-color"),
		"inset-ring": (value: string) =>
			value === "" || isBorderWidth(value) ? "inset-ring-w" : "inset-ring-color",
		"ring-offset": (value: string) =>
			isNumber(value) || testValue(value, isLengthLabel, isLengthContent)
				? "ring-offset-w"
				: "ring-offset-color",
		outline: (value: string) => {
			if (/^(solid|dashed|dotted|double|none|hidden)$/.test(value)) {
				return "outline-style";
			}
			return value === "" || isBorderWidth(value) ? "outline-w" : "outline-color";
		},
		stroke: (value: string) =>
			isBorderWidth(value) || testValue(value, (label) => label === "number", isNumber)
				? "stroke-w"
				: "stroke",
		from: (value: string) => (isStopPosition(value) ? "gradient-from-pos" : "gradient-from"),
		via: (value: string) => (isStopPosition(value) ? "gradient-via-pos" : "gradient-via"),
		to: (value: string) => (isStopPosition(value) ? "gradient-to-pos" : "gradient-to"),
		divide: (value: string) =>
			/^(solid|dashed|dotted|double|hidden|none)$/.test(value) ? "divide-style" : "divide-color",
		flex: (value: string) =>
			isNumber(value) ||
			FRACTION.test(value) ||
			/^(auto|initial|none)$/.test(value) ||
			isArbitrary(value)
				? "flex"
				: undefined,
		transition: (value: string) =>
			/^(|all|colors|opacity|shadow|transform|none)$/.test(value) || isArbitrary(value)
				? "transition"
				: undefined,
		transform: (value: string) => (isArbitrary(value) ? "transform" : undefined),
		object: (value: string) => {
			if (/^(contain|cover|fill|none|scale-down)$/.test(value)) {
				return "object-fit";
			}
			return BG_POSITION.test(value) || isArbitrary(value) ? "object-position" : undefined;
		},
		list: (value: string) =>
			/^(disc|decimal|none)$/.test(value) || isArbitrary(value) ? "list-style-type" : undefined,
		content: (value: string) => {
			if (
				/^(normal|center|start|end|between|around|evenly|baseline|stretch|(center|end)-safe)$/.test(
					value,
				)
			) {
				return "align-content";
			}
			return value === "none" || isArbitrary(value) ? "content" : undefined;
		},
		mask: (value: string) => {
			const stop = /^(linear|radial|conic|[trblxy])-(from|to)-(.+)$/.exec(value);
			if (stop != null) {
				const [, direction, edge, stopValue = ""] = stop;
				const kind = isMaskStopPosition(stopValue) ? "pos" : "color";
				return `mask-image-${direction}-${edge}-${kind}`;
			}
			if (/^(linear|conic)-\d*\.?\d+$/.test(value)) {
				return value.startsWith("linear") ? "mask-image-linear-pos" : "mask-image-conic-pos";
			}
			if (value.startsWith("radial-at-")) {
				return BG_POSITION.test(value.slice(10)) ? "mask-image-radial-pos" : undefined;
			}
			if (/^radial-(closest|farthest)-(side|corner)$/.test(value)) {
				return "mask-image-radial-size";
			}
			if (value.startsWith("radial-")) {
				return isArbitrary(value.slice(7)) ? "mask-image-radial" : undefined;
			}
			if (/^(circle|ellipse)$/.test(value)) {
				return "mask-image-radial-shape";
			}
			if (isBgPosition(value)) {
				return "mask-position";
			}
			if (isBgSize(value)) {
				return "mask-size";
			}
			if (value === "no-clip") {
				return "mask-clip";
			}
			return value === "none" || isArbitrary(value) ? "mask-image" : undefined;
		},
		touch: (value: string) => {
			if (/^pan-(x|left|right)$/.test(value)) {
				return "touch-x";
			}
			if (/^pan-(y|up|down)$/.test(value)) {
				return "touch-y";
			}
			if (value === "pinch-zoom") {
				return "touch-pz";
			}
			return /^(auto|none|manipulation)$/.test(value) ? "touch" : undefined;
		},
		scrollbar: (value: string) => (/^(auto|thin|none)$/.test(value) ? "scrollbar-w" : undefined),
		tab: (value: string) => (isInteger(value) || isArbitrary(value) ? "tab-size" : undefined),
	});

/** `border`, `border-x`, … : a width, a style, or a color. */
const BORDER_SIDES = new Set(["x", "y", "s", "e", "bs", "be", "t", "r", "b", "l"]);
const borderGroup = (value: string) => {
	const dash = value.indexOf("-");
	const side = dash < 0 ? value : value.slice(0, dash);
	if (BORDER_SIDES.has(side)) {
		const sideValue = dash < 0 ? "" : value.slice(dash + 1);
		return sideValue === "" || isBorderWidth(sideValue)
			? `border-w-${side}`
			: `border-color-${side}`;
	}
	if (/^(solid|dashed|dotted|double|hidden|none)$/.test(value)) {
		return "border-style";
	}
	return value === "" || isBorderWidth(value) ? "border-w" : "border-color";
};

// --- Conflicts -------------------------------------------------------------------------------

/**
 * Class groups that a later class in the key group also removes. `font-size:leading` is mantle's
 * choice over tailwind-merge 3.7: a later `text-xl` resets the line height that `leading-*` set.
 */
const CONFLICTS: Record<string, string[] | undefined> = Object.create(null);
for (const line of `font-size:leading|container-named:container-type|overflow:overflow-x overflow-y|overscroll:overscroll-x overscroll-y|inset:inset-x inset-y inset-bs inset-be start end top right bottom left|inset-x:start end right left|inset-y:inset-bs inset-be top bottom|flex:basis grow shrink|gap:gap-x gap-y|place-content:align-content justify-content|place-items:align-items justify-items|place-self:align-self justify-self|p:px py ps pe pbs pbe pt pr pb pl|px:ps pe pr pl|py:pbs pbe pt pb|m:mx my ms me mbs mbe mt mr mb ml|mx:ms me mr ml|my:mbs mbe mt mb|size:w h|fvn-normal:fvn-ordinal fvn-slashed-zero fvn-figure fvn-spacing fvn-fraction|fvn-ordinal:fvn-normal|fvn-slashed-zero:fvn-normal|fvn-figure:fvn-normal|fvn-spacing:fvn-normal|fvn-fraction:fvn-normal|line-clamp:display overflow|sr:not-sr position size w h p px py ps pe pbs pbe pt pr pb pl m mx my ms me mbs mbe mt mr mb ml overflow overflow-x overflow-y whitespace|not-sr:sr|rounded:rounded-s rounded-e rounded-t rounded-r rounded-b rounded-l rounded-ss rounded-se rounded-ee rounded-es rounded-tl rounded-tr rounded-br rounded-bl|rounded-s:rounded-ss rounded-es|rounded-e:rounded-se rounded-ee|rounded-t:rounded-tl rounded-tr|rounded-r:rounded-tr rounded-br|rounded-b:rounded-br rounded-bl|rounded-l:rounded-tl rounded-bl|border-spacing:border-spacing-x border-spacing-y|border-w:border-w-x border-w-y border-w-s border-w-e border-w-bs border-w-be border-w-t border-w-r border-w-b border-w-l|border-w-x:border-w-s border-w-e border-w-r border-w-l|border-w-y:border-w-bs border-w-be border-w-t border-w-b|border-color:border-color-x border-color-y border-color-s border-color-e border-color-bs border-color-be border-color-t border-color-r border-color-b border-color-l|border-color-x:border-color-s border-color-e border-color-r border-color-l|border-color-y:border-color-bs border-color-be border-color-t border-color-b|mask-image-x-from-pos:mask-image-r-from-pos mask-image-l-from-pos|mask-image-x-to-pos:mask-image-r-to-pos mask-image-l-to-pos|mask-image-x-from-color:mask-image-r-from-color mask-image-l-from-color|mask-image-x-to-color:mask-image-r-to-color mask-image-l-to-color|mask-image-y-from-pos:mask-image-t-from-pos mask-image-b-from-pos|mask-image-y-to-pos:mask-image-t-to-pos mask-image-b-to-pos|mask-image-y-from-color:mask-image-t-from-color mask-image-b-from-color|mask-image-y-to-color:mask-image-t-to-color mask-image-b-to-color|translate:translate-x translate-y translate-none|translate-none:translate translate-x translate-y translate-z|scroll-m:scroll-mx scroll-my scroll-ms scroll-me scroll-mbs scroll-mbe scroll-mt scroll-mr scroll-mb scroll-ml|scroll-mx:scroll-ms scroll-me scroll-mr scroll-ml|scroll-my:scroll-mbs scroll-mbe scroll-mt scroll-mb|scroll-p:scroll-px scroll-py scroll-ps scroll-pe scroll-pbs scroll-pbe scroll-pt scroll-pr scroll-pb scroll-pl|scroll-px:scroll-ps scroll-pe scroll-pr scroll-pl|scroll-py:scroll-pbs scroll-pbe scroll-pt scroll-pb|touch:touch-x touch-y touch-pz|touch-x:touch|touch-y:touch|touch-pz:touch`.split(
	"|",
)) {
	const [group = "", others = ""] = line.split(":");
	CONFLICTS[group] = others.split(" ");
}

// --- Lookup --------------------------------------------------------------------------------

/**
 * Each class group as a small integer, with the integers of the groups it overrides. The key
 * space is the fixed set of class group names in the tables above.
 */
const groupIndexes = new Map<string, number>();
const groupConflicts: number[][] = [];
/**
 * Room for every class group under one variant key; an id is `variant slot * GROUP_SLOTS + group`.
 * Arbitrary properties such as `[--brand:red]` add groups, so a group past the limit does not merge.
 */
const GROUP_SLOTS = 1 << 16;
/** Group slots that arbitrary properties cannot take, so each built-in group still has room. */
const BUILT_IN_GROUP_SLOTS = 2048;
const groupIndexOf = (group: string, limit = GROUP_SLOTS): number => {
	let index = groupIndexes.get(group);
	if (index == null) {
		if (groupIndexes.size >= limit) {
			return -1;
		}
		index = groupIndexes.size;
		groupIndexes.set(group, index);
		groupConflicts[index] = [];
		groupConflicts[index] = (CONFLICTS[group] ?? []).map((name) => groupIndexOf(name));
	}
	return index;
};

/** A keyword or a root, found by the hash of its text. */
type Lexeme = {
	text: string;
	/** The class group of the text as a whole class, or -1. */
	keywordGroup: number;
	/** Reads the class group of `text-<value>`. `undefined` means the value does not fit. */
	rootGroup: ((value: string) => string | undefined) | null;
	/** Whether the root is a class with no value too, such as `rounded`. */
	isBare: boolean;
};

/** Hashes `text[start, end)` with no string allocation. */
const hashRange = (text: string, start: number, end: number) => {
	let hash = 0;
	for (let index = start; index < end; index++) {
		hash = (Math.imul(hash, 31) + text.charCodeAt(index)) | 0;
	}
	return hash;
};

/**
 * Every keyword and root, in an open-addressing table keyed by the hash of its text. Why hash
 * ranges: a lookup by a sliced string allocates the string and hashes it again, which costs more
 * than the rest of the merge.
 */
const LEXEME_SLOTS = 4096;
const lexemeSlots = new Int32Array(LEXEME_SLOTS);
const lexemeHashes = new Int32Array(LEXEME_SLOTS);
const lexemes: Lexeme[] = [];

/** Finds the lexeme for `text[start, end)` with hash `hash`, or `null`. */
// oxlint-disable-next-line max-params -- Why: the merge calls this for each class, and an options object allocates on each call.
const findLexeme = (text: string, start: number, end: number, hash: number): Lexeme | null => {
	for (
		let slot = hash & (LEXEME_SLOTS - 1);
		lexemeSlots[slot] !== 0;
		slot = (slot + 1) & (LEXEME_SLOTS - 1)
	) {
		const lexeme = lexemes[(lexemeSlots[slot] ?? 0) - 1];
		if (
			lexeme != null &&
			lexemeHashes[slot] === hash &&
			lexeme.text.length === end - start &&
			text.startsWith(lexeme.text, start)
		) {
			return lexeme;
		}
	}
	return null;
};

const lexemeOf = (text: string): Lexeme => {
	const hash = hashRange(text, 0, text.length);
	const found = findLexeme(text, 0, text.length, hash);
	if (found != null) {
		return found;
	}
	const lexeme: Lexeme = { text, keywordGroup: -1, rootGroup: null, isBare: BARE_ROOTS.has(text) };
	lexemes.push(lexeme);
	let slot = hash & (LEXEME_SLOTS - 1);
	while (lexemeSlots[slot] !== 0) {
		slot = (slot + 1) & (LEXEME_SLOTS - 1);
	}
	lexemeSlots[slot] = lexemes.length;
	lexemeHashes[slot] = hash;
	return lexeme;
};
for (const word in KEYWORDS) {
	lexemeOf(word).keywordGroup = groupIndexOf(KEYWORDS[word] ?? "");
}
for (const root in ROOTS) {
	const group = ROOTS[root] ?? "";
	const shape = VALUE_SHAPES[root];
	lexemeOf(root).rootGroup =
		shape == null
			? () => group
			: (value) => (shape.test(value) || isArbitrary(value) ? group : undefined);
}
for (const root in VALUE_ROOTS) {
	lexemeOf(root).rootGroup = VALUE_ROOTS[root] ?? null;
}
lexemeOf("border").rootGroup = borderGroup;

/**
 * Returns the class group index of the class in `text[start, end)` with no variants, or -1 for a
 * class that is not a Tailwind utility.
 */
const classGroupIn = (text: string, start: number, end: number): number => {
	const first = text.charCodeAt(start);
	if (first === 91) {
		// An arbitrary property such as `[mask-type:luminance]` conflicts with the same property.
		const colon = text.indexOf(":", start);
		return colon > start + 1 && colon < end
			? groupIndexOf(
					`arbitrary..${text.slice(start + 1, colon)}`,
					GROUP_SLOTS - BUILT_IN_GROUP_SLOTS,
				)
			: -1;
	}
	// A negative value such as `-mt-2` has the class group of `mt-2`.
	const nameStart = first === 45 ? start + 1 : start;
	// Hash one char at a time and look up the text so far at each `-` and at the end. A root ends
	// before the first `[` or `(`, because a `-` inside them belongs to the value.
	let hash = 0;
	let longest: Lexeme | null = null;
	let longestEnd = 0;
	let shorter: Lexeme | null = null;
	let shorterEnd = 0;
	for (let index = nameStart; index <= end; index++) {
		const code = index === end ? 45 : text.charCodeAt(index);
		if (code === 45 && index > nameStart) {
			const lexeme = findLexeme(text, nameStart, index, hash);
			if (lexeme != null) {
				if (index === end && lexeme.keywordGroup >= 0 && nameStart === start) {
					return lexeme.keywordGroup;
				}
				if (lexeme.rootGroup != null) {
					shorter = longest;
					shorterEnd = longestEnd;
					longest = lexeme;
					longestEnd = index;
				}
			}
		} else if (code === 91 || code === 40) {
			break;
		}
		hash = (Math.imul(hash, 31) + code) | 0;
	}
	// A root with no value that is not a bare class, such as `border-x`, falls back to `border`.
	const root = longest != null && (longestEnd < end || longest.isBare) ? longest : shorter;
	const rootEnd = root === longest ? longestEnd : shorterEnd;
	if (root?.rootGroup == null || (rootEnd === end && !root.isBare)) {
		return -1;
	}
	const group = root.rootGroup(rootEnd < end ? text.slice(rootEnd + 1, end) : "");
	return group == null ? -1 : groupIndexOf(group);
};

// --- Variants --------------------------------------------------------------------------------

/** Variants whose order changes the selector, so they never sort. */
const ORDER_SENSITIVE_VARIANTS = new Set([
	"*",
	"**",
	"after",
	"backdrop",
	"before",
	"details-content",
	"file",
	"first-letter",
	"first-line",
	"marker",
	"placeholder",
	"selection",
]);

/**
 * Returns the variant key of `text[start, baseStart)`, so `hover:md:` and `md:hover:` share one.
 * Variants sort within each run between order-sensitive ones, like tailwind-merge.
 */
const variantKeyOf = (text: string, start: number, baseStart: number): string => {
	const variants: string[] = [];
	let depth = 0;
	let variantStart = start;
	for (let index = start; index < baseStart; index++) {
		const code = text.charCodeAt(index);
		if (code === 91 || code === 40) {
			depth++;
		} else if (code === 93 || code === 41) {
			depth--;
		} else if (code === 58 && depth === 0) {
			variants.push(text.slice(variantStart, index));
			variantStart = index + 1;
		}
	}
	if (variants.length === 1) {
		return variants[0] ?? "";
	}
	const sorted: string[] = [];
	let run: string[] = [];
	for (const variant of variants) {
		if (variant.charCodeAt(0) === 91 || ORDER_SENSITIVE_VARIANTS.has(variant)) {
			sorted.push(...run.toSorted(), variant);
			run = [];
		} else {
			run.push(variant);
		}
	}
	sorted.push(...run.toSorted());
	return sorted.join(":");
};

/**
 * Each variant key, such as `hover:md` or `md!`, as a small integer. Slot 0 is the class with no
 * variants. The key space is the set of variant stacks that the app writes.
 */
const variantSlots = new Map<string, number>([["", 0]]);
/** Variant stacks kept before the slots reset, at the start of a merge. */
const VARIANT_SLOT_LIMIT = 4096;

// --- Merging ---------------------------------------------------------------------------------

const LEADING = groupIndexOf("leading");
const FONT_SIZE = groupIndexOf("font-size");
const CONTAINER_TYPE = groupIndexOf("container-type");
const CONTAINER_NAMED = groupIndexOf("container-named");

/** Whether a char code is whitespace: a space, a tab, or a line break. */
const isSpace = (code: number) => code === 32 || (code >= 9 && code <= 13);

/**
 * Per-merge buffers, reused because one merge runs at a time: the bounds and id of each class,
 * and the ids that kept classes have taken.
 */
let classStarts = new Int32Array(64);
let classEnds = new Int32Array(64);
let classIds = new Int32Array(64);
let classSetsLeading = new Int32Array(64);
let taken = new Int32Array(256);

const grow = (buffer: Int32Array) => {
	const grown = new Int32Array(buffer.length * 2);
	grown.set(buffer);
	return grown;
};

/** Whether the last class that `classIdOf` read has a `/` postfix, such as `text-sm/6`. */
let hasPostfix = false;

/**
 * Returns the id of a class: its variant slot times `GROUP_SLOTS` plus its class group index, or
 * -1 for a class that is not a Tailwind utility. Sets `hasPostfix` when the class reads without its `/` postfix.
 */
// oxlint-disable-next-line max-params -- Why: the merge calls this for each class, and an options object allocates on each call.
const classIdOf = (
	classList: string,
	start: number,
	end: number,
	baseStart: number,
	slash: number,
): number => {
	let baseEnd = end;
	let nameStart = baseStart;
	let important = false;
	if (classList.charCodeAt(baseEnd - 1) === 33) {
		baseEnd--;
		important = true;
	} else if (classList.charCodeAt(baseStart) === 33) {
		nameStart++;
		important = true;
	}
	// A postfix such as `/50` in `bg-red-500/50` or `/6` in `text-sm/6` reads first without the
	// postfix, as in tailwind-merge, so `text-sm/6` is a font size and not a color.
	hasPostfix = slash > nameStart;
	let group = hasPostfix ? classGroupIn(classList, nameStart, slash) : -1;
	// A name such as `/sidebar` in `@container/sidebar` is part of the class, not a postfix.
	if (
		group === CONTAINER_TYPE &&
		slash + 1 < baseEnd &&
		/^@container(-size|-normal)?$/.test(classList.slice(nameStart, slash))
	) {
		group = CONTAINER_NAMED;
		hasPostfix = false;
	} else if (group < 0) {
		hasPostfix = false;
		group = classGroupIn(classList, nameStart, baseEnd);
	}
	if (group < 0) {
		return -1;
	}
	if (baseStart === start && !important) {
		return group;
	}
	const variantKey =
		(baseStart > start ? variantKeyOf(classList, start, baseStart) : "") + (important ? "!" : "");
	let slot = variantSlots.get(variantKey);
	if (slot == null) {
		// Why a limit inside one merge: a slot past 32767 overflows the `Int32Array` id.
		if (variantSlots.size >= VARIANT_SLOT_LIMIT * 2) {
			return -1;
		}
		slot = variantSlots.size;
		variantSlots.set(variantKey, slot);
	}
	return slot * GROUP_SLOTS + group;
};

/**
 * Removes each Tailwind class that a later class in the same class group overrides, so the
 * rightmost class wins. Keeps classes that are not Tailwind utilities, in order. Returns the
 * input string itself when no class is removed and the spacing is already single spaces.
 *
 * @example
 * mergeClassList("text-strong text-heading-xl text-muted"); // → "text-heading-xl text-muted"
 */
export const mergeClassList = (classList: string): string => {
	if (variantSlots.size > VARIANT_SLOT_LIMIT) {
		variantSlots.clear();
		variantSlots.set("", 0);
	}
	// One pass left to right finds each class, its base class after the last `:` outside
	// brackets, and a `/` postfix, then reads its id.
	let count = 0;
	let isUnchanged = true;
	let start = -1;
	let baseStart = 0;
	let slash = -1;
	let depth = 0;
	const length = classList.length;
	for (let index = 0; index <= length; index++) {
		const code = index === length ? 32 : classList.charCodeAt(index);
		if (isSpace(code)) {
			if (start < 0) {
				// Leading, trailing, or repeated whitespace changes the output.
				if (length > 0) {
					isUnchanged = false;
				}
				continue;
			}
			if (count === classStarts.length) {
				classStarts = grow(classStarts);
				classEnds = grow(classEnds);
				classIds = grow(classIds);
				classSetsLeading = grow(classSetsLeading);
			}
			classStarts[count] = start;
			classEnds[count] = index;
			const id = classIdOf(classList, start, index, baseStart, slash);
			classIds[count] = id;
			classSetsLeading[count] = hasPostfix && id % GROUP_SLOTS === FONT_SIZE ? 1 : 0;
			count++;
			start = -1;
			// A tab or a line break between classes becomes one space.
			if (code !== 32) {
				isUnchanged = false;
			}
			continue;
		}
		if (start < 0) {
			start = index;
			baseStart = index;
			slash = -1;
			depth = 0;
		}
		if (code === 91 || code === 40) {
			depth++;
		} else if (code === 93 || code === 41) {
			depth--;
		} else if (depth === 0) {
			if (code === 58) {
				baseStart = index + 1;
				slash = -1;
			} else if (code === 47) {
				slash = index;
			}
		}
	}
	// Then right to left, because the last class in each group wins.
	let takenCount = 0;
	let removed = 0;
	for (let position = count - 1; position >= 0; position--) {
		const id = classIds[position] ?? -1;
		if (id < 0) {
			continue;
		}
		let isTaken = false;
		for (let index = 0; index < takenCount; index++) {
			if (taken[index] === id) {
				isTaken = true;
				break;
			}
		}
		if (isTaken) {
			classIds[position] = -2;
			removed++;
			continue;
		}
		const group = id % GROUP_SLOTS;
		const offset = id - group;
		const conflicts = groupConflicts[group] ?? [];
		while (takenCount + conflicts.length + 2 > taken.length) {
			taken = grow(taken);
		}
		taken[takenCount++] = id;
		for (const conflict of conflicts) {
			taken[takenCount++] = offset + conflict;
		}
		// `text-sm/6` also sets the line height, so it removes an earlier `leading-*`.
		if (classSetsLeading[position] === 1) {
			taken[takenCount++] = offset + LEADING;
		}
	}
	if (isUnchanged && removed === 0) {
		return classList;
	}
	let result = "";
	for (let position = 0; position < count; position++) {
		if (classIds[position] !== -2) {
			const token = classList.slice(classStarts[position], classEnds[position]);
			result = result === "" ? token : `${result} ${token}`;
		}
	}
	return result;
};
