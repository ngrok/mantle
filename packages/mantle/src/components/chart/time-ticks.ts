// Ported from d3-time 3.1.1, d3-time-format 4.1.1, d3-array 3.2.5, and d3-scale 4.0.3 (ISC License, Copyright 2010-2026 Mike Bostock).
// A time axis reads one tick solver and eight label formats from them, so the chart ships that code and no d3 runtime.

import { tickIncrement } from "./scales.js";

// The tick solver ranks its steps by these nominal lengths: a month is 30 days, and a year is 365.
const SECOND_MS = 1000;
const MINUTE_MS = SECOND_MS * 60;
const HOUR_MS = MINUTE_MS * 60;
const DAY_MS = HOUR_MS * 24;
const WEEK_MS = DAY_MS * 7;
const MONTH_MS = DAY_MS * 30;
const YEAR_MS = DAY_MS * 365;

/**
 * A unit of time that repeats, such as the local day. Each function changes
 * the date in place, as a `Date` setter does.
 */
type TimeInterval = {
	/** Moves the date back to the start of the interval that holds it. */
	floor: (date: Date) => void;
	/** Moves the date one interval later. */
	offset: (date: Date) => void;
};

/** A {@link TimeInterval} with the field that {@link every} tests. */
type FieldInterval = TimeInterval & {
	/** The zero-based position of the interval in the unit above it, such as the minute of the hour. */
	field: (date: Date) => number;
};

// Why the next three floors subtract and call no local setter: in the hour that
// repeats when daylight saving time ends, a local setter moves the date to the first pass.
const second: FieldInterval = {
	floor: (date) => {
		date.setTime(date.getTime() - date.getMilliseconds());
	},
	offset: (date) => {
		date.setTime(date.getTime() + SECOND_MS);
	},
	// Why UTC: d3 reads the UTC second, and the local second differs in a zone whose offset holds seconds.
	field: (date) => date.getUTCSeconds(),
};

const minute: FieldInterval = {
	floor: (date) => {
		date.setTime(date.getTime() - date.getMilliseconds() - date.getSeconds() * SECOND_MS);
	},
	offset: (date) => {
		date.setTime(date.getTime() + MINUTE_MS);
	},
	field: (date) => date.getMinutes(),
};

const hour: FieldInterval = {
	floor: (date) => {
		date.setTime(
			date.getTime() -
				date.getMilliseconds() -
				date.getSeconds() * SECOND_MS -
				date.getMinutes() * MINUTE_MS,
		);
	},
	offset: (date) => {
		date.setTime(date.getTime() + HOUR_MS);
	},
	field: (date) => date.getHours(),
};

const day: FieldInterval = {
	floor: (date) => {
		date.setHours(0, 0, 0, 0);
	},
	offset: (date) => {
		date.setDate(date.getDate() + 1);
	},
	field: (date) => date.getDate() - 1,
};

/** The week starts on Sunday. */
const week: TimeInterval = {
	floor: (date) => {
		date.setDate(date.getDate() - date.getDay());
		date.setHours(0, 0, 0, 0);
	},
	offset: (date) => {
		date.setDate(date.getDate() + 7);
	},
};

const month: FieldInterval = {
	floor: (date) => {
		date.setDate(1);
		date.setHours(0, 0, 0, 0);
	},
	offset: (date) => {
		date.setMonth(date.getMonth() + 1);
	},
	field: (date) => date.getMonth(),
};

const floorYear = (date: Date): void => {
	date.setMonth(0, 1);
	date.setHours(0, 0, 0, 0);
};

/**
 * The interval that keeps each start of `interval` whose field `step` divides,
 * such as each 15th minute: d3's `interval.every`.
 */
const every = (interval: FieldInterval, step: number): TimeInterval => {
	const isKept = (date: Date): boolean => interval.field(date) % step === 0;
	// Why the guards: an invalid date never passes `isKept`, so each loop would not end.
	return {
		floor: (date) => {
			if (Number.isNaN(date.getTime())) {
				return;
			}
			interval.floor(date);
			while (!isKept(date)) {
				date.setTime(date.getTime() - 1);
				interval.floor(date);
			}
		},
		offset: (date) => {
			if (Number.isNaN(date.getTime())) {
				return;
			}
			do {
				interval.offset(date);
			} while (!isKept(date));
		},
	};
};

/** The interval that starts on each year `step` divides: d3's `timeYear.every`. */
const everyYear = (step: number): TimeInterval => ({
	floor: (date) => {
		date.setFullYear(Math.floor(date.getFullYear() / step) * step);
		floorYear(date);
	},
	offset: (date) => {
		date.setFullYear(date.getFullYear() + step);
	},
});

/** The interval that starts on each epoch millisecond `step` divides: d3's `timeMillisecond.every`. */
const everyMillisecond = (step: number): TimeInterval => ({
	floor: (date) => {
		date.setTime(Math.floor(date.getTime() / step) * step);
	},
	offset: (date) => {
		date.setTime(date.getTime() + step);
	},
});

/**
 * The interval that `make` builds for `step` rounded down, or `null` when the
 * rounded step is not a finite number above zero: the guard on d3's `every`.
 */
const everyWhole = (
	step: number,
	make: (wholeStep: number) => TimeInterval,
): TimeInterval | null => {
	const wholeStep = Math.floor(step);
	return Number.isFinite(wholeStep) && wholeStep > 0 ? make(wholeStep) : null;
};

// The tick solver selects one of these rows: the nominal length of a step, then
// its interval. The rows go from the shortest step to the longest.
const TICK_INTERVALS: ReadonlyArray<readonly [duration: number, interval: TimeInterval]> = [
	[SECOND_MS, second],
	[5 * SECOND_MS, every(second, 5)],
	[15 * SECOND_MS, every(second, 15)],
	[30 * SECOND_MS, every(second, 30)],
	[MINUTE_MS, minute],
	[5 * MINUTE_MS, every(minute, 5)],
	[15 * MINUTE_MS, every(minute, 15)],
	[30 * MINUTE_MS, every(minute, 30)],
	[HOUR_MS, hour],
	[3 * HOUR_MS, every(hour, 3)],
	[6 * HOUR_MS, every(hour, 6)],
	[12 * HOUR_MS, every(hour, 12)],
	[DAY_MS, day],
	[2 * DAY_MS, every(day, 2)],
	[WEEK_MS, week],
	[MONTH_MS, month],
	[3 * MONTH_MS, every(month, 3)],
	[YEAR_MS, everyYear(1)],
];

/**
 * The 1/2/5 step between ticks for an ascending domain: d3-array's `tickStep`.
 * {@link tickIncrement} encodes a step below one as a negative divisor.
 */
const tickStep = (start: number, stop: number, count: number): number => {
	const increment = tickIncrement(start, stop, count);
	return increment < 0 ? 1 / -increment : increment;
};

/**
 * The interval whose step is nearest, by ratio, to the span of an ascending
 * domain divided by `count`, or `null` when no step fits: d3's `timeTickInterval`.
 */
const tickInterval = (start: number, stop: number, count: number): TimeInterval | null => {
	const target = (stop - start) / count;
	const shorter = TICK_INTERVALS.findLast(([duration]) => duration <= target);
	const longer = TICK_INTERVALS.find(([duration]) => duration > target);
	if (longer == null) {
		return everyWhole(tickStep(start / YEAR_MS, stop / YEAR_MS, count), everyYear);
	}
	if (shorter == null) {
		return everyWhole(Math.max(tickStep(start, stop, count), 1), everyMillisecond);
	}
	const [shorterDuration, shorterInterval] = shorter;
	const [longerDuration, longerInterval] = longer;
	return target / shorterDuration < longerDuration / target ? shorterInterval : longerInterval;
};

/**
 * Each start of `interval` from `start` up to, and not at, `stop`, in epoch
 * milliseconds: d3's `interval.range`.
 */
const range = (interval: TimeInterval, start: number, stop: number): number[] => {
	// The next four lines are d3's `interval.ceil`: they find the first start at or after `start`.
	const date = new Date(start - 1);
	interval.floor(date);
	interval.offset(date);
	interval.floor(date);
	const starts: number[] = [];
	if (!(date.getTime() < stop)) {
		return starts;
	}
	let previous: number;
	// Why `previous`: across some offset changes a step lands on the same start
	// again, and the loop would not end.
	do {
		previous = date.getTime();
		starts.push(previous);
		interval.offset(date);
		interval.floor(date);
	} while (previous < date.getTime() && date.getTime() < stop);
	return starts;
};

/**
 * Calendar-aware ticks (epoch milliseconds) for a time domain, in local time.
 * The result matches d3-scale's `scaleTime().ticks(count)`.
 *
 * @example
 * ```ts
 * const tickTimes = timeTicks([start.getTime(), end.getTime()], 6);
 * ```
 */
const timeTicks = (domain: readonly [number, number], count: number): number[] => {
	// Why `Date`: d3 solves on `Date` values, and a `Date` drops the fraction of a millisecond.
	const first = new Date(domain[0]).getTime();
	const last = new Date(domain[1]).getTime();
	const reverse = last < first;
	const start = reverse ? last : first;
	const stop = reverse ? first : last;
	const interval = tickInterval(start, stop, count);
	if (interval == null) {
		return [];
	}
	// Why `stop + 1`: `range` leaves out its stop, and a tick can sit on the end of the domain.
	const ticks = range(interval, start, stop + 1);
	return reverse ? ticks.toReversed() : ticks;
};

// Why not `Intl`: d3 formats with its own en-US names in every locale. Its short
// month names are the first three letters of these.
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `value` in `width` digits or more, with zeros on the left and the sign first: d3's `pad`. */
const pad = (value: number, width: number): string =>
	value < 0 ? `-${String(-value).padStart(width, "0")}` : String(value).padStart(width, "0");

/** The hour of `date` on a 12-hour clock, in two digits: d3's `%I`. */
const hour12 = (date: Date): string => pad(date.getHours() % 12 || 12, 2);

/** Whether `date` is later than the start of its interval: d3's `interval(date) < date`. */
const isPastStart = (floor: TimeInterval["floor"], date: Date): boolean => {
	const start = new Date(date);
	floor(start);
	return start.getTime() < date.getTime();
};

/**
 * The label of one time-axis tick, at the coarsest unit the tick lands on: a
 * year at a year boundary, a month name at a month boundary, and so on down
 * to milliseconds. The result matches d3-scale's `scaleTime().tickFormat()`.
 *
 * @example
 * ```ts
 * formatTimeTick(new Date(2026, 0, 1).getTime()); // "2026"
 * formatTimeTick(new Date(2026, 2, 1).getTime()); // "March"
 * ```
 */
const formatTimeTick = (epochMs: number): string => {
	const date = new Date(epochMs);
	if (isPastStart(second.floor, date)) {
		return `.${pad(date.getMilliseconds(), 3)}`;
	}
	if (isPastStart(minute.floor, date)) {
		return `:${pad(date.getSeconds(), 2)}`;
	}
	if (isPastStart(hour.floor, date)) {
		return `${hour12(date)}:${pad(date.getMinutes(), 2)}`;
	}
	if (isPastStart(day.floor, date)) {
		return `${hour12(date)} ${date.getHours() >= 12 ? "PM" : "AM"}`;
	}
	if (isPastStart(month.floor, date)) {
		const name = isPastStart(week.floor, date)
			? SHORT_DAYS[date.getDay()]
			: MONTHS[date.getMonth()]?.slice(0, 3);
		return `${name ?? ""} ${pad(date.getDate(), 2)}`;
	}
	if (isPastStart(floorYear, date)) {
		return MONTHS[date.getMonth()] ?? "";
	}
	return pad(date.getFullYear() % 10000, 4);
};

export {
	//,
	formatTimeTick,
	timeTicks,
};
