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

test("reads an opener that shares a line with its parent's opener", () => {
	const code =
		'{\n  "messages": [{\n    "role": "user"\n  }, {\n    "role": "tool"\n  }],\n  "after": 1\n}';
	expect(jsonLinePaths(code)).toEqual([
		[],
		["messages"],
		["messages", 0, "role"],
		["messages", 1],
		["messages", 1, "role"],
		undefined,
		["after"],
		undefined,
	]);
});
