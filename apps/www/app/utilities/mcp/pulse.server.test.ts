import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	addToDigest,
	alertOf,
	createPulse,
	digestText,
	emptyDigest,
} from "~/utilities/mcp/pulse.server";
import type { GapSignal, ToolCallEvent } from "~/utilities/mcp/server.server";

const HOUR_MS = 3_600_000;

function event(overrides: Partial<ToolCallEvent> = {}): ToolCallEvent {
	return {
		tool: "find",
		outcome: "ok",
		latencyMs: 40,
		resultBytes: 900,
		client: "claude-code/2.1.3",
		caller: "agent-a",
		dataVersion: "0.93.0",
		...overrides,
	} as ToolCallEvent;
}

const gapReport = event({
	tool: "report_gap",
	intent: "settings page with a danger zone",
	gap: {
		source: "report_gap",
		tokens: ["stepper"],
		kind: "component",
		workaround: "composed-mantle-parts",
		closestPart: "Tabs",
	},
});

const detailedSignal: GapSignal = {
	source: "report_gap",
	tokens: ["stepper"],
	kind: "component",
	workaround: "composed-mantle-parts",
	closestPart: "Tabs",
	tried: "find stepper, find wizard, get Tabs, get Strata",
	reflection: "I would use Tabs, but it switches panels and has no numbered steps or done state.",
	built: "a vertical list of numbered circles joined by a line",
};

const detailedGap = event({
	...gapReport,
	source: "ngrok-private/frontend",
	workspace: "dashboard",
	ticket: "FEP-1867",
	gap: detailedSignal,
});

/** The contents of each Slack code block in `text`, in order. */
function codeBlocks(text: string): string[] {
	return Array.from(text.matchAll(/```\n([\s\S]*?)\n```/g), (match) => match[1] ?? "");
}

const weakFind = event({
	ids: ["DatePicker", "Calendar", "Popover", "Select"],
	gap: { source: "find", tokens: ["date", "range", "picker"] },
});

/**
 * A pulse with a fake clock and a fake Slack that records each posted text.
 * `respond` makes the Slack answer; by default Slack accepts each post.
 */
function testPulse({
	webhookUrl = "https://hooks.slack.test/x",
	respond = async () => new Response("ok"),
}: {
	webhookUrl?: string;
	respond?: () => Promise<Response>;
} = {}) {
	let time = 0;
	const posts: string[] = [];
	const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
		posts.push((JSON.parse(init?.body as string) as { text: string }).text);
		return respond();
	});
	const pulse = createPulse({ webhookUrl, fetch, now: () => time, host: "www-1" });
	return {
		pulse,
		posts,
		fetch,
		advance: (ms: number) => {
			time += ms;
			vi.advanceTimersByTime(ms);
		},
	};
}

describe("alertOf", () => {
	it("says what a gap report needed and what the agent did, then its fields as JSON", () => {
		const text = alertOf(gapReport)?.text ?? "";

		expect(text.slice(0, text.indexOf("```"))).toBe(
			[
				':jigsaw: *Gap reported: "stepper"*',
				"",
				"An agent needed a component.",
				"It composed mantle parts instead.",
				"The closest part was Tabs.",
				"",
				"_claude-code · mantle 0.93.0_",
				"",
				"",
			].join("\n"),
		);
		expect(codeBlocks(text)).toHaveLength(1);
	});

	it("puts the provenance and the free text of a report in one JSON block", () => {
		const [record = ""] = codeBlocks(alertOf(detailedGap)?.text ?? "");

		// Why a literal: the aggregator that files the reports in Linear parses these keys.
		expect(JSON.parse(record)).toEqual({
			schema: "mantle-gap/1",
			need: "stepper",
			kind: "component",
			workaround: "composed-mantle-parts",
			closestPart: "Tabs",
			ticket: "FEP-1867",
			client: "claude-code/2.1.3",
			source: "ngrok-private/frontend",
			workspace: "dashboard",
			dataVersion: "0.93.0",
			intent: "settings page with a danger zone",
			tried: "find stepper, find wizard, get Tabs, get Strata",
			reflection:
				"I would use Tabs, but it switches panels and has no numbered steps or done state.",
			built: "a vertical list of numbered circles joined by a line",
		});
	});

	it("names the top three guesses of a find with no strong match", () => {
		expect(alertOf(weakFind)?.text).toBe(
			[
				':mag: *No strong match for "date range picker"*',
				"",
				"*Best guesses*",
				"• DatePicker",
				"• Calendar",
				"• Popover",
				"",
				"_claude-code · mantle 0.93.0_",
			].join("\n"),
		);
	});

	it("alerts on a server error and a busy server", () => {
		const internal = alertOf(
			event({ tool: "get", outcome: "error", errorKind: "internal", latencyMs: 1_240 }),
		);
		const busy = alertOf(event({ tool: "get", outcome: "error", errorKind: "busy" }));

		expect(internal?.text).toContain("*`get` failed with a server error*");
		expect(internal?.text).toContain("It failed after 1.2 s.\nThe stack is in the container log.");
		expect(busy?.text).toContain("*`get` is busy*");
	});

	it.each([
		["a strong find", event({ ids: ["Dialog"] })],
		["a caller error", event({ outcome: "error", errorKind: "validation" })],
		["a disabled tool", event({ outcome: "disabled" })],
	])("does not alert on %s", (_, call) => {
		expect(alertOf(call)).toBeUndefined();
	});

	it("names the ngrok repo and the workspace of a call in the footer", () => {
		const fromFrontend = alertOf({
			...weakFind,
			source: "ngrok-private/frontend",
			workspace: "dashboard",
		});

		expect(fromFrontend?.text).toContain(
			"_claude-code · ngrok-private/frontend › dashboard · mantle 0.93.0_",
		);
	});

	it("links the Linear issue of a call in the footer", () => {
		const text = alertOf({
			...weakFind,
			source: "ngrok-private/frontend",
			ticket: "FEP-1867",
		})?.text;

		expect(text).toContain(
			"_claude-code · ngrok-private/frontend · <https://linear.app/ngrok/issue/FEP-1867|FEP-1867> · mantle 0.93.0_",
		);
	});

	it("keeps Slack markup and code fences out of the JSON block, and parses back to the text", () => {
		const intent = "<!channel> & <https://x.test|y> ```";
		const text = alertOf({ ...gapReport, intent })?.text ?? "";
		const [record = ""] = codeBlocks(text);

		expect(record).not.toMatch(/[<>&`]/);
		expect((JSON.parse(record) as { intent: string }).intent).toBe(intent);
	});
});

describe("write-up", () => {
	it("shows the whole write-up in its own code block, defanged and escaped", () => {
		const writeup = `See https://x.test/a <!here>\n\n\`\`\`tsx\n<Steps />\n\`\`\`\n${"step\n".repeat(700)}`;
		const text = alertOf({ ...detailedGap, gap: { ...detailedSignal, writeup } })?.text ?? "";
		const [, shown = ""] = codeBlocks(text);

		expect(text).toContain("*Write-up*\n```\nSee hxxps://x.test/a &lt;!here&gt;");
		expect(shown).toContain("\u02cb\u02cb\u02cbtsx\n&lt;Steps /&gt;\n\u02cb\u02cb\u02cb");
		expect(shown.match(/step\n/g)).toHaveLength(700);
	});
});

describe("digestText", () => {
	it("sums the calls since the last digest for a person to read", () => {
		const digest = emptyDigest(0);
		addToDigest(digest, { ...gapReport, source: "ngrok-private/frontend" }, { id: 1 });
		addToDigest(digest, weakFind, { id: 2, opening: "find" });
		addToDigest(
			digest,
			{ ...weakFind, client: "cursor/1.0", intent: "booking form" },
			{ id: 3, opening: "find" },
		);
		addToDigest(
			digest,
			event({ tool: "get", outcome: "error", errorKind: "not_found", latencyMs: 400 }),
			{ id: 4, opening: "check" },
		);
		const badQuery = event({
			outcome: "error",
			errorKind: "validation",
			invalidArguments: [{ argument: "query", problem: "too long" }],
		});
		addToDigest(digest, badQuery, { id: 2, opening: "find" });
		addToDigest(digest, badQuery, { id: 2, opening: "find" });
		addToDigest(
			digest,
			event({
				tool: "get",
				outcome: "error",
				errorKind: "validation",
				invalidArguments: [{ argument: "name", problem: "missing" }],
			}),
			{ id: 2, opening: "find" },
		);

		expect(digestText(digest, { now: 6 * HOUR_MS, reason: "shutdown", host: "www-1" })).toBe(
			[
				":bar_chart: *mantle MCP: 7 calls in the last 6 h*",
				"",
				"*Tools:* find 4 · get 2 · report_gap 1",
				"*Sources:* untagged 86% · ngrok-private/frontend 14%",
				"*Clients:* claude-code 86% · cursor 14%",
				"*Sessions:* 4 · 2 called find before any check · 1 called check before any find",
				"*Slowest:* get averages 220 ms (max 400 ms)",
				"",
				"*Errors:* 4 of 7 calls (57.1%)",
				"• 3 bad arguments: find query too long ×2 · get name missing",
				"• 1 not found",
				"",
				"*Gaps:* 1 reported, 0 finds with no strong match",
				'• "stepper"',
				"",
				"*Recent goals*",
				"• booking form",
				"• settings page with a danger zone",
				"",
				"_Posted at shutdown from www-1. Each server counts its own calls._",
			].join("\n"),
		);
	});

	it("names at most 200 clients and counts the calls of the others", () => {
		const digest = emptyDigest(0);
		for (let index = 0; index < 300; index += 1) {
			addToDigest(digest, event({ client: `caller${index}/1.0` }));
		}

		const text = digestText(digest, { now: HOUR_MS, reason: "interval", host: "www-1" });

		expect(text).toContain("*mantle MCP: 300 calls in the last 1 h*");
		expect(text).toContain("*Clients:* caller0 0% · caller1 0% · caller2 0% · 197 more");
	});

	it("has no text when no call came in", () => {
		expect(
			digestText(emptyDigest(0), { now: HOUR_MS, reason: "interval", host: "www-1" }),
		).toBeUndefined();
	});
});

describe("createPulse", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const getPart = (part: string, caller = "agent-a") => event({ tool: "get", ids: [part], caller });

	it("counts a weak find in the digest only when its session gets the top guess", async () => {
		const { pulse, posts } = testPulse();

		pulse.record(weakFind);
		pulse.record(getPart("DatePicker"));
		await pulse.flush("shutdown");

		expect(posts).toHaveLength(1);
		expect(posts[0]).toContain(
			"*Gaps:* 0 reported, 1 finds with no strong match (1 then got the top guess)",
		);
		expect(posts[0]).toContain('*Top guess was right:* "date range picker" → DatePicker');
		expect(posts[0]).not.toContain('• "date range picker"');
	});

	it("posts a weak find when its own session gets another part, with the part's rank", async () => {
		const { pulse, posts } = testPulse();

		pulse.record(weakFind);
		pulse.record(getPart("DatePicker", "agent-b"));
		pulse.record(getPart("Calendar"));
		await pulse.flush("shutdown");

		expect(posts[0]).toContain("*Then:* get Calendar (result 2)");
		expect(posts[1]).toContain('• "date range picker"');
	});

	it("posts a weak find with the steps of its session after 10 min with no get", () => {
		const { pulse, posts, advance } = testPulse();

		pulse.record(weakFind);
		pulse.record(event({ tool: "check" }));
		pulse.record(event({ tool: "check", outcome: "error", errorKind: "too_large" }));
		advance(10 * 60_000 - 1);
		const beforeWait = posts.length;
		advance(1);

		expect(beforeWait).toBe(0);
		expect(posts).toHaveLength(1);
		expect(posts[0]).toContain("*Then:* check → check (too large), no get in 10 min");
	});

	it("shows at most 8 steps after a weak find, then how many more", () => {
		const { pulse, posts, advance } = testPulse();

		pulse.record(weakFind);
		for (let index = 0; index < 20; index += 1) {
			pulse.record(event({ tool: index % 2 === 0 ? "check" : "read_docs" }));
		}
		advance(10 * 60_000);

		expect(posts[0]).toContain(
			"*Then:* check → read_docs → check → read_docs → check → read_docs → check → read_docs → … 12 more, no get in 10 min",
		);
	});

	it("counts a weak find in the digest of its outcome, after an interval flush", async () => {
		const { pulse, posts } = testPulse();

		pulse.record(weakFind);
		await pulse.flush("interval");
		pulse.record(getPart("DatePicker"));
		await pulse.flush("shutdown");

		expect(posts).toHaveLength(2);
		expect(posts[1]).toContain(
			"*Gaps:* 0 reported, 1 finds with no strong match (1 then got the top guess)",
		);
	});

	it("keeps the finds of another workspace or ticket out of a session", () => {
		const { pulse, posts, advance } = testPulse();
		const frontend = { source: "ngrok-private/frontend" } as const;

		pulse.record({ ...weakFind, ...frontend, workspace: "dashboard", ticket: "FEP-1" });
		pulse.record({ ...getPart("DatePicker"), ...frontend, workspace: "blog", ticket: "FEP-2" });
		advance(10 * 60_000);

		expect(posts).toHaveLength(1);
		expect(posts[0]).toContain("*Then:* no call in 10 min");
	});

	it("waits on each weak find of a session, also when two have the same words", async () => {
		const { pulse, posts } = testPulse();

		pulse.record(weakFind);
		pulse.record({ ...weakFind, ids: ["DataTable", "Calendar"] });
		pulse.record(getPart("DataTable"));
		await pulse.flush("shutdown");

		expect(posts[0]).toContain("*Then:* get DataTable (not in the results)");
		expect(posts[1]).toContain('*Top guess was right:* "date range picker" → DataTable');
	});

	it("counts the opening of a session by when its calls started, not when they ended", async () => {
		const { pulse, posts } = testPulse();

		pulse.record(event({ tool: "check", latencyMs: 10 }));
		pulse.record(event({ tool: "find", ids: ["Dialog"], latencyMs: 500 }));
		await pulse.flush("shutdown");

		expect(posts[0]).toContain("*Sessions:* 1 · 1 called find before any check");
	});

	it("posts a waiting weak find at shutdown", async () => {
		const { pulse, posts } = testPulse();

		pulse.record(weakFind);
		await pulse.flush("shutdown");

		expect(posts[0]).toContain("*Then:* no call before the server stopped");
		expect(posts[1]).toContain('• "date range picker"');
	});

	it("starts a new session when a caller makes no call for 30 min", async () => {
		const { pulse, posts, advance } = testPulse();

		pulse.record(event({ tool: "find", ids: ["Dialog"] }));
		advance(30 * 60_000 - 1);
		pulse.record(event({ tool: "check" }));
		advance(30 * 60_000);
		pulse.record(event({ tool: "check" }));
		pulse.record(event({ tool: "find", ids: ["Dialog"] }));
		await pulse.flush("shutdown");

		expect(posts[0]).toContain(
			"*Sessions:* 2 · 1 called find before any check · 1 called check before any find",
		);
	});

	it("shows the calls of the session before a gap report", () => {
		const { pulse, posts } = testPulse();

		pulse.record(event({ tool: "find", ids: ["Dialog"] }));
		pulse.record(event({ tool: "find", ids: ["Tabs"] }));
		pulse.record(getPart("Tabs"));
		pulse.record(gapReport);

		expect(posts[0]).toContain("*Session:* find ×2 → get Tabs\n");
	});
	it("posts an alert once an hour for the same need", () => {
		const { pulse, posts, advance } = testPulse();

		pulse.record(gapReport);
		pulse.record(gapReport);
		advance(HOUR_MS);
		pulse.record(gapReport);

		expect(posts).toHaveLength(2);
	});

	it("posts the same need once for each app in the same hour", () => {
		const { pulse, posts } = testPulse();
		const fromDashboard = {
			...gapReport,
			source: "ngrok-private/frontend",
			workspace: "dashboard",
		} as const;

		pulse.record(fromDashboard);
		pulse.record({ ...fromDashboard, workspace: "blog" });
		pulse.record(fromDashboard);

		expect(posts).toHaveLength(2);
		expect(posts[1]).toContain("ngrok-private/frontend › blog");
	});

	it("posts the same need once for each ticket in the same hour", () => {
		const { pulse, posts } = testPulse();

		pulse.record(detailedGap);
		pulse.record({ ...detailedGap, ticket: "FEP-2" });

		expect(posts).toHaveLength(2);
		expect(posts[1]).toContain("FEP-2");
	});

	it("posts a gap report after other alerts used up their cap", () => {
		const { pulse, posts } = testPulse();

		for (let index = 0; index < 31; index += 1) {
			pulse.record(event({ tool: `tool${index}`, outcome: "error", errorKind: "internal" }));
		}
		pulse.record(gapReport);

		expect(posts).toHaveLength(31);
		expect(posts.at(-1)).toContain(":jigsaw:");
	});

	it("holds back alerts over 30 an hour and counts them in the digest", async () => {
		const { pulse, posts } = testPulse();

		for (let index = 0; index < 32; index += 1) {
			pulse.record(event({ tool: `tool${index}`, outcome: "error", errorKind: "internal" }));
		}
		await pulse.flush("interval");

		expect(posts).toHaveLength(31);
		expect(posts.at(-1)).toContain(
			"*Held back:* 2 alerts over the caps of 60 gap reports and 30 other alerts an hour.",
		);
	});

	it("posts the digest at a flush, then starts a new one", async () => {
		const { pulse, posts } = testPulse();

		pulse.record(event({ ids: ["Dialog"] }));
		await pulse.flush("shutdown");
		await pulse.flush("shutdown");

		expect(posts).toHaveLength(1);
		expect(posts[0]).toContain("*mantle MCP: 1 call in the last 0 ms*");
	});

	it("posts nothing with no webhook URL", async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const pulse = createPulse({ webhookUrl: undefined, fetch });

		pulse.record(gapReport);
		await pulse.flush("shutdown");

		expect(fetch).not.toHaveBeenCalled();
	});

	it("posts an alert again when Slack refused it", async () => {
		const answers = [new Response("rate limited", { status: 429 }), new Response("ok")];
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { pulse, posts } = testPulse({
			respond: async () => answers.shift() ?? new Response("ok"),
		});

		pulse.record(gapReport);
		await pulse.flush("shutdown");
		pulse.record(gapReport);
		pulse.record(gapReport);
		await pulse.flush("shutdown");

		expect(posts.filter((text) => text.startsWith(":jigsaw:"))).toHaveLength(2);
		expect(error).toHaveBeenCalledWith("mcp pulse post failed", 429);
		error.mockRestore();
	});

	it("posts the calls of a refused digest with the next digest", async () => {
		const answers = [new Response("error", { status: 500 }), new Response("ok")];
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { pulse, posts } = testPulse({
			respond: async () => answers.shift() ?? new Response("ok"),
		});

		pulse.record(event({ ids: ["Dialog"] }));
		await pulse.flush("interval");
		pulse.record(event({ ids: ["Dialog"] }));
		await pulse.flush("interval");

		expect(posts[1]).toContain("*mantle MCP: 2 calls in the last 0 ms*");
		error.mockRestore();
	});

	it("posts the shutdown digest after an interval digest that is posting", async () => {
		const slack = Promise.withResolvers<Response>();
		let answered = false;
		const answeredAtShutdownPost: boolean[] = [];
		const { pulse, posts } = testPulse({
			respond: () => {
				if (posts.length === 1) {
					return slack.promise;
				}
				answeredAtShutdownPost.push(answered);
				return Promise.resolve(new Response("ok"));
			},
		});

		pulse.record(event({ ids: ["Dialog"] }));
		void pulse.flush("interval");
		pulse.record(event({ ids: ["Dialog"] }));
		const shutdown = pulse.flush("shutdown");
		answered = true;
		slack.resolve(new Response("ok"));
		await shutdown;

		expect(answeredAtShutdownPost).toEqual([true]);
	});

	it("waits at shutdown for the calls of a request in flight", async () => {
		const { pulse, posts } = testPulse();

		const release = pulse.hold();
		const shutdown = pulse.flush("shutdown");
		pulse.record(event({ ids: ["Dialog"] }));
		release();
		await shutdown;

		expect(posts).toHaveLength(1);
		expect(posts[0]).toContain("*mantle MCP: 1 call in the last 0 ms*");
	});

	it("keeps a failed post out of the tool call and the shutdown", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const pulse = createPulse({
			webhookUrl: "https://hooks.slack.test/secret",
			fetch: async () => {
				throw new TypeError("fetch failed: https://hooks.slack.test/secret");
			},
		});

		expect(() => pulse.record(gapReport)).not.toThrow();
		await expect(pulse.flush("shutdown")).resolves.toBeUndefined();
		expect(error).toHaveBeenCalledWith("mcp pulse post failed", "TypeError");
		error.mockRestore();
	});
});
