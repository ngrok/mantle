import { hostname } from "node:os";
import type { GapSignal, ToolCallEvent, ToolErrorKind } from "~/utilities/mcp/server.server";

const HOUR_MS = 3_600_000;

/** How often the digest posts while the process runs. A shutdown posts it too. */
export const DIGEST_INTERVAL_MS = 24 * HOUR_MS;

/** The most alerts that one process posts in an hour. The digest counts the rest. */
const ALERTS_PER_HOUR = 30;

/** The longest wait for Slack. A post must not hold a shutdown. */
const POST_TIMEOUT_MS = 3_000;

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
 * - a `find` call with no strong match, and
 * - a call that failed with a `busy` or `internal` error.
 *
 * @example
 * alertOf({ tool: "report_gap", outcome: "ok", latencyMs: 4, resultBytes: 60, gap: { source: "report_gap", tokens: ["stepper"], kind: "component", workaround: "composed-mantle-parts" } });
 * // { key: "gap:stepper", text: ':jigsaw: *Gap reported: "stepper"*\nAn agent needed a component. It composed mantle parts instead.\n_unknown client_' }
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
			text: lines(
				`:jigsaw: *Gap reported: "${need}"*`,
				[`An agent needed ${needed}.`, workaround, closest].filter(Boolean).join(" "),
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
			text: lines(
				`:mag: *No strong match for "${query}"*`,
				guesses.length > 0
					? `Best guesses: ${guesses.join(", ")}.`
					: "No part or docs page matched.",
				goal(event),
				footer(event),
			),
		};
	}
	if (event.outcome === "error" && event.errorKind === "busy") {
		return {
			key: `error:${event.tool}:busy`,
			text: lines(
				`:hourglass_flowing_sand: *\`${event.tool}\` is busy*`,
				"The version download queue is full, so the call failed. A retry can work. If this repeats, the queue is too small.",
				footer(event),
			),
		};
	}
	if (event.outcome === "error" && event.errorKind === "internal") {
		return {
			key: `error:${event.tool}:internal`,
			text: lines(
				`:rotating_light: *\`${event.tool}\` failed with a server error*`,
				`It failed after ${duration(event.latencyMs)}. The stack is in the container log.`,
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
	clients: Map<string, number>;
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

function increment<Key>(map: Map<Key, number>, key: Key) {
	map.set(key, (map.get(key) ?? 0) + 1);
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
	return lines(
		`:bar_chart: *mantle MCP: ${count(digest.calls)} ${digest.calls === 1 ? "call" : "calls"} in the last ${duration(now - digest.since)}*`,
		`*Tools:* ${ranked(new Map(Array.from(digest.tools, ([tool, stats]) => [tool, stats.calls])))
			.map(([tool, calls]) => `${tool} ${count(calls)}`)
			.join(", ")}`,
		errorCount === 0
			? "*Errors:* none"
			: `*Errors:* ${count(errorCount)} (${errorShare}%): ${ranked(digest.errors)
					.map(([kind, times]) => `${count(times)} ${ERROR_LABELS[kind]}`)
					.join(", ")}`,
		`*Clients:* ${topClients.join(", ")}${clients.length > 3 ? `, ${clients.length - 3} more` : ""}`,
		digest.reportedGaps + digest.weakFinds === 0
			? "*Gaps:* none"
			: `*Gaps:* ${count(digest.reportedGaps)} reported, ${count(digest.weakFinds)} finds with no strong match. Top needs: ${needs.join(", ")}`,
		slowest == null
			? undefined
			: `*Slowest:* ${slowest[0]} averages ${duration(slowest[1].totalMs / slowest[1].calls)} (max ${duration(slowest[1].maxMs)})`,
		digest.goals.length === 0
			? undefined
			: `*Recent goals:* ${digest.goals.map(escape).join("; ")}`,
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
	/** Posts the digest when it has calls, then starts a new one. */
	flush: (reason: "interval" | "shutdown") => Promise<void>;
};

/**
 * Creates the Slack pulse of the MCP server. With no `webhookUrl`, it posts
 * nothing. A repeat of an alert waits an hour, and one process posts at most
 * 30 alerts an hour; the digest counts the alerts it held back.
 *
 * @example
 * const pulse = createPulse({ webhookUrl: process.env.MANTLE_MCP_SLACK_WEBHOOK_URL });
 * pulse.record(event);
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

	const post = async (text: string) => {
		if (webhookUrl == null || webhookUrl === "") {
			return;
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
		} catch (error) {
			// Why no message: a fetch error message can quote the webhook URL, which is a secret.
			console.error("mcp pulse post failed", error instanceof Error ? error.name : "unknown");
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
			void post(alert.text);
		},
		flush: async (reason) => {
			const time = now();
			const text = digestText(digest, { now: time, reason, host });
			digest = emptyDigest(time);
			for (const [key, sentAt] of lastSent) {
				if (time - sentAt >= HOUR_MS) {
					lastSent.delete(key);
				}
			}
			if (text != null) {
				await post(text);
			}
		},
	};
}

/** The pulse of this process. It posts only where `MANTLE_MCP_SLACK_WEBHOOK_URL` is set. */
export const mcpPulse = createPulse({ webhookUrl: process.env.MANTLE_MCP_SLACK_WEBHOOK_URL });
