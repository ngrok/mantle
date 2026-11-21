import { describe, expect, it, vi } from "vitest";
import { createLinearGaps } from "~/utilities/mcp/linear.server";

type Call = { query: string; variables: Record<string, unknown> };

/** A Linear client with a fake API that answers each request with `answer`. */
function testLinear(answer: (call: Call) => unknown) {
	const calls: Call[] = [];
	const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
		const call = JSON.parse(init?.body as string) as Call;
		calls.push(call);
		return Response.json({ data: answer(call) });
	});
	const linear = createLinearGaps({ apiKey: "lin_api_test", fetch, now: () => 0 });
	return { linear, calls, fetch };
}

const node = (identifier: string, title: string) => ({ id: `id-${identifier}`, identifier, title });

describe("createLinearGaps", () => {
	it("has no client with no API key", () => {
		expect(createLinearGaps({ apiKey: undefined })).toBeUndefined();
	});

	it("keeps the open MNTL issues whose titles share half the words of the need", async () => {
		const { linear, calls } = testLinear(() => ({
			searchIssues: {
				nodes: [
					node("MNTL-1", "Badge: add a dismiss button"),
					node("MNTL-2", "Button loading state"),
					node("MNTL-3", "Removable badge"),
				],
			},
		}));

		const similar = await linear?.similar(["removable", "badge", "dismiss", "button"]);

		expect(similar?.map((issue) => issue.key)).toEqual(["MNTL-1", "MNTL-3"]);
		expect(calls[0]?.variables).toMatchObject({ term: "removable badge dismiss button" });
	});

	it("creates an issue with the gap label, and writes at most 20 times an hour", async () => {
		const { linear, calls } = testLinear((call) =>
			call.query.includes("issueLabels")
				? { issueLabels: { nodes: [{ id: "label-1" }] } }
				: { issueCreate: { issue: { identifier: "MNTL-130" } } },
		);
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const keys = [];
		for (let index = 0; index < 21; index += 1) {
			keys.push(await linear?.create({ title: "MCP gap: stepper", description: "text" }));
		}

		expect(keys.slice(0, 20).every((key) => key === "MNTL-130")).toBe(true);
		expect(keys[20]).toBeUndefined();
		expect(calls.filter((call) => call.query.includes("issueLabels"))).toHaveLength(1);
		expect(calls.at(-1)?.variables).toMatchObject({ input: { labelIds: ["label-1"] } });
		error.mockRestore();
	});

	it("resolves to nothing when Linear answers with an error", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { linear } = testLinear(() => null);

		await expect(linear?.issue("CDATA-1234")).resolves.toBeUndefined();
		expect(error).toHaveBeenCalledWith("mcp linear request failed", 200);
		error.mockRestore();
	});
});
