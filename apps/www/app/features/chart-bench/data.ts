/**
 * Deterministic data for every benchmark scenario. A seeded LCG keeps each
 * run's rows identical, so a timing difference is never a data difference.
 */

export type Row = { x: Date | number | string; a: number; b: number };
export type PointRow = { x: number; y: number };

const START_MS = Date.UTC(2026, 9, 1, 0, 0, 0);

const createRandom = (seed: number) => {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
};

const walk = (count: number, random: () => number, start: number, step: number) => {
	const values: number[] = [];
	let value = start;
	for (let index = 0; index < count; index += 1) {
		value = Math.max(0, value + (random() - 0.5) * step);
		values.push(Math.round(value * 100) / 100);
	}
	return values;
};

/** Rows with a `Date` x one minute apart: the dashboard time-series shape. */
export const timeRows = (count: number, seed: number): Row[] => {
	const random = createRandom(seed);
	const a = walk(count, random, 400, 60);
	const b = walk(count, random, 40, 12);
	return a.map((value, index) => ({
		x: new Date(START_MS + index * 60_000),
		a: value,
		b: b[index] ?? 0,
	}));
};

/** Rows with a numeric sample index x: the dense signal shape. */
export const sampleRows = (count: number, seed: number): Row[] => {
	const random = createRandom(seed);
	const a = walk(count, random, 250, 8);
	const b = walk(count, random, 120, 6);
	return a.map((value, index) => ({ x: index, a: value, b: b[index] ?? 0 }));
};

/** Rows with a category x: the bar shape. */
export const categoryRows = (count: number, seed: number): Row[] => {
	const random = createRandom(seed);
	return Array.from({ length: count }, (_, index) => ({
		x: `/api/v${index}`,
		a: Math.round(20 + random() * 200),
		b: Math.round(5 + random() * 60),
	}));
};

/** Rows with a category x and a count that is zero most of the time: the release-cadence shape. */
export const sparseRows = (count: number, seed: number): Row[] => {
	const random = createRandom(seed);
	return Array.from({ length: count }, (_, index) => ({
		x: `/api/v${index}`,
		a: random() < 0.3 ? 1 + Math.floor(random() * 6) : 0,
		b: 0,
	}));
};

/** A random point cloud. */
export const pointRows = (count: number, seed: number): PointRow[] => {
	const random = createRandom(seed);
	return Array.from({ length: count }, () => {
		const x = random() * 1000;
		return { x: Math.round(x * 10) / 10, y: Math.round((x * 0.4 + random() * 300) * 10) / 10 };
	});
};
