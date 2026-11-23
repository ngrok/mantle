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
