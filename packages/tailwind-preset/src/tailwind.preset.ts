import type { Config } from "tailwindcss";
import tailwindCssAnimatePlugin from "tailwindcss-animate";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";
import { firefoxVariantPlugin } from "./tailwind-plugin-firefox-variant.js";

const mantlePreset = {
	content: [],
	darkMode: "class",
	theme: {
		colors: {
			inherit: "inherit",
			current: "currentColor",
			transparent: "transparent",
			white: "hsl(var(--white) / <alpha-value>)",
			black: "hsl(var(--black) / <alpha-value>)",
			gray: {
				50: "hsl(var(--gray-050) / <alpha-value>)",
				100: "hsl(var(--gray-100) / <alpha-value>)",
				200: "hsl(var(--gray-200) / <alpha-value>)",
				300: "hsl(var(--gray-300) / <alpha-value>)",
				400: "hsl(var(--gray-400) / <alpha-value>)",
				500: "hsl(var(--gray-500) / <alpha-value>)",
				600: "hsl(var(--gray-600) / <alpha-value>)",
				700: "hsl(var(--gray-700) / <alpha-value>)",
				800: "hsl(var(--gray-800) / <alpha-value>)",
				900: "hsl(var(--gray-900) / <alpha-value>)",
				950: "hsl(var(--gray-950) / <alpha-value>)",
			},
			red: {
				50: "hsl(var(--red-050) / <alpha-value>)",
				100: "hsl(var(--red-100) / <alpha-value>)",
				200: "hsl(var(--red-200) / <alpha-value>)",
				300: "hsl(var(--red-300) / <alpha-value>)",
				400: "hsl(var(--red-400) / <alpha-value>)",
				500: "hsl(var(--red-500) / <alpha-value>)",
				600: "hsl(var(--red-600) / <alpha-value>)",
				700: "hsl(var(--red-700) / <alpha-value>)",
				800: "hsl(var(--red-800) / <alpha-value>)",
				900: "hsl(var(--red-900) / <alpha-value>)",
				950: "hsl(var(--red-950) / <alpha-value>)",
			},
			orange: {
				50: "hsl(var(--orange-050) / <alpha-value>)",
				100: "hsl(var(--orange-100) / <alpha-value>)",
				200: "hsl(var(--orange-200) / <alpha-value>)",
				300: "hsl(var(--orange-300) / <alpha-value>)",
				400: "hsl(var(--orange-400) / <alpha-value>)",
				500: "hsl(var(--orange-500) / <alpha-value>)",
				600: "hsl(var(--orange-600) / <alpha-value>)",
				700: "hsl(var(--orange-700) / <alpha-value>)",
				800: "hsl(var(--orange-800) / <alpha-value>)",
				900: "hsl(var(--orange-900) / <alpha-value>)",
				950: "hsl(var(--orange-950) / <alpha-value>)",
			},
			amber: {
				50: "hsl(var(--amber-050) / <alpha-value>)",
				100: "hsl(var(--amber-100) / <alpha-value>)",
				200: "hsl(var(--amber-200) / <alpha-value>)",
				300: "hsl(var(--amber-300) / <alpha-value>)",
				400: "hsl(var(--amber-400) / <alpha-value>)",
				500: "hsl(var(--amber-500) / <alpha-value>)",
				600: "hsl(var(--amber-600) / <alpha-value>)",
				700: "hsl(var(--amber-700) / <alpha-value>)",
				800: "hsl(var(--amber-800) / <alpha-value>)",
				900: "hsl(var(--amber-900) / <alpha-value>)",
				950: "hsl(var(--amber-950) / <alpha-value>)",
			},
			yellow: {
				50: "hsl(var(--yellow-050) / <alpha-value>)",
				100: "hsl(var(--yellow-100) / <alpha-value>)",
				200: "hsl(var(--yellow-200) / <alpha-value>)",
				300: "hsl(var(--yellow-300) / <alpha-value>)",
				400: "hsl(var(--yellow-400) / <alpha-value>)",
				500: "hsl(var(--yellow-500) / <alpha-value>)",
				600: "hsl(var(--yellow-600) / <alpha-value>)",
				700: "hsl(var(--yellow-700) / <alpha-value>)",
				800: "hsl(var(--yellow-800) / <alpha-value>)",
				900: "hsl(var(--yellow-900) / <alpha-value>)",
				950: "hsl(var(--yellow-950) / <alpha-value>)",
			},
			lime: {
				50: "hsl(var(--lime-050) / <alpha-value>)",
				100: "hsl(var(--lime-100) / <alpha-value>)",
				200: "hsl(var(--lime-200) / <alpha-value>)",
				300: "hsl(var(--lime-300) / <alpha-value>)",
				400: "hsl(var(--lime-400) / <alpha-value>)",
				500: "hsl(var(--lime-500) / <alpha-value>)",
				600: "hsl(var(--lime-600) / <alpha-value>)",
				700: "hsl(var(--lime-700) / <alpha-value>)",
				800: "hsl(var(--lime-800) / <alpha-value>)",
				900: "hsl(var(--lime-900) / <alpha-value>)",
				950: "hsl(var(--lime-950) / <alpha-value>)",
			},
			green: {
				50: "hsl(var(--green-050) / <alpha-value>)",
				100: "hsl(var(--green-100) / <alpha-value>)",
				200: "hsl(var(--green-200) / <alpha-value>)",
				300: "hsl(var(--green-300) / <alpha-value>)",
				400: "hsl(var(--green-400) / <alpha-value>)",
				500: "hsl(var(--green-500) / <alpha-value>)",
				600: "hsl(var(--green-600) / <alpha-value>)",
				700: "hsl(var(--green-700) / <alpha-value>)",
				800: "hsl(var(--green-800) / <alpha-value>)",
				900: "hsl(var(--green-900) / <alpha-value>)",
				950: "hsl(var(--green-950) / <alpha-value>)",
			},
			emerald: {
				50: "hsl(var(--emerald-050) / <alpha-value>)",
				100: "hsl(var(--emerald-100) / <alpha-value>)",
				200: "hsl(var(--emerald-200) / <alpha-value>)",
				300: "hsl(var(--emerald-300) / <alpha-value>)",
				400: "hsl(var(--emerald-400) / <alpha-value>)",
				500: "hsl(var(--emerald-500) / <alpha-value>)",
				600: "hsl(var(--emerald-600) / <alpha-value>)",
				700: "hsl(var(--emerald-700) / <alpha-value>)",
				800: "hsl(var(--emerald-800) / <alpha-value>)",
				900: "hsl(var(--emerald-900) / <alpha-value>)",
				950: "hsl(var(--emerald-950) / <alpha-value>)",
			},
			teal: {
				50: "hsl(var(--teal-050) / <alpha-value>)",
				100: "hsl(var(--teal-100) / <alpha-value>)",
				200: "hsl(var(--teal-200) / <alpha-value>)",
				300: "hsl(var(--teal-300) / <alpha-value>)",
				400: "hsl(var(--teal-400) / <alpha-value>)",
				500: "hsl(var(--teal-500) / <alpha-value>)",
				600: "hsl(var(--teal-600) / <alpha-value>)",
				700: "hsl(var(--teal-700) / <alpha-value>)",
				800: "hsl(var(--teal-800) / <alpha-value>)",
				900: "hsl(var(--teal-900) / <alpha-value>)",
				950: "hsl(var(--teal-950) / <alpha-value>)",
			},
			cyan: {
				50: "hsl(var(--cyan-050) / <alpha-value>)",
				100: "hsl(var(--cyan-100) / <alpha-value>)",
				200: "hsl(var(--cyan-200) / <alpha-value>)",
				300: "hsl(var(--cyan-300) / <alpha-value>)",
				400: "hsl(var(--cyan-400) / <alpha-value>)",
				500: "hsl(var(--cyan-500) / <alpha-value>)",
				600: "hsl(var(--cyan-600) / <alpha-value>)",
				700: "hsl(var(--cyan-700) / <alpha-value>)",
				800: "hsl(var(--cyan-800) / <alpha-value>)",
				900: "hsl(var(--cyan-900) / <alpha-value>)",
				950: "hsl(var(--cyan-950) / <alpha-value>)",
			},
			sky: {
				50: "hsl(var(--sky-050) / <alpha-value>)",
				100: "hsl(var(--sky-100) / <alpha-value>)",
				200: "hsl(var(--sky-200) / <alpha-value>)",
				300: "hsl(var(--sky-300) / <alpha-value>)",
				400: "hsl(var(--sky-400) / <alpha-value>)",
				500: "hsl(var(--sky-500) / <alpha-value>)",
				600: "hsl(var(--sky-600) / <alpha-value>)",
				700: "hsl(var(--sky-700) / <alpha-value>)",
				800: "hsl(var(--sky-800) / <alpha-value>)",
				900: "hsl(var(--sky-900) / <alpha-value>)",
				950: "hsl(var(--sky-950) / <alpha-value>)",
			},
			blue: {
				50: "hsl(var(--blue-050) / <alpha-value>)",
				100: "hsl(var(--blue-100) / <alpha-value>)",
				200: "hsl(var(--blue-200) / <alpha-value>)",
				300: "hsl(var(--blue-300) / <alpha-value>)",
				400: "hsl(var(--blue-400) / <alpha-value>)",
				500: "hsl(var(--blue-500) / <alpha-value>)",
				600: "hsl(var(--blue-600) / <alpha-value>)",
				700: "hsl(var(--blue-700) / <alpha-value>)",
				800: "hsl(var(--blue-800) / <alpha-value>)",
				900: "hsl(var(--blue-900) / <alpha-value>)",
				950: "hsl(var(--blue-950) / <alpha-value>)",
			},
			indigo: {
				50: "hsl(var(--indigo-050) / <alpha-value>)",
				100: "hsl(var(--indigo-100) / <alpha-value>)",
				200: "hsl(var(--indigo-200) / <alpha-value>)",
				300: "hsl(var(--indigo-300) / <alpha-value>)",
				400: "hsl(var(--indigo-400) / <alpha-value>)",
				500: "hsl(var(--indigo-500) / <alpha-value>)",
				600: "hsl(var(--indigo-600) / <alpha-value>)",
				700: "hsl(var(--indigo-700) / <alpha-value>)",
				800: "hsl(var(--indigo-800) / <alpha-value>)",
				900: "hsl(var(--indigo-900) / <alpha-value>)",
				950: "hsl(var(--indigo-950) / <alpha-value>)",
			},
			violet: {
				50: "hsl(var(--violet-050) / <alpha-value>)",
				100: "hsl(var(--violet-100) / <alpha-value>)",
				200: "hsl(var(--violet-200) / <alpha-value>)",
				300: "hsl(var(--violet-300) / <alpha-value>)",
				400: "hsl(var(--violet-400) / <alpha-value>)",
				500: "hsl(var(--violet-500) / <alpha-value>)",
				600: "hsl(var(--violet-600) / <alpha-value>)",
				700: "hsl(var(--violet-700) / <alpha-value>)",
				800: "hsl(var(--violet-800) / <alpha-value>)",
				900: "hsl(var(--violet-900) / <alpha-value>)",
				950: "hsl(var(--violet-950) / <alpha-value>)",
			},
			purple: {
				50: "hsl(var(--purple-050) / <alpha-value>)",
				100: "hsl(var(--purple-100) / <alpha-value>)",
				200: "hsl(var(--purple-200) / <alpha-value>)",
				300: "hsl(var(--purple-300) / <alpha-value>)",
				400: "hsl(var(--purple-400) / <alpha-value>)",
				500: "hsl(var(--purple-500) / <alpha-value>)",
				600: "hsl(var(--purple-600) / <alpha-value>)",
				700: "hsl(var(--purple-700) / <alpha-value>)",
				800: "hsl(var(--purple-800) / <alpha-value>)",
				900: "hsl(var(--purple-900) / <alpha-value>)",
				950: "hsl(var(--purple-950) / <alpha-value>)",
			},
			fuchsia: {
				50: "hsl(var(--fuchsia-050) / <alpha-value>)",
				100: "hsl(var(--fuchsia-100) / <alpha-value>)",
				200: "hsl(var(--fuchsia-200) / <alpha-value>)",
				300: "hsl(var(--fuchsia-300) / <alpha-value>)",
				400: "hsl(var(--fuchsia-400) / <alpha-value>)",
				500: "hsl(var(--fuchsia-500) / <alpha-value>)",
				600: "hsl(var(--fuchsia-600) / <alpha-value>)",
				700: "hsl(var(--fuchsia-700) / <alpha-value>)",
				800: "hsl(var(--fuchsia-800) / <alpha-value>)",
				900: "hsl(var(--fuchsia-900) / <alpha-value>)",
				950: "hsl(var(--fuchsia-950) / <alpha-value>)",
			},
			pink: {
				50: "hsl(var(--pink-050) / <alpha-value>)",
				100: "hsl(var(--pink-100) / <alpha-value>)",
				200: "hsl(var(--pink-200) / <alpha-value>)",
				300: "hsl(var(--pink-300) / <alpha-value>)",
				400: "hsl(var(--pink-400) / <alpha-value>)",
				500: "hsl(var(--pink-500) / <alpha-value>)",
				600: "hsl(var(--pink-600) / <alpha-value>)",
				700: "hsl(var(--pink-700) / <alpha-value>)",
				800: "hsl(var(--pink-800) / <alpha-value>)",
				900: "hsl(var(--pink-900) / <alpha-value>)",
				950: "hsl(var(--pink-950) / <alpha-value>)",
			},
			rose: {
				50: "hsl(var(--rose-050) / <alpha-value>)",
				100: "hsl(var(--rose-100) / <alpha-value>)",
				200: "hsl(var(--rose-200) / <alpha-value>)",
				300: "hsl(var(--rose-300) / <alpha-value>)",
				400: "hsl(var(--rose-400) / <alpha-value>)",
				500: "hsl(var(--rose-500) / <alpha-value>)",
				600: "hsl(var(--rose-600) / <alpha-value>)",
				700: "hsl(var(--rose-700) / <alpha-value>)",
				800: "hsl(var(--rose-800) / <alpha-value>)",
				900: "hsl(var(--rose-900) / <alpha-value>)",
				950: "hsl(var(--rose-950) / <alpha-value>)",
			},
		},
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
			aria: {
				collapsed: 'expanded="false"',
				invalid: 'invalid="true"',
				unchecked: 'checked="false"',
			},
			backgroundColor: {
				base: "hsl(var(--bg-base) / <alpha-value>)",
				card: "hsl(var(--bg-card) / <alpha-value>)",
				popover: "hsl(var(--bg-popover) / <alpha-value>)",
				dialog: "hsl(var(--bg-dialog) / <alpha-value>)",
				tooltip: "hsl(var(--bg-tooltip) / <alpha-value>)",
				overlay: "hsl(var(--bg-overlay) / <alpha-value>)",
				form: "hsl(var(--bg-form) / <alpha-value>)",
				neutral: "hsl(var(--bg-neutral) / <alpha-value>)",
				accent: "hsl(var(--bg-accent) / <alpha-value>)",
				danger: "hsl(var(--bg-danger) / <alpha-value>)",
				warning: "hsl(var(--bg-warning) / <alpha-value>)",
				success: "hsl(var(--bg-success) / <alpha-value>)",
				"base-hover": "hsl(var(--bg-base-hover) / <alpha-value>)",
				"card-hover": "hsl(var(--bg-card-hover) / <alpha-value>)",
				"popover-hover": "hsl(var(--bg-popover-hover) / <alpha-value>)",
				"form-hover": "hsl(var(--bg-form-hover) / <alpha-value>)",
				"neutral-hover": "hsl(var(--bg-neutral-hover) / <alpha-value>)",
				"accent-hover": "hsl(var(--bg-accent-hover) / <alpha-value>)",
				"danger-hover": "hsl(var(--bg-danger-hover) / <alpha-value>)",
				"warning-hover": "hsl(var(--bg-warning-hover) / <alpha-value>)",
				"success-hover": "hsl(var(--bg-success-hover) / <alpha-value>)",
				"form-active": "hsl(var(--bg-form-active) / <alpha-value>)",
				"neutral-active": "hsl(var(--bg-neutral-active) / <alpha-value>)",
				"accent-active": "hsl(var(--bg-accent-active) / <alpha-value>)",
				"danger-active": "hsl(var(--bg-danger-active) / <alpha-value>)",
				"warning-active": "hsl(var(--bg-warning-active) / <alpha-value>)",
				"success-active": "hsl(var(--bg-success-active) / <alpha-value>)",
				"neutral-muted": "hsl(var(--bg-neutral-muted) / <alpha-value>)",
				"accent-muted": "hsl(var(--bg-accent-muted) / <alpha-value>)",
				"danger-muted": "hsl(var(--bg-danger-muted) / <alpha-value>)",
				"warning-muted": "hsl(var(--bg-warning-muted) / <alpha-value>)",
				"success-muted": "hsl(var(--bg-success-muted) / <alpha-value>)",
				"neutral-muted-hover": "hsl(var(--bg-neutral-muted-hover) / <alpha-value>)",
				"primary-muted-hover": "hsl(var(--bg-accent-muted-hover) / <alpha-value>)",
				"danger-muted-hover": "hsl(var(--bg-danger-muted-hover) / <alpha-value>)",
				"warning-muted-hover": "hsl(var(--bg-warning-muted-hover) / <alpha-value>)",
				"success-muted-hover": "hsl(var(--bg-success-muted-hover) / <alpha-value>)",
				"neutral-muted-active": "hsl(var(--bg-neutral-muted-active) / <alpha-value>)",
				"accent-muted-active": "hsl(var(--bg-accent-muted-active) / <alpha-value>)",
				"danger-muted-active": "hsl(var(--bg-danger-muted-active) / <alpha-value>)",
				"warning-muted-active": "hsl(var(--bg-warning-muted-active) / <alpha-value>)",
				"success-muted-active": "hsl(var(--bg-success-muted-active) / <alpha-value>)",
			},
			textColor: {
				neutral: "hsl(var(--text-neutral) / <alpha-value>)",
				primary: "hsl(var(--text-accent) / <alpha-value>)",
				danger: "hsl(var(--text-danger) / <alpha-value>)",
				warning: "hsl(var(--text-warning) / <alpha-value>)",
				success: "hsl(var(--text-success) / <alpha-value>)",
				"bg-neutral": "hsl(var(--text-bg-neutral) / <alpha-value>)",
				"bg-accent": "hsl(var(--text-bg-accent) / <alpha-value>)",
				"bg-danger": "hsl(var(--text-bg-danger) / <alpha-value>)",
				"bg-warning": "hsl(var(--text-bg-warning) / <alpha-value>)",
				"bg-success": "hsl(var(--text-bg-success) / <alpha-value>)",
				"bg-neutral-muted": "hsl(var(--text-bg-neutral-muted) / <alpha-value>)",
				"bg-accent-muted": "hsl(var(--text-bg-accent-muted) / <alpha-value>)",
				"bg-danger-muted": "hsl(var(--text-bg-danger-muted) / <alpha-value>)",
				"bg-warning-muted": "hsl(var(--text-bg-warning-muted) / <alpha-value>)",
				"bg-success-muted": "hsl(var(--text-bg-success-muted) / <alpha-value>)",
				"bg-tooltip": "hsl(var(--text-bg-tooltip) / <alpha-value>)",
			},
			borderColor: {
				base: "hsl(var(--border-base) / <alpha-value>)",
				card: "hsl(var(--border-card) / <alpha-value>)",
				popover: "hsl(var(--border-popover) / <alpha-value>)",
				dialog: "hsl(var(--border-dialog) / <alpha-value>)",
				form: "hsl(var(--border-form) / <alpha-value>)",
				neutral: "hsl(var(--border-neutral) / <alpha-value>)",
				accent: "hsl(var(--border-accent) / <alpha-value>)",
				danger: "hsl(var(--border-danger) / <alpha-value>)",
				warning: "hsl(var(--border-warning) / <alpha-value>)",
				success: "hsl(var(--border-success) / <alpha-value>)",
				"base-muted": "hsl(var(--border-base-muted) / <alpha-value>)",
				"card-muted": "hsl(var(--border-card-muted) / <alpha-value>)",
				"popover-muted": "hsl(var(--border-popover-muted) / <alpha-value>)",
				"dialog-muted": "hsl(var(--border-dialog-muted) / <alpha-value>)",
				"neutral-muted": "hsl(var(--border-neutral-muted) / <alpha-value>)",
				"primary-muted": "hsl(var(--border-accent-muted) / <alpha-value>)",
				"danger-muted": "hsl(var(--border-danger-muted) / <alpha-value>)",
				"warning-muted": "hsl(var(--border-warning-muted) / <alpha-value>)",
				"success-muted": "hsl(var(--border-success-muted) / <alpha-value>)",
			},
			ringColor: {
				neutral: "hsl(var(--ring-neutral) / <alpha-value>)",
				accent: "hsl(var(--ring-accent) / <alpha-value>)",
				danger: "hsl(var(--ring-danger) / <alpha-value>)",
				warning: "hsl(var(--ring-warning) / <alpha-value>)",
				success: "hsl(var(--ring-success) / <alpha-value>)",
			},
			cursor: {
				inherit: "inherit",
				initial: "initial",
			},
			data: {
				"active-item": "active-item",
				"orientation-horizontal": 'orientation="horizontal"',
				"orientation-vertical": 'orientation="vertical"',
				"side-bottom": 'side="bottom"',
				"side-left": 'side="left"',
				"side-right": 'side="right"',
				"side-top": 'side="top"',
				"state-checked": 'state~="checked"',
				"state-closed": 'state~="closed"',
				"state-indeterminate": 'state~="indeterminate"',
				"state-open": 'state~="open"',
				"state-selected": 'state~="selected"',
				"state-unchecked": 'state~="unchecked"',
				disabled: "disabled",
				highlighted: "highlighted",
			},
			fontFamily: {
				sans: ["EuclidSquare", ...defaultTheme.fontFamily.sans],
				mono: ["IBMPlexMono", ...defaultTheme.fontFamily.mono],
			},
			fontSize: {
				"size-inherit": "inherit",
			},
			fontWeight: {
				initial: "initial",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			lineHeight: {
				0: "0",
				initial: "initial",
			},
			screens: {
				xs: "480px",
			},
			spacing: {
				"1.25": "0.3125rem",
			},
			transitionProperty: {
				"max-height": "max-height",
			},
			zIndex: {
				1: "1",
				max: "2147483647",
			},
		},
	},
	plugins: [
		tailwindCssAnimatePlugin,
		firefoxVariantPlugin,
		plugin(function ({ addVariant }) {
			addVariant("dark-high-contrast", [":is(.dark-high-contrast &)"]);
			addVariant("high-contrast", [":is(.light-high-contrast &)"]);
		}),
	],
} satisfies Config;

export type MantlePreset = typeof mantlePreset;

export { mantlePreset };
