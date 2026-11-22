/**
 * Tailwind CSS breakpoints in descending order (largest → smallest).
 *
 * These correspond to Tailwind’s default `theme.screens` config and are used
 * to determine the current viewport size.
 *
 * @see https://tailwindcss.com/docs/screens
 *
 * @example
 * "2xl" // ≥96rem (1536px)
 * "xl"  // ≥80rem (1280px)
 * "lg"  // ≥64rem (1024px)
 * "md"  // ≥48rem (768px)
 * "sm"  // ≥40rem (640px)
 * "xs"  // ≥30rem (480px)
 * "2xs" // ≥22.5rem (360px)
 */
const tailwindBreakpoints = ["2xl", "xl", "lg", "md", "sm", "xs", "2xs"] as const;

/**
 * A valid Tailwind CSS breakpoint identifier.
 *
 * @example
 * const bp: TailwindBreakpoint = "md"; // ≥48rem (768px)
 *
 * @example
 * "2xl" // ≥96rem (1536px)
 * "xl"  // ≥80rem (1280px)
 * "lg"  // ≥64rem (1024px)
 * "md"  // ≥48rem (768px)
 * "sm"  // ≥40rem (640px)
 * "xs"  // ≥30rem (480px)
 * "2xs" // ≥22.5rem (360px)
 */
type TailwindBreakpoint = (typeof tailwindBreakpoints)[number];

/**
 * Mantle’s breakpoint set, extending Tailwind’s with `"default"`.
 *
 * `"default"` represents the base (0px and up) viewport,
 * useful for defining fallbacks or mobile-first styles.
 *
 * `xs` (480px) is wider than most phones, so a class with only an `xs:` value
 * applies nothing on a phone. Give an unprefixed base value first, as in
 * `flex-col xs:flex-row`.
 *
 * @example
 * "default" // ≥0rem (0px)
 * "2xs"     // ≥22.5rem (360px)
 * "xs"      // ≥30rem (480px)
 * "sm"      // ≥40rem (640px)
 * "md"      // ≥48rem (768px)
 * "lg"      // ≥64rem (1024px)
 * "xl"      // ≥80rem (1280px)
 * "2xl"     // ≥96rem (1536px)
 */
const breakpoints = ["default", ...tailwindBreakpoints] as const;

/**
 * A valid Mantle breakpoint identifier.
 *
 * Includes Tailwind’s standard breakpoints plus `"default"` for 0px+.
 *
 * `xs` (480px) is wider than most phones, so a class with only an `xs:` value
 * applies nothing on a phone. Give an unprefixed base value first, as in
 * `flex-col xs:flex-row`.
 *
 * @example
 * const bp: Breakpoint = "default"; // ≥0px
 *
 * @example
 * "default" // ≥0rem (0px)
 * "2xs"     // ≥22.5rem (360px)
 * "xs"      // ≥30rem (480px)
 * "sm"      // ≥40rem (640px)
 * "md"      // ≥48rem (768px)
 * "lg"      // ≥64rem (1024px)
 * "xl"      // ≥80rem (1280px)
 * "2xl"     // ≥96rem (1536px)
 */
type Breakpoint = (typeof breakpoints)[number];

export {
	//,
	breakpoints,
	tailwindBreakpoints,
};

export type {
	//,
	Breakpoint,
	TailwindBreakpoint,
};
