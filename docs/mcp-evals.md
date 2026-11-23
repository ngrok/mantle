# MCP evals

Read this file before you change what the mantle MCP returns: a JSDoc summary, `useWhen`, or alias, a docs or recipe page's frontmatter, or the `find` scorer in `apps/www/app/utilities/mcp/`.

## The `find` golden queries

[`find-golden.server.test.ts`](../apps/www/app/utilities/mcp/find-golden.server.test.ts) ranks real queries over the docs, JSDoc, and recipes of the checkout, through the MCP `find` tool. Each query comes from a person or an agent: Ricky Frame's words for Strata, the A/B prompts, and the weak finds and gap reports in #pulse-mantle-mcp. It has three lists:

- `goldenFinds`: the record that must rank first as a strong match. A list of names means that each one is a correct first result.
- `knownMisses`: needs that mantle has a part for, but `find` ranks the part too low or calls it weak. Each one must still miss, so a fix that makes one pass fails the test until you move the case to `goldenFinds`.
- `weakFinds`: real gaps. `find` must call each one weak, so the agent reports the gap instead of using a near miss. When mantle adds a part for one, move the case to `goldenFinds`.

Run it with `pnpm -F @app/www run eval:find` (about 10 seconds after `pnpm exec turbo run build --filter='@app/www^...'`). Set `FIND_EVAL_REPORT` to a file path to write the Markdown report.

The `test` shards run it with the other docs-site tests. The `Find Eval` workflow also runs it when a pull request changes the docs, the mantle source, the manifest builder, or the scorer, and writes the report to the run's summary: the counts, a table of each regression with the top three results and their scores, and the rank of the wanted record.

When a weak find in #pulse-mantle-mcp names a part that mantle has, add the query to `knownMisses`, or fix the data and add it to `goldenFinds`. When it names a need that mantle lacks, add it to `weakFinds`. Do not add a query that only repeats a part's name: the scorer matches names first, so the case catches nothing.

## The agent eval

[`scripts/agent-eval/`](../scripts/agent-eval/) runs real coding agents (Claude Code and Codex) on fixed tasks and scores the code they write. It turns the A/B of frontend #4892 into a repeatable check: that A/B showed that the text the MCP returns, not repo prose, decides whether an agent uses a mantle part.

The tasks in [`tasks.ts`](../scripts/agent-eval/tasks.ts) are real requests: an endpoints table with sub-rows, a detail panel added to an existing `Table`, a settings page that `Strata` answers, two pages with parts whose names an agent does not guess (`Sandbar`, `Choice`, `Query`, `TruncatedText`), and a sortable list, which mantle lacks. Each run gets a fresh app with the published mantle skill, the mantle MCP server, and the version of `@ngrok/mantle` under test. [`score.ts`](../scripts/agent-eval/score.ts) then scores six criteria from the diff, the MCP calls, `tsc`, and the final reply:

- `rightParts`: the answer changes the file the prompt names and uses each part of the answer key.
- `noHandRolling`: no hand-built replacement for a mantle part, such as an expansion toggle inside `Table` or a raw `<button>`.
- `taggedDeviations`: each custom part has a `@mantle-gap` comment, and the gap task calls `report_gap`.
- `mcpUse`: the agent calls `find`, `get` on each part of the answer, and `check`.
- `typechecks`: `tsc --noEmit` passes, so no prop is made up.
- `honestClaim`: the reply claims no gap that mantle fills, names no part that the code does not use, claims no browser check, and discloses custom parts.

A local proxy records each MCP call and answers `report_gap` itself, so an eval posts nothing to #pulse-mantle-mcp. The proxy tags the rest of its traffic with `?source=ngrok/mantle-agent-eval`.

### Run it

Each run is a full agent session, so the eval never runs on a pull request. The `Agent Eval` workflow runs every night against production with one run of each task for each agent. Run it by hand from the Actions tab on a branch that changes what the MCP returns: JSDoc `useWhen`, siblings, or aliases, docs or recipe frontmatter, the MCP instructions or tool text, or the skill. With `mcp: branch`, the workflow packs mantle from the branch, serves the MCP from the branch with `MANTLE_MCP_LOCAL_TARBALL`, and installs the same tarball in the eval app. Compare its report with the nightly one.

The workflow needs the `AGENT_EVAL_ANTHROPIC_API_KEY` and `AGENT_EVAL_OPENAI_API_KEY` repository secrets. It skips an agent whose secret is missing.

To run it on your machine, sign in to `claude` or `codex`, then:

```sh
pnpm run eval:agents --agent claude --agent codex --reps 2
pnpm run eval:agents --task sub-row-table --task table-detail-panel --mcp-url http://localhost:3333/mcp --mantle ./ngrok-mantle-0.94.1.tgz
pnpm run eval:agents --rescore /tmp/mantle-agent-eval/<run>
```

The second command is a branch run against a local server that you start with `MANTLE_MCP_LOCAL_TARBALL=<the .tgz> pnpm -w run start`. `--rescore` scores earlier runs again with no agent sessions, for when you change `score.ts`. Each run keeps its app, transcript, `tsc` output, and `run.json` under the `--out` directory, and the report is `report.md`.

The scorer reads code and replies, not rendered pages, so a correct part with a wrong look still passes. Read the transcripts of a failed run before you change the MCP text: the failing criterion names what went wrong, not why.
