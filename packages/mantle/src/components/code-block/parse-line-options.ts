import type { LineRange } from "./line-numbers.js";

/** Parses a boolean or `"true"`/`"false"` string into a boolean. Returns `undefined` for unrecognized values. */
function parseCodeBlockShowLineNumbers(value: unknown): boolean | undefined {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "string") {
		if (value === "true") {
			return true;
		}
		if (value === "false") {
			return false;
		}
	}
	return undefined;
}

/** Parses a positive integer (or its string representation) for the starting line number. Returns `undefined` for invalid values. */
function parseCodeBlockLineNumberStart(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return Math.floor(value);
	}
	if (typeof value === "string" && /^\d+$/.test(value)) {
		const parsed = Number.parseInt(value, 10);
		return parsed > 0 ? parsed : undefined;
	}
	return undefined;
}

/**
 * Parses a single highlight-line entry into either a positive integer line
 * number or a `"start-end"` {@link LineRange} string. Accepts a number, a
 * decimal-digit string (e.g. `"3"`), or a range string (e.g. `"5-9"`); any
 * other shape — including non-positive bounds — yields `undefined` so callers
 * can drop the entry. Whitespace around string inputs is tolerated.
 *
 * @example
 * parseSingle(3);       // 3
 * parseSingle("5-9");   // "5-9"
 * parseSingle("0");     // undefined
 * parseSingle("foo");   // undefined
 */
function parseSingle(item: unknown): LineRange | number | undefined {
	if (typeof item === "number") {
		return Number.isFinite(item) && item > 0 ? Math.floor(item) : undefined;
	}
	if (typeof item === "string") {
		const trimmed = item.trim();
		if (/^\d+$/.test(trimmed)) {
			const parsed = Number.parseInt(trimmed, 10);
			return parsed > 0 ? parsed : undefined;
		}
		if (/^\d+-\d+$/.test(trimmed)) {
			const [startStr, endStr] = trimmed.split("-");
			const start = Number.parseInt(startStr ?? "", 10);
			const end = Number.parseInt(endStr ?? "", 10);
			if (start > 0 && end > 0) {
				return trimmed as LineRange;
			}
			return undefined;
		}
	}
	return undefined;
}

/** Parses highlight line specifications from an array or comma-separated string (e.g. `[1, "3-5"]` or `"1,3-5"`). Returns `undefined` when no valid entries are found. */
function parseCodeBlockHighlightLines(value: unknown): (LineRange | number)[] | undefined {
	if (typeof value === "string") {
		const parsed: (LineRange | number)[] = [];
		const segments = value.split(",");
		for (const segment of segments) {
			const maybe = parseSingle(segment);
			if (maybe != null) {
				parsed.push(maybe);
			}
		}
		return parsed.length > 0 ? parsed : undefined;
	}

	if (!Array.isArray(value)) {
		return undefined;
	}
	const parsed: (LineRange | number)[] = [];
	for (const item of value) {
		const maybe = parseSingle(item);
		if (maybe != null) {
			parsed.push(maybe);
		}
	}
	return parsed.length > 0 ? parsed : undefined;
}

export {
	//,
	parseCodeBlockHighlightLines,
	parseCodeBlockLineNumberStart,
	parseCodeBlockShowLineNumbers,
};
