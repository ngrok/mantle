import { expect, test } from "vitest";
import { jsonLinePaths } from "./json-line-paths.js";

test("gives each member its key path and each array item its index", () => {
	const code = JSON.stringify(
		{ messages: [{ role: "user" }, "text"], thinking: { budget_tokens: 10 } },
		null,
		2,
	);
	expect(jsonLinePaths(code)).toEqual([
		[],
		["messages"],
		["messages", 0],
		["messages", 0, "role"],
		undefined,
		["messages", 1],
		undefined,
		["thinking"],
		["thinking", "budget_tokens"],
		undefined,
		undefined,
	]);
});

test("decodes an escaped quote in a key", () => {
	expect(jsonLinePaths(JSON.stringify({ 'a"b': 1 }, null, 2))[1]).toEqual(['a"b']);
});
