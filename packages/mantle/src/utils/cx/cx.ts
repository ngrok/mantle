import { type ClassValue, resolveClassValue } from "./clsx.js";
import { mergeClassList } from "./merge.js";

export type { ClassValue };

/**
 * The two ways `cx` can be called: as a normal variadic function, or as a tagged
 * template literal.
 */
type ClassNameFunction = {
	(strings: TemplateStringsArray, ...values: ClassValue[]): string;
	(...inputs: ClassValue[]): string;
};

/**
 * A tagged template passes a frozen `TemplateStringsArray` (an array carrying a `.raw`
 * array) as the first argument, which is what distinguishes ``cx`...` `` from `cx(...)`.
 */
const isTemplateStringsArray = (
	value: TemplateStringsArray | ClassValue,
): value is TemplateStringsArray => Array.isArray(value) && "raw" in value;

/** One cached result: the arguments after the first, with falsy ones as `""`. */
type ArgEntry = { rest: readonly string[]; result: string };

/**
 * The cached results for one first argument, plus the arguments of its last miss. A call is
 * cached on its second sighting, so a `className` that changes on each call adds no entry.
 */
type ArgBucket = { entries: ArgEntry[]; lastMiss: string | null };

const NO_REST: readonly string[] = [];
/** Entries kept for each first argument; the oldest drops first. */
const ENTRIES_PER_FIRST = 8;
/** Entries kept per generation; a full generation becomes the previous one. */
const ENTRIES_PER_GENERATION = 500;

// Why an argument cache: a component calls `cx` with the same literal strings on each render.
// A hit compares the arguments by identity, so it does not join them, hash the joined string, or
// merge (see `cx.browser.bench.ts`).
let buckets = new Map<string, ArgBucket>();
let previousBuckets = new Map<string, ArgBucket>();
let entryCount = 0;

/** Whether `restStrings` holds the same strings as `rest`, with falsy values as `""`. */
const isSameRest = (restStrings: readonly string[], rest: ClassValue[]): boolean => {
	if (restStrings.length !== rest.length) {
		return false;
	}
	for (let index = 0; index < rest.length; index++) {
		if (restStrings[index] !== (rest[index] || "")) {
			return false;
		}
	}
	return true;
};

/** Merges and caches a call whose arguments are all strings or falsy. */
const mergeStrings = (first: string, rest: ClassValue[]): string => {
	const bucket = buckets.get(first) ?? previousBuckets.get(first);
	if (bucket != null) {
		for (const entry of bucket.entries) {
			if (isSameRest(entry.rest, rest)) {
				return entry.result;
			}
		}
	}
	let joined = first;
	for (const value of rest) {
		if (typeof value === "string" && value) {
			joined = joined ? `${joined} ${value}` : value;
		}
	}
	const result = mergeClassList(joined);
	let current = buckets.get(first);
	if (current == null) {
		current = { entries: [], lastMiss: null };
		buckets.set(first, current);
	}
	// The joined string stands in for the arguments of the last miss, so a miss allocates no array.
	if (bucket?.lastMiss !== joined) {
		current.lastMiss = joined;
		return result;
	}
	current.lastMiss = null;
	if (current.entries.length >= ENTRIES_PER_FIRST) {
		current.entries.shift();
	}
	const restStrings =
		rest.length === 0 ? NO_REST : rest.map((value) => (typeof value === "string" ? value : ""));
	current.entries.push({ rest: restStrings, result });
	entryCount += 1;
	if (entryCount > ENTRIES_PER_GENERATION) {
		entryCount = 0;
		previousBuckets = buckets;
		buckets = new Map();
	}
	return result;
};

/** Distinct interpolation tuples kept for each tagged-template call site. */
const ENTRIES_PER_TEMPLATE = 8;

// A tagged template passes the same frozen strings array on each evaluation, so its identity
// keys the static part of the class list.
const templateEntries = new WeakMap<
	TemplateStringsArray,
	{ values: ClassValue[]; result: string }[]
>();

/** Merges a tagged template, cached for each call site while every value is a string or falsy. */
const mergeTemplate = (strings: TemplateStringsArray, values: ClassValue[]): string => {
	const isCacheable = values.every((value) => !value || typeof value === "string");
	const siteEntries = templateEntries.get(strings);
	if (isCacheable && siteEntries != null) {
		const hit = siteEntries.find((entry) =>
			entry.values.every((value, index) => value === values[index]),
		);
		if (hit != null) {
			return hit.result;
		}
	}
	// Spacing is the author's: a template literal does not add a space between a span and a value.
	let joined = strings[0] ?? "";
	for (let index = 0; index < values.length; index++) {
		joined += resolveClassValue(values[index]) + (strings[index + 1] ?? "");
	}
	const result = mergeClassList(joined);
	if (isCacheable) {
		const next = siteEntries ?? [];
		if (next.length >= ENTRIES_PER_TEMPLATE) {
			next.shift();
		}
		next.push({ values, result });
		templateEntries.set(strings, next);
	}
	return result;
};

/**
 * Conditionally compose class names and resolve Tailwind CSS conflicts, so later
 * classes override earlier ones (the same precedence model as inline styles).
 *
 * Accepts the same inputs as `clsx` (strings, numbers, arrays, and
 * `{ [className]: boolean }` objects, with falsy values ignored), then resolves
 * Tailwind utility conflicts so the rightmost class in each conflicting group wins.
 * This makes `cx` safe for prop overrides: `cx("bg-blue-500", className)` lets a
 * consumer's `className` win.
 *
 * Two classes conflict only when they set the same CSS property. Look-alike classes stay
 * apart: `text-heading-xl` (a font size) and `text-strong` (a color) both survive. Mantle's
 * own utilities are built in: the `em` spacing scale (`w-em`, `p-em`, …), the type roles
 * (`text-heading-*`, `text-paragraph-*`), `text-mono`, `text-size-inherit`, and
 * `ease-out-strong`. Repeated calls with the same string arguments return a cached result.
 *
 * Also callable as a tagged template, which caches by call-site identity:
 * `` cx`px-2 px-4 ${active && "bg-blue-500"}` ``.
 *
 * @example
 * // Conditional + object syntax; later class wins on conflict
 * cx("px-4 py-2", isActive && "bg-blue-500", { "text-red-500": hasError });
 * // → "px-4 py-2 bg-blue-500 text-red-500"  (when isActive && hasError)
 *
 * @example
 * cx("text-red-500", "text-blue-500"); // → "text-blue-500"
 */
export const cx: ClassNameFunction = (
	first?: TemplateStringsArray | ClassValue,
	...rest: ClassValue[]
): string => {
	if (isTemplateStringsArray(first)) {
		return mergeTemplate(first, rest);
	}
	const key = first || "";
	let isStrings = typeof key === "string";
	for (let index = 0; isStrings && index < rest.length; index++) {
		const value = rest[index];
		isStrings = !value || typeof value === "string";
	}
	if (isStrings && typeof key === "string") {
		return mergeStrings(key, rest);
	}
	// An object or an array can change between calls with the same identity, so it is not cached.
	return mergeClassList(resolveClassValue([first, ...rest]));
};
