import { z } from "zod";

const HOUR_MS = 3_600_000;

/** The Mantle team (MNTL), which holds the gap issues. */
const MANTLE_TEAM_ID = "e290e66b-241e-4124-b444-b023fdeb1fff";

/** The label of each gap issue that the server creates. */
export const GAP_LABEL = "mcp-gap";

/** The most issues and comments that one process writes in an hour. */
const WRITES_PER_HOUR = 20;

/** The longest wait for Linear. It holds a `report_gap` call. */
const REQUEST_TIMEOUT_MS = 3_000;

/** A Linear issue: its UUID, its key, such as `MNTL-121`, and its title. */
export type LinearIssue = { id: string; key: string; title: string };

/** The gap issues of the Mantle team in Linear. Each method resolves to `undefined` or `false` when Linear fails. */
export type LinearGaps = {
	/** The issue with the key `key`, in any team. */
	issue: (key: string) => Promise<LinearIssue | undefined>;
	/**
	 * Up to three open MNTL issues whose titles share at least half of the
	 * words of `need`. Resolves to `undefined` when the search fails, so the
	 * caller cannot read a failure as "no match".
	 */
	similar: (need: readonly string[]) => Promise<LinearIssue[] | undefined>;
	/** Creates a gap issue, and resolves to its key. */
	create: (issue: { title: string; description: string }) => Promise<string | undefined>;
	/** Adds a comment to the issue with the UUID `id`. */
	comment: (id: string, body: string) => Promise<boolean>;
};

const issueFields = "id identifier title";

const issueNode = z.object({
	id: z.string(),
	identifier: z.string(),
	title: z.string(),
});

function issueOf(node: z.infer<typeof issueNode>): LinearIssue {
	return { id: node.id, key: node.identifier, title: node.title };
}

/**
 * Creates the Linear client of the gap flow. With no `apiKey`, it returns
 * `undefined`, and `report_gap` writes nothing to Linear. One process writes
 * at most 20 issues and comments an hour.
 *
 * @example
 * const linear = createLinearGaps({ apiKey: process.env.MANTLE_MCP_LINEAR_API_KEY });
 * const key = await linear?.create({ title: "MCP gap: stepper", description: "…" });
 */
export function createLinearGaps({
	apiKey,
	fetch = globalThis.fetch,
	now = Date.now,
}: {
	apiKey: string | undefined;
	fetch?: typeof globalThis.fetch;
	now?: () => number;
}): LinearGaps | undefined {
	if (apiKey == null || apiKey === "") {
		return undefined;
	}
	let windowStart = now();
	let writes = 0;
	let labelId: string | undefined;

	/** Runs one GraphQL request, and resolves to its parsed `data`, or `undefined`. */
	const request = async <Data>(
		query: string,
		variables: Record<string, unknown>,
		schema: z.ZodType<Data>,
	): Promise<Data | undefined> => {
		try {
			const response = await fetch("https://api.linear.app/graphql", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: apiKey },
				body: JSON.stringify({ query, variables }),
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
			const parsed = z.object({ data: schema }).safeParse(await response.json());
			if (!parsed.success) {
				console.error("mcp linear request failed", response.status);
				return undefined;
			}
			return parsed.data.data;
		} catch (error) {
			// Why no message: it can quote the request, which holds the API key.
			console.error("mcp linear request failed", error instanceof Error ? error.name : "unknown");
			return undefined;
		}
	};

	/** Counts one write, and returns `false` when the hour has no writes left. */
	const takeWrite = () => {
		if (now() - windowStart >= HOUR_MS) {
			windowStart = now();
			writes = 0;
		}
		if (writes >= WRITES_PER_HOUR) {
			console.error("mcp linear write held back");
			return false;
		}
		writes += 1;
		return true;
	};

	/**
	 * The ID of the gap label of MNTL or of the workspace. Why only those: an
	 * issue takes only labels that its team can use. A failed lookup is not
	 * kept, so the next issue tries again.
	 */
	const gapLabelId = async () => {
		labelId ??= (
			await request(
				`query ($name: String!) {
					issueLabels(filter: { name: { eq: $name }, or: [{ team: { null: true } }, { team: { key: { eq: "MNTL" } } }] }, first: 1) { nodes { id } }
				}`,
				{ name: GAP_LABEL },
				z.object({ issueLabels: z.object({ nodes: z.array(z.object({ id: z.string() })) }) }),
			)
		)?.issueLabels.nodes[0]?.id;
		return labelId;
	};

	return {
		issue: async (key) => {
			const data = await request(
				`query ($id: String!) { issue(id: $id) { ${issueFields} } }`,
				{ id: key },
				z.object({ issue: issueNode }),
			);
			return data == null ? undefined : issueOf(data.issue);
		},
		similar: async (need) => {
			const data = await request(
				`query ($term: String!, $teamId: String!) {
					searchIssues(term: $term, teamId: $teamId, first: 10, filter: { state: { type: { nin: ["completed", "canceled"] } } }) { nodes { ${issueFields} } }
				}`,
				{ term: need.join(" "), teamId: MANTLE_TEAM_ID },
				z.object({ searchIssues: z.object({ nodes: z.array(issueNode) }) }),
			);
			if (data == null) {
				return undefined;
			}
			const wanted = new Set(need);
			return data.searchIssues.nodes
				.map(issueOf)
				.filter((issue) => {
					// Why not `gapTokens`: it drops a word with a colon, such as "Stepper:" in a title.
					const words = new Set(issue.title.toLowerCase().split(/[^a-z0-9]+/));
					const shared = Array.from(words).filter((word) => wanted.has(word)).length;
					return shared > 0 && shared * 2 >= wanted.size;
				})
				.slice(0, 3);
		},
		create: async ({ title, description }) => {
			if (!takeWrite()) {
				return undefined;
			}
			const label = await gapLabelId();
			const data = await request(
				`mutation ($input: IssueCreateInput!) { issueCreate(input: $input) { issue { identifier } } }`,
				{
					input: {
						teamId: MANTLE_TEAM_ID,
						title,
						description,
						labelIds: label == null ? undefined : [label],
					},
				},
				z.object({ issueCreate: z.object({ issue: z.object({ identifier: z.string() }) }) }),
			);
			return data?.issueCreate.issue.identifier;
		},
		comment: async (id, body) => {
			if (!takeWrite()) {
				return false;
			}
			const data = await request(
				`mutation ($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
				{ input: { issueId: id, body } },
				z.object({ commentCreate: z.object({ success: z.boolean() }) }),
			);
			return data?.commentCreate.success === true;
		},
	};
}
