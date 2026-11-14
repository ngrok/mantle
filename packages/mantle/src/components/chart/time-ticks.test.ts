import { scaleTime } from "d3-scale";
import { describe, expect, test, vi } from "vitest";
import { formatTimeTick, timeTicks } from "./time-ticks.js";

// Why d3-scale as the oracle: the chart ships a port of d3's time ticks, and
// d3-scale's ticks and labels are the contract each time axis shows.
const scaleFormat = scaleTime().tickFormat();

/** The ticks that `scaleTime` puts on a domain, in epoch milliseconds. */
const scaleTicks = (domain: readonly [number, number], count: number): number[] =>
	scaleTime()
		.domain([new Date(domain[0]), new Date(domain[1])])
		.ticks(count)
		.map((date) => date.getTime());

/** Asserts that `timeTicks` returns `expected` for a domain, and that `scaleTime` returns the same. */
const expectTicks = (
	domain: readonly [number, number],
	count: number,
	expected: number[],
): void => {
	expect(timeTicks(domain, count)).toEqual(expected);
	expect(scaleTicks(domain, count)).toEqual(expected);
};

/** A seeded stream of numbers from 0 up to 1, so each run sweeps the same domains. */
const seededRandom = (seed: number): (() => number) => {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

describe("timeTicks", () => {
	const start = new Date(2026, 6, 18, 10, 0, 0).getTime();
	const end = new Date(2026, 6, 18, 16, 0, 0).getTime();

	test("produces calendar-aligned ticks inside the domain", () => {
		const ticks = timeTicks([start, end], 6);
		expect(ticks.length).toBeGreaterThan(2);
		for (const tick of ticks) {
			expect(tick).toBeGreaterThanOrEqual(start);
			expect(tick).toBeLessThanOrEqual(end);
			// A 6-hour domain at this count has each tick on an hour.
			expect(new Date(tick).getMinutes()).toBe(0);
		}
	});

	test("returns the ticks of a reversed domain from last to first (the `reverse` branch)", () => {
		const hours = [16, 15, 14, 13, 12, 11, 10];
		expectTicks(
			[end, start],
			6,
			hours.map((hour) => new Date(2026, 6, 18, hour).getTime()),
		);
	});

	test("returns no ticks for a count of zero (the `everyWhole` step that is not finite)", () => {
		expectTicks([start, end], 0, []);
	});

	test("returns no ticks when the year step rounds down to zero (the `everyWhole` step that is not above zero)", () => {
		// The span holds no 1 January, so a count below one makes d3 try a step of half a year.
		const february = new Date(2026, 1, 1).getTime();
		const november = new Date(2026, 10, 20).getTime();
		expectTicks([february, november], 0.6, []);
	});

	test("returns no ticks for a domain that starts at the earliest date (the invalid-date guards of `every`)", () => {
		// Why this domain: the tick search starts one millisecond before it, where no
		// `Date` is valid, and its 6-hour step is an `every` interval.
		const earliest = -8.64e15;
		expectTicks([earliest, earliest + 30 * HOUR_MS], 5, []);
	});

	test("keeps a tick on the end of the domain and drops a tick one millisecond after it (the first `stop` check of `range`)", () => {
		const january = new Date(2026, 0, 2).getTime();
		const february = new Date(2026, 1, 1).getTime();
		expectTicks([january, february], 2, [february]);
		expectTicks([january, february - 1], 2, []);
	});

	test("takes the longer step when two steps are equally near the target (the tie in `tickInterval`)", () => {
		// Why this count: the span divided by it is the one number equally near, by
		// ratio, to the 1-second step and the 5-second step.
		const span = 20_000;
		expectTicks([0, span], span / 2236.06797749979, [0, 5000, 10_000, 15_000, 20_000]);
	});
});

describe("time ticks match d3-scale's scaleTime", () => {
	// A seeded sweep reaches every tick unit, from one millisecond to steps of
	// thousands of years, and every label format.
	const random = seededRandom(7);
	const domains = Array.from({ length: 4000 }, () => {
		const start = Date.UTC(1990, 0, 1) + random() * 40 * 365 * DAY_MS;
		// The spans go from 1 millisecond to about 50,000 years, spread evenly in log space.
		const span = Math.exp(random() * 35);
		return [start, start + span] as const;
	});

	test("every tick lands where scaleTime puts it", () => {
		for (const domain of domains) {
			const count = 2 + Math.floor(random() * 10);
			// The domain and the count sit in both objects, so a failure names its case.
			expect({ domain, count, ticks: timeTicks(domain, count) }).toEqual({
				domain,
				count,
				ticks: scaleTicks(domain, count),
			});
		}
	});

	test("every tick wears the label scaleTime gives it", () => {
		for (const domain of domains) {
			for (const tick of timeTicks(domain, 6)) {
				expect({ tick, label: formatTimeTick(tick) }).toEqual({
					tick,
					label: scaleFormat(new Date(tick)),
				});
			}
		}
	});
});

test("formatTimeTick puts the sign of a year before year 0 ahead of the zeros (the sign branch of `pad`)", () => {
	const tick = new Date(-1, 0, 1).getTime();
	expect(formatTimeTick(tick)).toBe("-0001");
	expect(scaleFormat(new Date(tick))).toBe("-0001");
});

const SWEEP_START = Date.UTC(1850, 0, 1);
const SWEEP_END = Date.UTC(2030, 0, 1);

/** Each instant in the sweep years where the stubbed time zone changes its offset from UTC. */
const offsetChanges = (): number[] => {
	const offsetAt = (time: number): number => new Date(time).getTimezoneOffset();
	const changes: number[] = [];
	for (let day = SWEEP_START; day < SWEEP_END; day += DAY_MS) {
		if (offsetAt(day) === offsetAt(day + DAY_MS)) {
			continue;
		}
		// Halve the day until `after` is the first millisecond with the new offset.
		let before = day;
		let after = day + DAY_MS;
		while (after - before > 1) {
			const middle = Math.floor((before + after) / 2);
			if (offsetAt(middle) === offsetAt(before)) {
				before = middle;
			} else {
				after = middle;
			}
		}
		changes.push(after);
	}
	return changes;
};

// Why these zones: the unit project pins `TZ` to UTC, where no tick crosses an
// offset change. The second column is the zone's July offset in minutes.
test.each([
	["America/New_York", 240],
	["Europe/London", -60],
	// Daylight saving time moves this clock by 30 minutes.
	["Australia/Lord_Howe", -630],
	// This offset holds 45 minutes.
	["Asia/Kathmandu", -345],
	// This zone crossed the date line in 2011, so one calendar day does not exist.
	["Pacific/Apia", -780],
	// Daylight saving time began at midnight here, so some days have no midnight.
	["America/Sao_Paulo", 180],
])("ticks and labels match scaleTime in %s", (zone, julyOffset) => {
	vi.stubEnv("TZ", zone);
	// Guards the stub: a `Date` that ignores it compares UTC with UTC and passes.
	expect(new Date(2026, 6, 1).getTimezoneOffset()).toBe(julyOffset);
	const random = seededRandom(11);
	const changes = offsetChanges();
	for (let index = 0; index < 400; index += 1) {
		// The spans go from 5 seconds to about 10 years: each tick unit that reads local time.
		const span = 5000 * Math.exp(random() * 18);
		const change = changes[Math.floor(random() * changes.length)];
		// Every second domain holds an offset change, so its ticks cross the change.
		const start =
			index % 2 === 0 || change == null
				? SWEEP_START + random() * (SWEEP_END - SWEEP_START)
				: change - random() * span;
		const domain = [start, start + span] as const;
		const count = 2 + Math.floor(random() * 10);
		const ticks = scaleTicks(domain, count);
		expect({ domain, count, ticks: timeTicks(domain, count) }).toEqual({ domain, count, ticks });
		expect({ domain, count, labels: ticks.map((tick) => formatTimeTick(tick)) }).toEqual({
			domain,
			count,
			labels: ticks.map((tick) => scaleFormat(new Date(tick))),
		});
	}
});
