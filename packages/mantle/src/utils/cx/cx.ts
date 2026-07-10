import { type ClassValue, resolveClassValue } from "./vendor/clsx.js";
import { mergeTemplate } from "./vendor/lib/merge-template.js";
import { twMerge } from "./vendor/lib/tw-merge.js";

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

/**
 * Whether the runtime is V8 (Chrome/Edge/Node/Deno/Electron). V8 caches a string's hash on
 * the object it first hashed, so the whole-string merge cache pays a full O(length) re-hash
 * on every repeated multi-arg call (the join is a fresh string each render). The arg cache
 * below avoids that by keying on the stable individual argument strings instead. JavaScriptCore
 * (Safari/Bun) and SpiderMonkey (Firefox) hash fresh strings cheaply, so the extra layer is
 * pure overhead there — hence the gate. V8 `Error`s expose neither JSC's `line` nor
 * SpiderMonkey's `lineNumber`, a deterministic, allocation-free signal evaluated once.
 */
const isV8 = (() => {
	const error = new Error();
	return !("line" in error) && !("lineNumber" in error);
})();

type ArgCacheEntry = {
	/** The truthy string args after the first, in order; the bucket key is the first. */
	rest: string[];
	result: string;
};

/** Max distinct rest-sequences kept per first-arg bucket before the oldest is dropped. */
const ARG_CACHE_BUCKET_SIZE = 64;
/** First-arg buckets kept before a generation rotates into `previousArgCache`. */
const ARG_CACHE_GENERATION_SIZE = 500;

// Two-generation LRU. The merged output of `cx("a", cond && "b", …)` depends only on which
// string args are truthy and their order, and JSX class literals keep a stable identity across
// renders — so an identical arg sequence always yields an identical result and can be cached
// against the args by identity, with no re-hash of the joined string.
let argCache = new Map<string, ArgCacheEntry[]>();
let previousArgCache = new Map<string, ArgCacheEntry[]>();
let argCacheCount = 0;

/**
 * Variadic merge with the V8 arg-sequence cache. Only caches when every truthy arg is a
 * string (immutable, so identity guarantees identical output); a truthy object/array arg is
 * mutable, so those calls always recompute.
 */
const mergeVariadicCached = (inputs: ClassValue[]): string => {
	let firstKey = "";
	let hasFirstKey = false;
	let truthyStringCount = 0;
	let everyTruthyIsString = true;
	for (const input of inputs) {
		if (!input) {
			continue;
		}
		if (typeof input !== "string") {
			everyTruthyIsString = false;
			break;
		}
		if (!hasFirstKey) {
			firstKey = input;
			hasFirstKey = true;
		}
		truthyStringCount += 1;
	}

	if (!everyTruthyIsString) {
		return twMerge.mergeString(resolveClassValue(inputs));
	}
	if (!hasFirstKey) {
		return "";
	}
	// A lone truthy string behaves like the single-arg path: its hash is already cached, so the
	// whole-string cache is cheap without a separate arg-cache entry.
	if (truthyStringCount === 1) {
		return twMerge.mergeString(firstKey);
	}

	// Identity-compare the remaining truthy args against each cached entry — no string hashing.
	const bucket = argCache.get(firstKey) ?? previousArgCache.get(firstKey);
	if (bucket != null) {
		for (const entry of bucket) {
			if (entry.rest.length !== truthyStringCount - 1) {
				continue;
			}
			let restIndex = 0;
			let sawFirst = false;
			let isMatch = true;
			for (const input of inputs) {
				if (!input) {
					continue;
				}
				if (!sawFirst) {
					sawFirst = true;
					continue;
				}
				if (input !== entry.rest[restIndex]) {
					isMatch = false;
					break;
				}
				restIndex += 1;
			}
			if (isMatch) {
				return entry.result;
			}
		}
	}

	// Miss: build the join once, merge, and store it keyed on the stable arg strings.
	let joined = firstKey;
	let sawFirst = false;
	const rest: string[] = [];
	for (const input of inputs) {
		if (!input || typeof input !== "string") {
			continue;
		}
		if (!sawFirst) {
			sawFirst = true;
			continue;
		}
		joined += " " + input;
		rest.push(input);
	}
	const result = twMerge.mergeString(joined);

	let target = argCache.get(firstKey);
	if (target == null) {
		target = [];
		argCache.set(firstKey, target);
	}
	if (target.length >= ARG_CACHE_BUCKET_SIZE) {
		target.shift();
	}
	target.push({ rest, result });

	argCacheCount += 1;
	if (argCacheCount > ARG_CACHE_GENERATION_SIZE) {
		argCacheCount = 0;
		previousArgCache = argCache;
		argCache = new Map();
	}

	return result;
};

/**
 * Conditionally compose class names and resolve Tailwind CSS conflicts, so later
 * classes override earlier ones (the same precedence model as inline styles).
 *
 * Accepts the same inputs as `clsx` — strings, numbers, arrays, and
 * `{ [className]: boolean }` objects, with falsy values ignored — then resolves
 * Tailwind utility conflicts so the rightmost class in each conflicting group wins.
 * This makes `cx` safe for prop overrides: `cx("bg-blue-500", className)` lets a
 * consumer's `className` win.
 *
 * Conflict resolution uses a vendored, byte-for-byte port of `tailwind-merge` (see
 * `./vendor`) with mantle's overrides baked into the default config: the `em` spacing
 * scale (`w-em`, `p-em`, …) and the `text-mono` / `text-size-inherit` font-size
 * utilities are conflict-aware with no `extendTailwindMerge` call. Results are cached so
 * repeated calls with the same arguments — the common case across re-renders — are cheap.
 *
 * Also callable as a tagged template, which caches by call-site identity for hot
 * re-rendering paths: `` cx`px-2 px-4 ${active && "bg-blue-500"}` ``.
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

	// Single-arg fast path (the most common call shape): the whole-string cache already keys
	// on this stable string, so no arg-cache bookkeeping is needed.
	if (rest.length === 0) {
		return twMerge.mergeString(resolveClassValue(first));
	}

	const inputs = [first, ...rest];
	// The arg cache only helps on V8; elsewhere fresh strings hash cheaply, so skip it.
	if (isV8) {
		return mergeVariadicCached(inputs);
	}
	return twMerge.mergeString(resolveClassValue(inputs));
};
