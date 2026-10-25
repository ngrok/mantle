import { cx } from "@ngrok/mantle/cx";
import { Code } from "@ngrok/mantle/code";
import { useAppliedTheme } from "@ngrok/mantle/theme";

const shades = [950, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50] as const;

/**
 * Explicit Tailwind bg class map for each color and shade.
 * Tailwind requires full class names at build time — dynamic interpolation is not supported.
 */
const colorClasses: Record<string, Record<(typeof shades)[number], string>> = {
	neutral: {
		950: "bg-neutral-950",
		900: "bg-neutral-900",
		800: "bg-neutral-800",
		700: "bg-neutral-700",
		600: "bg-neutral-600",
		500: "bg-neutral-500",
		400: "bg-neutral-400",
		300: "bg-neutral-300",
		200: "bg-neutral-200",
		100: "bg-neutral-100",
		50: "bg-neutral-50",
	},
	accent: {
		950: "bg-accent-950",
		900: "bg-accent-900",
		800: "bg-accent-800",
		700: "bg-accent-700",
		600: "bg-accent-600",
		500: "bg-accent-500",
		400: "bg-accent-400",
		300: "bg-accent-300",
		200: "bg-accent-200",
		100: "bg-accent-100",
		50: "bg-accent-50",
	},
	info: {
		950: "bg-info-950",
		900: "bg-info-900",
		800: "bg-info-800",
		700: "bg-info-700",
		600: "bg-info-600",
		500: "bg-info-500",
		400: "bg-info-400",
		300: "bg-info-300",
		200: "bg-info-200",
		100: "bg-info-100",
		50: "bg-info-50",
	},
	success: {
		950: "bg-success-950",
		900: "bg-success-900",
		800: "bg-success-800",
		700: "bg-success-700",
		600: "bg-success-600",
		500: "bg-success-500",
		400: "bg-success-400",
		300: "bg-success-300",
		200: "bg-success-200",
		100: "bg-success-100",
		50: "bg-success-50",
	},
	danger: {
		950: "bg-danger-950",
		900: "bg-danger-900",
		800: "bg-danger-800",
		700: "bg-danger-700",
		600: "bg-danger-600",
		500: "bg-danger-500",
		400: "bg-danger-400",
		300: "bg-danger-300",
		200: "bg-danger-200",
		100: "bg-danger-100",
		50: "bg-danger-50",
	},
	warning: {
		950: "bg-warning-950",
		900: "bg-warning-900",
		800: "bg-warning-800",
		700: "bg-warning-700",
		600: "bg-warning-600",
		500: "bg-warning-500",
		400: "bg-warning-400",
		300: "bg-warning-300",
		200: "bg-warning-200",
		100: "bg-warning-100",
		50: "bg-warning-50",
	},
	gray: {
		950: "bg-gray-950",
		900: "bg-gray-900",
		800: "bg-gray-800",
		700: "bg-gray-700",
		600: "bg-gray-600",
		500: "bg-gray-500",
		400: "bg-gray-400",
		300: "bg-gray-300",
		200: "bg-gray-200",
		100: "bg-gray-100",
		50: "bg-gray-50",
	},
	red: {
		950: "bg-red-950",
		900: "bg-red-900",
		800: "bg-red-800",
		700: "bg-red-700",
		600: "bg-red-600",
		500: "bg-red-500",
		400: "bg-red-400",
		300: "bg-red-300",
		200: "bg-red-200",
		100: "bg-red-100",
		50: "bg-red-50",
	},
	orange: {
		950: "bg-orange-950",
		900: "bg-orange-900",
		800: "bg-orange-800",
		700: "bg-orange-700",
		600: "bg-orange-600",
		500: "bg-orange-500",
		400: "bg-orange-400",
		300: "bg-orange-300",
		200: "bg-orange-200",
		100: "bg-orange-100",
		50: "bg-orange-50",
	},
	amber: {
		950: "bg-amber-950",
		900: "bg-amber-900",
		800: "bg-amber-800",
		700: "bg-amber-700",
		600: "bg-amber-600",
		500: "bg-amber-500",
		400: "bg-amber-400",
		300: "bg-amber-300",
		200: "bg-amber-200",
		100: "bg-amber-100",
		50: "bg-amber-50",
	},
	yellow: {
		950: "bg-yellow-950",
		900: "bg-yellow-900",
		800: "bg-yellow-800",
		700: "bg-yellow-700",
		600: "bg-yellow-600",
		500: "bg-yellow-500",
		400: "bg-yellow-400",
		300: "bg-yellow-300",
		200: "bg-yellow-200",
		100: "bg-yellow-100",
		50: "bg-yellow-50",
	},
	lime: {
		950: "bg-lime-950",
		900: "bg-lime-900",
		800: "bg-lime-800",
		700: "bg-lime-700",
		600: "bg-lime-600",
		500: "bg-lime-500",
		400: "bg-lime-400",
		300: "bg-lime-300",
		200: "bg-lime-200",
		100: "bg-lime-100",
		50: "bg-lime-50",
	},
	green: {
		950: "bg-green-950",
		900: "bg-green-900",
		800: "bg-green-800",
		700: "bg-green-700",
		600: "bg-green-600",
		500: "bg-green-500",
		400: "bg-green-400",
		300: "bg-green-300",
		200: "bg-green-200",
		100: "bg-green-100",
		50: "bg-green-50",
	},
	emerald: {
		950: "bg-emerald-950",
		900: "bg-emerald-900",
		800: "bg-emerald-800",
		700: "bg-emerald-700",
		600: "bg-emerald-600",
		500: "bg-emerald-500",
		400: "bg-emerald-400",
		300: "bg-emerald-300",
		200: "bg-emerald-200",
		100: "bg-emerald-100",
		50: "bg-emerald-50",
	},
	teal: {
		950: "bg-teal-950",
		900: "bg-teal-900",
		800: "bg-teal-800",
		700: "bg-teal-700",
		600: "bg-teal-600",
		500: "bg-teal-500",
		400: "bg-teal-400",
		300: "bg-teal-300",
		200: "bg-teal-200",
		100: "bg-teal-100",
		50: "bg-teal-50",
	},
	cyan: {
		950: "bg-cyan-950",
		900: "bg-cyan-900",
		800: "bg-cyan-800",
		700: "bg-cyan-700",
		600: "bg-cyan-600",
		500: "bg-cyan-500",
		400: "bg-cyan-400",
		300: "bg-cyan-300",
		200: "bg-cyan-200",
		100: "bg-cyan-100",
		50: "bg-cyan-50",
	},
	sky: {
		950: "bg-sky-950",
		900: "bg-sky-900",
		800: "bg-sky-800",
		700: "bg-sky-700",
		600: "bg-sky-600",
		500: "bg-sky-500",
		400: "bg-sky-400",
		300: "bg-sky-300",
		200: "bg-sky-200",
		100: "bg-sky-100",
		50: "bg-sky-50",
	},
	blue: {
		950: "bg-blue-950",
		900: "bg-blue-900",
		800: "bg-blue-800",
		700: "bg-blue-700",
		600: "bg-blue-600",
		500: "bg-blue-500",
		400: "bg-blue-400",
		300: "bg-blue-300",
		200: "bg-blue-200",
		100: "bg-blue-100",
		50: "bg-blue-50",
	},
	indigo: {
		950: "bg-indigo-950",
		900: "bg-indigo-900",
		800: "bg-indigo-800",
		700: "bg-indigo-700",
		600: "bg-indigo-600",
		500: "bg-indigo-500",
		400: "bg-indigo-400",
		300: "bg-indigo-300",
		200: "bg-indigo-200",
		100: "bg-indigo-100",
		50: "bg-indigo-50",
	},
	violet: {
		950: "bg-violet-950",
		900: "bg-violet-900",
		800: "bg-violet-800",
		700: "bg-violet-700",
		600: "bg-violet-600",
		500: "bg-violet-500",
		400: "bg-violet-400",
		300: "bg-violet-300",
		200: "bg-violet-200",
		100: "bg-violet-100",
		50: "bg-violet-50",
	},
	purple: {
		950: "bg-purple-950",
		900: "bg-purple-900",
		800: "bg-purple-800",
		700: "bg-purple-700",
		600: "bg-purple-600",
		500: "bg-purple-500",
		400: "bg-purple-400",
		300: "bg-purple-300",
		200: "bg-purple-200",
		100: "bg-purple-100",
		50: "bg-purple-50",
	},
	fuchsia: {
		950: "bg-fuchsia-950",
		900: "bg-fuchsia-900",
		800: "bg-fuchsia-800",
		700: "bg-fuchsia-700",
		600: "bg-fuchsia-600",
		500: "bg-fuchsia-500",
		400: "bg-fuchsia-400",
		300: "bg-fuchsia-300",
		200: "bg-fuchsia-200",
		100: "bg-fuchsia-100",
		50: "bg-fuchsia-50",
	},
	pink: {
		950: "bg-pink-950",
		900: "bg-pink-900",
		800: "bg-pink-800",
		700: "bg-pink-700",
		600: "bg-pink-600",
		500: "bg-pink-500",
		400: "bg-pink-400",
		300: "bg-pink-300",
		200: "bg-pink-200",
		100: "bg-pink-100",
		50: "bg-pink-50",
	},
	rose: {
		950: "bg-rose-950",
		900: "bg-rose-900",
		800: "bg-rose-800",
		700: "bg-rose-700",
		600: "bg-rose-600",
		500: "bg-rose-500",
		400: "bg-rose-400",
		300: "bg-rose-300",
		200: "bg-rose-200",
		100: "bg-rose-100",
		50: "bg-rose-50",
	},
};

/**
 * Renders a row of color swatches for a given color name.
 * Each swatch displays the shade number beneath a colored rectangle.
 */
const ColorPalette = ({ color }: { color: string }) => {
	const classes = colorClasses[color];
	if (!classes) {
		return null;
	}

	return (
		<div className="mt-2 flex flex-col gap-2 overflow-hidden text-xs md:flex-row">
			{shades.map((shade) => (
				<div key={shade} className="flex grow flex-col gap-1 font-mono">
					<div className={cx("h-10 w-full rounded", classes[shade])} />
					{shade}
				</div>
			))}
		</div>
	);
};

/**
 * Demonstrates how mantle redefines "black" and "white" based on the current theme.
 * Renders a box with `bg-white` and `text-black` that swaps in dark mode.
 */
const BlackWhiteDemo = () => {
	const appliedTheme = useAppliedTheme();

	return (
		<div className="bg-white border-card flex flex-col items-center justify-center gap-2 rounded border p-6 text-black">
			<p>
				This renders <Code>bg-white</Code> and color <Code>text-black</Code>.
			</p>
			<p>
				The current applied theme is <Code>{appliedTheme}</Code>
			</p>
		</div>
	);
};

const functionalColors = ["neutral", "accent", "info", "success", "danger", "warning"] as const;

/**
 * Renders all 6 functional color sections (neutral, accent, info, success, danger, warning)
 * with a heading and swatch row for each.
 */
const FunctionalColors = () => (
	<>
		{functionalColors.map((color) => (
			<div key={color}>
				<h3 id={color} className="mt-8 text-xl font-medium capitalize">
					{color}
				</h3>
				<ColorPalette color={color} />
			</div>
		))}
	</>
);

const extendedColors = [
	"gray",
	"red",
	"orange",
	"amber",
	"yellow",
	"lime",
	"green",
	"emerald",
	"teal",
	"cyan",
	"sky",
	"blue",
	"indigo",
	"violet",
	"purple",
	"fuchsia",
	"pink",
	"rose",
] as const;

/**
 * Renders all extended palette colors with a heading and swatch row for each.
 * Includes a description of the extended palette's purpose.
 */
const ExtendedPalette = () => (
	<>
		<p className="font-body text-body mt-3">
			Mantle also supports the entirety of Tailwind&rsquo;s color palette in light, dark, and high
			contrast variants. These are to be used when there is no functional meaning behind the color
			choice. However, we&rsquo;ve left out the extended collection of Tailwind&rsquo;s grays eg.
			slate, zinc, etc. since we only want to use our own custom branded gray.
		</p>
		{extendedColors.map((color) => (
			<div key={color}>
				<h3 id={color} className="mt-8 text-xl font-medium capitalize">
					{color}
				</h3>
				<ColorPalette color={color} />
			</div>
		))}
	</>
);

export {
	//,
	BlackWhiteDemo,
	ColorPalette,
	ExtendedPalette,
	FunctionalColors,
};
