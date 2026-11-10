import { hostname } from "node:os";
import type { GapSignal, ToolCallEvent, ToolErrorKind } from "~/utilities/mcp/server.server";

const HOUR_MS = 3_600_000;

/** How often the digest posts while the process runs. A shutdown posts it too. */
export const DIGEST_INTERVAL_MS = 24 * HOUR_MS;

/** The most alerts that one process posts in an hour. The digest counts the rest. */
const ALERTS_PER_HOUR = 30;

/** The longest wait for Slack. A post must not hold a shutdown. */
const POST_TIMEOUT_MS = 3_000;

/**
 * The longest wait at shutdown for the MCP requests in flight. With
 * `POST_TIMEOUT_MS`, the shutdown digest posts before the 10 s drain deadline
 * of app-server.
 */
const DRAIN_WAIT_MS = 5_000;

/** The most client names, and the most needs, that one digest counts by name. */
const DIGEST_KEYS = 200;

/** One alert: its Slack text, and the key that holds back a repeat for an hour. */
type Alert = { key: string; text: string };

const KIND_LABELS: Record<NonNullable<GapSignal["kind"]>, string> = {
	component: "a component",
	"variant-or-prop": "a variant or prop",
	"hook-or-utility": "a hook or utility",
	pattern: "a pattern",
	docs: "docs",
};

const WORKAROUND_LABELS: Record<NonNullable<GapSignal["workaround"]>, string> = {
	"built-custom": "It built its own instead.",
	"composed-mantle-parts": "It composed mantle parts instead.",
	"used-another-library": "It used another library instead.",
	none: "It has no workaround.",
};

const ERROR_LABELS: Record<ToolErrorKind, string> = {
	validation: "bad arguments",
	invalid_argument: "unusable arguments",
	not_found: "not found",
	version: "bad version",
	too_large: "too large",
	busy: "busy",
	internal: "server error",
};

/** Escapes the characters that Slack reads as markup, so no text can ping or link. */
function escape(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function lines(...parts: Array<string | undefined>): string {
	return parts.filter((part) => part != null).join("\n");
}

/** Blocks with a blank line between them, so a person can scan the message. */
function sections(...blocks: Array<string | undefined>): string {
	return blocks.filter((block) => block != null).join("\n\n");
}

function bullets(items: readonly string[]): string {
	return items.map((item) => `• ${item}`).join("\n");
}

function count(value: number): string {
	return value.toLocaleString("en-US");
}

function duration(ms: number): string {
	if (ms < 1_000) {
		return `${Math.round(ms)} ms`;
	}
	if (ms < 60_000) {
		return `${(ms / 1_000).toFixed(1)} s`;
	}
	if (ms < HOUR_MS) {
		return `${Math.round(ms / 60_000)} min`;
	}
	return `${Math.round(ms / HOUR_MS)} h`;
}

/** The client name with no version: `claude-code/2.1.3` is `claude-code`. */
function clientName(client: string | undefined): string {
	return client?.split("/")[0] || "unknown client";
}

function goal(event: ToolCallEvent): string | undefined {
	return event.intent == null ? undefined : `> Goal: ${escape(event.intent)}`;
}

function footer(event: ToolCallEvent): string {
	const version = event.dataVersion == null ? undefined : `mantle ${event.dataVersion}`;
	return `_${[escape(clientName(event.client)), version].filter(Boolean).join(" · ")}_`;
}

/**
 * The Slack alert for a call that a person must see now, or `undefined`:
 *
 * - a `report_gap` call,
 * - a `find` call with no strong match, when its query has words that are safe to log, and
 * - a call that failed with a `busy` or `internal` error.
 *
 * @example
 * alertOf({ tool: "report_gap", outcome: "ok", latencyMs: 4, resultBytes: 60, gap: { source: "report_gap", tokens: ["stepper"], kind: "component", workaround: "composed-mantle-parts" } });
 * // { key: "gap:stepper", text: ':jigsaw: *Gap reported: "stepper"*\n\nAn agent needed a component.\nIt composed mantle parts instead.\n\n_unknown client_' }
 */
export function alertOf(event: ToolCallEvent): Alert | undefined {
	const { gap } = event;
	if (gap?.source === "report_gap") {
		const need = escape(gap.tokens.join(" "));
		const needed = gap.kind == null ? "something" : KIND_LABELS[gap.kind];
		const workaround = gap.workaround == null ? undefined : WORKAROUND_LABELS[gap.workaround];
		const closest =
			gap.closestPart == null ? undefined : `The closest part was *${escape(gap.closestPart)}*.`;
		return {
			key: `gap:${need}`,
			text: sections(
				`:jigsaw: *Gap reported: "${need}"*`,
				lines(`An agent needed ${needed}.`, workaround, closest),
				goal(event),
				footer(event),
			),
		};
	}
	if (gap?.source === "find") {
		const query = escape(gap.tokens.join(" "));
		const guesses = (event.ids ?? []).slice(0, 3).map(escape);
		return {
			key: `find:${query}`,
			text: sections(
				`:mag: *No strong match for "${query}"*`,
				guesses.length > 0
					? lines("*Best guesses*", bullets(guesses))
					: "No part or docs page matched.",
				goal(event),
				footer(event),
			),
		};
	}
	if (event.outcome === "error" && event.errorKind === "busy") {
		return {
			key: `error:${event.tool}:busy`,
			text: sections(
				`:hourglass_flowing_sand: *\`${event.tool}\` is busy*`,
				lines(
					"The version download queue is full, so the call failed.",
					"A retry can work. If this repeats, the queue is too small.",
				),
				footer(event),
			),
		};
	}
	if (event.outcome === "error" && event.errorKind === "internal") {
		return {
			key: `error:${event.tool}:internal`,
			text: sections(
				`:rotating_light: *\`${event.tool}\` failed with a server error*`,
				lines(
					`It failed after ${duration(event.latencyMs)}.`,
					"The stack is in the container log.",
				),
				footer(event),
			),
		};
	}
	return undefined;
}

type ToolStats = { calls: number; totalMs: number; maxMs: number };

/** The counts of the calls since the last digest. */
export type Digest = {
	since: number;
	calls: number;
	tools: Map<string, ToolStats>;
	errors: Map<ToolErrorKind, number>;
	/** At most `DIGEST_KEYS` names. A call from a new client after the cap counts only in `calls`. */
	clients: Map<string, number>;
	/** At most `DIGEST_KEYS` needs, as `clients`. */
	needs: Map<string, number>;
	reportedGaps: number;
	weakFinds: number;
	heldAlerts: number;
	/** The newest distinct intents, newest first. */
	goals: string[];
};

/** A digest with no calls, which starts at `now`. */
export function emptyDigest(now: number): Digest {
	return {
		since: now,
		calls: 0,
		tools: new Map(),
		errors: new Map(),
		clients: new Map(),
		needs: new Map(),
		reportedGaps: 0,
		weakFinds: 0,
		heldAlerts: 0,
		goals: [],
	};
}

/** Adds `by` to the count of `key`. A new key after `DIGEST_KEYS` keys is not added, so callers cannot grow the map. */
function increment<Key>(map: Map<Key, number>, key: Key, by = 1) {
	if (map.has(key) || map.size < DIGEST_KEYS) {
		map.set(key, (map.get(key) ?? 0) + by);
	}
}

/** Adds one call to the digest. */
export function addToDigest(digest: Digest, event: ToolCallEvent) {
	digest.calls += 1;
	const stats = digest.tools.get(event.tool) ?? { calls: 0, totalMs: 0, maxMs: 0 };
	stats.calls += 1;
	stats.totalMs += event.latencyMs;
	stats.maxMs = Math.max(stats.maxMs, event.latencyMs);
	digest.tools.set(event.tool, stats);
	if (event.outcome === "error") {
		increment(digest.errors, event.errorKind);
	}
	increment(digest.clients, clientName(event.client));
	if (event.gap != null) {
		increment(digest.needs, event.gap.tokens.join(" "));
		if (event.gap.source === "report_gap") {
			digest.reportedGaps += 1;
		} else {
			digest.weakFinds += 1;
		}
	}
	if (event.intent != null && !digest.goals.includes(event.intent)) {
		digest.goals = [event.intent, ...digest.goals].slice(0, 3);
	}
}

/**
 * Adds the counts of `older` to `digest`, so that the calls of a digest that
 * Slack did not accept post with the next digest.
 */
function mergeDigest(digest: Digest, older: Digest) {
	digest.since = Math.min(digest.since, older.since);
	digest.calls += older.calls;
	for (const [tool, stats] of older.tools) {
		const into = digest.tools.get(tool) ?? { calls: 0, totalMs: 0, maxMs: 0 };
		digest.tools.set(tool, {
			calls: into.calls + stats.calls,
			totalMs: into.totalMs + stats.totalMs,
			maxMs: Math.max(into.maxMs, stats.maxMs),
		});
	}
	for (const [kind, times] of older.errors) {
		increment(digest.errors, kind, times);
	}
	for (const [name, calls] of older.clients) {
		increment(digest.clients, name, calls);
	}
	for (const [need, times] of older.needs) {
		increment(digest.needs, need, times);
	}
	digest.reportedGaps += older.reportedGaps;
	digest.weakFinds += older.weakFinds;
	digest.heldAlerts += older.heldAlerts;
	digest.goals = Array.from(new Set([...digest.goals, ...older.goals])).slice(0, 3);
}

/** The entries of `map`, largest count first. */
function ranked<Key>(map: Map<Key, number>): Array<[Key, number]> {
	return Array.from(map).toSorted(([, left], [, right]) => right - left);
}

/**
 * The Slack text of a digest, or `undefined` when it has no calls.
 *
 * @example
 * digestText(digest, { now: Date.now(), reason: "shutdown", host: "www-7f9c" });
 */
export function digestText(
	digest: Digest,
	{ now, reason, host }: { now: number; reason: "interval" | "shutdown"; host: string },
): string | undefined {
	if (digest.calls === 0) {
		return undefined;
	}
	const errorCount = Array.from(digest.errors.values()).reduce((sum, value) => sum + value, 0);
	const errorShare = ((errorCount / digest.calls) * 100).toFixed(1);
	const slowest = Array.from(digest.tools).toSorted(
		([, left], [, right]) => right.totalMs / right.calls - left.totalMs / left.calls,
	)[0];
	const clients = ranked(digest.clients);
	const topClients = clients
		.slice(0, 3)
		.map(([name, calls]) => `${escape(name)} ${Math.round((calls / digest.calls) * 100)}%`);
	const needs = ranked(digest.needs)
		.slice(0, 5)
		.map(([need, times]) => `"${escape(need)}"${times > 1 ? ` ×${times}` : ""}`);
	const tools = ranked(new Map(Array.from(digest.tools, ([tool, stats]) => [tool, stats.calls])));
	return sections(
		`:bar_chart: *mantle MCP: ${count(digest.calls)} ${digest.calls === 1 ? "call" : "calls"} in the last ${duration(now - digest.since)}*`,
		lines(
			`*Tools:* ${tools.map(([tool, calls]) => `${tool} ${count(calls)}`).join(" · ")}`,
			`*Clients:* ${[...topClients, ...(clients.length > 3 ? [`${clients.length - 3} more`] : [])].join(" · ")}`,
			slowest == null
				? undefined
				: `*Slowest:* ${slowest[0]} averages ${duration(slowest[1].totalMs / slowest[1].calls)} (max ${duration(slowest[1].maxMs)})`,
		),
		errorCount === 0
			? "*Errors:* none"
			: lines(
					`*Errors:* ${count(errorCount)} of ${count(digest.calls)} calls (${errorShare}%)`,
					bullets(
						ranked(digest.errors).map(([kind, times]) => `${count(times)} ${ERROR_LABELS[kind]}`),
					),
				),
		digest.reportedGaps + digest.weakFinds === 0
			? "*Gaps:* none"
			: lines(
					`*Gaps:* ${count(digest.reportedGaps)} reported, ${count(digest.weakFinds)} finds with no strong match`,
					bullets(needs),
				),
		digest.goals.length === 0
			? undefined
			: lines("*Recent goals*", bullets(digest.goals.map(escape))),
		digest.heldAlerts === 0
			? undefined
			: `*Held back:* ${count(digest.heldAlerts)} alerts over the cap of ${ALERTS_PER_HOUR} an hour.`,
		`_${reason === "shutdown" ? "Posted at shutdown" : "Daily digest"} from ${escape(host)}. Each server counts its own calls._`,
	);
}

/** Posts tool-call alerts and digests to Slack. */
export type Pulse = {
	/** Adds a call to the digest, and posts its alert when the call needs one. Never waits for Slack. */
	record: (event: ToolCallEvent) => void;
	/**
	 * Marks an MCP request as in flight, and returns the function that ends it.
	 * Why: app-server runs the shutdown hook while the requests drain, so the
	 * shutdown digest waits up to 5 s for the calls in flight.
	 */
	hold: () => () => void;
	/**
	 * Posts the digest when it has calls, then starts a new one. Slack can
	 * refuse the post; then the next digest also counts these calls. At
	 * shutdown, it first waits for the requests in flight and the posts that
	 * are not done.
	 */
	flush: (reason: "interval" | "shutdown") => Promise<void>;
};

/**
 * Creates the Slack pulse of the MCP server. With no `webhookUrl`, it posts
 * nothing. A repeat of an alert waits an hour after Slack accepts it, and one
 * process tries at most 30 alerts an hour; the digest counts the alerts it held
 * back.
 *
 * @example
 * const pulse = createPulse({ webhookUrl: process.env.MANTLE_MCP_SLACK_WEBHOOK_URL });
 * const release = pulse.hold();
 * pulse.record(event);
 * release();
 * await pulse.flush("shutdown");
 */
export function createPulse({
	webhookUrl,
	fetch = globalThis.fetch,
	now = Date.now,
	host = hostname(),
}: {
	webhookUrl: string | undefined;
	fetch?: typeof globalThis.fetch;
	now?: () => number;
	host?: string;
}): Pulse {
	let digest = emptyDigest(now());
	const lastSent = new Map<string, number>();
	let windowStart = now();
	let sentInWindow = 0;
	/** The posts and the interval flushes that are not done. */
	const pending = new Set<Promise<unknown>>();
	let inFlight = 0;
	let onIdle: (() => void) | undefined;

	const track = <Value>(work: Promise<Value>): Promise<Value> => {
		pending.add(work);
		const remove = () => pending.delete(work);
		void work.then(remove, remove);
		return work;
	};

	const settled = () => Promise.allSettled(pending);

	/** Resolves when no request is in flight, or after `DRAIN_WAIT_MS`. */
	const idle = () =>
		new Promise<void>((resolve) => {
			if (inFlight === 0) {
				resolve();
				return;
			}
			const done = () => {
				clearTimeout(timer);
				onIdle = undefined;
				resolve();
			};
			const timer = setTimeout(done, DRAIN_WAIT_MS);
			onIdle = done;
		});

	/** Posts `text`, and resolves to whether Slack accepted it. */
	const post = async (text: string): Promise<boolean> => {
		if (webhookUrl == null || webhookUrl === "") {
			return true;
		}
		try {
			const response = await fetch(webhookUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, unfurl_links: false, unfurl_media: false }),
				signal: AbortSignal.timeout(POST_TIMEOUT_MS),
			});
			if (!response.ok) {
				console.error("mcp pulse post failed", response.status);
			}
			return response.ok;
		} catch (error) {
			// Why no message: a fetch error message can quote the webhook URL, which is a secret.
			console.error("mcp pulse post failed", error instanceof Error ? error.name : "unknown");
			return false;
		}
	};

	const postAlert = async (alert: Alert, sentAt: number) => {
		// Why: a refused alert must not hold back the next one for an hour.
		if (!(await post(alert.text)) && lastSent.get(alert.key) === sentAt) {
			lastSent.delete(alert.key);
		}
	};

	const postDigest = async (reason: "interval" | "shutdown") => {
		const time = now();
		const text = digestText(digest, { now: time, reason, host });
		const sent = digest;
		digest = emptyDigest(time);
		for (const [key, sentAt] of lastSent) {
			if (time - sentAt >= HOUR_MS) {
				lastSent.delete(key);
			}
		}
		if (text != null && !(await post(text))) {
			mergeDigest(digest, sent);
		}
	};

	return {
		record: (event) => {
			addToDigest(digest, event);
			const alert = alertOf(event);
			if (alert == null) {
				return;
			}
			const time = now();
			if (time - (lastSent.get(alert.key) ?? -Infinity) < HOUR_MS) {
				return;
			}
			if (time - windowStart >= HOUR_MS) {
				windowStart = time;
				sentInWindow = 0;
			}
			if (sentInWindow >= ALERTS_PER_HOUR) {
				digest.heldAlerts += 1;
				return;
			}
			sentInWindow += 1;
			lastSent.set(alert.key, time);
			void track(postAlert(alert, time));
		},
		hold: () => {
			inFlight += 1;
			let held = true;
			return () => {
				if (held) {
					held = false;
					inFlight -= 1;
					if (inFlight === 0) {
						onIdle?.();
					}
				}
			};
		},
		flush: async (reason) => {
			if (reason === "interval") {
				await track(postDigest(reason));
				return;
			}
			await Promise.all([idle(), settled()]);
			await postDigest(reason);
			// Why again: a call that ended during the wait can post an alert.
			await settled();
		},
	};
}

/** The pulse of this process. It posts only where `MANTLE_MCP_SLACK_WEBHOOK_URL` is set. */
export const mcpPulse = createPulse({ webhookUrl: process.env.MANTLE_MCP_SLACK_WEBHOOK_URL });
