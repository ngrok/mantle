import type {
	FilterFieldValue,
	FilterOperator,
	FilterValueDefinition,
	FilterValueType,
} from "./grammar.js";
import { getFilterOperators } from "./grammar.js";

/**
 * The operators and typed values of the query-filter language: what a
 * member such as `>=3`, `api*`, or `2026-01-01..2026-01-31` means, and how
 * one item's field compares with it.
 *
 * Parsing is total and clock-free: a member that does not parse has no
 * comparison. Evaluation reads the clock only through `now`, so a duration on
 * a date key counts back from the time the caller passes.
 */

/**
 * One parsed value of a comparison.
 *
 * - `"text"`: the value of a `"text"` key, the canonical value of an
 *   `"enum"` key, or the value of a key with no type.
 * - `"number"`: a decimal.
 * - `"date"`: an ISO 8601 string. A date alone (`2026-01-31`) means the whole
 *   UTC day. A date and time is normalized to UTC, as in
 *   `2026-01-31T12:00:00.000Z`.
 * - `"duration"`: milliseconds. On a date key, it means that long before now.
 * - `"boolean"`: `true` or `false`.
 */
type FilterOperand =
	| { type: "text"; value: string }
	| { type: "number"; value: number }
	| { type: "date"; value: string }
	| { type: "duration"; value: number }
	| { type: "boolean"; value: boolean };

/** The comparison one qualifier member asks for. */
type FilterComparison =
	| {
			/** How the field compares with the operand. */
			operator: Exclude<FilterOperator, "range">;
			/** The parsed value after the operator. */
			operand: FilterOperand;
	  }
	| {
			/** A range, `from..to`, with both ends included. */
			operator: "range";
			/** The parsed value before the `..`. */
			from: FilterOperand;
			/** The parsed value after the `..`. */
			to: FilterOperand;
	  };

/** The operator and comparison of one member. */
type ParsedComparison = {
	/** The operator as written, or the type's default when none is written. */
	operator: FilterOperator;
	/**
	 * The comparison, or `null` when the value does not parse for its type or
	 * the key does not accept the operator.
	 */
	comparison: FilterComparison | null;
};

/** The key fields that decide how a member parses. */
type TypedKeyShape = {
	type: FilterValueType;
	values?: readonly FilterValueDefinition[];
	operators?: readonly FilterOperator[];
};

/** One member to parse, and the key it belongs to. */
type TypedMember = {
	/** The member's key. */
	key: TypedKeyShape;
	/** The member exactly as written, its quotes included. */
	source: string;
	/** The member with its quotes removed. */
	literal: string;
	/** Resolves a written `"enum"` value to its canonical value, or `null`. */
	resolveEnumValue: (written: string) => string | null;
};

const millisecondsPerDay = 86_400_000;

/** Milliseconds per duration unit. */
const durationUnits: Record<string, number> = {
	ms: 1,
	s: 1000,
	m: 60_000,
	h: 3_600_000,
	d: millisecondsPerDay,
	w: 7 * millisecondsPerDay,
};

const comparisonOperators: Record<string, Exclude<FilterOperator, "range">> = {
	">=": "gte",
	"<=": "lte",
	">": "gt",
	"<": "lt",
	"=": "equals",
};

const numberPattern = /^-?\d+(?:\.\d+)?$/;
const durationPattern = /^(?:\d+(?:\.\d+)?(?:ms|s|m|h|d|w))+$/;
const durationPartPattern = /(\d+(?:\.\d+)?)(ms|s|m|h|d|w)/g;
const comparisonPrefixPattern = /^(?:>=|<=|>|<|=)/;
/** Parses a duration such as `250ms` or `1h30m` to milliseconds. */
function parseDuration(text: string): number | null {
	if (!durationPattern.test(text)) {
		return null;
	}
	let total = 0;
	for (const [, amount, unit] of text.matchAll(durationPartPattern)) {
		total += Number(amount) * (durationUnits[unit ?? ""] ?? Number.NaN);
	}
	return Number.isFinite(total) ? total : null;
}

const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Whether a code unit is an ASCII digit. */
function isDigit(code: number) {
	return code >= 48 && code <= 57;
}

/** Reads `count` decimal digits at `start`, or -1 when one of them is not a digit. */
function readDigits(text: string, start: number, count: number) {
	let value = 0;
	for (let index = start; index < start + count; index += 1) {
		const code = text.charCodeAt(index);
		if (!isDigit(code)) {
			return -1;
		}
		value = value * 10 + code - 48;
	}
	return value;
}

/** The number of days in a month of the proleptic Gregorian calendar. */
function daysInMonth(year: number, month: number) {
	const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	return month === 2 && isLeapYear ? 29 : (daysPerMonth[month - 1] ?? 0);
}

/**
 * Counts the days from 1970-01-01 to a date, with Howard Hinnant's
 * `days_from_civil`. Why not `Date.UTC`: it reads a year below 100 as 19xx,
 * and a `Date` for each item costs more than this arithmetic.
 */
function daysFromCivil(year: number, month: number, day: number) {
	const shiftedYear = month <= 2 ? year - 1 : year;
	const era = Math.floor(shiftedYear / 400);
	const yearOfEra = shiftedYear - era * 400;
	const dayOfYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
	const dayOfEra =
		yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
	return era * 146_097 + dayOfEra - 719_468;
}

/** Reads a time zone at `index`: the offset in milliseconds and the index past it, or `null`. */
function readZone(text: string, index: number): { offset: number; end: number } | null {
	if (index === text.length) {
		return { offset: 0, end: index };
	}
	const code = text.charCodeAt(index);
	// `Z` or `z`.
	if (code === 90 || code === 122) {
		return { offset: 0, end: index + 1 };
	}
	// `+HH:MM` or `-HH:MM`.
	if ((code !== 43 && code !== 45) || text.charCodeAt(index + 3) !== 58) {
		return null;
	}
	const hours = readDigits(text, index + 1, 2);
	const minutes = readDigits(text, index + 4, 2);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
		return null;
	}
	const sign = code === 45 ? -1 : 1;
	return { offset: sign * (hours * 60 + minutes) * 60_000, end: index + 6 };
}

/**
 * Reads an ISO 8601 date (`2026-01-31`) or date and time
 * (`2026-01-31T12:00`, `…T12:00:30.5Z`, `…T12:00+02:00`) as epoch
 * milliseconds. A time with no offset is UTC.
 *
 * @returns the first instant, or `NaN` when the text is not such a date or a
 * part is out of range, such as February 30 or hour 24.
 */
function parseIsoEpoch(text: string): number {
	const { length } = text;
	if (length < 10 || text.charCodeAt(4) !== 45 || text.charCodeAt(7) !== 45) {
		return Number.NaN;
	}
	const year = readDigits(text, 0, 4);
	const month = readDigits(text, 5, 2);
	const day = readDigits(text, 8, 2);
	if (year < 0 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
		return Number.NaN;
	}
	const dayEpoch = daysFromCivil(year, month, day) * millisecondsPerDay;
	if (length === 10) {
		return dayEpoch;
	}

	// `T` or `t`, then `HH:MM`.
	const separator = text.charCodeAt(10);
	if ((separator !== 84 && separator !== 116) || text.charCodeAt(13) !== 58) {
		return Number.NaN;
	}
	const hour = readDigits(text, 11, 2);
	const minute = readDigits(text, 14, 2);
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return Number.NaN;
	}
	let index = 16;
	let second = 0;
	let millisecond = 0;
	if (text.charCodeAt(index) === 58) {
		second = readDigits(text, index + 1, 2);
		if (second < 0 || second > 59) {
			return Number.NaN;
		}
		index += 3;
		if (text.charCodeAt(index) === 46) {
			const fractionStart = index + 1;
			index = fractionStart;
			while (isDigit(text.charCodeAt(index))) {
				index += 1;
			}
			const digits = index - fractionStart;
			if (digits < 1 || digits > 9) {
				return Number.NaN;
			}
			const kept = Math.min(digits, 3);
			millisecond = readDigits(text, fractionStart, kept) * 10 ** (3 - kept);
		}
	}

	const zone = readZone(text, index);
	if (zone == null || zone.end !== length) {
		return Number.NaN;
	}
	return dayEpoch + hour * 3_600_000 + minute * 60_000 + second * 1000 + millisecond - zone.offset;
}

/** Parses one operand of a number, date, or duration key. */
function parseOrderedOperand(
	type: "number" | "date" | "duration",
	text: string,
): FilterOperand | null {
	if (type === "number") {
		return numberPattern.test(text) ? { type: "number", value: Number(text) } : null;
	}
	const duration = parseDuration(text);
	if (duration != null) {
		return { type: "duration", value: duration };
	}
	if (type === "duration") {
		return null;
	}
	const epoch = parseIsoEpoch(text);
	if (Number.isNaN(epoch)) {
		return null;
	}
	return { type: "date", value: text.length === 10 ? text : new Date(epoch).toISOString() };
}

/**
 * Whether a member's source ends inside an open quote, so its last character
 * is quoted text and not a wildcard.
 */
function endsInsideQuotes(source: string) {
	let insideQuotes = false;
	for (let index = 0; index < source.length; index += 1) {
		const character = source.charAt(index);
		if (character === "\\") {
			index += 1;
		} else if (character === '"') {
			insideQuotes = !insideQuotes;
		}
	}
	return insideQuotes;
}

/**
 * Whether an operand holds a value. A quoted empty value (`=""`) does; an
 * operator with nothing after it (`=`, `api*` minus the `api`) does not.
 */
function hasOperand(operand: string, operandSource: string) {
	return operand !== "" || operandSource.length >= 2;
}

/** Names the text match mode of a member's wildcards. */
function textModeOperator({ leading, trailing }: { leading: boolean; trailing: boolean }) {
	if (leading && trailing) {
		return "contains";
	}
	return leading ? "ends-with" : "starts-with";
}

/**
 * Parses a `"text"` member: `=a` is exactly, `a*` starts with, `*a` ends with.
 * A plain `a` contains, or is exactly on a key that does not accept contains.
 */
function parseTextComparison({ key, source, literal }: TypedMember): ParsedComparison {
	if (source.startsWith("=")) {
		const operand = literal.slice(1);
		return {
			operator: "equals",
			comparison: hasOperand(operand, source.slice(1))
				? { operator: "equals", operand: { type: "text", value: operand } }
				: null,
		};
	}

	const leading = source.startsWith("*");
	const trailing = source.length > 1 && source.endsWith("*") && !endsInsideQuotes(source);
	if (!leading && !trailing) {
		const operator = getFilterOperators(key).includes("contains") ? "contains" : "equals";
		return {
			operator,
			comparison: { operator, operand: { type: "text", value: literal } },
		};
	}

	const operator = textModeOperator({ leading, trailing });
	const operand = literal.slice(leading ? 1 : 0, trailing ? -1 : undefined);
	const operandSource = source.slice(leading ? 1 : 0, trailing ? -1 : undefined);
	return {
		operator,
		comparison: hasOperand(operand, operandSource)
			? { operator, operand: { type: "text", value: operand } }
			: null,
	};
}

/** Parses an `"enum"` or `"boolean"` member, which accept only equality. */
function parseEqualityComparison({
	key,
	source,
	literal,
	resolveEnumValue,
}: TypedMember): ParsedComparison {
	const operand = source.startsWith("=") ? literal.slice(1) : literal;
	if (key.type === "boolean") {
		const lowered = operand.toLowerCase();
		return {
			operator: "equals",
			comparison:
				lowered === "true" || lowered === "false"
					? { operator: "equals", operand: { type: "boolean", value: lowered === "true" } }
					: null,
		};
	}
	const canonical = resolveEnumValue(operand);
	return {
		operator: "equals",
		comparison:
			canonical == null
				? null
				: { operator: "equals", operand: { type: "text", value: canonical } },
	};
}

/** Parses a `"number"`, `"date"`, or `"duration"` member. */
function parseOrderedComparison({
	type,
	source,
	literal,
}: {
	type: "number" | "date" | "duration";
	source: string;
	literal: string;
}): ParsedComparison {
	const prefix = comparisonPrefixPattern.exec(source)?.[0];
	const body = prefix == null ? literal : literal.slice(prefix.length);
	const rangeIndex = prefix == null ? body.indexOf("..") : -1;

	if (rangeIndex !== -1) {
		const from = parseOrderedOperand(type, body.slice(0, rangeIndex));
		const to = parseOrderedOperand(type, body.slice(rangeIndex + 2));
		return {
			operator: "range",
			comparison: from != null && to != null ? { operator: "range", from, to } : null,
		};
	}

	const operator = prefix == null ? "equals" : (comparisonOperators[prefix] ?? "equals");
	const operand = parseOrderedOperand(type, body);
	return { operator, comparison: operand == null ? null : { operator, operand } };
}

/** Parses a member with the parser of its key's type. */
function parseByType(member: TypedMember): ParsedComparison {
	const { key, source, literal } = member;
	switch (key.type) {
		case "text":
			return parseTextComparison(member);
		case "enum":
		case "boolean":
			return parseEqualityComparison(member);
		default:
			return parseOrderedComparison({ type: key.type, source, literal });
	}
}

/**
 * Parses the operator and the typed value of one member of a typed key.
 *
 * The operator characters must sit outside quotes, so `name:"=api"` contains
 * `=api`. A comparison whose operator the key does not accept is `null`, but
 * the operator stays, so a check can say which part is wrong.
 *
 * @example
 * ```ts
 * parseTypedComparison({ key: { type: "number" }, source: ">=3", literal: ">=3", resolveEnumValue });
 * // => { operator: "gte", comparison: { operator: "gte", operand: { type: "number", value: 3 } } }
 * parseTypedComparison({ key: { type: "text" }, source: "api*", literal: "api*", resolveEnumValue });
 * // => { operator: "starts-with", comparison: { operator: "starts-with", operand: { type: "text", value: "api" } } }
 * ```
 */
function parseTypedComparison(member: TypedMember): ParsedComparison {
	const parsed = parseByType(member);
	return getFilterOperators(member.key).includes(parsed.operator)
		? parsed
		: { operator: parsed.operator, comparison: null };
}

/** The span of values an operand covers, on the number line of its field. */
type OperandSpan = { start: number; end: number; endInclusive: boolean };

/**
 * Reads the span one operand covers. A date alone covers its whole UTC day;
 * every other operand is one point.
 */
function toOperandSpan(operand: FilterOperand): OperandSpan {
	if (operand.type === "date") {
		const epoch = parseIsoEpoch(operand.value);
		return operand.value.length === 10
			? { start: epoch, end: epoch + millisecondsPerDay, endInclusive: false }
			: { start: epoch, end: epoch, endInclusive: true };
	}
	const point =
		operand.type === "number" || operand.type === "duration" ? operand.value : Number.NaN;
	return { start: point, end: point, endInclusive: true };
}

/** The bounds of the field values a comparison keeps. */
type FieldBounds = { low: number; lowInclusive: boolean; high: number; highInclusive: boolean };

/** Works out the bounds of an ordered comparison once per pass. */
function toFieldBounds({
	comparison,
	type,
	now,
}: {
	comparison: FilterComparison;
	type: "number" | "date" | "duration";
	now: number;
}): FieldBounds {
	const unbounded = {
		low: Number.NEGATIVE_INFINITY,
		lowInclusive: true,
		high: Number.POSITIVE_INFINITY,
		highInclusive: true,
	};
	// Why: on a date key, a duration counts back from now; on a duration key, it is the value itself.
	const span = (operand: FilterOperand) =>
		toOperandSpan(
			type === "date" && operand.type === "duration"
				? { type: "number", value: now - operand.value }
				: operand,
		);

	if (comparison.operator === "range") {
		const from = span(comparison.from);
		const to = span(comparison.to);
		const upper = from.end > to.end || (from.end === to.end && from.endInclusive) ? from : to;
		return {
			low: Math.min(from.start, to.start),
			lowInclusive: true,
			high: upper.end,
			highInclusive: upper.endInclusive,
		};
	}

	const { start, end, endInclusive } = span(comparison.operand);
	switch (comparison.operator) {
		case "gt":
			return { ...unbounded, low: end, lowInclusive: !endInclusive };
		case "gte":
			return { ...unbounded, low: start };
		case "lt":
			return { ...unbounded, high: start, highInclusive: false };
		case "lte":
			return { ...unbounded, high: end, highInclusive: endInclusive };
		default:
			return { low: start, lowInclusive: true, high: end, highInclusive: endInclusive };
	}
}

/**
 * Compiles bounds into one test with no branch on the bounds themselves, so
 * the check per item is one or two comparisons. `NaN` fails every test.
 */
function toBoundsTest({ low, lowInclusive, high, highInclusive }: FieldBounds) {
	if (high === Number.POSITIVE_INFINITY) {
		return lowInclusive ? (value: number) => value >= low : (value: number) => value > low;
	}
	if (low === Number.NEGATIVE_INFINITY) {
		return highInclusive ? (value: number) => value <= high : (value: number) => value < high;
	}
	if (lowInclusive) {
		return highInclusive
			? (value: number) => value >= low && value <= high
			: (value: number) => value >= low && value < high;
	}
	return (value: number) => value > low && (highInclusive ? value <= high : value < high);
}

/** Reads a date field as epoch milliseconds, or `NaN` when it is not a date. */
function toEpoch(field: FilterFieldValue): number {
	if (typeof field === "number") {
		return field;
	}
	if (field instanceof Date) {
		return field.getTime();
	}
	if (typeof field === "string") {
		return parseIsoEpoch(field);
	}
	return Number.NaN;
}

/** Tests a lowercased text field against a lowercased operand. */
function matchesText(operator: FilterOperator, field: string, operand: string) {
	switch (operator) {
		case "equals":
			return field === operand;
		case "starts-with":
			return field.startsWith(operand);
		case "ends-with":
			return field.endsWith(operand);
		default:
			return field.includes(operand);
	}
}

/**
 * Compiles one comparison into a test of one field value. It resolves the
 * operand, its case, and its bounds once, so the test per item only compares.
 * A `null`, an `undefined`, or a field of the wrong type matches nothing.
 *
 * @example
 * ```ts
 * const isRecent = compileComparison({ type: "date", comparison, now: Date.now() });
 * isRecent(project.createdAt); // => true for a project from the last 7 days, with `created:>7d`
 * ```
 */
function compileComparison({
	type,
	comparison,
	now,
}: {
	type: FilterValueType;
	comparison: FilterComparison;
	now: number;
}): (field: FilterFieldValue) => boolean {
	if (type === "number" || type === "date" || type === "duration") {
		const inBounds = toBoundsTest(toFieldBounds({ comparison, type, now }));
		return type === "date"
			? (field) => inBounds(typeof field === "number" ? field : toEpoch(field))
			: (field) => typeof field === "number" && inBounds(field);
	}

	if (comparison.operator === "range") {
		return () => false;
	}
	const { operator, operand } = comparison;
	if (operand.type === "boolean") {
		return (field) => field === operand.value;
	}
	if (operand.type !== "text") {
		return () => false;
	}
	const term = operand.value.toLowerCase();
	return (field) => typeof field === "string" && matchesText(operator, field.toLowerCase(), term);
}

export {
	//,
	compileComparison,
	parseTypedComparison,
};

export type {
	//,
	FilterComparison,
	FilterOperand,
	ParsedComparison,
};
