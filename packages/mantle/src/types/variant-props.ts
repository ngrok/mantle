import type { DeepNonNullable } from "./deep-non-nullable.js";

/**
 * The variant props of a function that returns a className from them, such as a `cva` function:
 * optional, never `null`, and without `class` or `className`.
 *
 * @example
 * ```ts
 * const badgeClasses = ({ tone }: { tone?: "info" | "danger" }) => (tone === "danger" ? "text-danger-600" : "");
 * type BadgeVariants = VariantProps<typeof badgeClasses>; // { tone?: "info" | "danger" }
 * ```
 */
export type VariantProps<Variants extends (props: never) => string> = Partial<
	DeepNonNullable<Omit<NonNullable<Parameters<Variants>[0]>, "class" | "className">>
>;
