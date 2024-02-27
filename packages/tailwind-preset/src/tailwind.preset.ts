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
				base: "hsl(var(--bg-base))",
				card: "hsl(var(--bg-card))",
				popover: "hsl(var(--bg-popover))",
				dialog: "hsl(var(--bg-dialog))",
				tooltip: "hsl(var(--bg-tooltip))",
				overlay: "hsl(var(--bg-overlay))",
				form: "hsl(var(--bg-form))",
				neutral: "hsl(var(--bg-neutral))",
				accent: "hsl(var(--bg-accent))",
				danger: "hsl(var(--bg-danger))",
				warning: "hsl(var(--bg-warning))",
				success: "hsl(var(--bg-success))",
				"base-hover": "hsl(var(--bg-base-hover))",
				"card-hover": "hsl(var(--bg-card-hover))",
				"popover-hover": "hsl(var(--bg-popover-hover))",
				"form-hover": "hsl(var(--bg-form-hover))",
				"neutral-hover": "hsl(var(--bg-neutral-hover))",
				"accent-hover": "hsl(var(--bg-accent-hover))",
				"danger-hover": "hsl(var(--bg-danger-hover))",
				"warning-hover": "hsl(var(--bg-warning-hover))",
				"success-hover": "hsl(var(--bg-success-hover))",
				"form-active": "hsl(var(--bg-form-active))",
				"neutral-active": "hsl(var(--bg-neutral-active))",
				"accent-active": "hsl(var(--bg-accent-active))",
				"danger-active": "hsl(var(--bg-danger-active))",
				"warning-active": "hsl(var(--bg-warning-active))",
				"success-active": "hsl(var(--bg-success-active))",
				"neutral-muted": "hsl(var(--bg-neutral-muted))",
				"accent-muted": "hsl(var(--bg-accent-muted))",
				"danger-muted": "hsl(var(--bg-danger-muted))",
				"warning-muted": "hsl(var(--bg-warning-muted))",
				"success-muted": "hsl(var(--bg-success-muted))",
				"neutral-muted-hover": "hsl(var(--bg-neutral-muted-hover))",
				"accent-muted-hover": "hsl(var(--bg-accent-muted-hover))",
				"danger-muted-hover": "hsl(var(--bg-danger-muted-hover))",
				"warning-muted-hover": "hsl(var(--bg-warning-muted-hover))",
				"success-muted-hover": "hsl(var(--bg-success-muted-hover))",
				"neutral-muted-active": "hsl(var(--bg-neutral-muted-active))",
				"accent-muted-active": "hsl(var(--bg-accent-muted-active))",
				"danger-muted-active": "hsl(var(--bg-danger-muted-active))",
				"warning-muted-active": "hsl(var(--bg-warning-muted-active))",
				"success-muted-active": "hsl(var(--bg-success-muted-active))",
			},
			textColor: {
				strong: "hsl(var(--text-strong))",
				default: "hsl(var(--text-default))",
				accent: "hsl(var(--text-accent))",
				danger: "hsl(var(--text-danger))",
				warning: "hsl(var(--text-warning))",
				success: "hsl(var(--text-success))",
				"on-bg-neutral": "hsl(var(--text-on-bg-neutral))",
				"on-bg-accent": "hsl(var(--text-on-bg-accent))",
				"on-bg-danger": "hsl(var(--text-on-bg-danger))",
				"on-bg-warning": "hsl(var(--text-on-bg-warning))",
				"on-bg-success": "hsl(var(--text-on-bg-success))",
				"on-bg-neutral-muted": "hsl(var(--text-on-bg-neutral-muted))",
				"on-bg-accent-muted": "hsl(var(--text-on-bg-accent-muted))",
				"on-bg-danger-muted": "hsl(var(--text-on-bg-danger-muted))",
				"on-bg-warning-muted": "hsl(var(--text-on-bg-warning-muted))",
				"on-bg-success-muted": "hsl(var(--text-on-bg-success-muted))",
				"on-bg-tooltip": "hsl(var(--text-on-bg-tooltip))",
			},
			borderColor: {
				base: "hsl(var(--border-base))",
				card: "hsl(var(--border-card))",
				popover: "hsl(var(--border-popover))",
				dialog: "hsl(var(--border-dialog))",
				form: "hsl(var(--border-form))",
				neutral: "hsl(var(--border-neutral))",
				accent: "hsl(var(--border-accent))",
				danger: "hsl(var(--border-danger))",
				warning: "hsl(var(--border-warning))",
				success: "hsl(var(--border-success))",
				"base-muted": "hsl(var(--border-base-muted))",
				"card-muted": "hsl(var(--border-card-muted))",
				"popover-muted": "hsl(var(--border-popover-muted))",
				"dialog-muted": "hsl(var(--border-dialog-muted))",
				"neutral-muted": "hsl(var(--border-neutral-muted))",
				"accent-muted": "hsl(var(--border-accent-muted))",
				"danger-muted": "hsl(var(--border-danger-muted))",
				"warning-muted": "hsl(var(--border-warning-muted))",
				"success-muted": "hsl(var(--border-success-muted))",
			},
			ringColor: {
				neutral: "hsl(var(--ring-neutral))",
				accent: "hsl(var(--ring-accent))",
				danger: "hsl(var(--ring-danger))",
				warning: "hsl(var(--ring-warning))",
				success: "hsl(var(--ring-success))",
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
