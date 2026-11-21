/**
 * A dictionary of class names to truthy or falsy values, as in `clsx`.
 */
export type ClassDictionary = {
	// Why `any`: a render-function className such as Radix's `className={(state) => …}` fits
	// clsx's `Record<string, any>` but not an `unknown`-valued index signature.
	// oxlint-disable-next-line typescript/no-explicit-any -- Why: clsx type parity.
	[className: string]: any;
};

/**
 * A value that `clsx` and `cx` accept: a string, a number, a dictionary, or an array of these.
 * Falsy values add nothing.
 */
export type ClassValue =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined
	| ClassValue[]
	| ClassDictionary;

const isClassValueArray = (value: ClassValue): value is ClassValue[] => Array.isArray(value);

/**
 * Joins one class value into a space-separated string, with falsy values ignored. Follows
 * `clsx` by Luke Edwards (MIT).
 *
 * @example
 * resolveClassValue(["a", false, { b: true }]); // → "a b"
 */
export const resolveClassValue = (value: ClassValue): string => {
	if (!value) {
		return "";
	}
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number") {
		return `${value}`;
	}
	let result = "";
	if (isClassValueArray(value)) {
		for (const item of value) {
			const resolved = typeof item === "string" ? item : resolveClassValue(item);
			if (resolved) {
				result = result ? `${result} ${resolved}` : resolved;
			}
		}
		return result;
	}
	if (typeof value === "object") {
		for (const key in value) {
			if (value[key]) {
				result = result ? `${result} ${key}` : key;
			}
		}
	}
	return result;
};

/**
 * Conditionally join class names into a single space-separated string, with falsy
 * values ignored, **without** Tailwind conflict resolution.
 *
 * Prefer {@link cx} for composing a `className` (it also resolves Tailwind conflicts);
 * reach for `clsx` only when you need a plain space-join that must not be run through the
 * Tailwind merge (e.g. assembling a sentence).
 *
 * @example
 * clsx("base", isActive && "active", { disabled: isDisabled }); // → "base active"
 */
export const clsx = (...inputs: ClassValue[]): string => resolveClassValue(inputs);
