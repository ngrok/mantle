import type { CSSProperties as ReactCSSProperties } from "react";

/**
 * A CSS custom property (CSS variable) name.
 *
 * CSS variables must start with `--`, e.g. `--brand-color` or `--spacing-2`.
 * This template-literal type lets TypeScript recognize those keys as valid
 * style keys when building objects for `style={...}`.
 */
type CssVariableName = `--${string}`;

/**
 * React-compatible CSS properties plus support for CSS custom properties.
 *
 * React's `CSSProperties` type does not allow arbitrary property names by
 * default, so keys like `--foo` would normally be rejected by TypeScript.
 *
 * This type extends React's `CSSProperties` and additionally permits any
 * CSS variable name (keys starting with `--`) with values that match what
 * CSS variables accept in React style objects: `string | number`.
 */
type CssProperties = ReactCSSProperties & Record<CssVariableName, string | number>;

/**
 * Type-checks a style object that can hold CSS variables, and returns it as
 * React's `CSSProperties`, the type the `style` prop expects.
 *
 * Use it when you pass a CSS variable such as `--gap` to `style`. React's
 * `CSSProperties` rejects any key that starts with `--`. This function accepts
 * every key that starts with `--`, checks the other keys against React's
 * `CSSProperties`, and erases the CSS variable keys from the return type. An
 * unknown key that does not start with `--`, such as `displya`, does not compile.
 *
 * @example
 * style={$cssProperties({ display: "block", "--gap": 8, ...style })}
 */
const $cssProperties = (input: CssProperties): ReactCSSProperties => input;

export { type CssProperties, $cssProperties };
