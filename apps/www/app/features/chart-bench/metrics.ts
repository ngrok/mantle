import { onCLS, onFCP, onINP, onLCP } from "web-vitals";
import { canUseDOM } from "@ngrok/mantle/browser-only";

/**
 * Page-side instrumentation the Playwright driver in `bench/` reads through
 * `window.__bench`. Everything here is passive except the frame recorder,
 * which the driver starts only around the windows it wants to measure.
 */

type LongTask = { start: number; duration: number };
type EventTiming = { name: string; start: number; duration: number; processing: number };
type FrameRecorder = { start: () => void; stop: () => { deltas: number[]; stamps: number[] } };

export type UpdateMode = "replace" | "shift";

export type BenchSnapshot = {
	marks: Record<string, number>;
	longTasks: LongTask[];
	events: EventTiming[];
	vitals: Record<string, number>;
	domNodes: number;
	canvasCount: number;
	errors: string[];
};

type MemoryBreakdown = {
	bytes: number;
	breakdown: { bytes: number; types: string[] }[];
};

export type Bench = {
	ready: boolean;
	snapshot: () => BenchSnapshot;
	frames: FrameRecorder;
	memory: () => Promise<{ total: number; byType: Record<string, number> } | null>;
	/** Set by the scenario once mounted: re-renders every chart with new data. */
	update: (mode: UpdateMode) => void;
};

declare global {
	interface Window {
		__bench: Bench;
	}
	interface Performance {
		measureUserAgentSpecificMemory?: () => Promise<MemoryBreakdown>;
	}
}

const longTasks: LongTask[] = [];
const events: EventTiming[] = [];
const vitals: Record<string, number> = {};
const errors: string[] = [];

const record = (name: string) => (metric: { value: number }) => {
	vitals[name] = metric.value;
};

const createFrameRecorder = (): FrameRecorder => {
	let handle = 0;
	let stamps: number[] = [];
	const tick = (now: number) => {
		stamps.push(now);
		handle = requestAnimationFrame(tick);
	};
	return {
		start: () => {
			stamps = [];
			cancelAnimationFrame(handle);
			handle = requestAnimationFrame(tick);
		},
		stop: () => {
			cancelAnimationFrame(handle);
			handle = 0;
			const deltas: number[] = [];
			for (let index = 1; index < stamps.length; index += 1) {
				deltas.push((stamps[index] ?? 0) - (stamps[index - 1] ?? 0));
			}
			return { deltas, stamps: [...stamps] };
		},
	};
};

const isEventTiming = (entry: PerformanceEntry): entry is PerformanceEventTiming =>
	"processingStart" in entry && "processingEnd" in entry;

let started = false;

/**
 * Install `window.__bench` and start the observers. Idempotent, so the route
 * can call it on every render; a no-op on the server.
 *
 * @example
 * ```ts
 * startMetrics();
 * window.__bench.snapshot().marks["charts-painted"];
 * ```
 */
export const startMetrics = (): void => {
	if (started || !canUseDOM()) {
		return;
	}
	started = true;
	window.addEventListener("error", (event) => {
		errors.push(event.message);
	});
	window.addEventListener("unhandledrejection", (event) => {
		errors.push(String(event.reason));
	});
	new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			longTasks.push({ start: entry.startTime, duration: entry.duration });
		}
	}).observe({ type: "longtask", buffered: true });
	new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			if (isEventTiming(entry)) {
				events.push({
					name: entry.name,
					start: entry.startTime,
					duration: entry.duration,
					processing: entry.processingEnd - entry.processingStart,
				});
			}
		}
	}).observe({ type: "event", buffered: true, durationThreshold: 16 });
	onLCP(record("LCP"), { reportAllChanges: true });
	onCLS(record("CLS"), { reportAllChanges: true });
	onINP(record("INP"), { reportAllChanges: true });
	onFCP(record("FCP"), { reportAllChanges: true });

	const frames = createFrameRecorder();
	// Record from the first script tick so the startup window catches every
	// frame a chart's mount animation schedules.
	frames.start();
	window.__bench = {
		ready: false,
		update: () => {},
		frames,
		snapshot: () => {
			const marks: Record<string, number> = {};
			for (const mark of performance.getEntriesByType("mark")) {
				marks[mark.name] = mark.startTime;
			}
			return {
				marks,
				longTasks: [...longTasks],
				events: [...events],
				vitals: { ...vitals },
				domNodes: document.getElementsByTagName("*").length,
				canvasCount: document.getElementsByTagName("canvas").length,
				errors: [...errors],
			};
		},
		memory: async () => {
			if (performance.measureUserAgentSpecificMemory == null) {
				return null;
			}
			const result = await performance.measureUserAgentSpecificMemory();
			const byType: Record<string, number> = {};
			for (const item of result.breakdown) {
				const key = item.types.join("+") || "unknown";
				byType[key] = (byType[key] ?? 0) + item.bytes;
			}
			return { total: result.bytes, byType };
		},
	};
};
