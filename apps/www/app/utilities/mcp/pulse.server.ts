import { hostname } from "node:os";
import type { GapSignal, ToolCallEvent, ToolErrorKind } from "~/utilities/mcp/server.server";

const HOUR_MS = 3_600_000;

/** How often the digest posts while the process runs. A shutdown posts it too. */
export const DIGEST_INTERVAL_MS = 24 * HOUR_MS;

/**
 * The most gap reports, and the most other alerts, that one process posts in
 * an hour. The digest counts the rest. Why two caps: Slack is the only record
 * of a report, so weak finds and errors must not use up its budget.
 */
const GAPS_PER_HOUR = 60;
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

/** How long a caller can go with no call before its next call starts a new session. */
const SESSION_IDLE_MS = 30 * 60_000;

/** The most sessions that one process tracks, and that one digest counts. */
const SESSION_KEYS = 1_000;

/** The most calls that a session trail shows. */
const TRAIL_LENGTH = 8;

/**
 * How long a weak find waits for its session to `get` a part before its
 * alert posts. Why wait: when the agent gets the top guess, the guess was
 * right, and the alert is noise.
 */
const FOLLOW_THROUGH_MS = 10 * 60_000;

/** One alert: its Slack text, and the key that holds back a repeat for an hour. */
type Alert = { key: string; text: string };

const KIND_LABELS: Record<NonNullable<GapSignal["kind"]>, string> = {
	component: "a component",
	"variant-or-prop": "a variant or prop",
	"hook-or-utility": "a hook or utility",
	pattern: "a pattern",
	docs: "docs",
	other: "something else",
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

/** One call in a session trail: `get` with the part it returned, or the tool and its error. */
function stepOf(event: ToolCallEvent): string {
	if (event.outcome === "error") {
		return `${event.tool} (${ERROR_LABELS[event.errorKind]})`;
	}
	const part = event.tool === "get" && event.outcome === "ok" ? event.ids?.[0] : undefined;
	return part == null ? event.tool : `get ${part}`;
}

/**
 * The steps of a session in order, with a run of one step as one entry.
 *
 * @example
 * trailText(["find", "find", "get Tabs"]); // "find ×2 → get Tabs"
 */
function trailText(steps: readonly string[]): string {
	const runs: Array<{ step: string; times: number }> = [];
	for (const step of steps) {
		const last = runs.at(-1);
		if (last?.step === step) {
			last.times += 1;
		} else {
			runs.push({ step, times: 1 });
		}
	}
	return runs.map(({ step, times }) => (times > 1 ? `${step} ×${times}` : step)).join(" → ");
}

/**
 * What the session of a weak find did next: the part it got first, with
 * its index in the `find` results (`-1` when absent), or no `get` before
 * the wait ended, with its first `TRAIL_LENGTH` steps and how many more it took.
 */
export type FollowThrough =
	| { kind: "get"; part: string; rank: number }
	| { kind: "none"; after: string[]; more: number; until: "timeout" | "shutdown" | "full" };

const WAIT_ENDS: Record<Extract<FollowThrough, { kind: "none" }>["until"], string> = {
	timeout: `in ${FOLLOW_THROUGH_MS / 60_000} min`,
	shutdown: "before the server stopped",
	full: "before more weak finds filled the wait list",
};

function followThroughLine(followThrough: FollowThrough): string {
	if (followThrough.kind === "get") {
		const { part, rank } = followThrough;
		return `*Then:* get ${escape(part)} (${rank < 0 ? "not in the results" : `result ${rank + 1}`})`;
	}
	const wait = WAIT_ENDS[followThrough.until];
	const { after, more } = followThrough;
	return after.length === 0
		? `*Then:* no call ${wait}`
		: `*Then:* ${escape(trailText(after))}${more > 0 ? ` → … ${count(more)} more` : ""}, no get ${wait}`;
}

function goal(event: ToolCallEvent): string | undefined {
	return event.intent == null ? undefined : `> Goal: ${escape(event.intent)}`;
}

/** The fields of a call that a gap report renders. */
type GapReport = Pick<
	ToolCallEvent,
	"client" | "source" | "workspace" | "ticket" | "intent" | "dataVersion" | "gap"
>;

/**
 * Where the call came from: the ngrok repo of its `source`, then its
 * workspace, such as `ngrok-private/frontend › dashboard`.
 */
function origin(event: GapReport): string | undefined {
	return [event.source, event.workspace].filter(Boolean).join(" › ") || undefined;
}

/**
 * The repeat key of an alert: `base`, then where the call came from. Why: the
 * same gap from two apps must post two alerts in the same hour.
 */
function keyOf(base: string, event: ToolCallEvent): string {
	const from = origin(event);
	return from == null ? base : `${base} @ ${from}`;
}

/** The Linear URL of an issue key. `ticketKey` lets no markup through. */
function issueUrl(key: string): string {
	return `https://linear.app/ngrok/issue/${key}`;
}

function slackLink(key: string): string {
	return `<${issueUrl(key)}|${key}>`;
}

function versionOf(event: GapReport): string | undefined {
	return event.dataVersion == null ? undefined : `mantle ${event.dataVersion}`;
}

/** The client, where the call came from, the Linear issue of its work, and the data version. */
function footer(event: ToolCallEvent): string {
	const link = event.ticket != null ? slackLink(event.ticket) : undefined;
	return `_${[escape(clientName(event.client)), origin(event), link, versionOf(event)].filter(Boolean).join(" · ")}_`;
}

/** What a gap report needed, what the agent did instead, and the closest part. */
function gapSummary(gap: GapSignal): string {
	return lines(
		`An agent needed ${gap.kind == null ? "something" : KIND_LABELS[gap.kind]}.`,
		gap.workaround == null ? undefined : WORKAROUND_LABELS[gap.workaround],
		gap.closestPart == null ? undefined : `The closest part was ${gap.closestPart}.`,
	);
}

/**
 * The fields of a gap report as pretty JSON, for the aggregator that reads
 * the channel. `<`, `>`, `&`, and backticks are JSON escapes, so the text has
 * no Slack markup and cannot close its code block.
 */
function gapRecord(event: GapReport & { gap: GapSignal }): string {
	const { gap } = event;
	const record = {
		schema: "mantle-gap/1",
		need: gap.tokens.join(" "),
		kind: gap.kind,
		workaround: gap.workaround,
		closestPart: gap.closestPart,
		ticket: event.ticket,
		client: event.client,
		source: event.source,
		workspace: event.workspace,
		dataVersion: event.dataVersion,
		intent: event.intent,
		tried: gap.tried,
		reflection: gap.reflection,
		built: gap.built,
	};
	return JSON.stringify(record, null, 2).replace(
		/[<>&`]/g,
		(character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
	);
}

/**
 * A Slack code block, where text shows as typed: no link, mention, or format
 * renders. A run of three backticks turns into look-alike characters, so the
 * text cannot close the block.
 */
function codeBlock(text: string): string {
	return `\`\`\`\n${text.replace(/`{3,}/g, (run) => "\u02cb".repeat(run.length))}\n\`\`\``;
}

/** Text with `http://` and `https://` defanged to `hxxp://` and `hxxps://`, so no reader fetches a link. */
function defang(text: string): string {
	return text.replace(/\bhttp(s?):\/\//gi, "hxxp$1://");
}

/**
 * The first `length` characters of markdown. A cut inside a code fence closes
 * the fence, so the text after it keeps its format.
 *
 * @example
 * clipMarkdown("```tsx\n<Steps />\n```", 12); // "```tsx\n<Step…\n```"
 */
export function clipMarkdown(markdown: string, length: number): string {
	if (markdown.length <= length) {
		return markdown;
	}
	const clipped = `${markdown.slice(0, length).trimEnd()}…`;
	return (clipped.match(/```/g)?.length ?? 0) % 2 === 1 ? `${clipped}\n\`\`\`` : clipped;
}

/**
 * The Slack alert for a call that a person must see now, or `undefined`:
 *
 * - a `report_gap` call, with the `session` trail before it,
 * - a `find` call with no strong match, when its query has words that are safe to log, with its `followThrough`, and
 * - a call that failed with a `busy` or `internal` error.
 *
 * @example
 * alertOf({ tool: "report_gap", outcome: "ok", latencyMs: 4, resultBytes: 60, gap: { source: "report_gap", tokens: ["stepper"], kind: "component", workaround: "composed-mantle-parts" } });
 * // { key: "gap:stepper", text: ':jigsaw: *Gap reported: "stepper"*\n\nAn agent needed a component.\nIt composed mantle parts instead.\n\n_unknown client_\n\n```\n{\n  "schema": "mantle-gap/1", …\n}\n```' }
 */
export function alertOf(
	event: ToolCallEvent,
	{ session, followThrough }: { session?: string; followThrough?: FollowThrough } = {},
): Alert | undefined {
	const { gap } = event;
	if (gap?.source === "report_gap") {
		const need = escape(gap.tokens.join(" "));
		return {
			// Why the ticket: two tickets that need the same part are two reports.
			key: keyOf(event.ticket == null ? `gap:${need}` : `gap:${need} ${event.ticket}`, event),
			text: sections(
				`:jigsaw: *Gap reported: "${need}"*`,
				escape(gapSummary(gap)),
				session == null ? undefined : `*Session:* ${escape(session)}`,
				footer(event),
				codeBlock(gapRecord({ ...event, gap })),
				gap.writeup == null
					? undefined
					: lines("*Write-up*", codeBlock(escape(defang(gap.writeup)))),
			),
		};
	}
	if (gap?.source === "find") {
		const query = escape(gap.tokens.join(" "));
		const guesses = (event.ids ?? []).slice(0, 3).map(escape);
		return {
			key: keyOf(`find:${query}`, event),
			text: sections(
				`:mag: *No strong match for "${query}"*`,
				guesses.length > 0
					? lines("*Best guesses*", bullets(guesses))
					: "No part or docs page matched.",
				followThrough == null ? undefined : followThroughLine(followThrough),
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

/** Which of `find` and `check` a session called first. */
type Opening = "find" | "check";

/** The calls of one caller with no gap of `SESSION_IDLE_MS`, as the pulse tracks them. */
export type Session = {
	/** Unique in the process. */
	id: number;
	lastSeen: number;
	opening?: Opening;
	/** When the call that set `opening` started. Why: calls log when they end, so a slow `find` can log after a later `check`. */
	openedAt?: number;
	calls: number;
	/** The last `TRAIL_LENGTH` steps, from `stepOf`. */
	trail: string[];
};

/** The counts of the calls since the last digest. */
export type Digest = {
	since: number;
	calls: number;
	tools: Map<string, ToolStats>;
	errors: Map<ToolErrorKind, number>;
	/** At most `DIGEST_KEYS` names. A call from a new client after the cap counts only in `calls`. */
	clients: Map<string, number>;
	/** The calls of each source, with `untagged` for a call with no source. At most `DIGEST_KEYS`, as `clients`. */
	sources: Map<string, number>;
	/** The first of `find` and `check` that each session called, by session ID. At most `SESSION_KEYS`. */
	sessions: Map<number, Opening | undefined>;
	/** The calls rejected for each tool, argument, and problem, such as `find query too long`. At most `DIGEST_KEYS`. */
	invalidArguments: Map<string, number>;
	/** The needs of the reports and of the weak finds that did not lead to their top guess. At most `DIGEST_KEYS`. */
	needs: Map<string, number>;
	/** The weak finds whose session then got the top guess, as `"query" → Part`. At most `DIGEST_KEYS`. */
	topGuesses: Map<string, number>;
	/** All weak finds whose session then got the top guess, also past the cap of `topGuesses`. */
	topGuessHits: number;
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
		sources: new Map(),
		sessions: new Map(),
		invalidArguments: new Map(),
		needs: new Map(),
		topGuesses: new Map(),
		topGuessHits: 0,
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

/** Sets the opening of a session in the digest. A new session after `SESSION_KEYS` is not added. */
function addSession(digest: Digest, id: number, opening: Opening | undefined) {
	if (digest.sessions.has(id) || digest.sessions.size < SESSION_KEYS) {
		digest.sessions.set(id, opening);
	}
}

/**
 * Adds one call to the digest. A weak find does not count here: the pulse
 * counts it when it knows whether the session got the top guess, so its
 * count and its outcome go in the same digest.
 */
export function addToDigest(
	digest: Digest,
	event: ToolCallEvent,
	session?: Pick<Session, "id" | "opening">,
) {
	digest.calls += 1;
	const stats = digest.tools.get(event.tool) ?? { calls: 0, totalMs: 0, maxMs: 0 };
	stats.calls += 1;
	stats.totalMs += event.latencyMs;
	stats.maxMs = Math.max(stats.maxMs, event.latencyMs);
	digest.tools.set(event.tool, stats);
	if (event.outcome === "error") {
		increment(digest.errors, event.errorKind);
	}
	for (const { argument, problem } of event.invalidArguments ?? []) {
		increment(digest.invalidArguments, `${event.tool} ${argument} ${problem}`);
	}
	increment(digest.clients, clientName(event.client));
	increment(digest.sources, event.source ?? "untagged");
	if (session != null) {
		addSession(digest, session.id, session.opening);
	}
	if (event.gap?.source === "report_gap") {
		increment(digest.needs, event.gap.tokens.join(" "));
		digest.reportedGaps += 1;
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
	for (const [source, calls] of older.sources) {
		increment(digest.sources, source, calls);
	}
	for (const [id, opening] of older.sessions) {
		addSession(digest, id, digest.sessions.get(id) ?? opening);
	}
	for (const [reason, times] of older.invalidArguments) {
		increment(digest.invalidArguments, reason, times);
	}
	for (const [need, times] of older.needs) {
		increment(digest.needs, need, times);
	}
	for (const [pair, times] of older.topGuesses) {
		increment(digest.topGuesses, pair, times);
	}
	digest.topGuessHits += older.topGuessHits;
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
 * The top three keys of `map` with their share of `total`, then how many
 * keys are left, such as `claude-code 75% · cursor 25%`.
 */
function shares(map: Map<string, number>, total: number): string {
	const entries = ranked(map);
	return [
		...entries
			.slice(0, 3)
			.map(([key, calls]) => `${escape(key)} ${Math.round((calls / total) * 100)}%`),
		...(entries.length > 3 ? [`${entries.length - 3} more`] : []),
	].join(" · ");
}

/** The top `limit` keys of `map`, each with `×n` when it counts more than one, then how many are left. */
function tally(map: Map<string, number>, limit: number, label = escape): string {
	const entries = ranked(map);
	return [
		...entries
			.slice(0, limit)
			.map(([key, times]) => `${label(key)}${times > 1 ? ` ×${times}` : ""}`),
		...(entries.length > limit ? [`${entries.length - limit} more`] : []),
	].join(" · ");
}

/** The sessions line: how many sessions called, and how many called `find` or `check` first. */
function sessionsLine(sessions: Map<number, Opening | undefined>): string | undefined {
	if (sessions.size === 0) {
		return undefined;
	}
	const openings = Array.from(sessions.values());
	const findFirst = openings.filter((opening) => opening === "find").length;
	const checkFirst = openings.filter((opening) => opening === "check").length;
	return [
		`*Sessions:* ${count(sessions.size)}`,
		...(findFirst > 0 ? [`${count(findFirst)} called find before any check`] : []),
		...(checkFirst > 0 ? [`${count(checkFirst)} called check before any find`] : []),
	].join(" · ");
}

/**
 * The Slack text of a digest, or `undefined` when it has no calls and no
 * weak finds. Why weak finds: a find can end its wait in a digest with no calls.
 *
 * @example
 * digestText(digest, { now: Date.now(), reason: "shutdown", host: "www-7f9c" });
 */
export function digestText(
	digest: Digest,
	{ now, reason, host }: { now: number; reason: "interval" | "shutdown"; host: string },
): string | undefined {
	if (digest.calls === 0 && digest.weakFinds === 0) {
		return undefined;
	}
	const errorCount = Array.from(digest.errors.values()).reduce((sum, value) => sum + value, 0);
	const errorShare = ((errorCount / digest.calls) * 100).toFixed(1);
	const slowest = Array.from(digest.tools).toSorted(
		([, left], [, right]) => right.totalMs / right.calls - left.totalMs / left.calls,
	)[0];
	const needs = ranked(digest.needs)
		.slice(0, 5)
		.map(([need, times]) => `"${escape(need)}"${times > 1 ? ` ×${times}` : ""}`);
	const tools = ranked(new Map(Array.from(digest.tools, ([tool, stats]) => [tool, stats.calls])));
	const errors =
		errorCount === 0
			? "*Errors:* none"
			: lines(
					`*Errors:* ${count(errorCount)} of ${count(digest.calls)} calls (${errorShare}%)`,
					bullets(
						ranked(digest.errors).map(([kind, times]) =>
							kind === "validation" && digest.invalidArguments.size > 0
								? `${count(times)} ${ERROR_LABELS[kind]}: ${tally(digest.invalidArguments, 3)}`
								: `${count(times)} ${ERROR_LABELS[kind]}`,
						),
					),
				);
	return sections(
		`:bar_chart: *mantle MCP: ${count(digest.calls)} ${digest.calls === 1 ? "call" : "calls"} in the last ${duration(now - digest.since)}*`,
		digest.calls === 0
			? undefined
			: lines(
					`*Tools:* ${tools.map(([tool, calls]) => `${tool} ${count(calls)}`).join(" · ")}`,
					`*Sources:* ${shares(digest.sources, digest.calls)}`,
					`*Clients:* ${shares(digest.clients, digest.calls)}`,
					sessionsLine(digest.sessions),
					slowest == null
						? undefined
						: `*Slowest:* ${slowest[0]} averages ${duration(slowest[1].totalMs / slowest[1].calls)} (max ${duration(slowest[1].maxMs)})`,
				),
		digest.calls === 0 ? undefined : errors,
		digest.reportedGaps + digest.weakFinds === 0
			? "*Gaps:* none"
			: lines(
					`*Gaps:* ${count(digest.reportedGaps)} reported, ${count(digest.weakFinds)} finds with no strong match${digest.topGuessHits > 0 ? ` (${count(digest.topGuessHits)} then got the top guess)` : ""}`,
					needs.length === 0 ? undefined : bullets(needs),
					digest.topGuesses.size === 0
						? undefined
						: `*Top guess was right:* ${tally(digest.topGuesses, 3, (pair) => pair)}`,
				),
		digest.goals.length === 0
			? undefined
			: lines("*Recent goals*", bullets(digest.goals.map(escape))),
		digest.heldAlerts === 0
			? undefined
			: `*Held back:* ${count(digest.heldAlerts)} alerts over the caps of ${GAPS_PER_HOUR} gap reports and ${ALERTS_PER_HOUR} other alerts an hour.`,
		`_${reason === "shutdown" ? "Posted at shutdown" : "Daily digest"} from ${escape(host)}. Each server counts its own calls._`,
	);
}

/** Posts tool-call alerts and digests to Slack. */
export type Pulse = {
	/**
	 * Adds a call to the digest and to its session, and posts its alert when
	 * the call needs one. A weak find waits for its session first. Never waits
	 * for Slack.
	 */
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

/** A weak find that waits for its session to `get` a part. */
type ParkedFind = {
	event: ToolCallEvent & { gap: GapSignal };
	/** The key of its session. Why not the `Session`: an evicted session comes back as a new object. */
	sessionKey: string;
	/** When the find ended. A `get` that started earlier did not read its results. */
	endedAt: number;
	/** The first `TRAIL_LENGTH` steps of the session after the find. */
	after: string[];
	/** How many steps came after `after`. */
	more: number;
	timer: ReturnType<typeof setTimeout>;
};

/**
 * Creates the Slack pulse of the MCP server. With no `webhookUrl`, it posts
 * nothing. A repeat of an alert waits an hour after Slack accepts it, and one
 * process tries at most 30 alerts an hour; the digest counts the alerts it held
 * back. A weak find posts when its session gets a part other than the top
 * guess, or after 10 min with no `get`. When the session gets the top guess,
 * only the digest counts it.
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
	const sentInWindow = { gap: 0, other: 0 };
	/** The posts and the interval flushes that are not done. */
	const pending = new Set<Promise<unknown>>();
	let inFlight = 0;
	let onIdle: (() => void) | undefined;
	/** The sessions by caller, least recently seen first. */
	const sessions = new Map<string, Session>();
	let lastSessionId = 0;
	const parked = new Set<ParkedFind>();

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

	/** The session of `caller` at `time`: its open session, else a new one. */
	const sessionOf = (caller: string, time: number): Session => {
		const known = sessions.get(caller);
		sessions.delete(caller);
		let session = known;
		if (session == null || time - session.lastSeen >= SESSION_IDLE_MS) {
			lastSessionId += 1;
			session = { id: lastSessionId, lastSeen: time, calls: 0, trail: [] };
		}
		session.lastSeen = time;
		sessions.set(caller, session);
		const oldest = sessions.keys().next().value;
		if (sessions.size > SESSION_KEYS && oldest != null) {
			sessions.delete(oldest);
		}
		return session;
	};

	/** Posts `alert` unless a repeat or the hourly cap holds it back. */
	const send = (alert: Alert | undefined) => {
		if (alert == null) {
			return;
		}
		const time = now();
		if (time - (lastSent.get(alert.key) ?? -Infinity) < HOUR_MS) {
			return;
		}
		if (time - windowStart >= HOUR_MS) {
			windowStart = time;
			sentInWindow.gap = 0;
			sentInWindow.other = 0;
		}
		const budget = alert.key.startsWith("gap:") ? "gap" : "other";
		if (sentInWindow[budget] >= (budget === "gap" ? GAPS_PER_HOUR : ALERTS_PER_HOUR)) {
			digest.heldAlerts += 1;
			return;
		}
		sentInWindow[budget] += 1;
		lastSent.set(alert.key, time);
		void track(postAlert(alert, time));
	};

	/** Ends the wait of a weak find, and returns its alert. A right top guess has none: only the digest counts it. */
	const resolve = (find: ParkedFind, followThrough: FollowThrough): Alert | undefined => {
		clearTimeout(find.timer);
		parked.delete(find);
		const need = find.event.gap.tokens.join(" ");
		digest.weakFinds += 1;
		if (followThrough.kind === "get" && followThrough.rank === 0) {
			increment(digest.topGuesses, `"${escape(need)}" → ${escape(followThrough.part)}`);
			digest.topGuessHits += 1;
			return undefined;
		}
		increment(digest.needs, need);
		return alertOf(find.event, { followThrough });
	};

	const park = (event: ToolCallEvent & { gap: GapSignal }, sessionKey: string, time: number) => {
		// Why: a burst of weak finds must not hold a timer each. Past the cap, the oldest wait ends early.
		const oldest = parked.values().next().value;
		if (parked.size >= SESSION_KEYS && oldest != null) {
			send(
				resolve(oldest, { kind: "none", after: oldest.after, more: oldest.more, until: "full" }),
			);
		}
		const find: ParkedFind = {
			event,
			sessionKey,
			endedAt: time,
			after: [],
			more: 0,
			timer: setTimeout(
				() =>
					send(
						resolve(find, { kind: "none", after: find.after, more: find.more, until: "timeout" }),
					),
				FOLLOW_THROUGH_MS,
			),
		};
		parked.add(find);
	};

	return {
		record: (event) => {
			const time = now();
			// Why the workspace and the ticket: two tasks behind one address and agent are two sessions.
			const sessionKey = `${event.caller} ${event.workspace ?? ""} ${event.ticket ?? ""}`;
			const session = sessionOf(sessionKey, time);
			const startedAt = time - event.latencyMs;
			if (
				(event.tool === "find" || event.tool === "check") &&
				(session.openedAt == null || startedAt < session.openedAt)
			) {
				session.opening = event.tool;
				session.openedAt = startedAt;
			}
			addToDigest(digest, event, session);
			const step = stepOf(event);
			const got = event.tool === "get" && event.outcome === "ok" ? event.ids?.[0] : undefined;
			for (const find of parked) {
				if (find.sessionKey !== sessionKey) {
					continue;
				}
				if (got != null && startedAt >= find.endedAt) {
					send(
						resolve(find, { kind: "get", part: got, rank: (find.event.ids ?? []).indexOf(got) }),
					);
				} else if (find.after.length < TRAIL_LENGTH) {
					find.after.push(step);
				} else {
					find.more += 1;
				}
			}
			const { gap } = event;
			if (gap?.source === "find") {
				park({ ...event, gap }, sessionKey, time);
			} else {
				send(
					alertOf(event, {
						session:
							session.trail.length === 0
								? undefined
								: `${session.calls > session.trail.length ? "… → " : ""}${trailText(session.trail)}`,
					}),
				);
			}
			session.calls += 1;
			session.trail = [...session.trail, step].slice(-TRAIL_LENGTH);
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
			const waiting = Array.from(parked, (find) =>
				resolve(find, { kind: "none", after: find.after, more: find.more, until: "shutdown" }),
			);
			// Why the digest first: Slack allows about one post a second, and the digest holds the counts.
			await postDigest(reason);
			for (const alert of waiting) {
				send(alert);
			}
			// Why again: a call that ended during the wait can post an alert.
			await settled();
		},
	};
}

/** The pulse of this process. It posts only where `MANTLE_MCP_SLACK_WEBHOOK_URL` is set. */
export const mcpPulse = createPulse({ webhookUrl: process.env.MANTLE_MCP_SLACK_WEBHOOK_URL });
