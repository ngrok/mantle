import { describe, expect, it, vi } from "vitest";
import {
	addToDigest,
	alertOf,
	createPulse,
	digestText,
	emptyDigest,
} from "~/utilities/mcp/pulse.server";
import type { ToolCallEvent } from "~/utilities/mcp/server.server";

const HOUR_MS = 3_600_000;

function event(overrides: Partial<ToolCallEvent> = {}): ToolCallEvent {
	return {
		tool: "find",
		outcome: "ok",
		latencyMs: 40,
		resultBytes: 900,
		client: "claude-code/2.1.3",
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

const weakFind = event({
	ids: ["DatePicker", "Calendar", "Popover", "Select"],
	gap: { source: "find", tokens: ["date", "range", "picker"] },
});

/** A pulse with a fake clock and a fake Slack that records each posted text. */
function testPulse(
	{ webhookUrl }: { webhookUrl: string | undefined } = { webhookUrl: "https://hooks.slack.test/x" },
) {
	let time = 0;
	const posts: string[] = [];
	const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
		posts.push((JSON.parse(init?.body as string) as { text: string }).text);
		return new Response("ok");
	});
	const pulse = createPulse({ webhookUrl, fetch, now: () => time, host: "www-1" });
	return {
		pulse,
		posts,
		fetch,
		advance: (ms: number) => {
			time += ms;
		},
	};
}

describe("alertOf", () => {
	it("says what a gap report needed, what the agent did, and why", () => {
		expect(alertOf(gapReport)?.text).toBe(
			[
				':jigsaw: *Gap reported: "stepper"*',
				"An agent needed a component. It composed mantle parts instead. The closest part was *Tabs*.",
				"> Goal: settings page with a danger zone",
				"_claude-code · mantle 0.93.0_",
			].join("\n"),
		);
	});

	it("names the top three guesses of a find with no strong match", () => {
		expect(alertOf(weakFind)?.text).toBe(
			[
				':mag: *No strong match for "date range picker"*',
				"Best guesses: DatePicker, Calendar, Popover.",
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
		expect(internal?.text).toContain("It failed after 1.2 s.");
		expect(busy?.text).toContain("*`get` is busy*");
	});

	it.each([
		["a strong find", event({ ids: ["Dialog"] })],
		["a caller error", event({ outcome: "error", errorKind: "validation" })],
		["a disabled tool", event({ outcome: "disabled" })],
	])("does not alert on %s", (_, call) => {
		expect(alertOf(call)).toBeUndefined();
	});

	it("escapes Slack markup, so an intent cannot ping or link", () => {
		const text = alertOf({ ...gapReport, intent: "<!channel> & <https://x.test|y>" })?.text;

		expect(text).toContain("> Goal: &lt;!channel&gt; &amp; &lt;https://x.test|y&gt;");
	});
});

describe("digestText", () => {
	it("sums the calls since the last digest for a person to read", () => {
		const digest = emptyDigest(0);
		addToDigest(digest, gapReport);
		addToDigest(digest, weakFind);
		addToDigest(digest, { ...weakFind, client: "cursor/1.0", intent: "booking form" });
		addToDigest(
			digest,
			event({ tool: "get", outcome: "error", errorKind: "not_found", latencyMs: 400 }),
		);

		expect(digestText(digest, { now: 6 * HOUR_MS, reason: "shutdown", host: "www-1" })).toBe(
			[
				":bar_chart: *mantle MCP: 4 calls in the last 6 h*",
				"*Tools:* find 2, report_gap 1, get 1",
				"*Errors:* 1 (25.0%): 1 not found",
				"*Clients:* claude-code 75%, cursor 25%",
				'*Gaps:* 1 reported, 2 finds with no strong match. Top needs: "date range picker" ×2, "stepper"',
				"*Slowest:* get averages 400 ms (max 400 ms)",
				"*Recent goals:* booking form; settings page with a danger zone",
				"_Posted at shutdown from www-1. Each server counts its own calls._",
			].join("\n"),
		);
	});

	it("has no text when no call came in", () => {
		expect(
			digestText(emptyDigest(0), { now: HOUR_MS, reason: "interval", host: "www-1" }),
		).toBeUndefined();
	});
});

describe("createPulse", () => {
	it("posts an alert once an hour for the same need", () => {
		const { pulse, posts, advance } = testPulse();

		pulse.record(gapReport);
		pulse.record(gapReport);
		advance(HOUR_MS);
		pulse.record(gapReport);

		expect(posts).toHaveLength(2);
	});

	it("holds back alerts over 30 an hour and counts them in the digest", async () => {
		const { pulse, posts } = testPulse();

		for (let index = 0; index < 32; index += 1) {
			pulse.record(event({ tool: `tool${index}`, outcome: "error", errorKind: "internal" }));
		}
		await pulse.flush("interval");

		expect(posts).toHaveLength(31);
		expect(posts.at(-1)).toContain("*Held back:* 2 alerts over the cap of 30 an hour.");
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
		const { pulse, fetch } = testPulse({ webhookUrl: undefined });

		pulse.record(gapReport);
		await pulse.flush("shutdown");

		expect(fetch).not.toHaveBeenCalled();
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
