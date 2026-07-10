import { type ClassValue, clsx as vendorClsx } from "./vendor/clsx.js";

/**
 * Conditionally join class names into a single space-separated string, with falsy
 * values ignored — **without** Tailwind conflict resolution.
 *
 * Vendored `clsx`. Prefer {@link cx} for composing a `className` (it also resolves
 * Tailwind conflicts); reach for `clsx` only when you need a plain space-join that
 * must not be run through the Tailwind merge engine (e.g. assembling a sentence).
 *
 * @example
 * clsx("base", isActive && "active", { disabled: isDisabled }); // → "base active"
 */
export const clsx: typeof vendorClsx = vendorClsx;

export type { ClassValue };
